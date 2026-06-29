const REPEATER_FIELDS = {
  appointments: [
    { key: "date", label: "Data", placeholder: "12 mai" },
    { key: "time", label: "Horário", placeholder: "14:30" },
    { key: "title", label: "Título", placeholder: "Retorno clínico" },
    { key: "detail", label: "Detalhe", placeholder: "Revisão da última evolução." },
    { key: "status", label: "Status", placeholder: "Confirmada" }
  ],
  visits: [
    { key: "date", label: "Data", placeholder: "03 mai" },
    { key: "title", label: "Título", placeholder: "Última visita" },
    { key: "detail", label: "Detalhe", placeholder: "Consulta de retorno." },
    { key: "status", label: "Status", placeholder: "Registrada" }
  ],
  procedures: [
    { key: "date", label: "Data", placeholder: "03 mai" },
    { key: "title", label: "Título", placeholder: "Revisão facial" },
    { key: "detail", label: "Detalhe", placeholder: "Checagem do que mudou." },
    { key: "status", label: "Status", placeholder: "Concluído" }
  ],
  contact: [
    { key: "label", label: "Rótulo", placeholder: "Canal" },
    { key: "value", label: "Valor", placeholder: "WhatsApp oficial da clínica" }
  ],
  links: [
    { key: "label", label: "Rótulo", placeholder: "Guia" },
    { key: "url", label: "URL", placeholder: "https://..." }
  ]
};

