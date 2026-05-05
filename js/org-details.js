const API_BASE = window.GSUAuth ? window.GSUAuth.API_BASE :
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === ""
    ? "http://localhost:3001"
    : "https://gsu-clubs-portal-h8da.vercel.app");

document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("menuBtn");
  const mainNav = document.getElementById("mainNav");
  if (menuBtn && mainNav) {
    menuBtn.addEventListener("click", () => mainNav.classList.toggle("open"));
  }

  const orgTitle = document.getElementById("orgTitle");
  const orgTypeLabel = document.getElementById("orgTypeLabel");
  const docSections = document.getElementById("docSections");
  const openAdminModalBtn = document.getElementById("openAdminModal");
  const docEditor = document.getElementById("docEditor");
  const docForm = document.getElementById("docForm");
  const docIdInput = document.getElementById("docId");
  const docTypeInput = document.getElementById("docType");
  const docTitleInput = document.getElementById("docTitleInput");
  const docContentInput = document.getElementById("docContentInput");
  const docFileInput = document.getElementById("docFileInput");
  const docFormReset = document.getElementById("docFormReset");
  const editActions = document.querySelector(".org-page__actions");

  const params = new URLSearchParams(window.location.search);
  const orgSlugParam = params.get("slug");

  let currentOrg = null;
  let isUnlocked = false;
  let docsState = { constitution: [], bylaws: [] };

  const getToken = () => window.GSUAuth?.getSession()?.token || null;

  const session = window.GSUAuth?.getSession() || null;
  const isAdmin = session?.role === "super_admin";
  const isOrgOwner = (org) =>
    !!session && session.role === "org_admin" && session.orgSlug === org?.slug;

  const escapeHtml = (value = "") =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const formatDate = (isoDate) => {
    if (!isoDate) return "No update date";
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return "No update date";
    return date.toLocaleString();
  };

  const authFetch = (url, options = {}) => {
    const token = getToken();
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  };

  const makeDocumentCardMarkup = (doc, typeLabel) => {
    const safeTitle = escapeHtml(doc.title || "Untitled document");
    const safeContent = escapeHtml(doc.content || "");
    const fileMarkup = doc.fileUrl
      ? `<a class="doc-card__file-link" href="${escapeHtml(doc.fileUrl)}" target="_blank" rel="noopener">View attached file</a>`
      : "";

    return `
      <details class="doc-card">
        <summary class="doc-card__summary">
          <div>
            <p class="doc-card__type">${typeLabel}</p>
            <h3 class="doc-card__title">${safeTitle}</h3>
            <p class="doc-card__date">Last updated: ${escapeHtml(formatDate(doc.updatedAt))}</p>
          </div>
        </summary>
        <div class="doc-card__body">
          <p>${safeContent.replaceAll("\n", "<br/>")}</p>
          ${fileMarkup}
          ${
            isUnlocked
              ? `<div class="doc-card__admin-actions">
                  <button type="button" class="doc-card__admin-btn" data-edit-doc-id="${doc.id}" data-edit-doc-type="${doc.docType}">Edit</button>
                  <button type="button" class="doc-card__admin-btn doc-card__admin-btn--danger" data-delete-doc-id="${doc.id}">Delete</button>
                </div>`
              : ""
          }
        </div>
      </details>
    `;
  };

  const renderDocuments = () => {
    const constitutionCards = docsState.constitution
      .map((doc) => makeDocumentCardMarkup(doc, "Constitution"))
      .join("");
    const bylawsCards = docsState.bylaws
      .map((doc) => makeDocumentCardMarkup(doc, "Bylaws"))
      .join("");

    docSections.innerHTML = `
      <section class="doc-section">
        <h2 class="doc-section__heading">Constitution</h2>
        <div class="doc-section__list">
          ${constitutionCards || '<p class="org-grid__status">No constitution documents yet.</p>'}
        </div>
      </section>
      <section class="doc-section">
        <h2 class="doc-section__heading">Bylaws</h2>
        <div class="doc-section__list">
          ${bylawsCards || '<p class="org-grid__status">No bylaws documents yet.</p>'}
        </div>
      </section>
    `;
  };

  const resetForm = () => {
    docIdInput.value = "";
    docTypeInput.value = "constitution";
    docTitleInput.value = "";
    docContentInput.value = "";
    if (docFileInput) docFileInput.value = "";
  };

  const unlockEditing = () => {
    isUnlocked = true;
    if (docEditor) docEditor.hidden = false;
    if (editActions) editActions.hidden = true;
    renderDocuments();
  };

  const hideEditUI = () => {
    if (editActions) editActions.hidden = true;
    if (docEditor) docEditor.hidden = true;
  };

  const bootstrapPage = async () => {
    if (!orgSlugParam) {
      orgTitle.textContent = "Organization not found";
      orgTypeLabel.textContent = "Missing organization parameter";
      docSections.innerHTML = '<p class="org-grid__status">Please return and select an organization.</p>';
      hideEditUI();
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/orgs/${orgSlugParam}`);
      if (!response.ok) throw new Error("Not found");

      const org = await response.json();
      currentOrg = org;

      orgTitle.textContent = org.name;
      orgTypeLabel.textContent = org.type === "greek" ? "Greek Organization" : "Club / Organization";

      docsState = {
        constitution: org.documents.filter((d) => d.docType === "constitution"),
        bylaws: org.documents.filter((d) => d.docType === "bylaws"),
      };

      if (isAdmin || isOrgOwner(org)) {
        unlockEditing();
      } else {
        hideEditUI();
        renderDocuments();
      }
    } catch {
      orgTitle.textContent = "Organization not available";
      orgTypeLabel.textContent = "Load error";
      docSections.innerHTML = '<p class="org-grid__status">Could not load organization data.</p>';
      hideEditUI();
    }
  };

  if (docFormReset) docFormReset.addEventListener("click", resetForm);

  const uploadFile = async (file) => {
    if (!file) return null;
    const ALLOWED = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!ALLOWED.includes(file.type)) throw new Error("Only PDF or Word documents are allowed.");
    if (file.size > 10 * 1024 * 1024) throw new Error("File must be under 10MB.");

    const presignRes = await authFetch(`${API_BASE}/api/uploads/presign`, {
      method: "POST",
      body: JSON.stringify({ contentType: file.type, orgSlug: currentOrg.slug }),
    });
    if (!presignRes.ok) throw new Error("Could not get upload URL.");

    const { uploadUrl, fileUrl } = await presignRes.json();

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!uploadRes.ok) throw new Error("File upload failed.");

    return fileUrl;
  };

  if (docForm) {
    docForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!currentOrg || !isUnlocked) return;

      const docType = docTypeInput.value;
      const docTitle = docTitleInput.value.trim();
      const docContent = docContentInput.value.trim();
      const docId = docIdInput.value.trim();

      if (!docTitle || !docContent || !["constitution", "bylaws"].includes(docType)) return;

      try {
        const file = docFileInput?.files?.[0] || null;
        const fileUrl = file ? await uploadFile(file) : undefined;

        let res;

        if (docId) {
          res = await authFetch(`${API_BASE}/api/documents/${docId}`, {
            method: "PATCH",
            body: JSON.stringify({ title: docTitle, content: docContent, ...(fileUrl !== undefined && { fileUrl }) }),
          });
        } else {
          res = await authFetch(`${API_BASE}/api/orgs/${currentOrg.slug}/documents`, {
            method: "POST",
            body: JSON.stringify({ docType, title: docTitle, content: docContent, fileUrl: fileUrl || null }),
          });
        }

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to save document");
        }

        const saved = await res.json();

        if (docId) {
          const list = docsState[saved.docType];
          const idx = list.findIndex((d) => d.id === saved.id);
          if (idx !== -1) list[idx] = saved;
        } else {
          docsState[saved.docType].unshift(saved);
        }

        renderDocuments();
        resetForm();
      } catch (error) {
        window.alert(error.message);
      }
    });
  }

  docSections.addEventListener("click", async (event) => {
    if (!isUnlocked) return;

    const editBtn = event.target.closest("[data-edit-doc-id]");
    if (editBtn) {
      const docId = editBtn.getAttribute("data-edit-doc-id");
      const docType = editBtn.getAttribute("data-edit-doc-type");
      const targetDoc = docsState[docType]?.find((doc) => doc.id === docId);
      if (!targetDoc) return;

      docIdInput.value = targetDoc.id;
      docTypeInput.value = docType;
      docTitleInput.value = targetDoc.title;
      docContentInput.value = targetDoc.content;
      window.scrollTo({ top: docEditor.offsetTop - 90, behavior: "smooth" });
      return;
    }

    const deleteBtn = event.target.closest("[data-delete-doc-id]");
    if (!deleteBtn) return;

    const docId = deleteBtn.getAttribute("data-delete-doc-id");
    if (!confirm("Delete this document?")) return;

    const res = await authFetch(`${API_BASE}/api/documents/${docId}`, { method: "DELETE" });
    if (!res.ok) {
      window.alert("Failed to delete document.");
      return;
    }

    docsState.constitution = docsState.constitution.filter((d) => d.id !== docId);
    docsState.bylaws = docsState.bylaws.filter((d) => d.id !== docId);
    renderDocuments();
  });

  bootstrapPage();
});
