document.addEventListener("DOMContentLoaded", () => {
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
  const adminModal = document.getElementById("adminModal");
  const adminPasswordForm = document.getElementById("adminPasswordForm");
  const adminPasswordInput = document.getElementById("adminPasswordInput");
  const adminError = document.getElementById("adminError");

  const params = new URLSearchParams(window.location.search);
  const orgNameParam = params.get("org");

  const MAX_FILE_SIZE_BYTES = 1.5 * 1024 * 1024;
  const STORAGE_PREFIX = "gsu-org-docs-v1";

  let currentOrg = null;
  let isUnlocked = false;
  let docsState = {
    constitution: [],
    bylaws: [],
  };

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

  const slugify = (value) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const getStorageKey = () => `${STORAGE_PREFIX}:${slugify(currentOrg.name)}`;

  const defaultDocsForOrg = (orgName) => ({
    constitution: [
      {
        id: crypto.randomUUID(),
        title: "Constitution Document",
        content: `Constitution placeholder for ${orgName}.`,
        updatedAt: new Date().toISOString(),
      },
    ],
    bylaws: [
      {
        id: crypto.randomUUID(),
        title: "Bylaws Document",
        content: `Bylaws placeholder for ${orgName}.`,
        updatedAt: new Date().toISOString(),
      },
    ],
  });

  const saveDocs = () => {
    if (!currentOrg) return;
    localStorage.setItem(getStorageKey(), JSON.stringify(docsState));
  };

  const loadDocs = () => {
    if (!currentOrg) return;
    const stored = localStorage.getItem(getStorageKey());
    if (!stored) {
      docsState = defaultDocsForOrg(currentOrg.name);
      saveDocs();
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      docsState = {
        constitution: Array.isArray(parsed.constitution) ? parsed.constitution : [],
        bylaws: Array.isArray(parsed.bylaws) ? parsed.bylaws : [],
      };

      if (!docsState.constitution.length && !docsState.bylaws.length) {
        docsState = defaultDocsForOrg(currentOrg.name);
        saveDocs();
      }
    } catch (error) {
      docsState = defaultDocsForOrg(currentOrg.name);
      saveDocs();
    }
  };

  const makeDocumentCardMarkup = (doc, typeLabel) => {
    const safeTitle = escapeHtml(doc.title || "Untitled document");
    const safeContent = escapeHtml(doc.content || "");
    const fileMarkup =
      doc.fileData && doc.fileName
        ? `<a class="doc-card__file-link" href="${doc.fileData}" download="${escapeHtml(doc.fileName)}">Download attached file: ${escapeHtml(doc.fileName)}</a>`
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
                  <button type="button" class="doc-card__admin-btn" data-edit-doc-id="${doc.id}" data-edit-doc-type="${typeLabel.toLowerCase()}">Edit</button>
                  <button type="button" class="doc-card__admin-btn doc-card__admin-btn--danger" data-delete-doc-id="${doc.id}" data-delete-doc-type="${typeLabel.toLowerCase()}">Delete</button>
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
    const bylawsCards = docsState.bylaws.map((doc) => makeDocumentCardMarkup(doc, "Bylaws")).join("");

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
    docFileInput.value = "";
  };

  const openModal = () => {
    adminModal.hidden = false;
    adminError.textContent = "";
    adminPasswordInput.value = "";
    adminPasswordInput.focus();
  };

  const closeModal = () => {
    adminModal.hidden = true;
    adminError.textContent = "";
  };

  const unlockEditing = () => {
    isUnlocked = true;
    docEditor.hidden = false;
    openAdminModalBtn.textContent = "Editor Unlocked";
    openAdminModalBtn.disabled = true;
    renderDocuments();
  };

  const getFileData = async (file) => {
    if (!file) return null;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error("File is too large. Please upload a file under 1.5MB.");
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          fileName: file.name,
          fileData: reader.result,
          mimeType: file.type || "application/octet-stream",
        });
      };
      reader.onerror = () => reject(new Error("Could not read uploaded file."));
      reader.readAsDataURL(file);
    });
  };

  const bootstrapPage = async () => {
    if (!orgNameParam) {
      orgTitle.textContent = "Organization not found";
      orgTypeLabel.textContent = "Missing organization parameter";
      docSections.innerHTML = '<p class="org-grid__status">Please return and select an organization.</p>';
      openAdminModalBtn.disabled = true;
      return;
    }

    try {
      const response = await fetch("org_passwords.json");
      if (!response.ok) throw new Error("Could not load organizations");

      const data = await response.json();
      const orgList = Array.isArray(data?.passwords) ? data.passwords : [];

      currentOrg = orgList.find((org) => org.name === orgNameParam);
      if (!currentOrg) {
        orgTitle.textContent = "Organization not found";
        orgTypeLabel.textContent = "Not registered";
        docSections.innerHTML = '<p class="org-grid__status">The selected organization is not in the current list.</p>';
        openAdminModalBtn.disabled = true;
        return;
      }

      orgTitle.textContent = currentOrg.name;
      orgTypeLabel.textContent = currentOrg.type === "greek" ? "Greek Organization" : "Club / Organization";
      loadDocs();
      renderDocuments();
    } catch (error) {
      orgTitle.textContent = "Organization not available";
      orgTypeLabel.textContent = "Load error";
      docSections.innerHTML = '<p class="org-grid__status">Could not load organization data.</p>';
      openAdminModalBtn.disabled = true;
    }
  };

  openAdminModalBtn.addEventListener("click", openModal);

  adminModal.addEventListener("click", (event) => {
    const closeTarget = event.target.closest("[data-close-modal='true']");
    if (closeTarget) {
      closeModal();
    }
  });

  adminPasswordForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!currentOrg) return;

    const enteredPassword = adminPasswordInput.value.trim();
    if (enteredPassword !== currentOrg.password) {
      adminError.textContent = "Incorrect password for this organization.";
      return;
    }

    closeModal();
    unlockEditing();
  });

  docFormReset.addEventListener("click", resetForm);

  docForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentOrg || !isUnlocked) return;

    const docType = docTypeInput.value;
    const docTitle = docTitleInput.value.trim();
    const docContent = docContentInput.value.trim();
    const docId = docIdInput.value.trim();

    if (!docTitle || !docContent || !["constitution", "bylaws"].includes(docType)) return;

    try {
      const uploadedFile = await getFileData(docFileInput.files?.[0]);
      const timestamp = new Date().toISOString();
      const typeCollection = docsState[docType];

      if (docId) {
        const existing = typeCollection.find((doc) => doc.id === docId);
        if (!existing) return;

        existing.title = docTitle;
        existing.content = docContent;
        existing.updatedAt = timestamp;
        if (uploadedFile) {
          existing.fileName = uploadedFile.fileName;
          existing.fileData = uploadedFile.fileData;
          existing.mimeType = uploadedFile.mimeType;
        }
      } else {
        typeCollection.unshift({
          id: crypto.randomUUID(),
          title: docTitle,
          content: docContent,
          updatedAt: timestamp,
          ...(uploadedFile || {}),
        });
      }

      saveDocs();
      renderDocuments();
      resetForm();
    } catch (error) {
      window.alert(error.message);
    }
  });

  docSections.addEventListener("click", (event) => {
    if (!isUnlocked) return;

    const editBtn = event.target.closest("[data-edit-doc-id]");
    if (editBtn) {
      const docId = editBtn.getAttribute("data-edit-doc-id");
      const docType = editBtn.getAttribute("data-edit-doc-type");
      if (!docId || !docType || !["constitution", "bylaws"].includes(docType)) return;

      const targetDoc = docsState[docType].find((doc) => doc.id === docId);
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
    const docType = deleteBtn.getAttribute("data-delete-doc-type");
    if (!docId || !docType || !["constitution", "bylaws"].includes(docType)) return;

    docsState[docType] = docsState[docType].filter((doc) => doc.id !== docId);
    saveDocs();
    renderDocuments();
  });

  bootstrapPage();
});
