const {
  listPatients,
  getPatientById,
  getPatientByKey,
  savePatient,
  setArchived,
  deletePatient,
  createDefaultProfile,
  normalizeProfile,
  slugify,
  titleCaseName,
  buildAccessCode
} = require("../lib/supabase");
const {
  buildCookieHeader,
  clearSessionCookie,
  createSessionCookie,
  verifySession,
  isValidPassword
} = require("../lib/admin-session");

function sendJson(res, statusCode, body, headers = {}) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  for (const [key, value] of Object.entries(headers)) {
    res.setHeader(key, value);
  }
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function requireAuth(req, res) {
  const session = verifySession(req.headers.cookie);
  if (!session.authenticated) {
    sendJson(res, 401, { authenticated: false, error: "not_authenticated" });
    return null;
  }
  return session;
}

function sanitizeText(value) {
  return String(value || "").trim();
}

async function duplicatePatientById(id) {
  const existing = await getPatientById(id);
  if (!existing) return null;

  const sourceProfile = normalizeProfile(existing.profile, existing.full_name);
  const suffix = `cópia ${new Date().getTime().toString().slice(-4)}`;
  const fullName = `${existing.full_name} ${suffix}`;
  const slug = `${slugify(existing.slug || existing.full_name)}-copia-${new Date()
    .getTime()
    .toString()
    .slice(-4)}`;

  return savePatient({
    full_name: fullName,
    slug,
    access_code: buildAccessCode(fullName),
    is_archived: existing.is_archived,
    profile: {
      ...sourceProfile,
      name: titleCaseName(fullName),
      greeting: `Bem-vindo à E-Club, ${titleCaseName(fullName)}`,
      status: "Cópia criada para edição",
      code: buildAccessCode(fullName)
    }
  });
}

module.exports = async function handler(req, res) {
  const requestUrl = new URL(req.url, "http://localhost");
  const action = requestUrl.searchParams.get("action") || "";

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.end();
    return;
  }

  try {
    if (action === "session") {
      const session = verifySession(req.headers.cookie);
      sendJson(res, 200, {
        authenticated: Boolean(session.authenticated),
        expiresAt: session?.payload?.exp || null
      });
      return;
    }

    if (action === "login") {
      if (req.method !== "POST") {
        sendJson(res, 405, { error: "method_not_allowed" });
        return;
      }

      if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
        sendJson(res, 503, { error: "admin_auth_not_configured" });
        return;
      }

      const body = await readJson(req);
      const password = sanitizeText(body.password);
      if (!isValidPassword(password)) {
        sendJson(res, 401, { authenticated: false, error: "invalid_password" });
        return;
      }

      const token = createSessionCookie();
      sendJson(
        res,
        200,
        { authenticated: true },
        {
          "Set-Cookie": buildCookieHeader(token)
        }
      );
      return;
    }

    if (action === "logout") {
      sendJson(
        res,
        200,
        { authenticated: false },
        {
          "Set-Cookie": clearSessionCookie()
        }
      );
      return;
    }

    const session = requireAuth(req, res);
    if (!session) return;

    if (action === "list") {
      const patients = await listPatients();
      sendJson(res, 200, { patients });
      return;
    }

    if (action === "detail") {
      const id = requestUrl.searchParams.get("id");
      const key = requestUrl.searchParams.get("key");
      const patient = id ? await getPatientById(id) : key ? await getPatientByKey(key) : null;

      if (!patient) {
        sendJson(res, 404, { found: false });
        return;
      }

      sendJson(res, 200, { found: true, patient });
      return;
    }

    if (action === "save") {
      if (req.method !== "POST" && req.method !== "PATCH") {
        sendJson(res, 405, { error: "method_not_allowed" });
        return;
      }

      const body = await readJson(req);
      const patientInput = body.patient || body;

      if (!patientInput?.full_name && !patientInput?.profile?.name) {
        sendJson(res, 400, { error: "missing_full_name" });
        return;
      }

      const saved = await savePatient(patientInput);
      sendJson(res, 200, { patient: saved });
      return;
    }

    if (action === "archive") {
      if (req.method !== "POST" && req.method !== "PATCH") {
        sendJson(res, 405, { error: "method_not_allowed" });
        return;
      }

      const body = await readJson(req);
      const id = body.id || requestUrl.searchParams.get("id");
      if (!id) {
        sendJson(res, 400, { error: "missing_id" });
        return;
      }

      const patient = await setArchived(id, body.is_archived ?? body.archived ?? true);
      if (!patient) {
        sendJson(res, 404, { found: false });
        return;
      }

      sendJson(res, 200, { patient });
      return;
    }

    if (action === "duplicate") {
      if (req.method !== "POST") {
        sendJson(res, 405, { error: "method_not_allowed" });
        return;
      }

      const body = await readJson(req);
      const id = body.id || requestUrl.searchParams.get("id");
      if (!id) {
        sendJson(res, 400, { error: "missing_id" });
        return;
      }

      const patient = await duplicatePatientById(id);
      if (!patient) {
        sendJson(res, 404, { found: false });
        return;
      }

      sendJson(res, 200, { patient });
      return;
    }

    if (action === "delete") {
      if (req.method !== "DELETE" && req.method !== "POST") {
        sendJson(res, 405, { error: "method_not_allowed" });
        return;
      }

      const body = req.method === "POST" ? await readJson(req) : {};
      const id = body.id || requestUrl.searchParams.get("id");
      if (!id) {
        sendJson(res, 400, { error: "missing_id" });
        return;
      }

      await deletePatient(id);
      sendJson(res, 200, { deleted: true });
      return;
    }

    sendJson(res, 400, { error: "unknown_action" });
  } catch (error) {
    const statusCode = Number(error?.statusCode) || 500;
    sendJson(res, statusCode, {
      error: statusCode === 503 ? "admin_api_not_configured" : "unable_to_process_request",
      detail: statusCode === 500 ? error.message : undefined
    });
  }
};
