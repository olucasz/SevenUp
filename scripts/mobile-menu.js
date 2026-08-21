(() => {
  const mobileQuery = window.matchMedia("(max-width: 768px)");
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".site-mobile-toggle");
  const menu = document.querySelector(".site-mobile-menu");
  const links = menu ? Array.from(menu.querySelectorAll("a")) : [];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!header || !toggle || !menu || !links.length) return;

  const setLinksTabbable = (isTabbable) => {
    links.forEach((link) => {
      if (isTabbable) {
        link.removeAttribute("tabindex");
        return;
      }

      link.setAttribute("tabindex", "-1");
    });
  };

  const getGsap = () => {
    const gsap = window.gsap;

    if (!gsap || reduceMotion.matches) return null;

    return gsap;
  };

  const animateOpen = () => {
    const gsap = getGsap();

    if (!gsap) return;

    gsap.killTweensOf([menu, links]);

    gsap.fromTo(
      menu,
      { autoAlpha: 0, y: -6 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.18,
        ease: "power2.out",
        overwrite: true,
        clearProps: "opacity,visibility,transform",
      }
    );

    gsap.fromTo(
      links,
      { autoAlpha: 0, y: -3 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.18,
        ease: "power2.out",
        stagger: 0.018,
        overwrite: true,
        clearProps: "opacity,visibility,transform",
      }
    );
  };

  const finishClose = () => {
    header.classList.remove("is-mobile-menu-open");
  };

  const animateClose = () => {
    const gsap = getGsap();

    if (!gsap) {
      finishClose();
      return;
    }

    gsap.killTweensOf([menu, links]);
    gsap.to(links, {
      autoAlpha: 0,
      y: -2,
      duration: 0.08,
      ease: "power1.out",
      overwrite: true,
    });

    gsap.to(menu, {
      autoAlpha: 0,
      y: -6,
      duration: 0.14,
      ease: "power2.inOut",
      overwrite: true,
      onComplete: () => {
        finishClose();
        gsap.set([menu, links], { clearProps: "opacity,visibility,transform" });
      },
    });
  };

  const setMenuState = (isOpen) => {
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    toggle.setAttribute("aria-label", isOpen ? "Fechar menu de navegação" : "Abrir menu de navegação");
    setLinksTabbable(isOpen && mobileQuery.matches);

    if (isOpen) {
      header.classList.add("is-mobile-menu-open");
      menu.setAttribute("aria-hidden", "false");
      animateOpen();
      return;
    }

    menu.setAttribute("aria-hidden", "true");
    animateClose();
  };

  const closeMenu = () => setMenuState(false);

  setLinksTabbable(false);

  toggle.addEventListener("click", () => {
    setMenuState(toggle.getAttribute("aria-expanded") !== "true");
  });

  links.forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      closeMenu();
      toggle.focus({ preventScroll: true });
    }
  });

  mobileQuery.addEventListener("change", closeMenu);

  window.addEventListener("resize", () => {
    if (!mobileQuery.matches) {
      closeMenu();
    }
  });
})();
