(function () {
  const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short"
  });

  const fullDateFormatter = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short"
  });

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, " ");
  }

  function slugify(value) {
    return normalizeKey(value)
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "paciente";
  }

  function titleCaseName(value) {
    return String(value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }

  function getFirstName(value) {
    const cleaned = String(value || "").trim();
    if (!cleaned) return "Paciente";
    return titleCaseName(cleaned).split(" ")[0];
  }

  function getInitials(value) {
    const parts = String(value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!parts.length) return "EC";

    return parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }

  function buildAccessCode(value) {
    const cleaned = normalizeKey(value).replace(/[^a-z0-9]/g, "");
    if (!cleaned) return "ecl-000";
    const prefix = (cleaned.slice(0, 3) || "ecl").toUpperCase();
    const suffix = String(cleaned.length).padStart(3, "0");
    return `${prefix}-${suffix}`.toLowerCase();
  }

  function normalizeStatus(value) {
    return value === "Acesso individual ativo" ? "Online" : value;
  }

  function ensureArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function ensureObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function addDays(baseDate, days) {
    const next = new Date(baseDate);
    next.setDate(next.getDate() + days);
    return next;
  }

  function formatShortDate(date) {
    const value = shortDateFormatter.format(date).replace(/\./g, "");
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function formatFullDate(date) {
    const value = fullDateFormatter.format(date).replace(/\./g, "");
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function createDefaultProfile(fullName, { demo = false } = {}) {
    const name = titleCaseName(fullName) || "Paciente";
    const firstName = getFirstName(name);
    const now = new Date();
    const nextReview = addDays(now, 7);
    const nextFollowUp = addDays(now, 21);
    const lastVisit = addDays(now, -8);

    return {
      name,
      initials: getInitials(name),
      greeting: `Bem-vindo à E-Club, ${name}`,
      status: "Online",
      code: demo ? "DEMO" : buildAccessCode(name),
      subtitle: "Página individual da paciente",
      access: "Link público da paciente",
      nextSession: demo ? "Seg., 12 mai · 14:30" : `Próxima consulta com ${firstName}`,
      lastReview: demo ? "03 mai" : formatShortDate(lastVisit),
      focus: "Agenda, revisões e orientações da paciente.",
      appointments: demo
        ? [
            {
              date: "12 mai",
              time: "14:30",
              title: "Retorno clínico",
              detail: "Revisão da última evolução e alinhamento do próximo passo.",
              status: "Confirmada"
            },
            {
              date: "29 mai",
              time: "10:00",
              title: "Acompanhamento",
              detail: "Leitura do ciclo atual e registro da resposta.",
              status: "Programada"
            }
          ]
        : [],
      visits: demo
        ? [
            {
              date: "03 mai",
              title: "Última visita",
              detail: "Consulta de retorno com leitura da evolução.",
              status: "Registrada"
            },
            {
              date: "11 abr",
              title: "Visita anterior",
              detail: "Avaliação inicial e alinhamento do plano.",
              status: "Registrada"
            }
          ]
        : [],
      procedures: demo
        ? [
            {
              date: "03 mai",
              title: "Revisão facial",
              detail: "Checagem do que mudou e do que deve ser mantido.",
              status: "Concluído"
            }
          ]
        : [],
      notes: demo
        ? [
            "Use o nome completo ou o código do QR para abrir a ficha.",
            "As visitas aparecem em ordem prática para leitura rápida no celular.",
            "Dados sensíveis devem continuar protegidos por autenticação no backend."
          ]
        : [
            "As informações da paciente aparecem aqui depois que o cadastro é salvo.",
            "O link público pode ser copiado no painel da Dra. Emlyn.",
            "O conteúdo fica totalmente em português."
          ],
      contact: [
        { label: "Canal", value: "WhatsApp oficial da clínica" },
        { label: "Cidade", value: "Itajaí - SC" },
        { label: "Suporte", value: "Equipe do E-Club" }
      ],
      links: []
    };
  }

  function normalizeProfile(profile, fullName) {
    const source = ensureObject(profile);
    const name = titleCaseName(source.name || fullName || "Paciente");
    const base = createDefaultProfile(name);

    return {
      ...base,
      ...source,
      name,
      initials: source.initials || base.initials,
      greeting: source.greeting || `Bem-vindo à E-Club, ${name}`,
      status: normalizeStatus(source.status || base.status),
      code: source.code || base.code,
      subtitle: source.subtitle || base.subtitle,
      access: source.access || base.access,
      nextSession: source.nextSession || base.nextSession,
      lastReview: source.lastReview || base.lastReview,
      focus: source.focus || base.focus,
      appointments: ensureArray(source.appointments),
      visits: ensureArray(source.visits),
      procedures: ensureArray(source.procedures),
      notes: ensureArray(source.notes),
      contact: ensureArray(source.contact),
      links: ensureArray(source.links)
    };
  }

  function createNotFoundProfile(rawValue) {
    const searched = titleCaseName(rawValue) || "registro informado";
    const base = createDefaultProfile(searched);
    return {
      ...base,
      name: "Registro não encontrado",
      initials: "SN",
      greeting: "Registro não encontrado",
      status: "Registro não encontrado",
      code: "",
      subtitle: `Busca por ${searched}`,
      access: "Confira o nome ou o código",
      nextSession: "Sem agenda",
      lastReview: "Sem histórico",
      focus: "Não encontramos uma página correspondente para essa busca.",
      appointments: [],
      visits: [],
      procedures: [],
      notes: [
        "Confirme se o nome foi digitado como ele foi cadastrado.",
        "Se você recebeu um link, revise se a última parte está completa.",
        "Se a página existir, ela precisa estar publicada no banco conectado."
      ],
      contact: base.contact,
      links: []
    };
  }

  function createArchivedProfile(profile) {
    const current = normalizeProfile(profile, profile?.name || profile?.full_name);
    return {
      ...current,
      status: "Página arquivada",
      focus: "Este acesso foi arquivado pela clínica, mas continua disponível para edição."
    };
  }

  function renderList(root, selector, items, renderer, emptyText) {
    const scope = root?.querySelectorAll ? root : document;
    const containers = Array.from(scope.querySelectorAll(selector));
    if (!containers.length) return;

    const safeItems = ensureArray(items);

    if (!safeItems.length) {
      containers.forEach((container) => {
        const isList = ["UL", "OL"].includes(container.tagName);
        const emptyTag = isList ? "li" : "div";
        const markup = `<${emptyTag} class="record record--empty"><div class="record__body"><p class="record__title">${escapeHtml(emptyText || "Sem registros")}</p></div></${emptyTag}>`;
        container.innerHTML = markup;
      });
      return;
    }

    const markup = safeItems.map(renderer).join("");
    containers.forEach((container) => {
      container.innerHTML = markup;
    });
  }

  function renderPatientProfile(root, profile, options = {}) {
    const scope = root || document;
    const data = normalizeProfile(profile, profile?.name || profile?.full_name);
    const query = (selector) => (scope.querySelector ? scope.querySelector(selector) : document.querySelector(selector));

    const nameEl = query("[data-profile-name]");
    const greetingEl = query("[data-profile-greeting]");
    const initialsEl = query("[data-profile-initials]");
    const subtitleEl = query("[data-profile-fullname]");
    const accessEl = query("[data-profile-access]");
    const nextEl = query("[data-profile-next]");
    const reviewEl = query("[data-profile-review]");
    const focusEl = query("[data-profile-focus]");
    const statusEls = scope.querySelectorAll ? Array.from(scope.querySelectorAll("[data-profile-status]")) : [];
    const bannerEl = query("[data-profile-banner]");
    const appointmentsEl = query("[data-profile-appointments]");
    const historyEl = query("[data-profile-history]");
    const proceduresEl = query("[data-profile-procedures]");
    const chipEl = query("[data-access-chip]");
    const appointmentCountEls = scope.querySelectorAll ? Array.from(scope.querySelectorAll("[data-profile-appointments-count]")) : [];
    const visitCountEls = scope.querySelectorAll ? Array.from(scope.querySelectorAll("[data-profile-visits-count]")) : [];

    if (nameEl) nameEl.textContent = data.name;
    if (greetingEl) greetingEl.textContent = data.greeting || `Bem-vindo à E-Club, ${data.name}`;
    if (initialsEl) initialsEl.textContent = data.initials || getInitials(data.name);
    if (subtitleEl) subtitleEl.textContent = data.subtitle || data.name;
    if (accessEl) accessEl.textContent = data.code || data.access || "";
    if (nextEl) nextEl.textContent = data.nextSession || "";
    if (reviewEl) reviewEl.textContent = data.lastReview || "";
    if (focusEl) focusEl.textContent = data.focus || "";
    statusEls.forEach((element) => {
      element.textContent = data.status || "";
    });
    if (chipEl) chipEl.textContent = data.status || "Acesso individual";
    appointmentCountEls.forEach((element) => {
      element.textContent = `${data.appointments.length} ${data.appointments.length === 1 ? "consulta" : "consultas"}`;
    });
    visitCountEls.forEach((element) => {
      element.textContent = `${data.visits.length} ${data.visits.length === 1 ? "visita" : "visitas"}`;
    });

    if (bannerEl) {
      if (data.is_archived || options.archived) {
        bannerEl.classList.remove("hidden");
        bannerEl.textContent = "Página arquivada pela clínica";
      } else {
        bannerEl.classList.add("hidden");
      }
    }

    if (scope === document) {
      document.title = `${data.name || "E-Club"} | E-Club`;
    }

    renderList(
      scope,
      "[data-profile-appointments]",
      data.appointments,
      (item) => `
        <li class="record">
          <div class="record__meta">
            <span class="record__date">${escapeHtml(item.date)}</span>
            <span class="record__time">${escapeHtml(item.time)}</span>
          </div>
          <div class="record__body">
            <p class="record__title">${escapeHtml(item.title)}</p>
            <p class="record__text">${escapeHtml(item.detail)}</p>
          </div>
          <span class="record__tag">${escapeHtml(item.status)}</span>
        </li>`,
      "Nenhuma consulta cadastrada"
    );

    renderList(
      scope,
      "[data-profile-history]",
      data.visits,
      (item) => `
        <li class="record">
          <div class="record__meta">
            <span class="record__date">${escapeHtml(item.date)}</span>
          </div>
          <div class="record__body">
            <p class="record__title">${escapeHtml(item.title)}</p>
            <p class="record__text">${escapeHtml(item.detail)}</p>
          </div>
          <span class="record__tag">${escapeHtml(item.status)}</span>
        </li>`,
      "Nenhum histórico cadastrado"
    );

    renderList(
      scope,
      "[data-profile-procedures]",
      data.procedures,
      (item) => `
        <li class="record">
          <div class="record__meta">
            <span class="record__date">${escapeHtml(item.date)}</span>
          </div>
          <div class="record__body">
            <p class="record__title">${escapeHtml(item.title)}</p>
            <p class="record__text">${escapeHtml(item.detail)}</p>
          </div>
          <span class="record__tag">${escapeHtml(item.status)}</span>
        </li>`,
      "Nenhum procedimento cadastrado"
    );

    renderList(
      scope,
      "[data-profile-notes]",
      data.notes,
      (item) => `<li class="note-list__item">${escapeHtml(item)}</li>`,
      "Sem observações cadastradas"
    );

    return data;
  }

  function buildPublicLink(slug) {
    return new URL(`/paciente/${slugify(slug)}`, window.location.origin).toString();
  }

  function copyText(value) {
    return navigator.clipboard.writeText(String(value || ""));
  }

  const BONUS_STORAGE_PREFIX = "eclub:bonus:v1";
  const BONUS_DAY_MS = 24 * 60 * 60 * 1000;
  let bonusPatientContext = null;
  const bonusPopupHydrators = new Set();

  function getBonusStorage() {
    try {
      const key = "__emlyn_bonus_storage_test__";
      window.localStorage.setItem(key, "1");
      window.localStorage.removeItem(key);
      return window.localStorage;
    } catch {
      return null;
    }
  }

  function normalizeBonusKeyPart(value) {
    return slugify(value || "visitante");
  }

  function readBonusLookupFromLocation() {
    const params = new URLSearchParams(window.location.search);
    const paramValue = params.get("slug") || params.get("key") || params.get("id") || params.get("paciente");
    if (paramValue) return paramValue;

    const pathParts = window.location.pathname.split("/").filter(Boolean);
    if (!pathParts.length) return "visitante";
    if (["p", "paciente", "pacientes", "assinatura"].includes(pathParts[0])) {
      return pathParts[1] || pathParts[0];
    }
    return pathParts[pathParts.length - 1] || "visitante";
  }

  function resolveBonusPersonKey(context = {}) {
    return normalizeBonusKeyPart(
      context.personKey ||
        context.patient?.id ||
        context.patient?.slug ||
        context.profile?.id ||
        context.profile?.slug ||
        context.profile?.code ||
        context.lookupKey ||
        readBonusLookupFromLocation()
    );
  }

  function getBonusStorageKey(coupon, personKey) {
    return `${BONUS_STORAGE_PREFIX}:${normalizeBonusKeyPart(coupon)}:${resolveBonusPersonKey({ personKey })}`;
  }

  function readBonusState(storage, storageKey) {
    if (!storage || !storageKey) return {};
    try {
      const value = storage.getItem(storageKey);
      return value ? JSON.parse(value) : {};
    } catch {
      return {};
    }
  }

  function writeBonusState(storage, storageKey, state) {
    if (!storage || !storageKey) return state;
    try {
      storage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // localStorage can be unavailable or full; the popup still works for the current view.
    }
    return state;
  }

  function parseBonusTimestamp(value) {
    const time = Date.parse(value || "");
    return Number.isFinite(time) ? time : 0;
  }

  function formatBonusCountdown(expiresAt, now = Date.now()) {
    const expiresTime = parseBonusTimestamp(expiresAt);
    if (!expiresTime || expiresTime <= now) return "O prazo deste cupom terminou";

    const remaining = expiresTime - now;
    const days = Math.floor(remaining / BONUS_DAY_MS);
    const hours = Math.floor((remaining % BONUS_DAY_MS) / (60 * 60 * 1000));

    if (days > 0) {
      return `Expira em ${days} ${days === 1 ? "dia" : "dias"} e ${hours} ${hours === 1 ? "hora" : "horas"}`;
    }

    return hours > 0 ? `Expira em ${hours} ${hours === 1 ? "hora" : "horas"}` : "Expira em menos de 1 hora";
  }

  function renderBonusCard(card, state, coupon) {
    if (!card) return;

    const title = card.querySelector("[data-bonus-card-title]");
    const status = card.querySelector("[data-bonus-card-status]");
    const description = card.querySelector("[data-bonus-card-description]");
    const code = card.querySelector("[data-bonus-card-code]");
    const countdown = card.querySelector("[data-bonus-countdown]");
    const button = card.querySelector("[data-bonus-copy-persistent]");
    const expiresTime = parseBonusTimestamp(state?.expiresAt);
    const isClaimed = Boolean(state?.claimedAt && expiresTime);
    const isExpired = isClaimed && expiresTime <= Date.now();

    if (!isClaimed) {
      card.classList.add("hidden");
      card.dataset.bonusState = "inactive";
      return;
    }

    card.classList.remove("hidden");
    card.dataset.bonusState = isExpired ? "expired" : "active";
    if (status) status.textContent = isExpired ? "Cupom encerrado" : "Cupom ativo";
    if (title) title.textContent = isExpired ? "O prazo deste cupom terminou" : "R$ 200 disponíveis no E-Club";
    if (description) {
      description.textContent = isExpired
        ? "Fale com a clínica para verificar as condições disponíveis no momento."
        : `Use o código ${coupon} no agendamento do próximo cuidado elegível.`;
    }
    if (code) code.textContent = coupon;
    if (countdown) countdown.textContent = formatBonusCountdown(state.expiresAt);
    if (button) {
      button.disabled = isExpired;
      button.textContent = isExpired ? "Cupom expirado" : "Copiar cupom";
    }
  }

  function setupBonusPersistentCards(context = {}) {
    const cards = Array.from(document.querySelectorAll("[data-bonus-persistent]"));
    if (!cards.length) return;

    const coupon = context.coupon || document.querySelector("[data-bonus-popup]")?.dataset.bonusCoupon || "EMLYN200";
    const personKey = resolveBonusPersonKey(context);
    const storage = getBonusStorage();
    const storageKey = getBonusStorageKey(coupon, personKey);

    cards.forEach((card) => {
      const render = () => renderBonusCard(card, readBonusState(storage, storageKey), coupon);
      const copyButton = card.querySelector("[data-bonus-copy-persistent]");

      if (card._bonusCountdownTimer) {
        window.clearInterval(card._bonusCountdownTimer);
      }

      card.dataset.bonusStorageKey = storageKey;
      card._bonusCountdownTimer = window.setInterval(render, 60 * 1000);
      render();

      if (copyButton && copyButton.dataset.bonusCopyReady !== "true") {
        copyButton.dataset.bonusCopyReady = "true";
        copyButton.addEventListener("click", async () => {
          const originalText = copyButton.textContent;
          try {
            if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
            await navigator.clipboard.writeText(coupon);
            copyButton.textContent = "Cupom copiado";
          } catch {
            copyButton.textContent = coupon;
          }
          window.setTimeout(() => {
            copyButton.textContent = originalText || "Copiar cupom";
          }, 1600);
        });
      }
    });
  }

  function setupBonusForPatient(context = {}) {
    bonusPatientContext = {
      ...context,
      personKey: resolveBonusPersonKey(context)
    };
    setupBonusPersistentCards(bonusPatientContext);
    bonusPopupHydrators.forEach((hydrate) => hydrate(bonusPatientContext));
  }

  function setupBonusPopups() {
    document.querySelectorAll("[data-bonus-popup]").forEach((popup) => setupBonusPopup(popup));
  }

  function setupBonusPopup(popup) {
    if (!popup || popup.dataset.bonusReady === "true") return;

    const dialog = popup.querySelector(".bonus-popup__dialog");
    const closeButton = popup.querySelector("[data-bonus-close]");
    const redeemButton = popup.querySelector("[data-bonus-redeem]");
    const copyButton = popup.querySelector("[data-bonus-copy]");
    const toast = popup.querySelector("[data-bonus-toast]");

    if (!dialog) return;

    popup.dataset.bonusReady = "true";

    const coupon = popup.dataset.bonusCoupon || "EMLYN200";
    const openDelay = Number.parseInt(popup.dataset.bonusOpenDelay || "", 10);
    const validDays = Number.parseInt(popup.dataset.bonusValidDays || "", 10) || 60;
    const delay = Number.isFinite(openDelay) ? openDelay : 3000;
    const storage = getBonusStorage();
    const requiresPatientContext = document.body?.dataset.page === "patient";

    let previousBodyOverflow = "";
    let toastTimer = null;
    let previouslyFocused = null;
    let autoOpenTimer = null;
    let currentPersonKey = "";
    let storageKey = "";
    let state = {};
    let hasBonusContext = false;

    // Popup estático: o benefício já nasce revelado, sem etapa de raspagem.
    dialog.classList.add("is-revealed");
    if (redeemButton) redeemButton.disabled = false;

    function readCurrentBonusState() {
      state = storage ? readBonusState(storage, storageKey) : state;
      return state || {};
    }

    function saveBonusState(patch) {
      if (!storageKey) return state;

      const now = new Date().toISOString();
      state = {
        ...readCurrentBonusState(),
        version: 1,
        coupon,
        personKey: currentPersonKey || resolveBonusPersonKey({}),
        updatedAt: now,
        ...patch
      };
      return writeBonusState(storage, storageKey, state);
    }

    function markPopupSeen(reason) {
      if (!storageKey) return;
      const current = readCurrentBonusState();
      const now = new Date().toISOString();
      const patch = {
        lastPopupAction: reason,
        lastSeenAt: now
      };

      if (!current.popupSeenAt) {
        patch.popupSeenAt = now;
        patch.status = current.claimedAt ? "claimed" : "seen";
      }

      saveBonusState(patch);
    }

    function shouldAutoOpen() {
      if (!requiresPatientContext || !hasBonusContext) return false;
      const current = readCurrentBonusState();
      return !current.popupSeenAt && !current.claimedAt && current.status !== "seen" && current.status !== "claimed";
    }

    function scheduleAutoOpen() {
      if (autoOpenTimer || !shouldAutoOpen()) return;
      autoOpenTimer = window.setTimeout(() => {
        autoOpenTimer = null;
        if (shouldAutoOpen()) openPopup();
      }, delay);
    }

    function hydrateBonusContext(context = {}) {
      currentPersonKey = resolveBonusPersonKey(context);
      storageKey = getBonusStorageKey(coupon, currentPersonKey);
      hasBonusContext = true;
      state = readCurrentBonusState();
      setupBonusPersistentCards({
        ...context,
        coupon,
        personKey: currentPersonKey
      });
      scheduleAutoOpen();
    }

    function openPopup() {
      if (requiresPatientContext && !hasBonusContext) return;
      if (popup.classList.contains("is-active")) return;
      previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      previousBodyOverflow = document.body.style.overflow;
      markPopupSeen("opened");
      popup.classList.add("is-active");
      popup.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      window.setTimeout(() => closeButton?.focus(), 120);
    }

    function closePopup() {
      popup.classList.remove("is-active");
      popup.setAttribute("aria-hidden", "true");
      document.body.style.overflow = previousBodyOverflow;
      if (storageKey) {
        saveBonusState({
          lastClosedAt: new Date().toISOString(),
          lastPopupAction: "closed"
        });
      }
      previouslyFocused?.focus?.();
    }

    function getFocusableElements() {
      return Array.from(
        dialog.querySelectorAll("a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex='-1'])")
      ).filter((element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true");
    }

    function trapFocus(event) {
      if (event.key !== "Tab" || !popup.classList.contains("is-active")) return;

      const focusable = getFocusableElements();
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    async function copyCoupon(successMessage = `Cupom copiado: ${coupon}`) {
      try {
        if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
        await navigator.clipboard.writeText(coupon);
        showToast(successMessage);
      } catch {
        showToast(`Cupom: ${coupon}`);
      }
    }

    function claimCoupon() {
      const current = readCurrentBonusState();
      const now = Date.now();
      const nowIso = new Date(now).toISOString();
      const activeExpiresAt = parseBonusTimestamp(current.expiresAt) > now ? current.expiresAt : "";
      const expiresAt = activeExpiresAt || new Date(now + validDays * BONUS_DAY_MS).toISOString();

      saveBonusState({
        claimedAt: current.claimedAt || nowIso,
        activatedAt: current.activatedAt || nowIso,
        expiresAt,
        validDays,
        status: "claimed"
      });
      setupBonusPersistentCards({
        ...(bonusPatientContext || {}),
        coupon,
        personKey: currentPersonKey
      });
      void copyCoupon(`Cupom ${coupon} ativado e copiado`);
      window.setTimeout(closePopup, 850);
    }

    function showToast(message) {
      if (!toast) return;
      toast.textContent = message;
      toast.classList.add("is-active");
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toast.classList.remove("is-active"), 2200);
    }

    closeButton?.addEventListener("click", closePopup);
    popup.addEventListener("click", (event) => {
      if (event.target === popup) closePopup();
    });
    window.addEventListener("keydown", (event) => {
      if (!popup.classList.contains("is-active")) return;
      if (event.key === "Escape") closePopup();
      trapFocus(event);
    });
    copyButton?.addEventListener("click", () => {
      void copyCoupon();
    });
    redeemButton?.addEventListener("click", claimCoupon);

    bonusPopupHydrators.add(hydrateBonusContext);
    if (requiresPatientContext) {
      if (bonusPatientContext) hydrateBonusContext(bonusPatientContext);
    } else {
      hydrateBonusContext({
        coupon,
        personKey: document.body?.dataset.page || "admin"
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupBonusPopups);
  } else {
    setupBonusPopups();
  }

  window.EClub = {
    escapeHtml,
    normalizeKey,
    slugify,
    titleCaseName,
    getFirstName,
    getInitials,
    buildAccessCode,
    normalizeStatus,
    ensureArray,
    ensureObject,
    addDays,
    formatShortDate,
    formatFullDate,
    createDefaultProfile,
    normalizeProfile,
    createNotFoundProfile,
    createArchivedProfile,
    renderPatientProfile,
    buildPublicLink,
    copyText,
    setupBonusPopups,
    setupBonusForPatient
  };
})();
