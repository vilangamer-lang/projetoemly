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
      status: demo ? "Página de demonstração" : "Online",
      code: demo ? "DEMO" : buildAccessCode(name),
      subtitle: demo ? "Visualização de demonstração" : "Página individual da paciente",
      access: "Link público da paciente",
      nextSession: demo ? "Seg., 12 mai · 14:30" : `Próxima consulta com ${firstName}`,
      lastReview: demo ? "03 mai" : formatShortDate(lastVisit),
      focus: "Resumo clínico, agenda e orientações em uma única visão.",
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
    const container = root?.querySelector ? root.querySelector(selector) : document.querySelector(selector);
    if (!container) return;

    const safeItems = ensureArray(items);
    if (!safeItems.length) {
      container.innerHTML = `<li class="record record--empty"><div class="record__body"><p class="record__title">${escapeHtml(emptyText || "Sem registros")}</p></div></li>`;
      return;
    }

    container.innerHTML = safeItems.map(renderer).join("");
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
    const notesEl = query("[data-profile-notes]");
    const contactEl = query("[data-profile-contact]");
    const linksEl = query("[data-profile-links]");
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

    renderList(
      scope,
      "[data-profile-contact]",
      data.contact,
      (item) => `
        <dl class="contact-item">
          <dt class="contact-item__label">${escapeHtml(item.label)}</dt>
          <dd class="contact-item__value">${escapeHtml(item.value)}</dd>
        </dl>`,
      "Nenhum contato cadastrado"
    );

    renderList(
      scope,
      "[data-profile-links]",
      data.links,
      (item) => `
        <dl class="contact-item contact-item--link">
          <dt class="contact-item__label">${escapeHtml(item.label)}</dt>
          <dd class="contact-item__value">
            <a class="contact-item__link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
              <span>Abrir recurso</span>
              <span class="contact-item__link-icon" aria-hidden="true">↗</span>
            </a>
          </dd>
        </dl>`,
      "Sem links cadastrados"
    );

    return data;
  }

  function buildPublicLink(slug) {
    return new URL(`/paciente/${slugify(slug)}`, window.location.origin).toString();
  }

  function copyText(value) {
    return navigator.clipboard.writeText(String(value || ""));
  }

  function setupBonusPopups() {
    document.querySelectorAll("[data-bonus-popup]").forEach((popup) => setupBonusPopup(popup));
  }

  function setupBonusPopup(popup) {
    if (!popup || popup.dataset.bonusReady === "true") return;

    const dialog = popup.querySelector(".bonus-popup__dialog");
    const closeButton = popup.querySelector("[data-bonus-close]");
    const canvas = popup.querySelector("[data-bonus-canvas]");
    const card = popup.querySelector("[data-bonus-card]");
    const progressFill = popup.querySelector("[data-bonus-progress-fill]");
    const progressText = popup.querySelector("[data-bonus-progress-text]");
    const redeemButton = popup.querySelector("[data-bonus-redeem]");
    const resetButton = popup.querySelector("[data-bonus-reset]");
    const copyButton = popup.querySelector("[data-bonus-copy]");
    const toast = popup.querySelector("[data-bonus-toast]");

    if (!dialog || !canvas || !card) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    popup.dataset.bonusReady = "true";

    const coupon = popup.dataset.bonusCoupon || "EMLYN200";
    const revealAt = Number.parseInt(popup.dataset.bonusRevealAt || "", 10) || 64;
    const openDelay = Number.parseInt(popup.dataset.bonusOpenDelay || "", 10);
    const delay = Number.isFinite(openDelay) ? openDelay : 3000;
    const coverLogo = new Image();
    coverLogo.src = popup.dataset.bonusLogo || "/assets/brandbook/emlyn-logo-lockup.png";

    let previousBodyOverflow = "";
    let isDrawing = false;
    let lastPoint = null;
    let revealed = false;
    let particleTick = 0;
    let toastTimer = null;

    function openPopup() {
      if (popup.classList.contains("is-active")) return;
      previousBodyOverflow = document.body.style.overflow;
      popup.classList.add("is-active");
      popup.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      window.setTimeout(() => setupScratch(), 80);
    }

    function closePopup() {
      popup.classList.remove("is-active");
      popup.setAttribute("aria-hidden", "true");
      document.body.style.overflow = previousBodyOverflow;
    }

    function setupScratch() {
      const rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawCover(rect.width, rect.height);
      updateProgress(0);
      revealed = false;
      dialog.classList.remove("is-revealed");
      if (redeemButton) redeemButton.disabled = true;
    }

    function drawCover(width, height) {
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, width, height);

      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#FFFDF8");
      gradient.addColorStop(0.22, "#F4EEE5");
      gradient.addColorStop(0.58, "#E8D6B4");
      gradient.addColorStop(1, "#BC9C7C");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      const sea = ctx.createLinearGradient(0, height * 0.15, width, height * 0.9);
      sea.addColorStop(0, "rgba(5,68,100,.10)");
      sea.addColorStop(0.5, "rgba(255,255,255,.08)");
      sea.addColorStop(1, "rgba(95,65,41,.10)");
      ctx.fillStyle = sea;
      ctx.fillRect(0, 0, width, height);

      ctx.globalAlpha = 0.38;
      for (let y = -height; y < height * 2; y += 16) {
        ctx.beginPath();
        ctx.moveTo(-28, y);
        ctx.bezierCurveTo(width * 0.24, y + 20, width * 0.58, y - 20, width + 32, y + 14);
        ctx.strokeStyle = "rgba(255,255,255,.54)";
        ctx.lineWidth = 1.05;
        ctx.stroke();
      }

      ctx.globalAlpha = 0.65;
      const halo = ctx.createRadialGradient(width * 0.5, height * 0.43, 8, width * 0.5, height * 0.43, Math.max(width, height) * 0.55);
      halo.addColorStop(0, "rgba(255,255,255,.88)");
      halo.addColorStop(0.28, "rgba(255,255,255,.32)");
      halo.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;

      drawCoverLogo(width, height);

      ctx.textAlign = "center";
      ctx.fillStyle = "#054464";
      ctx.font = "900 12px Montserrat, Inter, sans-serif";
      ctx.fillText("RASPE AQUI", width / 2, height - 34);

      ctx.fillStyle = "rgba(5,68,100,.58)";
      ctx.font = "700 10.5px Montserrat, Inter, sans-serif";
      ctx.fillText("para revelar seu bônus", width / 2, height - 18);
    }

    function drawCoverLogo(width, height) {
      const panelWidth = Math.min(width * 0.72, 235);
      const panelHeight = Math.min(height * 0.66, 112);
      const panelX = (width - panelWidth) / 2;
      const panelY = 10;

      ctx.save();
      drawRoundRect(panelX, panelY, panelWidth, panelHeight, 18);
      ctx.fillStyle = "rgba(255,253,248,.42)";
      ctx.fill();
      ctx.strokeStyle = "rgba(200,167,106,.26)";
      ctx.lineWidth = 1;
      ctx.stroke();

      if (coverLogo.complete && coverLogo.naturalWidth) {
        const maxWidth = panelWidth * 0.78;
        const maxHeight = panelHeight * 0.86;
        const scale = Math.min(maxWidth / coverLogo.naturalWidth, maxHeight / coverLogo.naturalHeight);
        const logoWidth = coverLogo.naturalWidth * scale;
        const logoHeight = coverLogo.naturalHeight * scale;
        const x = (width - logoWidth) / 2;
        const y = panelY + (panelHeight - logoHeight) / 2;
        ctx.shadowColor = "rgba(5,68,100,.18)";
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 5;
        ctx.drawImage(coverLogo, x, y, logoWidth, logoHeight);
      } else {
        drawShellIcon(width / 2, panelY + panelHeight / 2 - 10);
      }

      ctx.restore();
    }

    function drawRoundRect(x, y, width, height, radius) {
      const size = Math.min(radius, width / 2, height / 2);
      ctx.beginPath();
      ctx.moveTo(x + size, y);
      ctx.lineTo(x + width - size, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + size);
      ctx.lineTo(x + width, y + height - size);
      ctx.quadraticCurveTo(x + width, y + height, x + width - size, y + height);
      ctx.lineTo(x + size, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - size);
      ctx.lineTo(x, y + size);
      ctx.quadraticCurveTo(x, y, x + size, y);
      ctx.closePath();
    }

    function drawShellIcon(cx, cy) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = "rgba(95,65,41,.72)";
      ctx.fillStyle = "rgba(255,255,255,.36)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 34);
      ctx.bezierCurveTo(-14, 5, -28, 4, -32, 18);
      ctx.bezierCurveTo(-42, 6, -34, -14, -16, -4);
      ctx.bezierCurveTo(-12, -27, 12, -27, 16, -4);
      ctx.bezierCurveTo(34, -14, 42, 6, 32, 18);
      ctx.bezierCurveTo(28, 4, 14, 5, 0, 34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 34);
      ctx.lineTo(0, -20);
      ctx.moveTo(0, 34);
      ctx.lineTo(-15, 0);
      ctx.moveTo(0, 34);
      ctx.lineTo(15, 0);
      ctx.moveTo(0, 34);
      ctx.lineTo(-29, 18);
      ctx.moveTo(0, 34);
      ctx.lineTo(29, 18);
      ctx.strokeStyle = "rgba(5,68,100,.38)";
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();
    }

    function getPoint(event) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        clientX: event.clientX,
        clientY: event.clientY
      };
    }

    function scratchAt(point) {
      const brush = Math.max(26, Math.min(36, canvas.getBoundingClientRect().width * 0.085));
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = brush * 1.15;

      if (lastPoint) {
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(point.x, point.y, brush / 2, 0, Math.PI * 2);
      ctx.fill();
      lastPoint = point;

      particleTick++;
      if (particleTick % 3 === 0) createSpark(point.clientX, point.clientY);
    }

    function calculateProgress() {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparent = 0;
      let total = 0;

      for (let i = 3; i < data.length; i += 32) {
        total++;
        if (data[i] < 80) transparent++;
      }

      return total ? Math.min(100, Math.round((transparent / total) * 100)) : 0;
    }

    function updateProgress(value) {
      if (progressFill) progressFill.style.width = `${value}%`;
      if (progressText) progressText.textContent = `${value}%`;
    }

    function revealBonus() {
      if (revealed) return;
      revealed = true;
      dialog.classList.add("is-revealed");
      if (redeemButton) redeemButton.disabled = false;
      updateProgress(100);
      launchConfetti();
      showToast("Bônus de R$ 200 revelado");
    }

    function handleStart(event) {
      if (revealed) return;
      event.preventDefault();
      isDrawing = true;
      lastPoint = null;
      canvas.setPointerCapture?.(event.pointerId);
      scratchAt(getPoint(event));
    }

    function handleMove(event) {
      if (!isDrawing || revealed) return;
      event.preventDefault();
      scratchAt(getPoint(event));
      const progress = calculateProgress();
      updateProgress(progress);
      if (progress >= revealAt) revealBonus();
    }

    function handleEnd(event) {
      if (!isDrawing) return;
      isDrawing = false;
      lastPoint = null;
      canvas.releasePointerCapture?.(event.pointerId);
      const progress = calculateProgress();
      updateProgress(progress);
      if (progress >= revealAt) revealBonus();
    }

    function createSpark(x, y) {
      const spark = document.createElement("span");
      spark.className = "bonus-popup__spark";
      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      spark.style.setProperty("--bonus-spark-x", `${Math.random() * 54 - 27}px`);
      spark.style.setProperty("--bonus-spark-y", `${Math.random() * 54 - 27}px`);
      document.body.appendChild(spark);
      window.setTimeout(() => spark.remove(), 700);
    }

    function launchConfetti() {
      const colors = ["#054464", "#5F4129", "#BC9C7C", "#C8A76A", "#EDECEB"];

      for (let i = 0; i < 54; i++) {
        const piece = document.createElement("span");
        piece.className = "bonus-popup__confetti";
        piece.style.left = `${Math.random() * 100}vw`;
        piece.style.setProperty("--bonus-confetti-color", colors[Math.floor(Math.random() * colors.length)]);
        piece.style.setProperty("--bonus-confetti-x", `${Math.random() * 240 - 120}px`);
        piece.style.setProperty("--bonus-confetti-rotation", `${Math.random() * 720 - 360}deg`);
        piece.style.setProperty("--bonus-confetti-duration", `${1.8 + Math.random() * 1.2}s`);
        piece.style.animationDelay = `${Math.random() * 0.22}s`;
        document.body.appendChild(piece);
        window.setTimeout(() => piece.remove(), 3400);
      }
    }

    async function copyCoupon() {
      try {
        if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
        await navigator.clipboard.writeText(coupon);
        showToast(`Cupom copiado: ${coupon}`);
      } catch {
        showToast(`Cupom: ${coupon}`);
      }
    }

    function showToast(message) {
      if (!toast) return;
      toast.textContent = message;
      toast.classList.add("is-active");
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toast.classList.remove("is-active"), 2200);
    }

    canvas.addEventListener("pointerdown", handleStart);
    canvas.addEventListener("pointermove", handleMove);
    canvas.addEventListener("pointerup", handleEnd);
    canvas.addEventListener("pointercancel", handleEnd);
    window.addEventListener("pointerup", handleEnd);
    closeButton?.addEventListener("click", closePopup);
    popup.addEventListener("click", (event) => {
      if (event.target === popup) closePopup();
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && popup.classList.contains("is-active")) closePopup();
    });
    window.addEventListener("resize", () => {
      if (popup.classList.contains("is-active")) setupScratch();
    });
    coverLogo.addEventListener("load", () => {
      if (popup.classList.contains("is-active")) setupScratch();
    });
    resetButton?.addEventListener("click", setupScratch);
    copyButton?.addEventListener("click", copyCoupon);
    redeemButton?.addEventListener("click", () => {
      void copyCoupon();
      showToast("Bônus de R$ 200 pronto para resgate");
    });

    window.setTimeout(openPopup, delay);
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
    setupBonusPopups
  };
})();
