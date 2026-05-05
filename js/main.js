const API_BASE = window.GSUAuth ? window.GSUAuth.API_BASE :
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === ""
    ? "http://localhost:3001"
    : "https://gsu-clubs-portal-h8da.vercel.app");

document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("menuBtn");
  const mainNav = document.getElementById("mainNav");

  if (menuBtn && mainNav) {
    menuBtn.addEventListener("click", () => {
      mainNav.classList.toggle("open");
    });
  }

  const toggleBars = document.querySelectorAll(".toggle-bar");
  toggleBars.forEach((toggleBar) => {
    const buttonGroup = toggleBar.querySelectorAll(".toggle-bar__btn");
    const sectionContainer = toggleBar.closest(".section, .container, body");
    const panelGroup = sectionContainer?.querySelectorAll(".toggle-panel");

    if (!buttonGroup.length || !panelGroup?.length) return;

    buttonGroup.forEach((button) => {
      button.addEventListener("click", () => {
        const targetId = button.getAttribute("data-target");
        if (!targetId) return;

        buttonGroup.forEach((btn) => btn.classList.remove("toggle-bar__btn--active"));
        button.classList.add("toggle-bar__btn--active");

        panelGroup.forEach((panel) => {
          panel.classList.toggle("active", panel.id === targetId);
        });
      });
    });
  });

  const session = window.GSUAuth ? window.GSUAuth.getSession() : null;
  const isOrgAdmin = session?.role === "org_admin";
  const isSuperAdmin = session?.role === "super_admin";
  const canEdit = isOrgAdmin || isSuperAdmin;

  const orgCardMarkup = (org) => `
    <article class="org-card">
      <a class="org-card__left org-card__link" href="org.html?slug=${org.slug}">
        <div class="org-card__logo" aria-hidden="true">GSU</div>
        <h3 class="org-card__name" title="${org.name}">${org.name}</h3>
      </a>
      <div class="org-card__actions">
        <a class="org-card__btn org-card__btn--link" href="org.html?slug=${org.slug}">View</a>
        ${canEdit ? `<a class="org-card__btn org-card__btn--edit" href="org.html?slug=${org.slug}">Edit</a>` : ""}
      </div>
    </article>
  `;

  const renderOrgCards = (container, orgs) => {
    if (!container) return;

    if (!orgs.length) {
      container.innerHTML = '<p class="org-grid__status">No organizations found.</p>';
      return;
    }

    container.innerHTML = orgs
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(orgCardMarkup)
      .join("");
  };

  const renderSingleOrg = async () => {
    const orgSection = document.getElementById("organizations");
    if (!orgSection) return;

    const heading = orgSection.querySelector(".section__heading");
    const subtext = orgSection.querySelector(".section__subtext");
    const toggleBar = orgSection.querySelector(".organizations-toggle");
    const allPanel = document.getElementById("org-all");
    const greeksPanel = document.getElementById("org-greeks");
    const clubsPanel = document.getElementById("org-clubs");
    const allContainer = allPanel?.querySelector('[data-org-grid="all"]');

    if (heading) heading.textContent = "Your Organization";
    if (subtext) subtext.textContent = "Manage your organization's documents and details.";
    if (toggleBar) toggleBar.style.display = "none";
    if (greeksPanel) greeksPanel.remove();
    if (clubsPanel) clubsPanel.remove();
    if (allPanel && !allPanel.classList.contains("active")) allPanel.classList.add("active");

    if (!allContainer) return;

    try {
      const res = await fetch(`${API_BASE}/api/orgs/${session.orgSlug}`);
      if (!res.ok) throw new Error("Unable to load organization");
      const org = await res.json();
      renderOrgCards(allContainer, [org]);
    } catch {
      allContainer.innerHTML = '<p class="org-grid__status">Could not load your organization.</p>';
    }
  };

  const loadOrganizations = async () => {
    const allContainer = document.querySelector('[data-org-grid="all"]');
    const greekContainer = document.querySelector('[data-org-grid="greek"]');
    const clubContainer = document.querySelector('[data-org-grid="club"]');

    if (!allContainer || !greekContainer || !clubContainer) return;

    try {
      const response = await fetch(`${API_BASE}/api/orgs`);
      if (!response.ok) throw new Error("Unable to load organizations");

      const orgs = await response.json();

      renderOrgCards(allContainer, orgs);
      renderOrgCards(greekContainer, orgs.filter((org) => org.type === "greek"));
      renderOrgCards(clubContainer, orgs.filter((org) => org.type === "club"));
    } catch (error) {
      const fallback = '<p class="org-grid__status">Could not load organization list.</p>';
      allContainer.innerHTML = fallback;
      greekContainer.innerHTML = fallback;
      clubContainer.innerHTML = fallback;
    }
  };

  if (isOrgAdmin && session?.orgSlug) {
    renderSingleOrg();
  } else {
    loadOrganizations();
  }
});
