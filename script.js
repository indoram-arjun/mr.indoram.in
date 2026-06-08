const PortfolioApp = (() => {
  const CONFIG = Object.freeze({
    googleScriptUrl:
      "https://script.google.com/macros/s/AKfycbxBJY1XdydWYJhYqxeqQ9DIi7A45LbzZ9y_KqkWyCrIi5w_XmM32m8NW_VDve5j_qm-nw/exec",
    selectors: {
      header: "[data-header]",
      navToggle: "[data-nav-toggle]",
      navMenu: "[data-nav-menu]",
      navLinks: ".nav-link",
      revealItems: ".reveal",
      pageSections: "main section[id]",
      typingText: "[data-typing-text]",
      tiltCards: "[data-tilt-card]",
      contactForm: "#contact-form",
      disabledLinks: '[aria-disabled="true"]',
      submitButton: 'button[type="submit"]',
      formStatus: ".form-status"
    },
    classes: {
      menuOpen: "is-open",
      headerScrolled: "is-scrolled",
      visible: "is-visible",
      active: "active",
      typing: "is-typing",
      formStatus: "form-status",
      formError: "is-error"
    },
    animation: {
      revealThreshold: 0.14,
      activeSectionRootMargin: "-42% 0px -48% 0px",
      typingDelay: 260,
      typingSpeed: 28,
      tiltDepth: "translate3d(0, -8px, 70px)",
      tiltStrength: 12
    },
    analytics: {
      ipEndpoint: "https://api.ipify.org?format=json",
      ipTimeout: 3500
    },
    messages: {
      sending: "Sending...",
      send: "Send Message",
      contactSuccess: "Thanks! Your message has been saved to Google Sheet.",
      contactFailure: "Message could not be saved right now. Please try WhatsApp or email."
    },
    contactFields: ["name", "email", "mobile", "subject", "message"]
  });

  const state = {
    prefersReducedMotion: false,
    header: null,
    navToggle: null,
    navMenu: null,
    navLinks: [],
    contactForm: null
  };

  const query = (selector, scope = document) => scope.querySelector(selector);
  const queryAll = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const supportsObserver = () => "IntersectionObserver" in window;
  const supportsFetch = () => "fetch" in window;

  const init = () => {
    cacheDom();
    bindNavigation();
    bindHeaderScroll();
    setupRevealAnimations();
    setupActiveNavigation();
    setupTypingEffect();
    setupTiltCards();
    setupContactForm();
    setupDisabledLinks();
    trackVisitorOpen();
  };

  const cacheDom = () => {
    state.prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    state.header = query(CONFIG.selectors.header);
    state.navToggle = query(CONFIG.selectors.navToggle);
    state.navMenu = query(CONFIG.selectors.navMenu);
    state.navLinks = queryAll(CONFIG.selectors.navLinks);
    state.contactForm = query(CONFIG.selectors.contactForm);
  };

  const bindNavigation = () => {
    state.navToggle?.addEventListener("click", toggleMenu);
    state.navLinks.forEach((link) => link.addEventListener("click", closeMenu));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  };

  const closeMenu = () => {
    if (!state.navMenu || !state.navToggle) return;
    state.navMenu.classList.remove(CONFIG.classes.menuOpen);
    state.navToggle.classList.remove(CONFIG.classes.menuOpen);
    state.navToggle.setAttribute("aria-expanded", "false");
  };

  const toggleMenu = () => {
    if (!state.navMenu || !state.navToggle) return;
    const isOpen = state.navMenu.classList.toggle(CONFIG.classes.menuOpen);
    state.navToggle.classList.toggle(CONFIG.classes.menuOpen, isOpen);
    state.navToggle.setAttribute("aria-expanded", String(isOpen));
  };

  const bindHeaderScroll = () => {
    updateHeaderState();
    window.addEventListener("scroll", updateHeaderState, { passive: true });
  };

  const updateHeaderState = () => {
    state.header?.classList.toggle(CONFIG.classes.headerScrolled, window.scrollY > 20);
  };

  const setupRevealAnimations = () => {
    const revealItems = queryAll(CONFIG.selectors.revealItems);

    if (!supportsObserver() || state.prefersReducedMotion) {
      revealItems.forEach((element) => element.classList.add(CONFIG.classes.visible));
      return;
    }

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add(CONFIG.classes.visible);
          observer.unobserve(entry.target);
        });
      },
      { threshold: CONFIG.animation.revealThreshold }
    );

    revealItems.forEach((element) => revealObserver.observe(element));
  };

  const setupActiveNavigation = () => {
    const sections = queryAll(CONFIG.selectors.pageSections);
    if (!supportsObserver()) return;

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setActiveNavigationLink(entry.target.id);
        });
      },
      {
        rootMargin: CONFIG.animation.activeSectionRootMargin,
        threshold: 0
      }
    );

    sections.forEach((section) => sectionObserver.observe(section));
  };

  const setActiveNavigationLink = (sectionId) => {
    const activeLink = query(`.nav-link[href="#${sectionId}"]`);
    if (!activeLink) return;

    state.navLinks.forEach((link) => link.classList.remove(CONFIG.classes.active));
    activeLink.classList.add(CONFIG.classes.active);
  };

  const setupTypingEffect = () => {
    const subtitle = query(CONFIG.selectors.typingText);
    if (!subtitle || state.prefersReducedMotion) return;

    const text = subtitle.dataset.typingText || subtitle.textContent.trim();
    let index = 0;

    subtitle.textContent = "";
    subtitle.classList.add(CONFIG.classes.typing);

    const typeNextCharacter = () => {
      subtitle.textContent = text.slice(0, index);
      index += 1;

      if (index <= text.length) {
        window.setTimeout(typeNextCharacter, CONFIG.animation.typingSpeed);
        return;
      }

      subtitle.classList.remove(CONFIG.classes.typing);
    };

    window.setTimeout(typeNextCharacter, CONFIG.animation.typingDelay);
  };

  const setupTiltCards = () => {
    if (state.prefersReducedMotion) return;

    queryAll(CONFIG.selectors.tiltCards).forEach((card) => {
      card.addEventListener("pointermove", (event) => applyTilt(card, event));
      card.addEventListener("pointerleave", () => {
        card.style.transform = "";
      });
    });
  };

  const applyTilt = (card, event) => {
    const bounds = card.getBoundingClientRect();
    const pointerX = event.clientX - bounds.left;
    const pointerY = event.clientY - bounds.top;
    const rotateY = (pointerX / bounds.width - 0.5) * CONFIG.animation.tiltStrength;
    const rotateX = (0.5 - pointerY / bounds.height) * CONFIG.animation.tiltStrength;

    card.style.transform = `${CONFIG.animation.tiltDepth} rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const setupContactForm = () => {
    if (!state.contactForm) return;

    state.contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await handleContactSubmit(state.contactForm);
    });
  };

  const handleContactSubmit = async (form) => {
    const button = query(CONFIG.selectors.submitButton, form);
    setFormStatus(form, "");
    setSubmitState(button, true);

    try {
      await sendToGoogleSheet(getContactPayload(form));
      form.reset();
      setFormStatus(form, CONFIG.messages.contactSuccess);
    } catch (error) {
      setFormStatus(form, CONFIG.messages.contactFailure, true);
      console.error("Contact form submit failed:", error);
    } finally {
      setSubmitState(button, false);
    }
  };

  const getContactPayload = (form) => {
    const formData = new FormData(form);
    const payload = {
      action: "contact",
      pageUrl: window.location.href
    };

    CONFIG.contactFields.forEach((field) => {
      payload[field] = formData.get(field)?.toString().trim() || "";
    });

    return payload;
  };

  const setSubmitState = (button, isSending) => {
    if (!button) return;
    button.disabled = isSending;
    button.textContent = isSending ? CONFIG.messages.sending : CONFIG.messages.send;
  };

  const setFormStatus = (form, message, isError = false) => {
    query(CONFIG.selectors.formStatus, form)?.remove();
    if (!message) return;

    const status = document.createElement("p");
    status.className = `${CONFIG.classes.formStatus}${isError ? ` ${CONFIG.classes.formError}` : ""}`;
    status.setAttribute("role", "status");
    status.textContent = message;
    form.appendChild(status);
  };

  const setupDisabledLinks = () => {
    queryAll(CONFIG.selectors.disabledLinks).forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
      });
    });
  };

  const trackVisitorOpen = async () => {
    try {
      const visitor = await getVisitorInfo();

      await sendToGoogleSheet({
        action: "visit",
        ip: visitor.ip,
        device: visitor.device,
        browser: visitor.browser,
        os: visitor.os,
        pageUrl: window.location.href
      });
    } catch (error) {
      console.warn("Visitor tracking skipped:", error);
    }
  };

  const getVisitorInfo = async () => {
    const userAgent = navigator.userAgent || "";

    return {
      ip: await getPublicIp(),
      device: getDeviceType(userAgent),
      browser: getBrowser(userAgent),
      os: getOperatingSystem(userAgent)
    };
  };

  const getPublicIp = async () => {
    if (!supportsFetch()) return "";

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), CONFIG.analytics.ipTimeout);

    try {
      const response = await fetch(CONFIG.analytics.ipEndpoint, {
        signal: controller.signal,
        cache: "no-store"
      });
      const data = await response.json();
      return data.ip || "";
    } catch {
      return "";
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const getDeviceType = (userAgent) => {
    const width = window.innerWidth;
    const isMobile = /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Tablet|PlayBook|Silk/i.test(userAgent);
    const isAndroidTablet = width >= 700 && width <= 1024 && /Android/i.test(userAgent);

    if (isTablet || isAndroidTablet) return "Tablet";
    if (isMobile || width < 700) return "Mobile";
    return "Desktop";
  };

  const getBrowser = (userAgent) =>
    detectFromUserAgent(userAgent, [
      [/Edg\//i, "Microsoft Edge"],
      [/OPR\//i, "Opera"],
      [/SamsungBrowser/i, "Samsung Internet"],
      [/Chrome\//i, "Google Chrome", /Chromium/i],
      [/Firefox\//i, "Mozilla Firefox"],
      [/Safari\//i, "Safari", null, /Version\//i]
    ]);

  const getOperatingSystem = (userAgent) =>
    detectFromUserAgent(userAgent, [
      [/Windows NT/i, "Windows"],
      [/Android/i, "Android"],
      [/iPhone|iPad|iPod/i, "iOS"],
      [/Mac OS X/i, "macOS"],
      [/Linux/i, "Linux"]
    ]);

  const detectFromUserAgent = (userAgent, rules) => {
    const match = rules.find(([pattern, , exclude, require]) => {
      const matchesPattern = pattern.test(userAgent);
      const passesExclude = !exclude || !exclude.test(userAgent);
      const passesRequire = !require || require.test(userAgent);
      return matchesPattern && passesExclude && passesRequire;
    });

    return match?.[1] || "Unknown";
  };

  const sendToGoogleSheet = async (payload) => {
    const body = new URLSearchParams();

    Object.entries(payload).forEach(([key, value]) => {
      body.append(key, value ?? "");
    });

    await fetch(CONFIG.googleScriptUrl, {
      method: "POST",
      mode: "no-cors",
      body,
      keepalive: true
    });
  };

  return { init };
})();

document.addEventListener("DOMContentLoaded", PortfolioApp.init);
