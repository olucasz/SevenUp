(() => {
  const form = document.querySelector(".appointment-form");

  if (!form) return;

  const submitButton = form.querySelector(".appointment-form__button");
  const status = form.querySelector(".appointment-form__status");
  const loadedAt = form.querySelector('[name="form_loaded_at"]');
  const initialButtonText = submitButton ? submitButton.textContent.trim() : "";

  const setStatus = (type, message) => {
    if (!status) return;

    status.textContent = message || "";
    status.dataset.state = type || "idle";
  };

  const setSubmitting = (submitting) => {
    if (!submitButton) return;

    submitButton.disabled = submitting;
    submitButton.setAttribute("aria-busy", submitting ? "true" : "false");
    submitButton.textContent = submitting ? "Enviando..." : initialButtonText;
  };

  const refreshHiddenFields = () => {
    if (loadedAt) {
      loadedAt.value = String(Date.now());
    }

    if (window.SevenUpLeadSource) {
      window.SevenUpLeadSource.fill(form);
    }
  };

  refreshHiddenFields();

  form.addEventListener("input", () => {
    if (window.SevenUpTracking) {
      window.SevenUpTracking.formStart(form);
    }
  }, { once: true });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      setStatus("error", "Revise os campos obrigatórios antes de enviar.");
      form.reportValidity();
      return;
    }

    setSubmitting(true);
    setStatus("loading", "Enviando sua solicitação...");

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      const result = await response.json().catch(() => ({
        ok: false,
        message: "Não foi possível interpretar a resposta do servidor.",
      }));

      if (!response.ok || !result.ok) {
        setStatus(response.status === 429 ? "rate-limit" : "error", result.message || "Não foi possível enviar agora.");
        return;
      }

      setStatus("success", result.message || "Recebemos sua solicitação. Entraremos em contato em breve.");
      form.reset();
      refreshHiddenFields();

      if (window.SevenUpTracking) {
        window.SevenUpTracking.generateLead();
      }
    } catch {
      setStatus("error", "Não foi possível enviar agora. Tente novamente em alguns minutos ou fale pelo WhatsApp.");
    } finally {
      setSubmitting(false);
    }
  });
})();
