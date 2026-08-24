import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const reportsDir = path.join(root, "reports");
const publicConfigPath = path.join(root, "config/site.config.json");
const buildMode = process.env.BUILD_MODE || process.env.NODE_ENV || "development";
const isProduction = buildMode === "production";
const warnings = [];

const envMap = {
  SITE_URL: ["siteUrl"],
  CANONICAL_HOST: ["canonicalHost"],
  GOOGLE_BUSINESS_URL: ["googleBusinessUrl"],
  GOOGLE_MAPS_PLACE_URL: ["googleMapsPlaceUrl"],
  GOOGLE_MAPS_DIRECTIONS_URL: ["googleMapsDirectionsUrl"],
  GEO_LATITUDE: ["geo", "latitude"],
  GEO_LONGITUDE: ["geo", "longitude"],
  GTM_ID: ["tracking", "gtmId"],
  GA4_ID: ["tracking", "ga4Id"],
  GOOGLE_ADS_ID: ["tracking", "googleAdsId"],
  GOOGLE_ADS_FORM_CONVERSION_LABEL: ["tracking", "googleAdsFormConversionLabel"],
  GOOGLE_ADS_WHATSAPP_CONVERSION_LABEL: ["tracking", "googleAdsWhatsappConversionLabel"],
  META_PIXEL_ID: ["tracking", "metaPixelId"],
};

const localScripts = [
  "scripts/mobile-menu.js",
  "scripts/tracking.js",
  "scripts/lead-source.js",
  "scripts/contact-form.js",
  "scripts/cookie-consent.js",
  "scripts/motion.js",
];

const readText = (file) => readFile(path.join(root, file), "utf8");
const distPath = (...parts) => path.join(dist, ...parts);
const hash = (value, length = 10) => createHash("sha256").update(value).digest("hex").slice(0, length);
const toPosix = (value) => value.split(path.sep).join("/");
const ensureDir = (dir) => mkdir(dir, { recursive: true });

const fileExists = async (file) => {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
};

const setDeep = (target, keys, value) => {
  let current = target;

  keys.slice(0, -1).forEach((key) => {
    current[key] = current[key] || {};
    current = current[key];
  });

  current[keys.at(-1)] = value;
};

const normalizeSiteUrl = (value) => {
  const trimmed = String(value || "").trim().replace(/\/+$/, "");

  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    return url.origin;
  } catch {
    return "";
  }
};

const normalizeHost = (value) => {
  const trimmed = String(value || "").trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();

  return trimmed;
};

const toFiniteNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
};

const loadConfig = async () => {
  const config = JSON.parse(await readFile(publicConfigPath, "utf8"));

  Object.entries(envMap).forEach(([envName, keys]) => {
    const value = process.env[envName];

    if (value) {
      setDeep(config, keys, value);
    }
  });

  config.siteUrl = normalizeSiteUrl(config.siteUrl);
  config.canonicalHost = normalizeHost(config.canonicalHost);
  const latitude = toFiniteNumber(config.geo?.latitude);
  const longitude = toFiniteNumber(config.geo?.longitude);

  if (latitude !== null && longitude !== null) {
    config.geo = { latitude, longitude };
  }

  if (isProduction) {
    if (!config.siteUrl) {
      throw new Error("BUILD_MODE=production exige SITE_URL configurado.");
    }

    if (!config.siteUrl.startsWith("https://")) {
      throw new Error("BUILD_MODE=production exige SITE_URL com HTTPS.");
    }

    if (!config.canonicalHost) {
      throw new Error("BUILD_MODE=production exige CANONICAL_HOST configurado.");
    }

    if (new URL(config.siteUrl).host !== config.canonicalHost) {
      throw new Error("BUILD_MODE=production exige CANONICAL_HOST igual ao host de SITE_URL.");
    }
  } else if (!config.siteUrl) {
    warnings.push("SITE_URL nao informado; canonical, sitemap, robots, Schema e OG ficam em modo local/pendente.");
  }

  return config;
};

