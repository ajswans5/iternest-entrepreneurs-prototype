function createCompletionScreen() {
  const phone = document.querySelector(".phone");
  const bottomNav = document.querySelector(".bottom-nav");
  if (!phone || document.querySelector('[data-screen="complete"]')) return;

  const screen = document.createElement("section");
  screen.className = "screen screen-complete";
  screen.dataset.screen = "complete";
  screen.innerHTML = `
    <header class="plain-header"><button class="icon-back" data-complete-go="home">←</button><strong>Progress Saved</strong></header>
    <section class="completion-card">
      <div class="completion-mark">✅</div>
      <p class="script-greeting">Nice work.</p>
      <h2>Progress saved.</h2>
      <p class="completion-copy">I'll remember where you left off, so you don't have to.</p>
      <div class="completion-summary">
        <p>Finished today</p>
        <strong id="completedAction">Your focused work session</strong>
      </div>
      <div class="completion-summary soft">
        <p>Where I'll pick up next time</p>
        <strong id="resumePoint">Your next move is ready.</strong>
      </div>
      <p class="completion-status">🟢 Milestone status updated.</p>
      <div class="completion-actions">
        <button data-complete-go="home">Back to Dashboard</button>
        <button data-complete-go="home">Choose a different time →</button>
        <button data-complete-go="coffee">Coffee Break ☕</button>
      </div>
    </section>
  `;

  phone.insertBefore(screen, bottomNav);
}

function showCompletion(detail = {}) {
  createCompletionScreen();

  const screen = document.querySelector('[data-screen="complete"]');
  const completedAction = document.querySelector("#completedAction");
  const resumePoint = document.querySelector("#resumePoint");
  const statusLine = document.querySelector(".completion-status");
  const heading = screen?.querySelector("h2");

  const labels = {
    done: "Progress saved.",
    partial: "Progress saved. I know where to pick this back up.",
    stuck: "Saved. Next time we will start by untangling what stopped you."
  };

  if (completedAction) completedAction.textContent = detail.completedAction || "Your focused work session";
  if (resumePoint) resumePoint.textContent = detail.resumePoint || "Your next move is ready.";
  if (heading) heading.textContent = labels[detail.status] || "Progress saved.";
  if (statusLine) {
    statusLine.textContent = detail.status === "stuck"
      ? "🟡 Milestone needs attention."
      : `🟢 ${detail.milestoneStatus || "Milestone status updated."}`;
  }

  if (typeof showScreen === "function") showScreen("complete");
}

createCompletionScreen();

document.addEventListener("iternest:progress-saved", (event) => {
  showCompletion(event.detail || {});
});

document.addEventListener("click", (event) => {
  const completeNav = event.target.closest("[data-complete-go]");
  if (!completeNav) return;
  const destination = completeNav.dataset.completeGo;
  if (typeof showScreen === "function") showScreen(destination);
});
