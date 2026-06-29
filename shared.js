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
      status: demo ? "Página de demonstração" : "Acesso individual ativo",
      code: demo ? "DEMO" : buildAccessCode(name),
      subtitle: demo ? "Visualização de demonstração" : "Página individual da paciente",
      access: "Link público da paciente",
      nextSession: demo ? "Seg., 12 mai · 14:30" : `Próxima consulta com ${firstName}`,
      lastReview: demo ? "03 mai" : formatShortDate(lastVisit),
      focus: "Role a tela para baixo para ver mais...",
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
      status: source.status || base.status,
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
        <article class="contact-item">
          <p class="contact-item__label">${escapeHtml(item.label)}</p>
          <p class="contact-item__value">${escapeHtml(item.value)}</p>
        </article>`,
      "Nenhum contato cadastrado"
    );

    renderList(
      scope,
      "[data-profile-links]",
      data.links,
      (item) => `
        <article class="contact-item">
          <p class="contact-item__label">${escapeHtml(item.label)}</p>
          <p class="contact-item__value"><a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(
            item.url
          )}</a></p>
        </article>`,
      "Sem links cadastrados"
    );

    return data;
  }

  function buildPublicLink(slug) {
    return new URL(`/p/${slugify(slug)}`, window.location.origin).toString();
  }

  function copyText(value) {
    return navigator.clipboard.writeText(String(value || ""));
  }

  window.EClub = {
    escapeHtml,
    normalizeKey,
    slugify,
    titleCaseName,
    getFirstName,
    getInitials,
    buildAccessCode,
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
    copyText
  };
})();