const absoluteUrl = (config, href = "/") => {
  if (/^https?:\/\//i.test(href)) return href;
  const clean = href.startsWith("./") ? href.slice(1) : href;

  if (!config.siteUrl) return clean || "/";

  return new URL(clean || "/", `${config.siteUrl}/`).toString();
};

const whatsappUrl = (config, message) => {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${config.whatsappNumber}?text=${encoded}`;
};

const generateSchema = (config) => {
  const base = config.siteUrl || "";
  const url = base || "/";
  const businessId = `${url.replace(/\/$/, "")}/#business`;
  const latitude = toFiniteNumber(config.geo?.latitude);
  const longitude = toFiniteNumber(config.geo?.longitude);
  const hasGeo = latitude !== null && longitude !== null;
  const services = config.services.map((service, index) => ({
    "@type": "Service",
    "@id": `${url.replace(/\/$/, "")}/#service-${index + 1}`,
    "name": service.name,
    "description": service.description,
    "provider": { "@id": businessId },
    "areaServed": {
      "@type": "City",
      "name": "Santo Antônio da Platina"
    }
  }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": businessId,
        "name": config.brandNameDisplay,
        "legalName": config.legalName,
        "url": url,
        "logo": absoluteUrl(config, "/assets/Home/LogoHeader.svg"),
        "image": absoluteUrl(config, "/assets/social/og-sevenup.jpg"),
        "telephone": config.phoneE164,
        "email": config.email,
        "taxID": config.cnpj,
        "address": {
          "@type": "PostalAddress",
          "streetAddress": config.streetAddress,
          "addressLocality": config.addressLocality,
          "addressRegion": config.addressRegion,
          "postalCode": config.postalCode,
          "addressCountry": config.addressCountry
        },
        ...(hasGeo ? {
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": latitude,
            "longitude": longitude
          }
        } : {}),
        "openingHoursSpecification": [
          {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            "opens": "09:00",
            "closes": "18:00"
          }
        ],
        "hasMap": config.googleBusinessUrl || config.googleMapsPlaceUrl || config.googleMapsSearchUrl,
        "sameAs": [config.instagram, config.facebook].filter(Boolean)
      },
      {
        "@type": "Person",
        "@id": `${url.replace(/\/$/, "")}/#silvia-leticia`,
        "name": "Dra. Silvia Letícia da Silveira Jacinto",
        "jobTitle": "Nutricionista e Farmacêutica",
        "worksFor": { "@id": businessId },
        "description": "Responsável Técnica da Clínica SevenUp — CRF nº 21694."
      },
      ...services,
      {
        "@type": "FAQPage",
        "@id": `${url.replace(/\/$/, "")}/#faq`,
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Como funciona a primeira avaliação na Clínica SevenUp?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A avaliação inicial entende seus objetivos e histórico para indicar um plano de cuidado personalizado."
            }
          },
          {
            "@type": "Question",
            "name": "Os procedimentos de aplicação de botox e preenchimento causam dor?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Os procedimentos são geralmente bem tolerados e podem contar com recursos para maior conforto."
            }
          },
          {
            "@type": "Question",
            "name": "Qual a durabilidade da toxina botulínica e dos preenchimentos?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "A durabilidade varia conforme organismo, produto, região tratada e rotina de cuidados."
            }
          },
          {
            "@type": "Question",
            "name": "O que é estética regenerativa e o que são bioestimuladores?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "São abordagens que estimulam respostas naturais da pele, como produção de colágeno e melhora progressiva da firmeza."
            }
          },
          {
            "@type": "Question",
            "name": "Por que a clínica conta com acompanhamento nutricional?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Porque os resultados estéticos também dependem de saúde interna, metabolismo e hábitos de cuidado."
            }
          }
        ]
      }
    ]
  };
};

