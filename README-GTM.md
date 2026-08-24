# GTM SevenUp

Container oficial:

```text
GTM-T9JQHD3M
```

## Arquitetura

O site usa uma arquitetura GTM-first:

```text
Site -> dataLayer -> GTM-T9JQHD3M -> GA4 / Google Ads / Meta
```

O frontend nao carrega `gtag.js`, Google Ads direto ou Meta Pixel direto. O codigo do site apenas envia eventos para `window.dataLayer`.

## Consent Mode

Na primeira visita, antes de carregar o GTM, o site envia o default:

```js
gtag("consent", "default", {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  functionality_storage: "granted",
  security_storage: "granted"
});
```

Quando o visitante aceita todos os cookies:

```text
analytics_storage = granted
ad_storage = granted
ad_user_data = granted
ad_personalization = granted
```

Quando escolhe somente necessarios ou revoga a decisao:

```text
analytics_storage = denied
ad_storage = denied
ad_user_data = denied
ad_personalization = denied
```

O site tambem envia `consent_updated` para debug no GTM:

```text
event: consent_updated
analytics_consent: true | false
marketing_consent: true | false
consent_source: default | stored | accept_all | necessary_only
```

## Eventos enviados pelo site

Todos os eventos abaixo sao enviados sem PII:

```text
whatsapp_click
form_start
generate_lead
maps_click
email_click
social_click
faq_open
```

Parametros previstos:

```text
page_path
cta_location
treatment
lead_method
faq_index
```

Nao enviar ao GA4, Ads ou Meta:

```text
nome
telefone digitado
email digitado
mensagem digitada
qualquer campo livre do formulario
```

## GA4 no GTM

1. Criar uma tag Google Tag ou GA4 Configuration no container `GTM-T9JQHD3M`.
2. Informar o Measurement ID real do GA4 no painel do GTM.
3. Usar consentimento exigido: `analytics_storage`.
4. Criar tags GA4 Event para:
   - `whatsapp_click`
   - `form_start`
   - `generate_lead`
   - `maps_click`
   - `email_click`
   - `social_click`
   - `faq_open`
5. Usar triggers Custom Event com o mesmo nome do evento.

## Google Ads no GTM

1. Configurar a tag de Google Ads Conversion Tracking dentro do GTM.
2. Usar consentimentos exigidos:
   - `ad_storage`
   - `ad_user_data`
   - `ad_personalization`
3. Criar conversoes separadas para:
   - `generate_lead`: lead confirmado pelo formulario.
   - `whatsapp_click`: clique em CTA de WhatsApp.
4. Usar os Conversion ID/Labels reais somente no painel do GTM.

## Meta Pixel no GTM

Meta deve ser configurado pelo GTM, nao no frontend.

Sugestao de mapeamento:

```text
PageView -> tag base Meta, respeitando consentimento de marketing
Lead -> generate_lead
Contact -> whatsapp_click
```

Use um template confiavel do Community Template Gallery ou uma Custom HTML tag revisada. A tag deve disparar somente quando marketing estiver permitido.

## Debug

Checklist no Preview do GTM:

1. Abrir a home em janela anonima.
2. Confirmar `consent default` como denied antes do `gtm.js`.
3. Confirmar apenas um container `GTM-T9JQHD3M`.
4. Clicar em "Aceitar todos" e verificar consent update para granted.
5. Reabrir preferencias, escolher somente necessarios e verificar update para denied sem reload.
6. Testar os eventos:
   - CTA WhatsApp
   - inicio do formulario
   - envio do formulario com sucesso real ou ambiente de homologacao
   - mapa
   - email
   - social
   - FAQ
7. Conferir que `dataLayer`, GA4 DebugView e Meta Test Events nao recebem PII.

## Observacao

Os campos legados `ga4Id`, `googleAdsId`, `googleAdsFormConversionLabel`, `googleAdsWhatsappConversionLabel` e `metaPixelId` podem existir em `config/site.config.json` por compatibilidade/documentacao, mas o frontend nao usa esses IDs para carregar tags diretas quando `gtmId` esta configurado.
