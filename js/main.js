document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("menuBtn");
  const mainNav = document.getElementById("mainNav");

  if (menuBtn && mainNav) {
    menuBtn.addEventListener("click", () => {
      mainNav.classList.toggle("open");
    });
  }

  const toggleButtons = document.querySelectorAll(".toggle-bar__btn");
  const togglePanels = document.querySelectorAll(".toggle-panel");

  if (!toggleButtons.length || !togglePanels.length) {
    return;
  }

  toggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.getAttribute("data-target");
      if (!targetId) return;

      toggleButtons.forEach((btn) => btn.classList.remove("toggle-bar__btn--active"));
      button.classList.add("toggle-bar__btn--active");

      togglePanels.forEach((panel) => {
        panel.classList.toggle("active", panel.id === targetId);
      });
    });
  });
});
