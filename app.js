const screens = document.querySelectorAll('.screen');
const coachText = document.querySelector('#coachText');
const thoughtInput = document.querySelector('#thoughtInput');
const userBubble = document.querySelector('#userBubble');
const sessionTime = document.querySelector('#sessionTime');
const customTimeInput = document.querySelector('#customTime');
const bottomNav = document.querySelector('.bottom-nav');

let selectedTime = '25 minutes';

function showScreen(name) {
  screens.forEach((screen) => {
    screen.classList.toggle('is-active', screen.dataset.screen === name);
  });
  if (bottomNav) bottomNav.classList.toggle('is-hidden', name === 'welcome');
}

showScreen('welcome');

function setSelectedTime(time) {
  selectedTime = time;
  document.querySelectorAll('[data-time]').forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.time === time);
  });
  if (sessionTime) sessionTime.textContent = time;
  if (userBubble) userBubble.textContent = `I have ${time} today.`;
  if (coachText) {
    coachText.textContent = `With ${time}, we should use where you left off instead of opening the whole project. The most useful next step is the smallest decision that moves the current screen forward.`;
  }
}

function setCustomTime() {
  const raw = customTimeInput?.value.trim();
  if (!raw) return;
  const time = /minute|min|hour|hr/i.test(raw) ? raw : `${raw} minutes`;
  setSelectedTime(time);
  showScreen('coach');
}

document.addEventListener('click', (event) => {
  const customTimeTarget = event.target.closest('[data-action="custom-time"]');
  if (customTimeTarget) {
    setCustomTime();
    return;
  }

  const timeTarget = event.target.closest('[data-time]');
  if (timeTarget) {
    setSelectedTime(timeTarget.dataset.time);
    showScreen('coach');
    return;
  }

  const goTarget = event.target.closest('[data-go]');
  if (goTarget) {
    const destination = goTarget.dataset.go;
    if (destination === 'coach') {
      const thought = thoughtInput?.value.trim();
      if (thought) {
        if (userBubble) userBubble.textContent = `I have ${selectedTime}. ${thought}`;
        if (coachText) {
          coachText.textContent = `Given ${selectedTime} and where you left off, I’d make the smallest next step that makes this clearer: ${thought}`;
        }
      }
    }
    showScreen(destination);
    return;
  }

  const problemTarget = event.target.closest('[data-problem]');
  if (problemTarget) {
    if (userBubble) userBubble.textContent = problemTarget.dataset.problem;
    if (coachText) {
      coachText.textContent = `I hear this: “${problemTarget.dataset.problem}.” This is not a time problem; it’s a blocker. Let’s name the blocker, then choose one next move that fits your available time.`;
    }
    showScreen('coach');
    return;
  }

  const voiceTarget = event.target.closest('[data-action="voice"]');
  if (voiceTarget) {
    thoughtInput.value = 'I need help choosing the most useful next step from where I left off.';
    thoughtInput.focus();
  }
});
