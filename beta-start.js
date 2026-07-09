window.addEventListener('load', () => {
  if (typeof showScreen === 'function') {
    showScreen('welcome');
  }
});

document.addEventListener('click', (event) => {
  const newProjectButton = event.target.closest('.new-project-button');
  if (!newProjectButton) return;

  document.querySelectorAll('.setup-input').forEach((input) => {
    input.value = '';
  });

  document.querySelectorAll('.project-choice-grid button').forEach((button, index) => {
    button.classList.toggle('is-selected', index === 0);
  });
});
