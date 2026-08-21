(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  root.classList.add("motion-ready");

  const hasGSAP = Boolean(gsap);
  const canUseScrollTrigger = hasGSAP && Boolean(ScrollTrigger);

  if (canUseScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({
      ignoreMobileResize: true,
      autoRefreshEvents: "visibilitychange,DOMContentLoaded,load",
    });
  }

  const setFaqExpanded = (item, expanded) => {
    const summary = item.querySelector("summary");

    if (summary) {
      summary.setAttribute("aria-expanded", expanded ? "true" : "false");
    }
  };

  const setupFaq = () => {
    document.querySelectorAll(".faq-item").forEach((item) => {
      const summary = item.querySelector("summary");
      const content = item.querySelector("p");

      if (!summary || !content) return;

      setFaqExpanded(item, item.open);

      if (!hasGSAP) return;

      item.classList.add("faq-item--animated");

      if (!item.open) {
        gsap.set(content, { height: 0, autoAlpha: 0, overflow: "hidden" });
      } else {
        gsap.set(content, { height: "auto", autoAlpha: 1, overflow: "hidden" });
      }

      summary.addEventListener("click", (event) => {
        event.preventDefault();

        const isOpen = item.open;
        const duration = reduceMotion.matches ? 0 : 0.34;

        if (item._faqTween) {
          item._faqTween.kill();
        }

        if (isOpen) {
          item.classList.add("is-closing");
          item.classList.remove("is-open");
          setFaqExpanded(item, false);

          item._faqTween = gsap.to(content, {
            height: 0,
            autoAlpha: 0,
            duration,
            ease: "power2.inOut",
            overwrite: true,
            onComplete: () => {
              item.open = false;
              item.classList.remove("is-closing");
            },
          });

          return;
        }

        item.open = true;
        item.classList.add("is-open");
        item.classList.remove("is-closing");
        setFaqExpanded(item, true);

        item._faqTween = gsap.fromTo(
          content,
          { height: 0, autoAlpha: 0 },
          {
            height: "auto",
            autoAlpha: 1,
            duration,
            ease: "power2.out",
            overwrite: true,
            onComplete: () => {
              gsap.set(content, { height: "auto" });
            },
          }
        );
      });
    });
  };

  setupFaq();

  if (!hasGSAP || reduceMotion.matches) {
    if (canUseScrollTrigger) {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    }

    document.querySelectorAll(".faq-item p").forEach((content) => {
      content.style.removeProperty("height");
      content.style.removeProperty("opacity");
      content.style.removeProperty("visibility");
      content.style.removeProperty("overflow");
    });

    return;
  }

  gsap.defaults({
    duration: 0.7,
    ease: "power3.out",
  });

  const q = gsap.utils.selector(document);

  const setupHeroIntro = () => {
    const panels = q(".home-hero__image-panel");
    const lines = q(".home-hero__line");
    const brand = q(".home-hero__brand");
    const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });

    timeline
      .from(panels, {
        autoAlpha: 0.9,
        scale: 1.018,
        duration: 0.82,
        stagger: 0.06,
        clearProps: "opacity,visibility,transform",
      })
      .from(
        lines,
        {
          autoAlpha: 0,
          y: 14,
          duration: 0.68,
          stagger: 0.07,
          clearProps: "opacity,visibility,transform",
        },
        0.12
      )
      .from(
        brand,
        {
          autoAlpha: 0,
          y: 10,
          duration: 0.58,
          clearProps: "opacity,visibility,transform",
        },
        0.34
      );
  };

  const setupScrollReveals = ({ y, imageY, duration, stagger, start }) => {
    const revealGroup = (trigger, targets, options = {}) => {
      const elements = q(targets);

      if (!elements.length || !canUseScrollTrigger) return null;

      const movement = options.image ? imageY : y;

      gsap.set(elements, {
        autoAlpha: 0,
        y: movement,
      });

      return gsap.to(elements, {
        autoAlpha: 1,
        y: 0,
        duration: options.duration || duration,
        stagger: options.stagger === false ? 0 : stagger,
        ease: options.ease || "power3.out",
        clearProps: "opacity,visibility,transform",
        scrollTrigger: {
          trigger,
          start,
          once: true,
          invalidateOnRefresh: true,
        },
      });
    };

    const animations = [
      revealGroup(".hero-section", ".hero-section__copy, .hero-section__gallery, .hero-section__cta"),
      revealGroup(".services-section", ".services-section__intro", { duration: duration * 0.9 }),
      revealGroup(".services-section__list", ".service-item", { stagger: stagger * 0.75 }),
      revealGroup(".clinic-section", ".clinic-section__intro-inner"),
      revealGroup(".clinic-section__gallery", ".clinic-section__gallery-row", { image: true }),
      revealGroup(".about-section", ".about-section__title"),
      revealGroup(".about-section__content", ".about-section__copy, .about-section__photo-panel"),
      revealGroup(".reviews-section", ".review-card", { stagger: stagger * 0.8 }),
      revealGroup(".location-section", ".location-section__map-frame, .location-section__info, .location-section__footer"),
      revealGroup(".appointment-section", ".appointment-section__card"),
      revealGroup(".faq-section", ".faq-section__header, .faq-section__list"),
    ].filter(Boolean);

    return () => {
      animations.forEach((animation) => {
        if (animation.scrollTrigger) {
          animation.scrollTrigger.kill();
        }

        animation.kill();
      });
    };
  };

  setupHeroIntro();

  if (canUseScrollTrigger) {
    const matchMedia = gsap.matchMedia();

    matchMedia.add("(min-width: 769px)", () =>
      setupScrollReveals({
        y: 18,
        imageY: 12,
        duration: 0.72,
        stagger: 0.08,
        start: "top 84%",
      })
    );

    matchMedia.add("(max-width: 768px)", () =>
      setupScrollReveals({
        y: 8,
        imageY: 6,
        duration: 0.5,
        stagger: 0.045,
        start: "top 88%",
      })
    );

    window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
  }
})();