function setYear() {
  document.querySelectorAll("[data-current-year], [data-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
}

function getByData(root, selector) {
  return root.querySelector(selector);
}

function apiUrl(action, params = {}) {
  const url = new URL("/api/admin", window.location.origin);
  url.searchParams.set("action", action);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

async function apiRequest(action, { method = "GET", params = {}, body } = {}) {
  const response = await fetch(apiUrl(action, params), {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    credentials: "same-origin",
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
}

function blankPatientProfile() {
  const profile = window.EClub.createDefaultProfile("Paciente");
  return {
    ...profile,
    name: "",
    greeting: "Bem-vindo à E-Club",
    status: "Aguardando atendimento",
    code: "",
    subtitle: "Crie a primeira página da paciente",
    access: "Link público da paciente",
    nextSession: "",
    lastReview: "",
    focus: "Preencha os dados para gerar o link da paciente.",
    appointments: [],
    visits: [],
    procedures: [],
    notes: [],
    contact: [],
    links: []
  };
}

function createBlankPatient() {
  return {
    id: "",
    slug: "",
    access_code: "",
    full_name: "",
    is_archived: false,
    profile: blankPatientProfile(),
    created_at: "",
    updated_at: ""
  };
}

function normalizePatientFromList(patient) {
  return {
    ...createBlankPatient(),
    ...patient,
    profile: window.EClub.normalizeProfile(patient.profile, patient.full_name || patient.profile?.name)
  };
}

function renderRepeaterRow(name, value = {}) {
  const fields = REPEATER_FIELDS[name] || [];
  const cells = fields
    .map(
      (field) => `
        <label class="field repeater__field">
          <span>${window.EClub.escapeHtml(field.label)}</span>
          ${
            field.key === "detail" || field.key === "value" || field.key === "url"
              ? `<textarea rows="2" data-field="${window.EClub.escapeHtml(field.key)}" placeholder="${window.EClub.escapeHtml(
                  field.placeholder
                )}">${window.EClub.escapeHtml(value[field.key] || "")}</textarea>`
              : `<input type="text" data-field="${window.EClub.escapeHtml(field.key)}" placeholder="${window.EClub.escapeHtml(
                  field.placeholder
                )}" value="${window.EClub.escapeHtml(value[field.key] || "")}" />`
          }
        </label>`
    )
    .join("");

  return `
    <div class="repeater__row" data-repeater-row="${window.EClub.escapeHtml(name)}">
      <div class="repeater__grid repeater__grid--${window.EClub.escapeHtml(name)}">${cells}</div>
      <button class="button repeater__remove" type="button" data-remove-row>Remover</button>
    </div>`;
}

function renderRepeater(container, name, items) {
  if (!container) return;
  const safeItems = window.EClub.ensureArray(items);
  const rows = safeItems.length ? safeItems : [{}];
  container.innerHTML = rows.map((item) => renderRepeaterRow(name, item)).join("");
}

function collectRepeater(container) {
  if (!container) return [];
  const rows = Array.from(container.querySelectorAll("[data-repeater-row]"));
  return rows
    .map((row) => {
      const item = {};
      row.querySelectorAll("[data-field]").forEach((input) => {
        item[input.dataset.field] = String(input.value || "").trim();
      });
      return item;
    })
    .filter((item) => Object.values(item).some(Boolean));
}

function setField(form, key, value) {
  const field = form.querySelector(`[data-field="${CSS.escape(key)}"]`);
  if (!field) return;
  field.value = value ?? "";
}

function getField(form, key) {
  const field = form.querySelector(`[data-field="${CSS.escape(key)}"]`);
  return field ? String(field.value || "").trim() : "";
}

function setStatusChip(text, tone = "neutral") {
  const chip = document.querySelector("[data-save-state]");
  if (!chip) return;
  chip.textContent = text;
  chip.dataset.tone = tone;
}

function setSessionChip(text, tone = "neutral") {
  const chip = document.querySelector("[data-session-chip]");
  if (!chip) return;
  chip.textContent = text;
  chip.dataset.tone = tone;
}

function setCurrentPatientLabel(patient) {
  const label = document.querySelector("[data-current-patient]");
  if (!label) return;
  if (!patient?.full_name) {
    label.textContent = "Tela pronta para criar uma nova página";
    return;
  }
  const parts = [patient.full_name, patient.slug ? `/${patient.slug}` : ""].filter(Boolean);
  label.textContent = parts.join(" · ");
}

function getPreviewProfile(form) {
  const fullName = getField(form, "full_name");
  const slug = getField(form, "slug");
  const accessCode = getField(form, "access_code");
  const profile = {
    name: fullName || "Paciente",
    initials: window.EClub.getInitials(fullName || "Paciente"),
    greeting: getField(form, "greeting") || `Bem-vindo à E-Club, ${fullName || "Paciente"}`,
    status: getField(form, "status") || "Aguardando atendimento",
    code: accessCode || (fullName ? window.EClub.buildAccessCode(fullName) : ""),
    subtitle: getField(form, "subtitle") || "Página individual da paciente",
    access: slug ? window.EClub.buildPublicLink(slug) : "Link público da paciente",
    nextSession: getField(form, "nextSession"),
    lastReview: getField(form, "lastReview"),
    focus: getField(form, "focus"),
    appointments: collectRepeater(form.querySelector('[data-repeater="appointments"]')),
    visits: collectRepeater(form.querySelector('[data-repeater="visits"]')),
    procedures: collectRepeater(form.querySelector('[data-repeater="procedures"]')),
    notes: getField(form, "notes")
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean),
    contact: collectRepeater(form.querySelector('[data-repeater="contact"]')),
    links: collectRepeater(form.querySelector('[data-repeater="links"]')),
    is_archived: getField(form, "status") === "Página arquivada"
  };

  return profile;
}

function syncPreview(form, previewRoot) {
  const profile = getPreviewProfile(form);
  profile.id = form._currentPatientId || "";
  window.EClub.renderPatientProfile(previewRoot, profile, { archived: profile.is_archived });
  const accessChip = document.querySelector("[data-access-chip]");
  if (accessChip) {
    accessChip.textContent = profile.status || "Pronta para edição";
  }
  updateActionButtons(profile);
  return profile;
}

function updateActionButtons(profile) {
  const copyButton = document.querySelector("[data-copy-link]");
  const openButton = document.querySelector("[data-open-link]");
  const archiveButton = document.querySelector("[data-archive-patient]");

  const slug = window.EClub.slugify(profile?.slug || profile?.name || "");
  const hasLink = Boolean(profile?.id && slug && profile?.name);

  if (copyButton) copyButton.disabled = !hasLink;
  if (openButton) openButton.disabled = !hasLink;
  if (archiveButton) archiveButton.textContent = profile?.is_archived ? "Desarquivar" : "Arquivar";
}

function getPublicLinkFromForm(form) {
  const slug = window.EClub.slugify(getField(form, "slug") || getField(form, "full_name"));
  return window.EClub.buildPublicLink(slug);
}

function buildPatientPayload(form, currentPatient = {}) {
  const fullName = getField(form, "full_name");
  const slugValue = getField(form, "slug") || window.EClub.slugify(fullName);
  const accessCode = getField(form, "access_code") || (fullName ? window.EClub.buildAccessCode(fullName) : "");
  const status = getField(form, "status") || "Aguardando atendimento";
  const isArchived = status === "Página arquivada";

  return {
    id: currentPatient.id || "",
    slug: slugValue,
    access_code: accessCode,
    full_name: fullName,
    is_archived: isArchived,
    profile: {
      name: fullName || "Paciente",
      initials: window.EClub.getInitials(fullName || "Paciente"),
      greeting: getField(form, "greeting") || `Bem-vindo à E-Club, ${fullName || "Paciente"}`,
      status,
      code: accessCode,
      subtitle: getField(form, "subtitle") || "Página individual da paciente",
      access: "Link público da paciente",
      nextSession: getField(form, "nextSession"),
      lastReview: getField(form, "lastReview"),
      focus: getField(form, "focus"),
      appointments: collectRepeater(form.querySelector('[data-repeater="appointments"]')),
      visits: collectRepeater(form.querySelector('[data-repeater="visits"]')),
      procedures: collectRepeater(form.querySelector('[data-repeater="procedures"]')),
      notes: getField(form, "notes")
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean),
      contact: collectRepeater(form.querySelector('[data-repeater="contact"]')),
      links: collectRepeater(form.querySelector('[data-repeater="links"]'))
    }
  };
}

function populateForm(form, patient) {
  const safe = normalizePatientFromList(patient);
  const profile = safe.profile;
  setField(form, "full_name", safe.full_name || profile.name || "");
  setField(form, "slug", safe.slug || "");
  setField(form, "access_code", safe.access_code || "");
  setField(form, "status", profile.status || "Aguardando atendimento");
  setField(form, "greeting", profile.greeting || `Bem-vindo à E-Club, ${safe.full_name || profile.name || "Paciente"}`);
  setField(form, "subtitle", profile.subtitle || "Página individual da paciente");
  setField(form, "focus", profile.focus || "Role a tela para baixo para ver mais...");
  setField(form, "nextSession", profile.nextSession || "");
  setField(form, "lastReview", profile.lastReview || "");
  setField(form, "notes", window.EClub.ensureArray(profile.notes).join("\n"));

  renderRepeater(form.querySelector('[data-repeater="appointments"]'), "appointments", profile.appointments);
  renderRepeater(form.querySelector('[data-repeater="visits"]'), "visits", profile.visits);
  renderRepeater(form.querySelector('[data-repeater="procedures"]'), "procedures", profile.procedures);
  renderRepeater(form.querySelector('[data-repeater="contact"]'), "contact", profile.contact);
  renderRepeater(form.querySelector('[data-repeater="links"]'), "links", profile.links);

  setCurrentPatientLabel(safe);
  form._currentPatientId = safe.id || "";
  updateActionButtons({
    id: safe.id,
    slug: safe.slug,
    name: safe.full_name || profile.name,
    is_archived: safe.is_archived
  });
}

function renderPatientList(patients, { filter = "all", search = "", selectedId = "" } = {}) {
  const list = document.querySelector("[data-patient-list]");
  if (!list) return;

  const query = window.EClub.normalizeKey(search);
  const filtered = patients.filter((patient) => {
    const matchesFilter =
      filter === "all" || (filter === "active" && !patient.is_archived) || (filter === "archived" && patient.is_archived);
    const haystack = window.EClub.normalizeKey(
      `${patient.full_name} ${patient.slug} ${patient.access_code} ${patient.profile?.status || ""}`
    );
    return matchesFilter && (!query || haystack.includes(query));
  });

  if (!filtered.length) {
    list.innerHTML = `
      <div class="empty-state">
        <p class="empty-state__title">Nenhum paciente encontrado</p>
        <p class="empty-state__text">Ajuste a busca ou crie uma nova página.</p>
      </div>`;
    return;
  }

  list.innerHTML = filtered
    .map((patient) => {
      const active = patient.id === selectedId;
      const status = patient.is_archived ? "Arquivada" : patient.profile?.status || "Ativa";
      const updated = patient.updated_at ? new Date(patient.updated_at).toLocaleDateString("pt-BR") : "Sem data";
      return `
        <button class="patient-list__item ${active ? "is-active" : ""}" type="button" data-select-patient="${window.EClub.escapeHtml(
          patient.id
        )}">
          <div class="patient-list__copy">
            <strong>${window.EClub.escapeHtml(patient.full_name || patient.profile?.name || "Paciente")}</strong>
            <span>${window.EClub.escapeHtml(patient.slug || "")}</span>
          </div>
          <div class="patient-list__meta">
            <span class="chip ${patient.is_archived ? "" : "chip--solid"}">${window.EClub.escapeHtml(status)}</span>
            <small>Atualizado em ${window.EClub.escapeHtml(updated)}</small>
          </div>
        </button>`;
    })
    .join("");
}

function updateCounts(patients) {
  const total = patients.length;
  const archived = patients.filter((patient) => patient.is_archived).length;
  const active = total - archived;
  const totalEl = document.querySelector("[data-admin-total]");
  const activeEl = document.querySelector("[data-admin-active]");
  const archivedEl = document.querySelector("[data-admin-archived]");
  if (totalEl) totalEl.textContent = String(total);
  if (activeEl) activeEl.textContent = String(active);
  if (archivedEl) archivedEl.textContent = String(archived);
}

function setWorkspaceVisible(visible) {
  const workspace = document.querySelector("[data-workspace]");
  if (!workspace) return;
  workspace.classList.toggle("hidden", !visible);
}

function setAuthPanels(authenticated) {
  const loginPanel = document.querySelector("[data-login-panel]");
  const sessionPanel = document.querySelector("[data-session-panel]");
  const logoutButton = document.querySelector("[data-logout-button]");
  if (loginPanel) loginPanel.classList.toggle("hidden", authenticated);
  if (sessionPanel) sessionPanel.classList.toggle("hidden", !authenticated);
  if (logoutButton) logoutButton.classList.toggle("hidden", !authenticated);
  setWorkspaceVisible(authenticated);
}

function createPreviewTarget() {
  return document.querySelector("[data-preview-root]") || document;
}

function createBlankEditorState() {
  return createBlankPatient();
}

async function loadPatients(state) {
  const result = await apiRequest("list");
  if (!result.ok) {
    setStatusChip("Não foi possível carregar os pacientes", "warning");
    return [];
  }

  const patients = window.EClub.ensureArray(result.payload.patients).map(normalizePatientFromList);
  state.patients = patients;
  updateCounts(patients);
  renderPatientList(patients, { ...state, selectedId: state.currentPatient?.id || "" });
  return patients;
}

function syncAutoFields(form, state) {
  const name = getField(form, "full_name");
  if (!name) return;

  const slugField = form.querySelector('[data-field="slug"]');
  const codeField = form.querySelector('[data-field="access_code"]');
  const greetingField = form.querySelector('[data-field="greeting"]');
  const subtitleField = form.querySelector('[data-field="subtitle"]');

  if (state.autoSlug || !slugField.value.trim()) {
    slugField.value = window.EClub.slugify(name);
    state.autoSlug = true;
  }

  if (state.autoCode || !codeField.value.trim()) {
    codeField.value = window.EClub.buildAccessCode(name);
    state.autoCode = true;
  }

  if (state.autoGreeting || !greetingField.value.trim()) {
    greetingField.value = `Bem-vindo à E-Club, ${name}`;
    state.autoGreeting = true;
  }

  if (state.autoSubtitle || !subtitleField.value.trim()) {
    subtitleField.value = "Página individual da paciente";
    state.autoSubtitle = true;
  }
}

function attachRepeaterEvents(form, state) {
  form.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-row]");
    if (addButton) {
      const name = addButton.dataset.addRow;
      const container = form.querySelector(`[data-repeater="${CSS.escape(name)}"]`);
      if (container) {
        const existingRows = Array.from(container.querySelectorAll("[data-repeater-row]"));
        container.insertAdjacentHTML("beforeend", renderRepeaterRow(name, {}));
        if (!existingRows.length) {
          syncPreview(form, createPreviewTarget());
        }
      }
      return;
    }

    const removeButton = event.target.closest("[data-remove-row]");
    if (removeButton) {
      const row = removeButton.closest("[data-repeater-row]");
      const container = row?.parentElement;
      if (row) row.remove();
      if (container && !container.querySelector("[data-repeater-row]")) {
        const name = container.dataset.repeater;
        container.innerHTML = renderRepeaterRow(name, {});
      }
      syncPreview(form, createPreviewTarget());
    }
  });
}

async function saveCurrentPatient(state) {
  const form = document.querySelector("[data-patient-form]");
  if (!form) return null;

  const patient = buildPatientPayload(form, state.currentPatient || {});
  if (!patient.full_name) {
    setStatusChip("Preencha o nome da paciente antes de salvar.", "warning");
    return null;
  }

  setStatusChip("Salvando no Supabase...", "neutral");
  const result = await apiRequest("save", {
    method: "POST",
    body: { patient }
  });

  if (!result.ok || !result.payload?.patient) {
    setStatusChip("Não foi possível salvar a página.", "warning");
    return null;
  }

  state.currentPatient = normalizePatientFromList(result.payload.patient);
  state.autoSlug = false;
  state.autoCode = false;
  state.autoGreeting = false;
  state.autoSubtitle = false;
  populateForm(form, state.currentPatient);
  syncPreview(form, createPreviewTarget());
  await loadPatients(state);
  renderPatientList(state.patients, { ...state, selectedId: state.currentPatient?.id || "" });
  setStatusChip("Página salva com sucesso.", "neutral");
  return state.currentPatient;
}

async function loadPatientIntoEditor(state, patient) {
  state.currentPatient = normalizePatientFromList(patient);
  state.autoSlug = false;
  state.autoCode = false;
  state.autoGreeting = false;
  state.autoSubtitle = false;
  const form = document.querySelector("[data-patient-form]");
  if (!form) return;
  populateForm(form, state.currentPatient);
  syncPreview(form, createPreviewTarget());
  renderPatientList(state.patients, { ...state, selectedId: state.currentPatient?.id || "" });
  setStatusChip("Paciente carregado.", "neutral");
}

async function duplicateCurrentPatient(state) {
  if (!state.currentPatient?.id) {
    setStatusChip("Salve a página antes de duplicar.", "warning");
    return;
  }

  setStatusChip("Duplicando paciente...", "neutral");
  const result = await apiRequest("duplicate", {
    method: "POST",
    body: { id: state.currentPatient.id }
  });

  if (!result.ok || !result.payload?.patient) {
    setStatusChip("Não foi possível duplicar.", "warning");
    return;
  }

  await loadPatients(state);
  await loadPatientIntoEditor(state, result.payload.patient);
}

async function toggleArchiveCurrentPatient(state) {
  if (!state.currentPatient?.id) {
    setStatusChip("Salve a página antes de arquivar.", "warning");
    return;
  }

  const form = document.querySelector("[data-patient-form]");
  const patient = buildPatientPayload(form, state.currentPatient);
  patient.is_archived = !state.currentPatient.is_archived;
  patient.profile.status = patient.is_archived ? "Página arquivada" : "Acesso individual ativo";
  patient.profile.greeting = getField(form, "greeting") || `Bem-vindo à E-Club, ${patient.full_name}`;
  patient.profile.code = patient.access_code;
  patient.profile.name = patient.full_name;

  const result = await apiRequest("save", {
    method: "POST",
    body: { patient }
  });

  if (!result.ok || !result.payload?.patient) {
    setStatusChip("Não foi possível atualizar o status.", "warning");
    return;
  }

  state.currentPatient = normalizePatientFromList(result.payload.patient);
  populateForm(form, state.currentPatient);
  syncPreview(form, createPreviewTarget());
  await loadPatients(state);
  setStatusChip(state.currentPatient.is_archived ? "Página arquivada." : "Página reativada.", "neutral");
}

async function deleteCurrentPatient(state) {
  if (!state.currentPatient?.id) {
    setStatusChip("Selecione uma página para excluir.", "warning");
    return;
  }

  const confirmed = window.confirm(
    `Excluir permanentemente a página de ${state.currentPatient.full_name}? Essa ação não pode ser desfeita.`
  );
  if (!confirmed) return;

  const result = await apiRequest("delete", {
    method: "DELETE",
    params: { id: state.currentPatient.id }
  });

  if (!result.ok) {
    setStatusChip("Não foi possível excluir.", "warning");
    return;
  }

  state.currentPatient = null;
  state.autoSlug = true;
  state.autoCode = true;
  state.autoGreeting = true;
  state.autoSubtitle = true;
  await loadPatients(state);
  resetEditorToBlank();
  setStatusChip("Página excluída.", "neutral");
}

function resetEditorToBlank() {
  const form = document.querySelector("[data-patient-form]");
  if (!form) return;
  populateForm(form, createBlankPatient());
  syncPreview(form, createPreviewTarget());
  setCurrentPatientLabel(null);
}

function bindFormEvents(state) {
  const form = document.querySelector("[data-patient-form]");
  if (!form) return;

  const previewRoot = createPreviewTarget();
  const manualFields = new Set(["slug", "access_code", "greeting", "subtitle"]);

  form.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.matches('[data-field="full_name"]')) {
      syncAutoFields(form, state);
    }

    if (target.matches('[data-field="slug"]')) state.autoSlug = false;
    if (target.matches('[data-field="access_code"]')) state.autoCode = false;
    if (target.matches('[data-field="greeting"]')) state.autoGreeting = false;
    if (target.matches('[data-field="subtitle"]')) state.autoSubtitle = false;

    if (target.matches('[data-field="full_name"]') && !manualFields.has(target.dataset.field)) {
      syncAutoFields(form, state);
    }

    syncPreview(form, previewRoot);
    setStatusChip("Alterações locais prontas para salvar.", "neutral");
  });

  form.addEventListener("change", () => {
    syncPreview(form, previewRoot);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveCurrentPatient(state);
  });

  attachRepeaterEvents(form, state);
}

function bindSidebarEvents(state) {
  const search = document.querySelector("[data-patient-search]");
  const filterButtons = Array.from(document.querySelectorAll("[data-filter-status]"));
  const createButton = document.querySelector("[data-create-patient]");
  const copyButton = document.querySelector("[data-copy-link]");
  const openButton = document.querySelector("[data-open-link]");
  const duplicateButton = document.querySelector("[data-duplicate-patient]");
  const archiveButton = document.querySelector("[data-archive-patient]");
  const deleteButton = document.querySelector("[data-delete-patient]");

  search?.addEventListener("input", () => {
    state.search = search.value;
    renderPatientList(state.patients, { ...state, selectedId: state.currentPatient?.id || "" });
  });

  const list = document.querySelector("[data-patient-list]");
  list?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-select-patient]");
    if (!button) return;
    const patient = state.patients.find((item) => item.id === button.dataset.selectPatient);
    if (patient) {
      void loadPatientIntoEditor(state, patient);
    }
  });

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filterStatus || "all";
      filterButtons.forEach((item) => item.setAttribute("aria-selected", String(item === button)));
      renderPatientList(state.patients, { ...state, selectedId: state.currentPatient?.id || "" });
    });
  });

  createButton?.addEventListener("click", () => {
    state.currentPatient = null;
    state.autoSlug = true;
    state.autoCode = true;
    state.autoGreeting = true;
    state.autoSubtitle = true;
    resetEditorToBlank();
    renderPatientList(state.patients, { ...state, selectedId: "" });
    setStatusChip("Nova página pronta para preenchimento.", "neutral");
  });

  copyButton?.addEventListener("click", async () => {
    const form = document.querySelector("[data-patient-form]");
    if (!form) return;
    const link = getPublicLinkFromForm(form);
    await window.EClub.copyText(link);
    setStatusChip("Link copiado.", "neutral");
  });

  openButton?.addEventListener("click", () => {
    const form = document.querySelector("[data-patient-form]");
    if (!form) return;
    const link = getPublicLinkFromForm(form);
    window.open(link, "_blank", "noopener,noreferrer");
  });

  duplicateButton?.addEventListener("click", () => {
    void duplicateCurrentPatient(state);
  });

  archiveButton?.addEventListener("click", () => {
    void toggleArchiveCurrentPatient(state);
  });

  deleteButton?.addEventListener("click", () => {
    void deleteCurrentPatient(state);
  });

  document.querySelector("[data-logout-button]")?.addEventListener("click", async () => {
    await apiRequest("logout", { method: "POST" });
    window.location.reload();
  });

  document.querySelector("[data-login-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = String(document.querySelector("[data-login-password]")?.value || "").trim();
    if (!password) {
      setSessionChip("Digite a senha para entrar", "warning");
      return;
    }

    setSessionChip("Validando acesso...", "neutral");
    const result = await apiRequest("login", {
      method: "POST",
      body: { password }
    });

    if (!result.ok) {
      setSessionChip("Senha inválida ou acesso não configurado", "warning");
      return;
    }

    window.location.reload();
  });
}

async function bootstrap() {
  if (!window.EClub) return;

  setYear();
  const state = {
    patients: [],
    filter: "all",
    search: "",
    currentPatient: null,
    autoSlug: true,
    autoCode: true,
    autoGreeting: true,
    autoSubtitle: true
  };

  bindFormEvents(state);
  bindSidebarEvents(state);
  resetEditorToBlank();

  const session = await apiRequest("session");
  if (!session.payload?.authenticated) {
    setAuthPanels(false);
    setSessionChip("Sem sessão ativa", "neutral");
    setStatusChip("Entre para começar a gerenciar os pacientes.", "neutral");
    return;
  }

  setAuthPanels(true);
  setSessionChip("Sessão ativa na Dra. Emlyn", "neutral");
  setStatusChip("Painel carregado.", "neutral");
  await loadPatients(state);

  const first = state.patients[0];
  if (first) {
    await loadPatientIntoEditor(state, first);
  } else {
    setCurrentPatientLabel(null);
  }

  document.querySelector("[data-workspace]")?.classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  void bootstrap();
});
