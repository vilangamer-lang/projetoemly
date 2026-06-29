function setYear() {
  document.querySelectorAll("[data-year], [data-current-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
}

function readLookupKey() {
  const params = new URLSearchParams(window.location.search);
  const candidates = [
    params.get("slug"),
    params.get("key"),
    params.get("name"),
    params.get("code"),
    params.get("id"),
    params.get("paciente")
  ].filter(Boolean);

  if (candidates.length) {
    return candidates[0];
  }

  const pathParts = window.location.pathname.split("/").filter(Boolean);
  if (!pathParts.length) return "";

  if (["p", "paciente", "assinatura"].includes(pathParts[0])) {
    return decodeURIComponent(pathParts[1] || "");
  }

  return decodeURIComponent(pathParts[pathParts.length - 1] || "");
}

function setBanner(message, tone = "neutral") {
  const banner = document.querySelector("[data-page-state]");
  if (!banner) return;
  banner.textContent = message;
  banner.dataset.tone = tone;
  banner.classList.remove("hidden");
}

function hideBanner() {
  const banner = document.querySelector("[data-page-state]");
  if (!banner) return;
  banner.classList.add("hidden");
}

async function fetchPatient(lookupKey) {
  const url = new URL("/api/patient", window.location.origin);
  url.searchParams.set("slug", lookupKey);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    const payload = await response.json().catch(() => null);
    return {
      ok: response.ok,
      status: response.status,
      payload
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

function applyState(profile) {
  const data = window.EClub.renderPatientProfile(document, profile, {
    archived: Boolean(profile?.is_archived)
  });

  const accessChip = document.querySelector("[data-access-chip]");
  if (accessChip) {
    accessChip.textContent = data.status || "Acesso individual";
  }

  if (data.is_archived) {
    setBanner("Esta página foi arquivada pela clínica.", "warning");
  } else {
    hideBanner();
  }
}

async function setupPublicPatientPage() {
  if (!window.EClub) return;

  setYear();

  const lookupKey = readLookupKey().trim();
  const titleFallback = document.querySelector("[data-profile-greeting]");

  if (!lookupKey) {
    const profile = window.EClub.createNotFoundProfile("Acesso não informado");
    applyState(profile);
    if (titleFallback) {
      titleFallback.textContent = profile.greeting;
    }
    setBanner("Informe um link válido da paciente.", "danger");
    return;
  }

  if (lookupKey.toLowerCase() === "demo") {
    const profile = window.EClub.createDefaultProfile("Assinatura demo", { demo: true });
    applyState(profile);
    return;
  }

  setBanner("Carregando a página da paciente...", "neutral");

  try {
    const result = await fetchPatient(lookupKey);
    if (result.ok && result.payload?.profile) {
      const profile = {
        ...result.payload.profile,
        is_archived: Boolean(result.payload.patient?.is_archived)
      };
      applyState(profile);
      return;
    }

    if (result.status === 404) {
      const profile = window.EClub.createNotFoundProfile(lookupKey);
      applyState(profile);
      setBanner("Nenhuma página foi encontrada para este link.", "warning");
      return;
    }

    const profile = window.EClub.createNotFoundProfile(lookupKey);
    applyState(profile);
    setBanner("O banco ainda não respondeu. Verifique a conexão.", "warning");
  } catch {
    const profile = window.EClub.createNotFoundProfile(lookupKey);
    applyState(profile);
    setBanner("A página não pôde ser carregada agora.", "danger");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  void setupPublicPatientPage();
});
