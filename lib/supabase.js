const DEFAULT_SUPABASE_URL = "https://kltatgellicxoutkpsee.supabase.co";
const DEFAULT_TABLE = "patient_portal";

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ");
}

function slugify(value) {
  return normalizeText(value)
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
  const cleaned = normalizeText(value).replace(/[^a-z0-9]/g, "");
  if (!cleaned) return "ECL-000";
  const prefix = (cleaned.slice(0, 3) || "ecl").toUpperCase();
  const suffix = String(cleaned.length).padStart(3, "0");
  return `${prefix}-${suffix}`;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function createDefaultProfile(fullName, { demo = false } = {}) {
  const name = titleCaseName(fullName) || "Paciente";
  const firstName = getFirstName(name);
  const now = new Date();
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + 7);
  const nextFollowUp = new Date(now);
  nextFollowUp.setDate(nextFollowUp.getDate() + 21);

  return {
    name,
    initials: getInitials(name),
    greeting: `Bem-vindo à E-Club, ${name}`,
    status: demo ? "Página de demonstração" : "Acesso individual ativo",
    code: demo ? "DEMO" : buildAccessCode(name),
    subtitle: demo ? "Visualização de demonstração" : "Página individual da paciente",
    access: "Link público da paciente",
    nextSession: demo ? "Seg., 12 mai · 14:30" : `Próxima consulta com ${firstName}`,
    lastReview: demo ? "03 mai" : "Aguardando entrada",
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
          },
          {
            date: "11 abr",
            title: "Planejamento",
            detail: "Leitura facial, prioridades e sequência de cuidado.",
            status: "Registrado"
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
          "As informações serão exibidas após o cadastro ser salvo.",
          "A paciente acessa a página pelo link público gerado no painel.",
          "Você pode atualizar esta página sempre que precisar."
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
  return {
    ...createDefaultProfile(searched),
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
    contact: createDefaultProfile(searched).contact,
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

function getConfig() {
  return {
    url: String(process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, ""),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    table: process.env.SUPABASE_TABLE || DEFAULT_TABLE
  };
}

async function supabaseFetch(path, { method = "GET", query, body } = {}) {
  const { url, serviceRoleKey } = getConfig();
  if (!serviceRoleKey) {
    const error = new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    error.statusCode = 503;
    throw error;
  }

  const requestUrl = new URL(`${url}/rest/v1/${path}`);
  if (query && typeof query === "object") {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        requestUrl.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(requestUrl, {
    method,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Supabase request failed with ${response.status}: ${text}`);
    error.statusCode = response.status >= 500 ? 502 : response.status;
    throw error;
  }

  return response;
}

function mapPatientRow(row) {
  const payload = ensureObject(row);
  const profile = normalizeProfile(payload.profile, payload.full_name || payload.name);

  return {
    id: payload.id || "",
    slug: payload.slug || "",
    access_code: payload.access_code || "",
    full_name: payload.full_name || profile.name || "",
    full_name_search: payload.full_name_search || normalizeText(payload.full_name || profile.name || ""),
    is_archived: Boolean(payload.is_archived),
    profile,
    created_at: payload.created_at || null,
    updated_at: payload.updated_at || null
  };
}

async function listPatients() {
  const { table } = getConfig();
  const response = await supabaseFetch(table, {
    query: {
      select: "id,slug,access_code,full_name,full_name_search,is_archived,profile,created_at,updated_at",
      order: "updated_at.desc"
    }
  });
  const rows = await response.json();
  return Array.isArray(rows) ? rows.map(mapPatientRow) : [];
}

async function getPatientById(id) {
  const { table } = getConfig();
  const response = await supabaseFetch(table, {
    query: {
      select: "id,slug,access_code,full_name,full_name_search,is_archived,profile,created_at,updated_at",
      id: `eq.${String(id)}`
    }
  });
  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? mapPatientRow(rows[0]) : null;
}

async function getPatientByKey(rawKey) {
  const { table } = getConfig();
  const key = normalizeText(rawKey);
  if (!key) return null;

  const response = await supabaseFetch(table, {
    query: {
      select: "id,slug,access_code,full_name,full_name_search,is_archived,profile,created_at,updated_at",
      or: `(slug.eq.${key},access_code.eq.${key},full_name_search.eq.${key})`,
      limit: "1"
    }
  });

  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? mapPatientRow(rows[0]) : null;
}

async function createPatient(input) {
  const { table } = getConfig();
  const payload = preparePatientPayload(input, { isCreate: true });
  const response = await supabaseFetch(table, {
    method: "POST",
    query: {
      select: "id,slug,access_code,full_name,full_name_search,is_archived,profile,created_at,updated_at"
    },
    body: payload
  });
  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? mapPatientRow(rows[0]) : null;
}

async function updatePatient(id, input) {
  const { table } = getConfig();
  const payload = preparePatientPayload(input, { isCreate: false });
  const response = await supabaseFetch(table, {
    method: "PATCH",
    query: {
      select: "id,slug,access_code,full_name,full_name_search,is_archived,profile,created_at,updated_at",
      id: `eq.${String(id)}`
    },
    body: payload
  });
  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? mapPatientRow(rows[0]) : null;
}

async function savePatient(input) {
  if (input?.id) {
    return updatePatient(input.id, input);
  }
  return createPatient(input);
}

async function setArchived(id, isArchived) {
  const existing = await getPatientById(id);
  if (!existing) return null;
  return updatePatient(id, { ...existing, is_archived: Boolean(isArchived) });
}

async function deletePatient(id) {
  const { table } = getConfig();
  await supabaseFetch(table, {
    method: "DELETE",
    query: {
      id: `eq.${String(id)}`
    }
  });
  return true;
}

function preparePatientPayload(input, { isCreate } = {}) {
  const source = ensureObject(input);
  const profile = normalizeProfile(source.profile, source.full_name || source.name);
  const fullName = titleCaseName(source.full_name || profile.name || source.name || "Paciente");
  const slug = slugify(source.slug || fullName);
  const accessCode = String(source.access_code || profile.code || buildAccessCode(fullName))
    .trim()
    .toUpperCase();

  return {
    ...(source.id ? { id: source.id } : {}),
    slug,
    access_code: accessCode,
    full_name: fullName,
    is_archived: Boolean(source.is_archived),
    profile: {
      ...profile,
      name: fullName,
      code: accessCode,
      initials: source.profile?.initials || profile.initials || getInitials(fullName),
      greeting: source.profile?.greeting || profile.greeting || `Bem-vindo à E-Club, ${fullName}`,
      status: source.profile?.status || profile.status || "Acesso individual ativo",
      subtitle: source.profile?.subtitle || profile.subtitle || "Página individual da paciente",
      access: source.profile?.access || profile.access || "Link público da paciente",
      nextSession: source.profile?.nextSession || profile.nextSession || "",
      lastReview: source.profile?.lastReview || profile.lastReview || "",
      focus: source.profile?.focus || profile.focus || "Role a tela para baixo para ver mais...",
      appointments: ensureArray(source.profile?.appointments),
      visits: ensureArray(source.profile?.visits),
      procedures: ensureArray(source.profile?.procedures),
      notes: ensureArray(source.profile?.notes),
      contact: ensureArray(source.profile?.contact),
      links: ensureArray(source.profile?.links)
    }
  };
}

function serializeResponse(row) {
  if (!row) return null;
  return mapPatientRow(row);
}

module.exports = {
  normalizeText,
  slugify,
  titleCaseName,
  getFirstName,
  getInitials,
  buildAccessCode,
  ensureArray,
  createDefaultProfile,
  createNotFoundProfile,
  createArchivedProfile,
  normalizeProfile,
  mapPatientRow,
  getConfig,
  supabaseFetch,
  listPatients,
  getPatientById,
  getPatientByKey,
  createPatient,
  updatePatient,
  savePatient,
  setArchived,
  deletePatient,
  preparePatientPayload,
  serializeResponse
};
