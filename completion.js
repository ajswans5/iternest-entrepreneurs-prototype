function createCompletionScreen() {
  const phone = document.querySelector('.phone');
  const bottomNav = document.querySelector('.bottom-nav');
  if (!phone || document.querySelector('[data-screen="complete"]')) return;

  const screen = document.createElement('section');
  screen.className = 'screen screen-complete';
  screen.dataset.screen = 'complete';
  screen.innerHTML = `
    <header class="plain-header"><button class="icon-back" data-complete-go="home">←</button><strong>Progress Saved</strong></header>
    <section class="completion-card">
      <div class="completion-mark">✅</div>
      <p class="script-greeting">Nice work.</p>
      <h2>Progress saved.</h2>
      <p class="completion-copy">I'll remember where you left off, so you don't have to.</p>
      <div class="completion-summary">
        <p>Finished today</p>
        <strong id="completedAction">Your next move</strong>
      </div>
      <div class="completion-summary soft">
        <p>Where I'll pick up next time</p>
        <strong id="resumePoint">Your dashboard is updated.</strong>
      </div>
      <p class="completion-status">🟢 Milestone status updated.</p>
      <div class="completion-actions">
        <button data-complete-go="home">Back to Dashboard</button>
        <button data-complete-go="nextmove">I have more time →</button>
        <button data-complete-go="coffee">Coffee Break ☕</button>
      </div>
    </section>
  `;

  phone.insertBefore(screen, bottomNav);
}

function showCompletion(status, actionBeforeSave) {
  createCompletionScreen();

  const screen = document.querySelector('[data-screen="complete"]');
  const completedAction = document.querySelector('#completedAction');
  const resumePoint = document.querySelector('#resumePoint');
  const statusLine = document.querySelector('.completion-status');
  const whereLeftOff = document.querySelector('.continue-card strong')?.textContent?.trim();
  const trackStatus = document.querySelector('.track-card strong')?.textContent?.trim();

  const labels = {
    done: 'Nice work. Progress saved.',
    partial: 'Progress saved. I know where to pick this back up.',
    stuck: 'Saved. Next time we will start by untangling the blocker.'
  };

  if (completedAction) completedAction.textContent = actionBeforeSave || 'Your focused work session';
  if (resumePoint) resumePoint.textContent = whereLeftOff || 'Your dashboard is updated.';
  if (statusLine) statusLine.textContent = status === 'stuck' ? '🟡 Milestone needs attention.' : '🟢 Milestone status updated.';

  const heading = screen?.querySelector('h2');
  if (heading) heading.textContent = labels[status] || 'Progress saved.';

  document.querySelectorAll('.screen').forEach((item) => {
    item.classList.toggle('is-active', item.dataset.screen === 'complete');
  });

  if (trackStatus && statusLine && status !== 'stuck') {
    statusLine.textContent = `🟢 ${trackStatus}`;
  }
}

createCompletionScreen();

let lastActionBeforeSave = '';

document.addEventListener('click', (event) => {
  const progressButton = event.target.closest('[data-progress]');
  if (progressButton) {
    lastActionBeforeSave = document.querySelector('.next-move-title')?.textContent?.trim() || '';
    window.setTimeout(() => showCompletion(progressButton.dataset.progress, lastActionBeforeSave), 0);
    return;
  }

  const completeNav = event.target.closest('[data-complete-go]');
  if (completeNav) {
    const destination = completeNav.dataset.completeGo;
    document.querySelectorAll('.screen').forEach((item) => {
      item.classList.toggle('is-active', item.dataset.screen === destination);
    });
  }
});
