/**
 * motion.js — sistema de animação da página do paciente (E-Club).
 *
 * Responsabilidades:
 *  - Revelar elementos [data-reveal] ao entrarem na viewport (IntersectionObserver).
 *  - Re-observar conteúdo injetado dinamicamente (listas do perfil) após o
 *    gate `body.is-patient-ready`.
 *  - Sombra/realce do header fixo ao rolar (.site-header.is-scrolled).
 *
 * Princípios:
 *  - Respeita `prefers-reduced-motion: reduce` (não anima nada).
 *  - Degradação graciosa: sem JS ou sem IntersectionObserver, o conteúdo
 *    aparece normalmente (o CSS só esconde quando <html> tem `.js-reveal`).
 *  - Sem dependências, vanilla, sem build.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** Revela imediatamente todos os alvos (fallback sem observer). */
  function revealAll() {
    var els = document.querySelectorAll("[data-reveal]");
    for (var i = 0; i < els.length; i++) {
      els[i].classList.add("is-revealed");
    }
  }

  /** Observa todos os [data-reveal] ainda não revelados. */
  function observeAll(observer) {
    var els = document.querySelectorAll("[data-reveal]:not(.is-revealed)");
    for (var i = 0; i < els.length; i++) {
      observer.observe(els[i]);
    }
  }

  function setupReveal() {
    // Reduced-motion: nada de esconder/animar — o conteúdo já está visível.
    if (reduceMotion) {
      root.classList.remove("js-reveal");
      return null;
    }

    if (!("IntersectionObserver" in window)) {
      revealAll();
      return null;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" }
    );

    observeAll(observer);
    return observer;
  }

  /** Header ganha sombra/realce após um pequeno scroll. */
  function setupHeaderScroll() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var ticking = false;

    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
    update();
  }

  function init() {
    // motion.js assumiu o controle: cancela o fallback de segurança do <head>.
    if (window.__ecRevealFallback) {
      window.clearTimeout(window.__ecRevealFallback);
    }

    var observer = setupReveal();
    setupHeaderScroll();

    // Conteúdo do paciente é injetado após o fetch; re-observa quando montar.
    if (observer && document.body) {
      var mo = new MutationObserver(function () {
        if (document.body.classList.contains("is-patient-ready")) {
          observeAll(observer);
        }
      });
      mo.observe(document.body, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
