const screens = document.querySelectorAll('.screen');
const coachText = document.querySelector('#coachText');
const thoughtInput = document.querySelector('#thoughtInput');
const userBubble = document.querySelector('#userBubble');
const sessionTime = document.querySelector('#sessionTime');

let selectedTime = '25 minutes';

function showScreen(name) {
  screens.forEach((screen) => {
    screen.classList.toggle('is-active', screen.dataset.screen === name);
  });
}

function setSelectedTime(time) {
  selectedTime = time;
  document.querySelectorAll('[data-time]').forEach((button) => {
    button.classList.toggle('is-selected', button.dataset.time === time);
  });
  if (sessionTime) sessionTime.textContent = time;
  if (userBubble) userBubble.textContent = `I have ${time} today.`;
  if (coachText) {
    coachText.textContent = `With ${time}, we should not open the whole project. The best next move is one useful decision that fits the time you actually have.`;
  }
}

document.addEventListener('click', (event) => {
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
          coachText.textContent = `Given ${selectedTime}, I would not try to solve the whole thing. I’d choose the smallest next step that makes ${thought.toLowerCase()} clearer.`;
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
      coachText.textContent = `I hear this: “${problemTarget.dataset.problem}.” Let’s start with capacity first, then choose the next useful move.`;
    }
    showScreen('coach');
    return;
  }

  const voiceTarget = event.target.closest('[data-action="voice"]');
  if (voiceTarget) {
    thoughtInput.value = 'I need help choosing the most useful next step for the time I have.';
    thoughtInput.focus();
  }
});
