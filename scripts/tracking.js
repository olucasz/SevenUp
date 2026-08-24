(() => {
  window.dataLayer = window.dataLayer || [];

  const pagePath = () => window.location.pathname || "/";

  const push = (event, payload = {}) => {
    if (!event) return;

    window.dataLayer.push({
      event,
      page_path: pagePath(),
      ...payload,
    });
  };

  const formStarts = new WeakSet();

  window.SevenUpTracking = {
    push,
    formStart(form) {
      if (!form || formStarts.has(form)) return;

      formStarts.add(form);
      push("form_start");
    },
    generateLead() {
      push("generate_lead", { lead_method: "form" });
    },
  };

  document.addEventListener("click", (event) => {
    const tracked = event.target.closest("[data-track]");

    if (tracked) {
      const type = tracked.getAttribute("data-track");
      const location = tracked.getAttribute("data-cta-location");
      const treatment = tracked.getAttribute("data-treatment");
      const payload = { cta_location: location || "unknown" };

      if (treatment) {
        payload.treatment = treatment;
      }

      if (type === "whatsapp") {
        push("whatsapp_click", payload);
      }

      if (type === "maps") {
        push("maps_click", { cta_location: location || "location" });
      }

      if (type === "social") {
        push("social_click", { cta_location: location || "footer" });
      }

      return;
    }

    const link = event.target.closest("a[href]");

    if (!link) return;

    const href = link.getAttribute("href") || "";

    if (href.startsWith("tel:")) {
      push("phone_click");
    }

    if (href.startsWith("mailto:")) {
      push("email_click");
    }
  });

  document.addEventListener("toggle", (event) => {
    const item = event.target;

    if (item instanceof HTMLDetailsElement && item.open && item.classList.contains("faq-item")) {
      const items = Array.from(document.querySelectorAll(".faq-item"));
      push("faq_open", { faq_index: items.indexOf(item) + 1 });
    }
  }, true);

  const floating = document.querySelector("[data-floating-whatsapp]");

  if (floating) {
    const setVisibility = () => {
      floating.classList.toggle("is-visible", window.scrollY > window.innerHeight * 0.45);
    };

    setVisibility();
    window.addEventListener("scroll", setVisibility, { passive: true });
  }
})();
