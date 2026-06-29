const {
  getPatientByKey,
  normalizeProfile,
  createDefaultProfile,
  createArchivedProfile
} = require("../lib/supabase");

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
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
    sendJson(res, 405, { error: "method_not_allowed" });
    return;
  }

  try {
    const requestUrl = new URL(req.url, "http://localhost");
    const rawKey =
      requestUrl.searchParams.get("slug") ||
      requestUrl.searchParams.get("key") ||
      requestUrl.searchParams.get("name") ||
      requestUrl.searchParams.get("code") ||
      requestUrl.searchParams.get("id") ||
      requestUrl.searchParams.get("paciente") ||
      "";

    const normalized = String(rawKey || "").trim().toLowerCase();

    if (!rawKey) {
      sendJson(res, 404, { found: false, error: "missing_key" });
      return;
    }

    if (normalized === "demo") {
      const profile = createDefaultProfile("Assinatura demo", { demo: true });
      sendJson(res, 200, {
        found: true,
        source: "demo",
        patient: {
          id: "demo",
          slug: "demo",
          access_code: "DEMO",
          full_name: profile.name,
          is_archived: false
        },
        profile
      });
      return;
    }

    const row = await getPatientByKey(rawKey);
    if (!row) {
      sendJson(res, 404, { found: false, key: rawKey });
      return;
    }

    const profile = row.is_archived ? createArchivedProfile(row) : normalizeProfile(row.profile, row.full_name);

    sendJson(res, 200, {
      found: true,
      source: "supabase",
      patient: {
        id: row.id,
        slug: row.slug,
        access_code: row.access_code,
        full_name: row.full_name,
        is_archived: row.is_archived,
        created_at: row.created_at,
        updated_at: row.updated_at
      },
      profile
    });
  } catch (error) {
    const statusCode = Number(error?.statusCode) || 500;
    sendJson(res, statusCode, {
      found: false,
      error: statusCode === 503 ? "Supabase is not configured" : "Unable to load patient data"
    });
  }
};
