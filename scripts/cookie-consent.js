(() => {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  const storageKey = "sevenup.cookieConsent";
  const banner = document.querySelector(".cookie-consent");
  const buttons = banner ? banner.querySelectorAll("[data-consent-choice]") : [];
  const manageButtons = document.querySelectorAll("[data-cookie-preferences]");
  let configPromise = null;
  let gtmLoaded = false;
  let currentConfig = null;

  window.gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    functionality_storage: "granted",
    security_storage: "granted",
  });

  const defaultConsent = {
    necessary: true,
    analytics: false,
    marketing: false,
  };

  const readConsent = () => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? { ...defaultConsent, ...JSON.parse(raw) } : null;
    } catch {
      return null;
    }
  };

  const saveConsent = (consent) => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({
        ...consent,
        updated_at: new Date().toISOString(),
      }));
    } catch {
      /* Consent still applies for the current session if localStorage is unavailable. */
    }
  };

  const updateGoogleConsent = (consent) => {
    window.gtag("consent", "update", {
      analytics_storage: consent.analytics ? "granted" : "denied",
      ad_storage: consent.marketing ? "granted" : "denied",
      ad_user_data: consent.marketing ? "granted" : "denied",
      ad_personalization: consent.marketing ? "granted" : "denied",
    });
  };

  const pushConsentState = (consent, source) => {
    window.dataLayer.push({
      event: "consent_updated",
      analytics_consent: Boolean(consent.analytics),
      marketing_consent: Boolean(consent.marketing),
      consent_source: source,
    });
  };

  const loadConfig = () => {
    if (!configPromise) {
      configPromise = fetch("./config/site.config.json", { credentials: "same-origin" })
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null);
    }

    return configPromise;
  };

  const appendScript = (src, id) => {
    if (id && document.getElementById(id)) return;

    const script = document.createElement("script");
    script.async = true;
    script.src = src;

    if (id) {
      script.id = id;
    }

    document.head.appendChild(script);
  };

  const loadGtm = (gtmId) => {
    if (!gtmId || gtmLoaded || document.getElementById("sevenup-gtm")) return;

    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    appendScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`, "sevenup-gtm");
    gtmLoaded = true;
  };

  const applyConsent = (consent, persist = false, source = "runtime") => {
    updateGoogleConsent(consent);
    pushConsentState(consent, source);

    if (persist) {
      saveConsent(consent);
    }
  };

  const showBanner = () => {
    if (!banner) return;

    banner.hidden = false;
    requestAnimationFrame(() => banner.classList.add("is-visible"));
  };

  const hideBanner = () => {
    if (!banner) return;

    banner.classList.remove("is-visible");
    window.setTimeout(() => {
      banner.hidden = true;
    }, 180);
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const choice = button.getAttribute("data-consent-choice");
      const consent = choice === "all"
        ? { necessary: true, analytics: true, marketing: true }
        : { ...defaultConsent };

      applyConsent(consent, true, choice === "all" ? "accept_all" : "necessary_only");
      hideBanner();
    });
  });

  manageButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      showBanner();
    });
  });

  const init = async () => {
    currentConfig = await loadConfig();
    const tracking = currentConfig && currentConfig.tracking ? currentConfig.tracking : {};

    loadGtm(tracking.gtmId);

    const saved = readConsent();

    if (saved) {
      applyConsent(saved, false, "stored");
      return;
    }

    pushConsentState(defaultConsent, "default");
    showBanner();
  };

  init();
})();
