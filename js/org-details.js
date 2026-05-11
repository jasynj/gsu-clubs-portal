const API_BASE = window.GSUAuth ? window.GSUAuth.API_BASE :
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === ""
    ? "http://localhost:3001"
    : "https://gsu-clubs-portal-h8da.vercel.app");

const DOC_TYPES = [
  { key: "details",      label: "About",        visibility: "public",  uploadKind: "image" },
  { key: "constitution", label: "Constitution", visibility: "private", uploadKind: "file"  },
  { key: "bylaws",       label: "Bylaws",       visibility: "private", uploadKind: "file"  },
];

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";
const FILE_ACCEPT = "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

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
  const docTitleLabel = document.getElementById("docTitleLabel");
  const docContentLabel = document.getElementById("docContentLabel");
  const docFileLabel = document.getElementById("docFileLabel");
  const docFormReset = document.getElementById("docFormReset");
  const editActions = document.querySelector(".org-page__actions");

  const params = new URLSearchParams(window.location.search);
  const orgSlugParam = params.get("slug");

  let currentOrg = null;
  let isUnlocked = false;
  let docsState = Object.fromEntries(DOC_TYPES.map((t) => [t.key, []]));

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

  const getDetailsDoc = () => (docsState.details && docsState.details[0]) || null;

  const renderDetailsCard = () => {
    const detailsDoc = getDetailsDoc();

    if (!detailsDoc) {
      if (!isUnlocked) {
        return `
          <section class="org-details-card org-details-card--empty">
            <p class="org-details-card__placeholder">This organization hasn't published a profile yet.</p>
          </section>
        `;
      }
      return `
        <section class="org-details-card org-details-card--empty">
          <p class="org-details-card__placeholder">No public profile yet. Use the editor below — pick "Details" as the type — to create one.</p>
        </section>
      `;
    }

    const safeTitle = escapeHtml(detailsDoc.title || "");
    const safeContent = escapeHtml(detailsDoc.content || "").replaceAll("\n", "<br/>");
    const imageMarkup = detailsDoc.fileUrl
      ? `<img class="org-details-card__image" src="${escapeHtml(detailsDoc.fileUrl)}" alt="${safeTitle}" />`
      : `<div class="org-details-card__image org-details-card__image--placeholder" aria-hidden="true"></div>`;

    const adminControls = isUnlocked
      ? `<div class="org-details-card__actions">
           <button type="button" class="doc-card__admin-btn" data-edit-doc-id="${detailsDoc.id}" data-edit-doc-type="details">Edit details</button>
           <button type="button" class="doc-card__admin-btn doc-card__admin-btn--danger" data-delete-doc-id="${detailsDoc.id}">Delete</button>
         </div>`
      : "";

    return `
      <section class="org-details-card">
        ${imageMarkup}
        <div class="org-details-card__body">
          <h2 class="org-details-card__title">${safeTitle}</h2>
          <p class="org-details-card__text">${safeContent}</p>
          ${adminControls}
        </div>
      </section>
    `;
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

  const renderPrivateBlock = (type) => {
    const docs = docsState[type.key] || [];
    const count = docs.length;
    const latestUpdated = docs.reduce(
      (latest, d) => (!latest || new Date(d.updatedAt) > new Date(latest) ? d.updatedAt : latest),
      null
    );

    const cards = docs.map((doc) => makeDocumentCardMarkup(doc, type.label)).join("");
    const emptyState = `<p class="doc-block__empty">No ${type.label.toLowerCase()} on file yet. Add one using the editor below.</p>`;
    const meta = count > 0
      ? `<span class="doc-block__meta">${count} document${count === 1 ? "" : "s"} · Last updated ${escapeHtml(formatDate(latestUpdated))}</span>`
      : `<span class="doc-block__meta doc-block__meta--empty">No documents yet</span>`;

    return `
      <details class="doc-block">
        <summary class="doc-block__summary">
          <div class="doc-block__heading-row">
            <h2 class="doc-block__heading">${type.label}</h2>
            ${meta}
          </div>
        </summary>
        <div class="doc-block__body">
          ${cards || emptyState}
        </div>
      </details>
    `;
  };

  const renderDocuments = () => {
    const detailsMarkup = renderDetailsCard();
    const privateBlocks = isUnlocked
      ? DOC_TYPES.filter((t) => t.visibility === "private").map(renderPrivateBlock).join("")
      : "";
    docSections.innerHTML = detailsMarkup + privateBlocks;
  };

  const applyTypeAwareFormUI = () => {
    const selectedType = docTypeInput.value;
    if (selectedType === "details") {
      docTitleLabel.textContent = "Display name / heading";
      docContentLabel.textContent = "Public summary";
      docFileLabel.textContent = "Profile image (PNG, JPEG, or WEBP)";
      docContentInput.placeholder = "Describe your organization for visitors...";
      if (docFileInput) docFileInput.accept = IMAGE_ACCEPT;
    } else {
      docTitleLabel.textContent = "Title";
      docContentLabel.textContent = "Document Content";
      docFileLabel.textContent = "Optional File Upload (PDF or DOCX)";
      docContentInput.placeholder = "Paste the constitution/bylaw text or summary...";
      if (docFileInput) docFileInput.accept = FILE_ACCEPT;
    }
  };

  const resetForm = () => {
    docIdInput.value = "";
    docTypeInput.value = "details";
    docTitleInput.value = "";
    docContentInput.value = "";
    if (docFileInput) docFileInput.value = "";
    applyTypeAwareFormUI();
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
      const token = getToken();
      const response = await fetch(`${API_BASE}/api/orgs/${orgSlugParam}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error("Not found");

      const org = await response.json();
      currentOrg = org;

      const TYPE_LABELS = {
        nphc: "NPHC Organization",
        non_nphc: "Non-NPHC Organization",
        club: "Club / Organization",
      };
      orgTitle.textContent = org.name;
      orgTypeLabel.textContent = TYPE_LABELS[org.type] || "Organization";

      docsState = Object.fromEntries(
        DOC_TYPES.map((t) => [t.key, org.documents.filter((d) => d.docType === t.key)])
      );

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
  if (docTypeInput) docTypeInput.addEventListener("change", applyTypeAwareFormUI);
  applyTypeAwareFormUI();

  const uploadFile = async (file, kind) => {
    if (!file) return null;
    const allowed = kind === "image"
      ? ["image/png", "image/jpeg", "image/webp"]
      : ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type)) {
      throw new Error(kind === "image"
        ? "Only PNG, JPEG, or WEBP images are allowed."
        : "Only PDF or Word documents are allowed.");
    }
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
      let docId = docIdInput.value.trim();

      if (!docTitle || !docContent || !["constitution", "bylaws", "details"].includes(docType)) return;

      // Singleton enforcement for details: if creating a new one but one already exists, PATCH it instead.
      if (!docId && docType === "details") {
        const existing = getDetailsDoc();
        if (existing) docId = existing.id;
      }

      try {
        const file = docFileInput?.files?.[0] || null;
        const uploadKind = docType === "details" ? "image" : "file";
        const fileUrl = file ? await uploadFile(file, uploadKind) : undefined;

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
          else list.unshift(saved);
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
      applyTypeAwareFormUI();
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

    for (const key of Object.keys(docsState)) {
      docsState[key] = docsState[key].filter((d) => d.id !== docId);
    }
    renderDocuments();
  });

  bootstrapPage();
});
