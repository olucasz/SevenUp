import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const reportsDir = path.join(root, "reports");
const buildMode = process.env.BUILD_MODE || process.env.NODE_ENV || "development";
const isProduction = buildMode === "production";
const officialGtmId = "GTM-T9JQHD3M";
const officialSiteUrl = "https://clinicasevenup.com.br";
const officialCanonicalHost = "clinicasevenup.com.br";
const officialGoogleBusinessUrl = "https://share.google/wDuGoTZ5oIP1zpH73";
const officialGoogleMapsDirectionsUrl = "https://www.google.com/maps/dir//Clínica+Seven+UP,+R.+José+Bonifácio,+200+-+Centro,+Santo+Antônio+da+Platina+-+PR,+86430-000/@-23.4090584,-50.3578624,8408m/data=!3m1!1e3!4m8!4m7!1m0!1m5!1m1!1s0x94ea8361d96091a3:0x4d37994e49897bc3!2m2!1d-50.0730897!2d-23.2928033?entry=ttu&g_ep=EgoyMDI2MDgxOS4wIKXMDSoASAFQAw%3D%3D";
const officialGeo = { latitude: -23.2928033, longitude: -50.0730897 };
const errors = [];
const warnings = [];

const exists = async (file) => {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
};

const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await walk(full));
    } else {
      files.push(full);
    }
  }

  return files;
};

const toPosix = (value) => value.split(path.sep).join("/");

const assert = (condition, message) => {
  if (!condition) errors.push(message);
};

const warn = (condition, message) => {
  if (!condition) warnings.push(message);
};

const readMaybe = async (file) => (await exists(file) ? readFile(file, "utf8") : "");

const readJsonMaybe = async (file) => {
  const content = await readMaybe(file);
  return content ? JSON.parse(content) : {};
};

const count = (value, needle) => value.split(needle).length - 1;

const isTextAsset = (file) => (
  /\.(?:html|css|js|json|txt|xml|svg|webmanifest|php)$/i.test(file) || file === ".htaccess"
);

