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

  const renderOrgCards = (container, orgs) => {
    if (!container) return;

    if (!orgs.length) {
      container.innerHTML = '<p class="org-grid__status">No organizations found.</p>';
      return;
    }

    const cardsMarkup = orgs
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(
        (org) => `
          <article class="org-card">
            <a class="org-card__left org-card__link" href="org.html?org=${encodeURIComponent(org.name)}">
              <div class="org-card__logo" aria-hidden="true">GSU</div>
              <h3 class="org-card__name" title="${org.name}">${org.name}</h3>
            </a>
            <a class="org-card__btn org-card__btn--link" href="org.html?org=${encodeURIComponent(org.name)}">
              View
            </a>
          </article>
        `
      )
      .join("");

    container.innerHTML = cardsMarkup;
  };

  const loadOrganizations = async () => {
    const allContainer = document.querySelector('[data-org-grid="all"]');
    const greekContainer = document.querySelector('[data-org-grid="greek"]');
    const clubContainer = document.querySelector('[data-org-grid="club"]');

    if (!allContainer || !greekContainer || !clubContainer) return;

    try {
      const response = await fetch("org_passwords.json");
      if (!response.ok) {
        throw new Error("Unable to load organizations");
      }

      const data = await response.json();
      const organizations = Array.isArray(data?.passwords) ? data.passwords : [];

      const cleanOrgs = organizations
        .filter((org) => org && typeof org.name === "string" && typeof org.type === "string")
        .map((org) => ({
          name: org.name.trim(),
          type: org.type.trim().toLowerCase(),
        }));

      renderOrgCards(allContainer, cleanOrgs);
      renderOrgCards(
        greekContainer,
        cleanOrgs.filter((org) => org.type === "greek")
      );
      renderOrgCards(
        clubContainer,
        cleanOrgs.filter((org) => org.type === "club")
      );
    } catch (error) {
      const fallback = '<p class="org-grid__status">Could not load organization list.</p>';
      allContainer.innerHTML = fallback;
      greekContainer.innerHTML = fallback;
      clubContainer.innerHTML = fallback;
    }
  };

  loadOrganizations();
});
