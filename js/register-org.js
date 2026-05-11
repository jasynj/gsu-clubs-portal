const API_BASE = window.GSUAuth ? window.GSUAuth.API_BASE :
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === ""
    ? "http://localhost:3001"
    : "https://gsu-clubs-portal-h8da.vercel.app");

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 10;
const MAX_MEMBERS = 50;

document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("menuBtn");
  const mainNav = document.getElementById("mainNav");
  if (menuBtn && mainNav) {
    menuBtn.addEventListener("click", () => mainNav.classList.toggle("open"));
  }

  const form = document.getElementById("regForm");
  const typeSel = document.getElementById("regType");
  const nameInput = document.getElementById("regName");
  const memberInput = document.getElementById("memberInput");
  const memberAddBtn = document.getElementById("memberAddBtn");
  const memberChips = document.getElementById("memberChips");
  const filesInput = document.getElementById("regFiles");
  const fileStatus = document.getElementById("fileStatus");
  const errEl = document.getElementById("regError");
  const submitBtn = document.getElementById("regSubmitBtn");
  const successEl = document.getElementById("regSuccess");

  const members = [];

  const escapeHtml = (s = "") =>
    String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));

  const renderChips = (container, items, removeFn) => {
    if (!items.length) {
      container.innerHTML = "";
      return;
    }
    container.innerHTML = items
      .map(
        (item, i) => `
          <span class="chip">
            ${escapeHtml(item)}
            <button type="button" class="chip__remove" data-index="${i}" aria-label="Remove">&times;</button>
          </span>
        `
      )
      .join("");
    container.querySelectorAll(".chip__remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-index"));
        removeFn(idx);
      });
    });
  };

  const renderMembers = () =>
    renderChips(memberChips, members, (i) => {
      members.splice(i, 1);
      renderMembers();
    });

  memberAddBtn.addEventListener("click", () => {
    const v = memberInput.value.trim();
    if (!v) return;
    if (members.length >= MAX_MEMBERS) {
      errEl.textContent = `Max ${MAX_MEMBERS} members.`;
      return;
    }
    members.push(v);
    memberInput.value = "";
    memberInput.focus();
    errEl.textContent = "";
    renderMembers();
  });

  memberInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      memberAddBtn.click();
    }
  });

  filesInput.addEventListener("change", () => {
    const files = Array.from(filesInput.files || []);
    if (files.length > MAX_FILES) {
      errEl.textContent = `Max ${MAX_FILES} files.`;
      filesInput.value = "";
      fileStatus.textContent = "";
      return;
    }
    for (const f of files) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        errEl.textContent = `${f.name}: only PDF or Word documents are allowed.`;
        filesInput.value = "";
        fileStatus.textContent = "";
        return;
      }
      if (f.size > MAX_FILE_BYTES) {
        errEl.textContent = `${f.name} is over 10MB.`;
        filesInput.value = "";
        fileStatus.textContent = "";
        return;
      }
    }
    errEl.textContent = "";
    fileStatus.textContent = files.length
      ? `${files.length} file${files.length === 1 ? "" : "s"} ready: ${files.map((f) => f.name).join(", ")}`
      : "";
  });

  const uploadOne = async (file) => {
    const presignRes = await fetch(`${API_BASE}/api/uploads/presign-public`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: file.type }),
    });
    if (!presignRes.ok) throw new Error(`Could not get upload URL for ${file.name}`);
    const { uploadUrl, fileUrl } = await presignRes.json();

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!putRes.ok) throw new Error(`Upload failed for ${file.name}`);

    return fileUrl;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errEl.textContent = "";

    const submittedCategory = typeSel.value;
    const orgName = nameInput.value.trim();

    if (!submittedCategory) {
      errEl.textContent = "Please choose Organization or Club.";
      return;
    }
    if (!orgName) {
      errEl.textContent = "Please enter the organization or club name.";
      return;
    }
    if (members.length === 0) {
      errEl.textContent = "Please add at least one founding member.";
      return;
    }

    // New orgs default to the general clubs bucket. submittedCategory preserves
    // whether the user selected "Organization" or "Club" on the form.
    const orgType = "club";

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    try {
      const files = Array.from(filesInput.files || []);
      const fileUrls = [];
      for (let i = 0; i < files.length; i++) {
        fileStatus.textContent = `Uploading ${i + 1} of ${files.length}: ${files[i].name}`;
        const url = await uploadOne(files[i]);
        fileUrls.push(url);
      }
      fileStatus.textContent = "";

      const res = await fetch(`${API_BASE}/api/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName,
          orgType,
          submittedCategory,
          foundingMembers: members,
          meetingDates: [],
          fileUrls,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Submission failed.");
      }

      form.hidden = true;
      successEl.hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      errEl.textContent = err.message || "Submission failed. Please try again.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit for Review";
    }
  });
});
