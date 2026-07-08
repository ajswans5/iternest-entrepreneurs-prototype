const screens = document.querySelectorAll('.screen');
const coachText = document.querySelector('#coachText');
const thoughtInput = document.querySelector('#thoughtInput');

function showScreen(name) {
  screens.forEach((screen) => {
    screen.classList.toggle('is-active', screen.dataset.screen === name);
  });
}

document.addEventListener('click', (event) => {
  const goTarget = event.target.closest('[data-go]');
  if (goTarget) {
    const destination = goTarget.dataset.go;
    if (destination === 'coach') {
      const thought = thoughtInput?.value.trim();
      if (thought) {
        coachText.textContent = `I read what you wrote: “${thought}” It sounds like this needs a visible next step, not a bigger explanation. Let’s make it concrete.`;
      }
    }
    showScreen(destination);
    return;
  }

  const problemTarget = event.target.closest('[data-problem]');
  if (problemTarget) {
    coachText.textContent = `I hear this: “${problemTarget.dataset.problem}” Let’s not turn that into a giant plan. Let’s find the next useful move.`;
    showScreen('coach');
    return;
  }

  const voiceTarget = event.target.closest('[data-action="voice"]');
  if (voiceTarget) {
    thoughtInput.value = 'Voice placeholder: I need help untangling what I am building.';
    thoughtInput.focus();
  }
});
