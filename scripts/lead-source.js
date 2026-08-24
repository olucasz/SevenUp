(() => {
  const storageKey = "sevenup.leadSource";
  const allowedParams = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid"];
  const maxAgeMs = 1000 * 60 * 60 * 6;

  const limit = (value, max = 600) => String(value || "").slice(0, max);

  const collect = () => {
    const params = new URLSearchParams(window.location.search);
    const source = {};
    let hasCampaignParam = false;

    allowedParams.forEach((param) => {
      const value = params.get(param);

      if (value) {
        source[param] = limit(value, 180);
        hasCampaignParam = true;
      }
    });

    source.landing_url = limit(window.location.href, 600);
    source.referrer = limit(document.referrer, 600);
    source.created_at = Date.now();

    return hasCampaignParam || source.referrer ? source : null;
  };

  const read = () => {
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (!raw) return null;

      const value = JSON.parse(raw);
      if (!value || Date.now() - Number(value.created_at || 0) > maxAgeMs) {
        window.sessionStorage.removeItem(storageKey);
        return null;
      }

      return value;
    } catch {
      return null;
    }
  };

  const write = (source) => {
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(source));
    } catch {
      /* sessionStorage can be unavailable in restricted browser modes. */
    }
  };

  const captured = collect();

  if (captured) {
    write(captured);
  }

  const fill = (form) => {
    const source = read() || {
      landing_url: window.location.href,
      referrer: document.referrer,
    };

    [...allowedParams, "landing_url", "referrer"].forEach((field) => {
      const input = form.querySelector(`[name="${field}"]`);

      if (input) {
        input.value = limit(source[field] || "", field === "landing_url" || field === "referrer" ? 600 : 180);
      }
    });
  };

  window.SevenUpLeadSource = { fill };

  document.querySelectorAll("form.appointment-form").forEach(fill);
})();
