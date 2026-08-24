# Produção SevenUp

## Configuração oficial

```text
SITE_URL=https://clinicasevenup.com.br
CANONICAL_HOST=clinicasevenup.com.br
GTM_ID=GTM-T9JQHD3M
```

O host canônico é sem `www`. O `.htaccess` gerado redireciona HTTP para HTTPS, `www` para non-www e `/index.html` para `/`.

## Antes do upload

1. Fazer backup do site temporário atual na Hostinger.
2. Confirmar que o kit Adobe Fonts `sog3usj` continua ativo para o domínio oficial.
3. Gerar build final:

```bash
BUILD_MODE=production npm run build
npm run verify-production
```

4. Conferir `dist/` antes do upload.

## Upload Hostinger

Subir o conteúdo de `dist/` para:

```text
public_html/
```

Garantir que arquivos ocultos também sejam enviados:

```text
public_html/.htaccess
public_html/.well-known/security.txt
```

Não subir `.env`, `.git`, `.agents`, `.codex`, `node_modules` ou arquivos locais fora do `dist`.

## SMTP

O formulário envia para:

```text
clinicasevenup@gmail.com
```

Conta remetente SMTP:

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=tls
SMTP_USER=sitesevenup@gmail.com
SMTP_FROM=sitesevenup@gmail.com
SMTP_FROM_NAME=Clínica SevenUp
SMTP_TO=clinicasevenup@gmail.com
```

O runtime atual usa PHPMailer `6.9.3`. Requisito recomendado no servidor: PHP 8+ com SMTP/TLS ativo.

### Config local no servidor

Na Hostinger, criar manualmente:

```text
public_html/api/config.local.php
```

Use `api/config.local.php.example` como base e preencha somente no servidor:

```text
SMTP_PASS = App Password do Google
```

Para Gmail, usar uma App Password criada na conta `sitesevenup@gmail.com`. Não usar a senha principal da conta e não colocar `SMTP_PASS` em Git, README, `.env.example`, JavaScript, JSON ou `dist` gerado automaticamente.

`api/config.local.php` real está no `.gitignore`, não é copiado pelo build e é bloqueado pelo `.htaccess`.

## Tracking e Consentimento

A arquitetura é GTM-first:

```text
Site -> dataLayer -> GTM-T9JQHD3M -> GA4 / Google Ads / Meta
```

O frontend não carrega `gtag.js`, Google Ads direto ou Meta Pixel direto. GA4, conversões do Google Ads e Meta devem ser configurados dentro do GTM, seguindo `README-GTM.md`.

Eventos enviados sem PII:

```text
whatsapp_click
form_start
generate_lead
maps_click
email_click
social_click
faq_open
```

`generate_lead` dispara somente após sucesso confirmado do backend.

## Fontes

Tosh A e Area Normal Light são carregadas pelo mesmo kit Adobe Fonts:

```html
<link rel="stylesheet" href="https://use.typekit.net/sog3usj.css">
```

CSS oficial:

```css
font-family: "tosh-a", sans-serif;
font-family: "area-normal-light", sans-serif;
font-style: normal;
```

Não há declaração local de fonte nem dependência de arquivos WOFF2 no pacote final.

## Google Maps e Local SEO

Dados oficiais centralizados em `config/site.config.json`:

```text
googleBusinessUrl=https://share.google/wDuGoTZ5oIP1zpH73
geo.latitude=-23.2928033
geo.longitude=-50.0730897
```

O Schema `LocalBusiness` usa `hasMap` com a URL do Google Business e inclui `geo`. A URL de direções é usada apenas no CTA `Ver rota`, não em `sameAs`.

## Segurança

O `.htaccess` gerado inclui:

- HTTPS obrigatório;
- canonical host `clinicasevenup.com.br`;
- remoção de `/index.html`;
- HSTS `max-age=31536000`, sem `includeSubDomains` e sem `preload`;
- bloqueio de `.env` e `config.local.php`;
- headers básicos de segurança e cache.

CSP ainda não está sendo aplicada em modo enforce. Se for necessário, começar com `Content-Security-Policy-Report-Only` em homologação e liberar explicitamente Adobe Fonts, GTM, Google Maps e demais terceiros reais.

## Depois do upload

Testar:

```text
https://clinicasevenup.com.br/
https://clinicasevenup.com.br/robots.txt
https://clinicasevenup.com.br/sitemap.xml
https://clinicasevenup.com.br/llms.txt
https://clinicasevenup.com.br/politica-de-privacidade.html
https://clinicasevenup.com.br/URL-INEXISTENTE
```

Também validar:

- formulário real com SMTP;
- WhatsApp;
- GTM Preview e Consent Mode;
- `dataLayer` sem PII;
- favicon e manifest;
- Rich Results Test para Schema;
- sitemap no Google Search Console e Bing Webmaster Tools.

## Pendências externas

- App Password do Google para `sitesevenup@gmail.com`.
- Teste real de SMTP na Hostinger.
- Tags internas no GTM para GA4, Google Ads e Meta.
- Validação formal dos depoimentos antes de qualquer Schema de reviews.
