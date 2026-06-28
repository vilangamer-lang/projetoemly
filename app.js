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
    .replace(/\s+/g, " ");
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

  if (!parts.length) return "CB";

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function buildPatientCode(value) {
  const cleaned = normalizeKey(value).replace(/[^a-z0-9]/g, "");
  const prefix = (cleaned.slice(0, 3) || "cb").toUpperCase();
  const suffix = String(cleaned.length || 0).padStart(3, "0");
  return `${prefix}-${suffix}`;
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

function createProfile(rawValue, { demo = false } = {}) {
  const displayName = titleCaseName(rawValue) || "Paciente";
  const firstName = getFirstName(displayName);
  const code = buildPatientCode(displayName);
  const initials = getInitials(displayName);
  const today = new Date();
  const nextVisit = addDays(today, 7);
  const followUpVisit = addDays(today, 24);
  const lastVisit = addDays(today, -9);
  const previousVisit = addDays(today, -31);
  const olderVisit = addDays(today, -58);

  return {
    name: displayName,
    initials,
    greeting: demo ? "Visualização de demonstração" : `Olá, ${firstName}.`,
    status: demo ? "Visualização de demonstração" : "Acesso individual carregado",
    code,
    subtitle: `${displayName} · ${code}`,
    access: "Nome completo ou QR",
    nextSession: `${formatFullDate(nextVisit)} · 14:30`,
    lastReview: formatShortDate(lastVisit),
    focus: demo
      ? "Estrutura pronta para consulta rápida."
      : "Seu painel individual está pronto para consulta rápida.",
    appointments: [
      {
        date: formatShortDate(nextVisit),
        time: "14:30",
        title: "Retorno clínico",
        detail: "Revisão da última evolução e alinhamento do próximo passo.",
        status: "Confirmada"
      },
      {
        date: formatShortDate(followUpVisit),
        time: "10:00",
        title: "Acompanhamento",
        detail: "Leitura do ciclo atual e registro da resposta.",
        status: "Programada"
      }
    ],
    visits: [
      {
        date: formatShortDate(lastVisit),
        title: "Última visita",
        detail: "Consulta de retorno com leitura da evolução.",
        status: "Registrada"
      },
      {
        date: formatShortDate(previousVisit),
        title: "Visita anterior",
        detail: "Avaliação inicial e alinhamento do plano.",
        status: "Registrada"
      },
      {
        date: formatShortDate(olderVisit),
        title: "Histórico",
        detail: "Atendimento anterior anexado ao ciclo da paciente.",
        status: "Arquivada"
      }
    ],
    procedures: [
      {
        date: formatShortDate(lastVisit),
        title: "Revisão facial",
        detail: "Checagem do que mudou e do que deve ser mantido.",
        status: "Concluído"
      },
      {
        date: formatShortDate(previousVisit),
        title: "Planejamento",
        detail: "Leitura facial, prioridades e sequência de cuidado.",
        status: "Registrado"
      },
      {
        date: formatShortDate(olderVisit),
        title: "Acompanhamento",
        detail: "Registro do contato anterior e observações da equipe.",
        status: "Arquivado"
      }
    ],
    notes: [
      "Use o nome completo ou o código do QR para abrir a ficha.",
      "As visitas aparecem em ordem prática para leitura rápida no celular.",
      "Dados sensíveis devem continuar protegidos por autenticação no backend."
    ],
    contact: [
      { label: "Canal", value: "WhatsApp oficial da clínica" },
      { label: "Cidade", value: "Itajaí - SC" },
      { label: "Suporte", value: "Equipe do Club do Botox" }
    ]
  };
}

const demoProfile = createProfile("Assinatura demo", { demo: true });

const emptyProfile = {
  name: "Digite seu nome completo",
  initials: "CB",
  greeting: "Aguardando identificação",
  status: "Cole o nome completo ou código",
  code: "",
  subtitle: "Aguardando identificação",
  access: "Após o QR",
  nextSession: "Aguardando entrada",
  lastReview: "Aguardando entrada",
  focus: "Cole o nome completo ou o código para abrir a ficha da paciente.",
  appointments: [
    {
      date: "Aguardando",
      time: "--:--",
      title: "Próxima visita",
      detail: "A agenda aparece depois da identificação.",
      status: "Pendente"
    }
  ],
  visits: [
    {
      date: "Aguardando",
      title: "Última visita",
      detail: "O histórico aparece depois da identificação.",
      status: "Pendente"
    }
  ],
  procedures: [
    {
      date: "Aguardando",
      title: "Procedimentos",
      detail: "O que foi feito fica listado aqui.",
      status: "Pendente"
    }
  ],
  notes: [
    "Cole o nome completo ou o código do QR para carregar a ficha.",
    "A página se ajusta para celular e computador.",
    "O acesso pode ser integrado depois com banco de dados."
  ],
  contact: [
    { label: "Canal", value: "Mensagem oficial da clínica" },
    { label: "Cidade", value: "Itajaí - SC" },
    { label: "Suporte", value: "Equipe do Club do Botox" }
  ]
};

function setYear() {
  document.querySelectorAll("[data-year], [data-current-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
}

function renderList(container, items, renderer) {
  if (!container) return;
  container.innerHTML = items.map(renderer).join("");
}

function renderProfile(profile) {
  const nameEl = document.querySelector("[data-profile-name]");
  const greetingEl = document.querySelector("[data-profile-greeting]");
  const initialsEl = document.querySelector("[data-profile-initials]");
  const subtitleEl = document.querySelector("[data-profile-fullname]");
  const accessEl = document.querySelector("[data-profile-access]");
  const nextEl = document.querySelector("[data-profile-next]");
  const reviewEl = document.querySelector("[data-profile-review]");
  const focusEl = document.querySelector("[data-profile-focus]");
  const appointmentsEl = document.querySelector("[data-profile-appointments]");
  const historyEl = document.querySelector("[data-profile-history]");
  const proceduresEl = document.querySelector("[data-profile-procedures]");
  const notesEl = document.querySelector("[data-profile-notes]");
  const contactEl = document.querySelector("[data-profile-contact]");

  if (nameEl) nameEl.textContent = profile.name;
  if (greetingEl) greetingEl.textContent = profile.greeting || profile.name;
  if (initialsEl) initialsEl.textContent = profile.initials || getInitials(profile.name);
  if (subtitleEl) subtitleEl.textContent = profile.subtitle || profile.name;
  if (accessEl) accessEl.textContent = profile.code || profile.access || "";
  if (nextEl) nextEl.textContent = profile.nextSession || "";
  if (reviewEl) reviewEl.textContent = profile.lastReview || "";
  if (focusEl) focusEl.textContent = profile.focus || "";

  renderList(
    appointmentsEl,
    profile.appointments,
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
      </li>`
  );

  renderList(
    historyEl,
    profile.visits,
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
      </li>`
  );

  renderList(
    proceduresEl,
    profile.procedures,
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
      </li>`
  );

  renderList(
    notesEl,
    profile.notes,
    (item) => `
      <li class="note-list__item">${escapeHtml(item)}</li>`
  );

  renderList(
    contactEl,
    profile.contact,
    (item) => `
      <article class="contact-item">
        <p class="contact-item__label">${escapeHtml(item.label)}</p>
        <p class="contact-item__value">${escapeHtml(item.value)}</p>
      </article>`
  );
}

function setupAccessForm() {
  const form = document.querySelector("[data-access-form]");
  if (!form) return;

  const input = form.querySelector("[data-access-input]");
  const statusChip = document.querySelector("[data-access-chip]");
  const emptyState = document.querySelector("[data-access-empty]");
  const params = new URLSearchParams(window.location.search);
  const keyParam =
    params.get("name") ||
    params.get("nome") ||
    params.get("code") ||
    params.get("id") ||
    params.get("paciente");

  const load = (code) => {
    const raw = String(code || "").trim();
    const normalized = normalizeKey(raw);
    let profile = null;

    if (!raw) {
      profile = emptyProfile;
    } else if (normalized === "demo") {
      profile = demoProfile;
    } else {
      profile = createProfile(raw);
    }

    renderProfile(profile);

    if (statusChip) {
      statusChip.textContent = raw ? profile.status : emptyProfile.status;
    }

    if (emptyState) {
      emptyState.classList.toggle("hidden", Boolean(raw));
    }

    try {
      if (raw) {
        localStorage.setItem("club-do-botox-identity", raw);
      } else {
        localStorage.removeItem("club-do-botox-identity");
      }
    } catch {
      /* noop */
    }

    try {
      const url = new URL(window.location.href);
      if (raw) {
        url.searchParams.set("name", raw);
      } else {
        url.searchParams.delete("name");
      }
      history.replaceState({}, "", url.toString());
    } catch {
      /* noop */
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    load(input.value);
  });

  const saved = (() => {
    try {
      return localStorage.getItem("club-do-botox-identity");
    } catch {
      return null;
    }
  })();

  input.value = keyParam || saved || "";
  load(input.value);
}

document.addEventListener("DOMContentLoaded", () => {
  setYear();
  setupAccessForm();
});