const collectCss = async (entry) => {
  const file = path.join(root, entry);
  const content = await readFile(file, "utf8");
  const imports = [...content.matchAll(/@import url\("(.+?)"\);/g)].map((match) => match[1]);
  let css = content;

  for (const imported of imports) {
    const importedPath = path.join(path.dirname(entry), imported);
    css = css.replace(`@import url("${imported}");`, await collectCss(importedPath));
  }

  return css;
};

const buildCss = async () => {
  const css = await collectCss("styles/global.css");
  const result = await esbuild.transform(css, {
    loader: "css",
    minify: true,
    legalComments: "none",
  });
  const name = `app-${hash(result.code)}.css`;
  await ensureDir(distPath("assets"));
  await writeFile(distPath("assets", name), result.code);

  return `./assets/${name}`;
};

const buildJs = async () => {
  const entry = localScripts.map((script) => `import "../${script}";`).join("\n");
  const result = await esbuild.build({
    stdin: {
      contents: entry,
      resolveDir: path.join(root, "tools"),
      sourcefile: "sevenup-app.js",
      loader: "js",
    },
    bundle: true,
    minify: true,
    write: false,
    legalComments: "none",
    target: "es2018",
  });
  const code = result.outputFiles[0].text;
  const name = `app-${hash(code)}.js`;
  await writeFile(distPath("assets", name), code);

  return `./assets/${name}`;
};

const copyGsap = async () => {
  const vendorDir = distPath("assets", "vendor");
  await ensureDir(vendorDir);

  const files = [
    ["node_modules/gsap/dist/gsap.min.js", "gsap"],
    ["node_modules/gsap/dist/ScrollTrigger.min.js", "ScrollTrigger"],
  ];
  const output = [];

  for (const [file, label] of files) {
    const content = await readFile(path.join(root, file));
    const name = `${label}-${hash(content)}.min.js`;
    await writeFile(path.join(vendorDir, name), content);
    output.push(`./assets/vendor/${name}`);
  }

  return output;
};