const findRefs = (html) => {
  const refs = [];
  const patterns = [
    /(?:src|href)="([^"#?]+)[^"]*"/gi,
    /content="([^"]+\.(?:jpg|jpeg|png|webp|avif|svg))"/gi,
  ];

  patterns.forEach((pattern) => {
    for (const match of html.matchAll(pattern)) {
      const ref = match[1];

      if (/^(?:https?:|mailto:|tel:|#|data:)/i.test(ref)) continue;
      if (ref.startsWith("api/") || ref.startsWith("/api/")) continue;

      refs.push(ref);
    }
  });

  return refs;
};

const checkProductionUrls = ({ index, privacy, robots, sitemap, allText, publicConfig }) => {
  const hasAbsoluteCanonical = /<link rel="canonical" href="https?:\/\//.test(index)
    && /<link rel="canonical" href="https?:\/\//.test(privacy);
  const sitemapUrls = [...sitemap.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g)].map((match) => match[1]);

  if (isProduction) {
    assert(Boolean(publicConfig.siteUrl), "SITE_URL obrigatorio em modo production.");
    assert(/^https:\/\//.test(publicConfig.siteUrl || ""), "SITE_URL precisa usar HTTPS em modo production.");
    assert(Boolean(publicConfig.canonicalHost), "CANONICAL_HOST obrigatorio em modo production.");
    assert(publicConfig.siteUrl === officialSiteUrl, `SITE_URL production deve ser ${officialSiteUrl}.`);
    assert(publicConfig.canonicalHost === officialCanonicalHost, `CANONICAL_HOST production deve ser ${officialCanonicalHost}.`);

    if (publicConfig.siteUrl && publicConfig.canonicalHost) {
      assert(new URL(publicConfig.siteUrl).host === publicConfig.canonicalHost, "CANONICAL_HOST precisa bater com o host de SITE_URL.");
    }

    assert(hasAbsoluteCanonical, "Canonical absoluto obrigatorio em modo production.");
    assert(index.includes(`<link rel="canonical" href="${officialSiteUrl}/"`), "Canonical da home precisa apontar para o dominio oficial.");
    assert(privacy.includes(`<link rel="canonical" href="${officialSiteUrl}/politica-de-privacidade.html"`), "Canonical da politica precisa apontar para o dominio oficial.");
    assert(sitemapUrls.length >= 2, "Sitemap precisa ter URLs absolutas da home e politica em modo production.");
    assert(sitemapUrls.includes(`${officialSiteUrl}/`), "Sitemap sem home oficial.");
    assert(sitemapUrls.includes(`${officialSiteUrl}/politica-de-privacidade.html`), "Sitemap sem politica oficial.");
    assert(robots.includes(`Sitemap: ${publicConfig.siteUrl}/sitemap.xml`), "robots.txt precisa apontar para o sitemap absoluto do dominio final.");
    assert(!/SITE_URL pendente|dominio-final|example\.com|localhost|127\.0\.0\.1|seudominio/i.test(allText), "Build production contem placeholder ou dominio local.");
  } else {
    warn(hasAbsoluteCanonical, "SITE_URL ausente ou canonical relativo no build de desenvolvimento.");
    warn(sitemapUrls.length >= 2, "Sitemap sem URLs absolutas enquanto SITE_URL nao for configurado.");
  }
};

const checkTrackingArchitecture = async ({ htmlText, jsCombined, allText, publicConfig }) => {
  const cookieSource = await readMaybe(path.join(root, "scripts", "cookie-consent.js"));
  const trackingSource = await readMaybe(path.join(root, "scripts", "tracking.js"));
  const contactSource = await readMaybe(path.join(root, "scripts", "contact-form.js"));
  const sourceCombined = [cookieSource, trackingSource, contactSource, htmlText].join("\n");

  assert(publicConfig.tracking?.gtmId === officialGtmId, `GTM oficial ausente em config/site.config.json: ${officialGtmId}`);
  assert(count(allText, officialGtmId) === 1, `GTM ${officialGtmId} deve aparecer uma unica vez em dist/.`);
  assert(count(jsCombined, "googletagmanager.com/gtm.js") === 1, "Loader do GTM deve existir uma unica vez no bundle JS.");

  [
    "googletagmanager.com/gtag/js",
    "googleadservices.com/pagead/conversion",
    "connect.facebook.net",
    "fbevents.js",
    "sevenup-gtag",
    "sevenup-meta-pixel",
  ].forEach((needle) => {
    assert(!allText.includes(needle), `Tracking direto redundante encontrado em dist: ${needle}`);
  });

  assert(!/\bfbq\s*\(/.test(allText), "fbq() nao deve ser usado no frontend; Meta deve passar pelo GTM.");

  const consentDefaultSourceIndex = cookieSource.indexOf('window.gtag("consent", "default"');
  const loadGtmSourceIndex = cookieSource.indexOf("loadGtm(tracking.gtmId)");
  assert(consentDefaultSourceIndex >= 0, "Consent Mode default nao encontrado em cookie-consent.js.");
  assert(loadGtmSourceIndex >= 0, "Bootstrap do GTM nao encontrado em cookie-consent.js.");
  assert(consentDefaultSourceIndex < loadGtmSourceIndex, "Consent Mode default precisa vir antes do carregamento do GTM.");

  const consentDefaultDistIndex = jsCombined.indexOf('gtag("consent","default"');
  const gtmLoaderDistIndex = jsCombined.indexOf("googletagmanager.com/gtm.js");
  assert(consentDefaultDistIndex >= 0, "Consent Mode default nao encontrado no bundle.");
  assert(gtmLoaderDistIndex >= 0, "Loader GTM nao encontrado no bundle.");
  assert(consentDefaultDistIndex < gtmLoaderDistIndex, "Bundle carrega GTM antes do Consent Mode default.");
  assert(jsCombined.includes("consent_updated"), "Evento consent_updated ausente no bundle.");

  [
    "whatsapp_click",
    "form_start",
    "generate_lead",
    "maps_click",
    "email_click",
    "social_click",
    "faq_open",
  ].forEach((eventName) => {
    assert(sourceCombined.includes(eventName) || jsCombined.includes(eventName), `Evento de dataLayer ausente: ${eventName}`);
  });

  const backendGuardIndex = contactSource.indexOf("if (!response.ok || !result.ok)");
  const generateLeadIndex = contactSource.indexOf("window.SevenUpTracking.generateLead()");
  assert(backendGuardIndex >= 0 && generateLeadIndex > backendGuardIndex, "generate_lead precisa disparar apenas apos sucesso confirmado do backend.");
  assert(!/data-track=["']generate_lead/i.test(htmlText), "generate_lead nao deve estar ligado diretamente a clique ou submit no HTML.");
  assert(!/addEventListener\(["']click["'][\s\S]{0,300}generateLead/i.test(sourceCombined), "generate_lead nao deve disparar por click listener.");

  const piiWords = "(nome|telefone|phone|email|mail|mensagem|message)";
  assert(!new RegExp(`dataLayer\\.push\\([^)]*${piiWords}`, "i").test(allText), "Possivel PII sendo enviada ao dataLayer.");
  assert(!new RegExp(`localStorage\\.setItem\\([^)]*${piiWords}`, "i").test(sourceCombined), "Possivel PII persistida em localStorage.");
  assert(!new RegExp(`sessionStorage\\.setItem\\([^)]*${piiWords}`, "i").test(sourceCombined), "Possivel PII persistida em sessionStorage.");
  assert(!new RegExp(`console\\.(log|info|warn|error)\\([^)]*${piiWords}`, "i").test(sourceCombined), "Possivel PII escrita em console.");
};

const checkHtaccess = (htaccess) => {
  assert(htaccess.includes("RewriteCond %{THE_REQUEST} \\s/+index\\.html[\\s?] [NC]"), ".htaccess gerado deve manter a regex literal de index.html.");
  assert(htaccess.includes("RewriteRule ^index\\.html$ / [R=301,L]"), ".htaccess gerado deve manter o escape literal no rewrite de index.html.");
  assert(htaccess.includes("RewriteCond %{HTTP_HOST} !^clinicasevenup\\.com\\.br$ [NC]"), ".htaccess production precisa redirecionar www/outros hosts para o host oficial.");
  assert(htaccess.includes("RewriteRule ^ https://clinicasevenup.com.br%{REQUEST_URI} [L,R=301]"), ".htaccess production precisa apontar para o host oficial sem www.");
  assert(htaccess.includes('Header always set Strict-Transport-Security "max-age=31536000"'), "HSTS max-age=31536000 ausente no .htaccess.");
  assert(!/Strict-Transport-Security[^\n]*(includeSubDomains|preload)/i.test(htaccess), "HSTS nao deve usar includeSubDomains/preload neste projeto.");
};

const checkFonts = ({ htmlFiles, htmlContentByFile, allText }) => {
  htmlFiles.forEach((file) => {
    const html = htmlContentByFile[file] || "";
    assert(count(html, "https://use.typekit.net/sog3usj.css") === 1, `${file} precisa carregar o kit Adobe sog3usj exatamente uma vez.`);
    assert(html.includes("https://use.typekit.net"), `${file} sem preconnect ou stylesheet Typekit.`);
  });

  assert(!allText.includes("AreaNormal-Light.woff2"), "AreaNormal-Light.woff2 nao deve ser exigida; Area Normal vem do Adobe Fonts.");
  assert(!allText.includes("ToshA-Light.woff2"), "ToshA-Light.woff2 nao deve ser exigida; Tosh A vem do Adobe Fonts.");
  assert(!allText.includes("ToshA-Regular.woff2"), "ToshA-Regular.woff2 nao deve ser exigida; Tosh A vem do Adobe Fonts.");
  assert(!allText.includes("assets/fonts"), "Pacote final nao deve referenciar fontes locais em assets/fonts.");
  assert(!allText.includes("@font-face"), "Pacote final nao deve declarar @font-face local para Tosh A/Area Normal.");
  assert(!/(?:Trial|TRY)[^\s"'<>]*\.(?:woff2|otf|ttf)|\.(?:woff2|otf|ttf)[^\s"'<>]*(?:Trial|TRY)|font-family:[^;}<>"']*(?:Trial|TRY)|(?:Tosh|Area)[^;}<>"']*(?:Trial|TRY)|(?:Trial|TRY)[^;}<>"']*(?:Tosh|Area)/i.test(allText), "Pacote final contem referencia Trial/TRY de fonte.");
  assert(!allText.includes('"Area Normal"'), "Token antigo Area Normal local ainda aparece no pacote final.");
  assert(!allText.includes('"Tosh A"'), "Token antigo Tosh A local ainda aparece no pacote final.");
  assert(allText.includes("area-normal-light"), "Token area-normal-light ausente no CSS final.");
  assert(allText.includes("tosh-a"), "Token tosh-a ausente no CSS final.");
};

const checkLocalSeo = ({ index, publicConfig }) => {
  assert(publicConfig.googleBusinessUrl === officialGoogleBusinessUrl, "googleBusinessUrl oficial ausente em config/site.config.json.");
  assert(publicConfig.googleMapsDirectionsUrl === officialGoogleMapsDirectionsUrl, "googleMapsDirectionsUrl oficial ausente em config/site.config.json.");
  assert(Number(publicConfig.geo?.latitude) === officialGeo.latitude, "Latitude oficial ausente em config/site.config.json.");
  assert(Number(publicConfig.geo?.longitude) === officialGeo.longitude, "Longitude oficial ausente em config/site.config.json.");
  assert(index.includes(officialGoogleMapsDirectionsUrl), "CTA Ver rota nao usa a URL oficial de direcoes.");

  const schemaMatch = index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert(Boolean(schemaMatch), "Schema JSON-LD nao encontrado para validar LocalBusiness.");

  if (!schemaMatch) return;

  try {
    const schema = JSON.parse(schemaMatch[1]);
    const graph = Array.isArray(schema["@graph"]) ? schema["@graph"] : [];
    const business = graph.find((entry) => entry["@type"] === "LocalBusiness");

    assert(Boolean(business), "Schema LocalBusiness ausente.");
    assert(business?.hasMap === officialGoogleBusinessUrl, "LocalBusiness.hasMap deve usar a URL oficial do Google Business.");
    assert(Number(business?.geo?.latitude) === officialGeo.latitude, "Schema LocalBusiness.geo.latitude incorreto.");
    assert(Number(business?.geo?.longitude) === officialGeo.longitude, "Schema LocalBusiness.geo.longitude incorreto.");
    assert(!business?.sameAs?.includes(officialGoogleMapsDirectionsUrl), "URL de direcoes nao deve entrar em LocalBusiness.sameAs.");
  } catch {
    assert(false, "Schema JSON-LD invalido.");
  }
};

const checkFavicons = async ({ index, privacy, relativeFiles }) => {
  const requiredFavicons = [
    "favicon.ico",
    "favicon-16x16.png",
    "favicon-32x32.png",
    "apple-touch-icon.png",
    "android-chrome-192x192.png",
    "android-chrome-512x512.png",
    "site.webmanifest",
  ];

  requiredFavicons.forEach((file) => {
    assert(relativeFiles.includes(file), `Favicon/manifest obrigatorio ausente em dist: ${file}`);
  });

  if (await exists(path.join(dist, "favicon.ico"))) {
    const ico = await readFile(path.join(dist, "favicon.ico"));
    assert(ico.length > 6 && ico[0] === 0 && ico[1] === 0 && ico[2] === 1 && ico[3] === 0, "favicon.ico nao parece ser um ICO valido.");
  }

  const manifest = await readJsonMaybe(path.join(dist, "site.webmanifest"));
  const manifestIcons = Array.isArray(manifest.icons) ? manifest.icons : [];

  ["android-chrome-192x192.png", "android-chrome-512x512.png"].forEach((icon) => {
    assert(manifestIcons.some((item) => item.src === `/${icon}`), `Manifest sem referencia root-relative para ${icon}.`);
    assert(relativeFiles.includes(icon), `Manifest referencia icon inexistente: ${icon}`);
  });

  assert(manifest.theme_color === "#ece5d9", "theme_color do manifest deve seguir a marca.");

  if (isProduction) {
    [index, privacy].forEach((html) => {
      assert(html.includes('<link rel="icon" href="/favicon.ico" sizes="any"'), "HTML production sem favicon.ico root-relative.");
      assert(html.includes('<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"'), "HTML production sem favicon 32 root-relative.");
      assert(html.includes('<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png"'), "HTML production sem favicon 16 root-relative.");
      assert(html.includes('<link rel="apple-touch-icon" href="/apple-touch-icon.png"'), "HTML production sem apple-touch-icon root-relative.");
      assert(html.includes('<link rel="manifest" href="/site.webmanifest"'), "HTML production sem manifest root-relative.");
    });
  }
};

const checkSecretsAndPackage = ({ relativeFiles, allText }) => {
  assert(!relativeFiles.includes(".env"), ".env nao pode entrar no dist.");
  assert(!relativeFiles.includes("api/config.local.php"), "api/config.local.php real nao pode entrar no dist.");
  assert(!relativeFiles.some((file) => file.endsWith(".DS_Store")), ".DS_Store nao pode entrar no dist.");

  const suspiciousSecretPatterns = [
    /smtp_pass\s*=\s*['"][^'"\s]{8,}['"]/i,
    /'SMTP_PASS'\s*=>\s*'(?!COLOCAR_GOOGLE_APP_PASSWORD_AQUI_NO_SERVIDOR')[^']{8,}'/i,
    /"SMTP_PASS"\s*:\s*"(?!")[^"]{8,}"/i,
  ];

  suspiciousSecretPatterns.forEach((pattern) => {
    assert(!pattern.test(allText), "Possivel segredo SMTP real encontrado no pacote.");
  });
};

const main = async () => {
  assert(await exists(dist), "dist/ nao existe. Rode npm run build primeiro.");
  if (!(await exists(dist))) {
    throw new Error(errors.join("\n"));
  }

  const files = await walk(dist);
  const relativeFiles = files.map((file) => toPosix(path.relative(dist, file)));
  const htmlFiles = relativeFiles.filter((file) => file.endsWith(".html"));
  const cssFiles = relativeFiles.filter((file) => file.endsWith(".css"));
  const jsFiles = relativeFiles.filter((file) => file.endsWith(".js"));
  const textFiles = relativeFiles.filter(isTextAsset);
  const htmlContentByFile = {};

  [".git", ".agents", ".codex", "node_modules", ".DS_Store"].forEach((forbidden) => {
    assert(!relativeFiles.some((file) => file.includes(forbidden)), `Arquivo/pasta proibido em dist: ${forbidden}`);
  });

  ["index.html", "politica-de-privacidade.html", "404.html", "robots.txt", "sitemap.xml", "llms.txt", ".htaccess", ".well-known/security.txt", "site.webmanifest", "favicon.ico"].forEach((file) => {
    assert(relativeFiles.includes(file), `Arquivo obrigatorio ausente em dist: ${file}`);
  });

  for (const htmlFile of htmlFiles) {
    const html = await readFile(path.join(dist, htmlFile), "utf8");
    htmlContentByFile[htmlFile] = html;

    for (const ref of findRefs(html)) {
      const clean = ref.replace(/^\//, "");
      const target = path.join(dist, clean);
      assert(await exists(target), `${htmlFile} referencia arquivo inexistente: ${ref}`);
    }

    assert(!html.includes('action="#"'), `${htmlFile} contem formulario com action="#"`);
    assert(!html.includes('class="appointment-form__button" type="button"'), `${htmlFile} contem botao do formulario type="button"`);
    assert(!html.includes('href="#agendamento"'), `${htmlFile} ainda tem CTA direto para #agendamento`);
    assert(!/GTM-XXXX|G-XXXXXXXX|AW-XXXXXXXX|META_PIXEL|dominio-final/i.test(html), `${htmlFile} contem placeholder de tracking/dominio.`);
  }

  const index = await readMaybe(path.join(dist, "index.html"));
  const privacy = await readMaybe(path.join(dist, "politica-de-privacidade.html"));
  const htmlText = [index, privacy].join("\n");
  const robots = await readMaybe(path.join(dist, "robots.txt"));
  const sitemap = await readMaybe(path.join(dist, "sitemap.xml"));
  const htaccess = await readMaybe(path.join(dist, ".htaccess"));
  const report = await readJsonMaybe(path.join(reportsDir, "build-report.json"));
  const publicConfig = await readJsonMaybe(path.join(dist, "config", "site.config.json"));
  const jsCombined = (await Promise.all(jsFiles.map((file) => readFile(path.join(dist, file), "utf8")))).join("\n");
  const publicTextFiles = textFiles.filter((file) => !file.endsWith(".php"));
  const publicText = (await Promise.all(publicTextFiles.map((file) => readFile(path.join(dist, file), "utf8")))).join("\n");
  const allText = (await Promise.all(textFiles.map((file) => readFile(path.join(dist, file), "utf8")))).join("\n");
  const fontAuditFiles = textFiles.filter((file) => !file.endsWith(".svg"));
  const fontAuditText = (await Promise.all(fontAuditFiles.map((file) => readFile(path.join(dist, file), "utf8")))).join("\n");

  assert((index.match(/<h1\b/g) || []).length === 1, "index.html deve conter exatamente um H1.");
  assert(index.includes("https://wa.me/5543996036417"), "WhatsApp correto nao encontrado na home.");
  assert(privacy.includes("https://wa.me/5543996036417"), "WhatsApp correto nao encontrado na politica.");
  assert(index.includes("application/ld+json"), "Schema JSON-LD ausente na home.");
  assert(!index.includes("AggregateRating") && !index.includes('"Review"'), "Schema nao deve conter Review/AggregateRating sem validacao externa.");
  assert(robots.includes("Sitemap:"), "robots.txt sem Sitemap.");

  checkProductionUrls({ index, privacy, robots, sitemap, allText: publicText, publicConfig });
  await checkTrackingArchitecture({ htmlText, jsCombined, allText, publicConfig });
  checkHtaccess(htaccess);
  checkFonts({ htmlFiles, htmlContentByFile, allText: fontAuditText });
  checkLocalSeo({ index, publicConfig });
  await checkFavicons({ index, privacy, relativeFiles });
  checkSecretsAndPackage({ relativeFiles, allText });

  const cssCombined = (await Promise.all(cssFiles.map((file) => readFile(path.join(dist, file), "utf8")))).join("\n");
  const fontRefs = [...cssCombined.matchAll(/url\((?:'|")?([^'")]+\.woff2)(?:'|")?\)/g)];
  assert(fontRefs.length === 0, "Build final nao deve exigir fontes locais WOFF2; Tosh A e Area Normal vêm do Adobe Fonts.");

  for (const file of files) {
    const rel = toPosix(path.relative(dist, file));
    const size = (await stat(file)).size;

    if (/\.(?:png|jpe?g|webp|avif)$/i.test(rel) && size > 300 * 1024) {
      errors.push(`Imagem acima de 300KB em dist: ${rel} (${Math.round(size / 1024)}KB)`);
    }
  }

  const requiredConfigWarnings = [
    ["siteUrl", "SITE_URL pendente em config/site.config.json ou env."],
    ["canonicalHost", "CANONICAL_HOST pendente em config/site.config.json ou env."],
    ["googleBusinessUrl", "GOOGLE_BUSINESS_URL pendente."],
    ["googleMapsDirectionsUrl", "GOOGLE_MAPS_DIRECTIONS_URL pendente."],
    ["geo.latitude", "GEO_LATITUDE pendente."],
    ["geo.longitude", "GEO_LONGITUDE pendente."],
  ];

  requiredConfigWarnings.forEach(([key, message]) => {
    const value = key.split(".").reduce((acc, part) => acc && acc[part], publicConfig);
    warn(Boolean(value), message);
  });

  warnings.push(...(report.warnings || []));

  if (warnings.length) {
    console.warn("Warnings:");
    [...new Set(warnings)].forEach((message) => console.warn(`- ${message}`));
  }

  if (errors.length) {
    console.error("Falhas:");
    errors.forEach((message) => console.error(`- ${message}`));
    process.exit(1);
  }

  console.log("Verificacao concluida sem falhas bloqueantes.");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
