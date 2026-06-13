/* Animation sequencing state machine
 *
 * Phase 1 (0–16s):  Left plays, Right paused
 * Phase 2 (16–32s): Left loops, Right starts
 * Phase 3 (32s+):   Both loop indefinitely
 *
 * Each panel has two 8s scenes (clinical + home) = 16s total cycle.
 * We use a simple timer-based approach for reliability across browsers.
 */

const SCENE_DURATION = 8000;   // 8s per scene
const PANEL_DURATION = 16000;  // 2 scenes × 8s = 16s per full panel cycle

function initAnimation() {
  const rightPanel = document.querySelector('.panel-right');
  const leftBar    = document.querySelector('.panel-left .progress-bar');
  const rightBar   = document.querySelector('.panel-right .progress-bar');

  if (!rightPanel) return;

  /* ── Phase 1: Left plays, right is paused ── */
  rightPanel.classList.remove('active');
  animateBar(leftBar, PANEL_DURATION, '#E63946');

  setTimeout(() => {
    /* ── Phase 2: Right starts, left continues looping ── */
    rightPanel.classList.add('active');
    animateBar(rightBar, PANEL_DURATION, '#2A9D8F');
  }, PANEL_DURATION);
}

/* Smoothly fills the progress bar over `duration` ms */
function animateBar(bar, duration, color) {
  if (!bar) return;
  bar.style.transition = 'none';
  bar.style.width = '0%';
  bar.style.background = color;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      bar.style.transition = `width ${duration}ms linear`;
      bar.style.width = '100%';
    });
  });
}

/* Start once DOM is ready */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnimation);
} else {
  initAnimation();
}