const slugAsset = (assetPath) => {
  return assetPath
    .replace(/^\.?\//, "")
    .replace(/^assets\//, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

const optimizeImage = async (assetPath) => {
  const source = path.join(root, assetPath.replace(/^\.\//, ""));
  const input = await readFile(source);
  const metadata = await sharp(input).metadata();
  const base = `${slugAsset(assetPath)}-${hash(input)}`;
  const dir = distPath("assets", "media");
  const webpName = `${base}.webp`;
  const avifName = `${base}.avif`;
  await ensureDir(dir);

  const width = metadata.width || undefined;
  const resize = width && width > 1400 ? { width: 1400, withoutEnlargement: true } : {};

  await sharp(input)
    .resize(resize)
    .webp({ quality: 76, effort: 5 })
    .toFile(path.join(dir, webpName));

  await sharp(input)
    .resize(resize)
    .avif({ quality: 52, effort: 5 })
    .toFile(path.join(dir, avifName));

  return {
    width: metadata.width,
    height: metadata.height,
    webp: `./assets/media/${webpName}`,
    avif: `./assets/media/${avifName}`,
  };
};

const copyAsset = async (assetPath) => {
  const clean = assetPath.replace(/^\.\//, "");
  const source = path.join(root, clean);
  const target = distPath(clean);

  if (!(await fileExists(source))) return;

  await ensureDir(path.dirname(target));
  await copyFile(source, target);
};

const rewriteImages = async (html) => {
  const imageRegex = /<img\b([^>]*?)\bsrc="(\.\/assets\/[^"]+\.(?:png|jpe?g))"([^>]*)>/gi;
  const matches = [...html.matchAll(imageRegex)];
  const optimized = new Map();
  let output = html;

  for (const match of matches) {
    const src = match[2];
    const shouldKeepOriginal = src.includes("/footer/logoFOOTER.png");

    if (shouldKeepOriginal) {
      await copyAsset(src);
      continue;
    }

    if (!optimized.has(src)) {
      optimized.set(src, await optimizeImage(src));
    }

    const info = optimized.get(src);
    const originalTag = match[0];
    const imgTag = originalTag.replace(src, info.webp);
    const picture = `<picture><source type="image/avif" srcset="${info.avif}"><source type="image/webp" srcset="${info.webp}">${imgTag}</picture>`;
    output = output.replace(originalTag, picture);
  }

  return output;
};

const copyHtmlReferencedAssets = async (html) => {
  const refs = [
    ...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+\.(?:svg|png|webp|avif|jpg|jpeg|woff2))"/gi),
    ...html.matchAll(/content="(\/assets\/[^"]+\.(?:svg|png|webp|avif|jpg|jpeg))"/gi),
  ];

  for (const match of refs) {
    const ref = match[1].replace(/^\//, "./");

    if (/\.(webp|avif)$/i.test(ref) && ref.includes("./assets/media/")) {
      continue;
    }

    await copyAsset(ref);
  }

};

const injectConfiguredLinks = (html, config) => {
  if (!config.googleMapsDirectionsUrl) return html;

  return html.replace(
    /(<a class="location-section__route" href=")[^"]+(" target="_blank" rel="noopener" data-track="maps" data-cta-location="location_route">)/,
    `$1${config.googleMapsDirectionsUrl}$2`
  );
};

const writePublicConfig = async (config) => {
  await ensureDir(distPath("config"));
  await writeFile(distPath("config", "site.config.json"), JSON.stringify(config, null, 2));
};

const injectMetadata = (html, config, page) => {
  const siteName = config.brandNameDisplay;
  const title = page === "home"
    ? "Clínica SevenUp | Estética Avançada em Santo Antônio da Platina"
    : "Política de Privacidade | Clínica SevenUp";
  const description = page === "home"
    ? "Clínica de estética avançada em Santo Antônio da Platina, PR, com tratamentos faciais, corporais e avaliação profissional."
    : "Política de Privacidade da Clínica SevenUp sobre formulário, cookies, analytics e canais de contato.";
  const pathName = page === "home" ? "/" : "/politica-de-privacidade.html";
  const ogImage = absoluteUrl(config, "/assets/social/og-sevenup.jpg");
  const canonical = absoluteUrl(config, pathName);
  const assetRoot = isProduction ? "/" : "./";

  html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`);
  html = html.replace(/<meta name="description" content=".*?" \/>/, `<meta name="description" content="${description}" />`);

  const managed = [
    `<link rel="canonical" href="${canonical}" data-managed="site-url" />`,
    `<meta name="robots" content="index, follow" />`,
    `<meta name="theme-color" content="#ece5d9" />`,
    `<link rel="icon" href="${assetRoot}favicon.ico" sizes="any" />`,
    `<link rel="icon" type="image/png" sizes="32x32" href="${assetRoot}favicon-32x32.png" />`,
    `<link rel="icon" type="image/png" sizes="16x16" href="${assetRoot}favicon-16x16.png" />`,
    `<link rel="apple-touch-icon" href="${assetRoot}apple-touch-icon.png" />`,
    `<link rel="manifest" href="${assetRoot}site.webmanifest" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="pt_BR" />`,
    `<meta property="og:site_name" content="${siteName}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${canonical}" data-managed="site-url" />`,
    `<meta property="og:image" content="${ogImage}" data-managed="site-url" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${ogImage}" data-managed="site-url" />`,
  ].join("\n  ");

  if (html.includes("<!-- sevenup:metadata -->")) {
    return html.replace("<!-- sevenup:metadata -->", managed);
  }

  return html.replace("</head>", `  ${managed}\n</head>`);
};

const injectSchema = (html, config) => {
  if (!html.includes("<!-- sevenup:schema -->")) return html;

  return html.replace(
    "<!-- sevenup:schema -->",
    `<script type="application/ld+json">${JSON.stringify(generateSchema(config))}</script>`
  );
};

const rewriteStylesAndScripts = (html, cssHref, jsHref, gsapHrefs) => {
  html = html.replace(/<link rel="stylesheet" href="\.\/styles\/global\.css" \/>/, `<link rel="stylesheet" href="${cssHref}" />`);
  html = html.replace(/\n\s*<script src="\.\/scripts\/[^"]+" defer><\/script>/g, "");
  html = html.replace(/\n\s*<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/gsap@3\.15\/dist\/[^"]+" defer><\/script>/g, "");

  const scripts = [
    `<script src="${gsapHrefs[0]}" defer></script>`,
    `<script src="${gsapHrefs[1]}" defer></script>`,
    `<script src="${jsHref}" defer></script>`,
  ].join("\n  ");

  return html.replace("</body>", `  ${scripts}\n</body>`);
};

const processHtml = async (file, page, config, cssHref, jsHref, gsapHrefs) => {
  let html = await readText(file);
  html = injectMetadata(html, config, page);
  html = injectSchema(html, config);
  html = injectConfiguredLinks(html, config);
  html = rewriteStylesAndScripts(html, cssHref, jsHref, gsapHrefs);
  html = await rewriteImages(html);
  await copyHtmlReferencedAssets(html);
  await writeFile(distPath(file), html);
};

const makeOgImage = async (config) => {
  const socialDir = distPath("assets", "social");
  await ensureDir(socialDir);

  const left = await sharp(path.join(root, "assets/Home/imgESQUERDA.png"))
    .resize(600, 630, { fit: "cover" })
    .modulate({ saturation: 0.92 })
    .png()
    .toBuffer();
  const right = await sharp(path.join(root, "assets/Home/imgDIREITA.png"))
    .resize(600, 630, { fit: "cover" })
    .greyscale()
    .png()
    .toBuffer();
  const overlay = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="rgba(35,24,19,0.34)"/>
      <rect x="0" y="0" width="1200" height="630" fill="none"/>
      <text x="600" y="268" text-anchor="middle" font-family="Georgia, serif" font-size="66" fill="#fff7ea">Clínica SevenUp</text>
      <text x="600" y="330" text-anchor="middle" font-family="Arial, sans-serif" font-size="25" fill="#fff7ea" opacity="0.9">Estética avançada em Santo Antônio da Platina</text>
      <text x="600" y="380" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#fff7ea" opacity="0.78">${config.phoneDisplay} · ${config.email}</text>
    </svg>
  `);

  const image = sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: "#c1ab91",
    },
  }).composite([
    { input: left, left: 0, top: 0 },
    { input: right, left: 600, top: 0 },
    { input: overlay, left: 0, top: 0 },
  ]);

  await image.clone().jpeg({ quality: 82, progressive: true }).toFile(path.join(socialDir, "og-sevenup.jpg"));
  await image.clone().webp({ quality: 78 }).toFile(path.join(socialDir, "og-sevenup.webp"));
};

const makeFavicons = async (config) => {
  const logo = path.join(root, "assets/Home/LogoHeader.svg");
  const sizes = [
    [16, "favicon-16x16.png"],
    [32, "favicon-32x32.png"],
    [180, "apple-touch-icon.png"],
    [192, "android-chrome-192x192.png"],
    [512, "android-chrome-512x512.png"],
  ];
  const pngBuffers = [];

  for (const [size, name] of sizes) {
    const buffer = await sharp(logo)
      .resize(size, size, { fit: "contain", background: "#ece5d9" })
      .png()
      .toBuffer();
    await writeFile(distPath(name), buffer);

    if (size === 16 || size === 32) {
      pngBuffers.push(buffer);
    }
  }

  await writeFile(distPath("favicon.ico"), await pngToIco(pngBuffers));
  await writeFile(distPath("site.webmanifest"), JSON.stringify({
    name: config.brandNameDisplay,
    short_name: "SevenUp",
    icons: [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" }
    ],
    theme_color: "#ece5d9",
    background_color: "#fff7ea",
    start_url: "/",
    display: "minimal-ui"
  }, null, 2));
};

const makeRobots = async (config) => {
  const sitemap = config.siteUrl ? `${config.siteUrl}/sitemap.xml` : "/sitemap.xml";
  await writeFile(distPath("robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${sitemap}\n`);
};

const makeSitemap = async (config) => {
  const urls = config.siteUrl
    ? [`${config.siteUrl}/`, `${config.siteUrl}/politica-de-privacidade.html`]
    : [];
  const body = urls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n");
  await writeFile(distPath("sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
};

const makeLlms = async (config) => {
  const site = config.siteUrl || "SITE_URL pendente";
  await writeFile(distPath("llms.txt"), `# Clínica SevenUp

> Clínica de estética avançada localizada em Santo Antônio da Platina, Paraná.

## Sobre
A Clínica SevenUp oferece tratamentos estéticos apresentados no site, com atendimento mediante avaliação profissional.

## Serviços
${config.services.map((service) => `- ${service.name}`).join("\n")}

## Responsável técnica
Dra. Silvia Letícia da Silveira Jacinto — CRF nº 21694.

## Localização
${config.streetAddress}
${config.addressLocality} - ${config.addressRegion}
CEP ${config.postalCode}

## Contato
Email: ${config.email}
WhatsApp: ${config.phoneE164}
Site: ${site}

## Páginas principais
- Home: apresentação da clínica, tratamentos, localização, FAQ e agendamento.
- Política de Privacidade: informações sobre tratamento de dados e privacidade.
`);
};

const makeSecurityTxt = async (config) => {
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const canonical = config.siteUrl ? `Canonical: ${config.siteUrl}/.well-known/security.txt\n` : "";

  await ensureDir(distPath(".well-known"));
  await writeFile(distPath(".well-known", "security.txt"), `Contact: mailto:${config.email}\nPreferred-Languages: pt-BR\n${canonical}Expires: ${expires}\n`);
};

const makeHtaccess = async (config) => {
  const canonicalHostPattern = config.canonicalHost
    ? config.canonicalHost.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    : "";
  const hostRule = config.canonicalHost ? `
RewriteCond %{HTTP_HOST} !^${canonicalHostPattern}$ [NC]
RewriteRule ^ https://${config.canonicalHost}%{REQUEST_URI} [L,R=301]
` : "";

  await writeFile(distPath(".htaccess"), `Options -Indexes
DirectoryIndex index.html
ErrorDocument 404 /404.html

<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{HTTPS} !=on
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
${hostRule}
RewriteCond %{THE_REQUEST} \\s/+index\\.html[\\s?] [NC]
RewriteRule ^index\\.html$ / [R=301,L]
</IfModule>

<FilesMatch "^(config\\.local\\.php|\\.env)">
Require all denied
</FilesMatch>

<IfModule mod_headers.c>
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
Header always set X-Frame-Options "SAMEORIGIN"
Header always set Strict-Transport-Security "max-age=31536000"
Header set Cache-Control "no-cache, must-revalidate" "expr=%{CONTENT_TYPE} =~ m#text/html#"
<FilesMatch "\\.(?:css|js|webp|avif|png|jpg|jpeg|svg|woff2|ico)$">
Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
</IfModule>

<IfModule mod_brotli.c>
AddOutputFilterByType BROTLI_COMPRESS text/html text/plain text/css application/javascript application/json application/xml image/svg+xml
</IfModule>

<IfModule mod_deflate.c>
AddOutputFilterByType DEFLATE text/html text/plain text/css application/javascript application/json application/xml image/svg+xml
</IfModule>
`);
};

const make404 = async (cssHref, jsHref, gsapHrefs, config) => {
  const wa = whatsappUrl(config, "Olá, vim pelo site da SevenUp e gostaria de falar com a clínica.");
  const assetRoot = isProduction ? "/" : "./";
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Página não encontrada | Clínica SevenUp</title>
  <meta name="robots" content="noindex, follow" />
  <meta name="theme-color" content="#ece5d9" />
  <link rel="preconnect" href="https://use.typekit.net" crossorigin />
  <link rel="stylesheet" href="https://use.typekit.net/sog3usj.css" />
  <link rel="icon" href="${assetRoot}favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="32x32" href="${assetRoot}favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="${assetRoot}favicon-16x16.png" />
  <link rel="apple-touch-icon" href="${assetRoot}apple-touch-icon.png" />
  <link rel="manifest" href="${assetRoot}site.webmanifest" />
  <link rel="stylesheet" href="${cssHref}" />
</head>
<body>
  <main class="not-found-page" aria-labelledby="not-found-title">
    <img src="./assets/Home/LogoHeader.svg" alt="SevenUp Clínica" width="121" height="84" />
    <h1 id="not-found-title">Página não encontrada</h1>
    <p>O endereço acessado não existe ou foi movido.</p>
    <div class="not-found-page__actions">
      <a href="./index.html#inicio">Voltar para a home</a>
      <a href="${wa}" target="_blank" rel="noopener" data-track="whatsapp" data-cta-location="404">Falar pelo WhatsApp</a>
    </div>
  </main>
  <script src="${gsapHrefs[0]}" defer></script>
  <script src="${gsapHrefs[1]}" defer></script>
  <script src="${jsHref}" defer></script>
</body>
</html>`;

  await writeFile(distPath("404.html"), html);
  await copyAsset("./assets/Home/LogoHeader.svg");
};

const copyApiRuntime = async () => {
  const sourceDir = path.join(root, "api");
  const targetDir = distPath("api");
  await ensureDir(targetDir);

  const walk = async (dir) => {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const source = path.join(dir, entry.name);
      const relative = path.relative(sourceDir, source);
      const target = path.join(targetDir, relative);

      if (entry.name === "config.local.php") continue;

      if (entry.isDirectory()) {
        await ensureDir(target);
        await walk(source);
      } else {
        await ensureDir(path.dirname(target));
        await copyFile(source, target);
      }
    }
  };

  await walk(sourceDir);
};

const writeReport = async (config) => {
  const files = [];

  const walk = async (dir) => {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const relative = toPosix(path.relative(dist, full));

      if (entry.isDirectory()) {
        await walk(full);
      } else {
        const size = (await stat(full)).size;
        files.push({ file: relative, size });
      }
    }
  };

  await walk(dist);

  const report = {
    mode: buildMode,
    siteUrl: config.siteUrl || null,
    publicConfig: config,
    generatedAt: new Date().toISOString(),
    warnings,
    files,
  };

  await ensureDir(reportsDir);
  await writeFile(path.join(reportsDir, "build-report.json"), JSON.stringify(report, null, 2));
};

const main = async () => {
  const config = await loadConfig();

  await rm(dist, { recursive: true, force: true });
  await ensureDir(dist);
  await writePublicConfig(config);

  await makeOgImage(config);
  const cssHref = await buildCss();
  const jsHref = await buildJs();
  const gsapHrefs = await copyGsap();

  await processHtml("index.html", "home", config, cssHref, jsHref, gsapHrefs);
  await processHtml("politica-de-privacidade.html", "privacy", config, cssHref, jsHref, gsapHrefs);

  await makeFavicons(config);
  await make404(cssHref, jsHref, gsapHrefs, config);
  await makeRobots(config);
  await makeSitemap(config);
  await makeLlms(config);
  await makeSecurityTxt(config);
  await makeHtaccess(config);
  await copyApiRuntime();
  await writeReport(config);

  console.log(`Build concluido em dist/ (${buildMode}).`);

  warnings.forEach((warning) => {
    console.warn(`Aviso: ${warning}`);
  });
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
