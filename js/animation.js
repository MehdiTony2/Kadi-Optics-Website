/* Caption schedule: [startMs, endMs, text, cssClass] within each 8s scene */
const CAPTIONS = {
  lc: [
    [0,    2400, "Blood sample collected from the OR",          "note"],
    [2400, 5000, "Nurse leaves the room with sample...",        ""],
    [5000, 7000, "⏱  10–15 minute monitoring blind spot",      "problem"],
    [7000, 8000, "Results returned — monitoring resumes",       ""],
  ],
  lh: [
    [0,    2800, "Daily finger-stick required",                 "problem"],
    [2800, 5500, "Waiting for result...",                       ""],
    [5500, 8000, "No home monitoring option for DOAC patients", "problem"],
  ],
  rc: [
    [0,    2600, "Fiber probe inserted into the circuit",       "good"],
    [2600, 5500, "Live coagulation data — no delays, no gaps",  "good"],
    [5500, 8000, "✓  Continuous monitoring around the clock",   "good"],
  ],
  rh: [
    [0,    2800, "Simply wear the KADI wrist device",           "good"],
    [2800, 5500, "Coagulation data streams wirelessly 24/7",    "good"],
    [5500, 8000, "✓  No blood draws. No strips. No waiting.",   "good"],
  ],
};

const SCENE_MS  = 8000;  // one scene = 8s
const PANEL_MS  = 16000; // two scenes per panel = 16s

function showCap(zone, schedule, elapsed) {
  const t = elapsed % SCENE_MS;
  let active = null;
  for (const [s, e, , cls] of schedule) {
    if (t >= s && t < e) { active = [s, e, , cls]; break; }
  }

  zone.querySelectorAll('.cap').forEach((el, i) => {
    const [s, e, , cls] = schedule[i] || [];
    const shouldShow = active && schedule[i] && t >= schedule[i][0] && t < schedule[i][1];
    el.classList.toggle('visible', !!shouldShow);
  });
}

function buildCaptions(zoneId, schedule) {
  const zone = document.getElementById(zoneId);
  if (!zone) return;
  schedule.forEach(([, , text, cls]) => {
    const p = document.createElement('p');
    p.className = 'cap' + (cls ? ' ' + cls : '');
    p.textContent = text;
    zone.appendChild(p);
  });
}

function animateBar(bar, duration) {
  if (!bar) return;
  bar.style.transition = 'none';
  bar.style.width = '0%';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bar.style.transition = `width ${duration}ms linear`;
    bar.style.width = '100%';
  }));
}

function init() {
  /* Build caption elements */
  buildCaptions('cap-lc', CAPTIONS.lc);
  buildCaptions('cap-lh', CAPTIONS.lh);
  buildCaptions('cap-rc', CAPTIONS.rc);
  buildCaptions('cap-rh', CAPTIONS.rh);

  const rightPanel = document.querySelector('.panel-right');
  const leftBar    = document.querySelector('.panel-left  .progress-bar');
  const rightBar   = document.querySelector('.panel-right .progress-bar');

  const lcZone = document.getElementById('cap-lc');
  const lhZone = document.getElementById('cap-lh');
  const rcZone = document.getElementById('cap-rc');
  const rhZone = document.getElementById('cap-rh');

  /* Phase 1: left runs, right paused */
  animateBar(leftBar, PANEL_MS);

  const leftStart = performance.now();
  let rightStart  = null;

  function tick(now) {
    const leftElapsed = now - leftStart;

    /* Left clinical (0–8s) vs left home (8–16s) */
    if (leftElapsed < SCENE_MS) {
      showCap(lcZone, CAPTIONS.lc, leftElapsed);
    } else {
      showCap(lhZone, CAPTIONS.lh, leftElapsed - SCENE_MS);
    }

    /* Phase 2: activate right panel after one full left cycle */
    if (!rightStart && leftElapsed >= PANEL_MS) {
      rightStart = now;
      rightPanel.classList.add('active');
      animateBar(rightBar, PANEL_MS);
    }

    /* Right captions */
    if (rightStart) {
      const rightElapsed = (now - rightStart) % PANEL_MS;
      if (rightElapsed < SCENE_MS) {
        showCap(rcZone, CAPTIONS.rc, rightElapsed);
      } else {
        showCap(rhZone, CAPTIONS.rh, rightElapsed - SCENE_MS);
      }
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
