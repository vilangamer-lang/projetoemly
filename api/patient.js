const DEFAULT_SUPABASE_URL = "https://kltatgellicxoutkpsee.supabase.co";
const DEFAULT_TABLE = "patient_portal";

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
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

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function normalizeProfile(row) {
  const payload = row && typeof row === "object" ? row : {};
  const profile = payload.profile && typeof payload.profile === "object" ? payload.profile : {};
  const fullName = payload.full_name || profile.name || "Paciente";
  const accessCode = payload.access_code || profile.code || "";
  const name = titleCaseName(fullName);

  return {
    name,
    initials: profile.initials || getInitials(name),
    greeting: profile.greeting || `Olá, ${getFirstName(name)}.`,
    status: profile.status || "Acesso individual carregado",
    code: accessCode,
    subtitle: profile.subtitle || `${name}${accessCode ? ` · ${accessCode}` : ""}`,
    access: profile.access || "Nome completo ou QR",
    nextSession: profile.nextSession || "Aguardando entrada",
    lastReview: profile.lastReview || "Aguardando entrada",
    focus: profile.focus || "Painel carregado a partir do banco Supabase.",
    appointments: ensureArray(profile.appointments),
    visits: ensureArray(profile.visits),
    procedures: ensureArray(profile.procedures),
    notes: ensureArray(profile.notes),
    contact: ensureArray(profile.contact)
  };
}

async function querySupabaseProfile(rawKey) {
  const key = normalizeKey(rawKey);
  const supabaseUrl = String(process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const table = process.env.SUPABASE_TABLE || DEFAULT_TABLE;

  if (!serviceRoleKey) {
    const error = new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    error.statusCode = 503;
    throw error;
  }

  if (!key) {
    const error = new Error("Missing patient key");
    error.statusCode = 400;
    throw error;
  }

  const url = new URL(`${supabaseUrl}/rest/v1/${table}`);
  url.searchParams.set("select", "access_code,full_name,profile");
  url.searchParams.set("or", `(access_code.eq.${key},full_name_search.eq.${key})`);
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Supabase request failed with ${response.status}: ${text}`);
    error.statusCode = response.status >= 500 ? 502 : response.status;
    throw error;
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] || null : null;
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.end();
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const requestUrl = new URL(req.url, "http://localhost");
    const rawKey =
      requestUrl.searchParams.get("key") ||
      requestUrl.searchParams.get("name") ||
      requestUrl.searchParams.get("code") ||
      requestUrl.searchParams.get("id") ||
      requestUrl.searchParams.get("paciente") ||
      "";

    const row = await querySupabaseProfile(rawKey);

    if (!row) {
      sendJson(res, 404, { found: false, key: normalizeKey(rawKey) });
      return;
    }

    sendJson(res, 200, {
      found: true,
      source: "supabase",
      profile: normalizeProfile(row)
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode) || 500;
    sendJson(res, statusCode, {
      found: false,
      error: statusCode === 503 ? "Supabase is not configured" : "Unable to load patient data"
    });
  }
};
