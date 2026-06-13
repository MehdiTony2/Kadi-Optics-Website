/*
 * Animation engine:
 *  - ViewBox zoom keyframes drive the "zoom in → zoom out → zoom in results" effect
 *  - Caption text managed via rAF loop
 *  - Left panel plays first (16s), then right panel starts
 */

const SCENE_MS = 8000;
const PANEL_MS = 16000;

/* ── ViewBox keyframes: [timeMs, [x, y, w, h]] ── */
const VB = {
  lc: [ /* left clinical */
    [0,    [0,   0,   460, 175]], /* full */
    [350,  [0,   52,  255, 120]], /* zoom: patient+nurse at bedside */
    [2500, [0,   52,  255, 120]], /* hold */
    [3200, [0,   0,   460, 175]], /* zoom out — nurse walking */
    [5400, [0,   0,   460, 175]], /* hold full scene */
    [6100, [115, 52,  240, 118]], /* zoom: doctor + result paper */
    [8000, [115, 52,  240, 118]], /* hold */
  ],
  lh: [ /* left home */
    [0,    [0,   0,   460, 175]], /* full */
    [350,  [62,  80,  220, 90]],  /* zoom: hand + lancet + blood drop */
    [2600, [62,  80,  220, 90]],  /* hold */
    [3300, [0,   0,   460, 175]], /* zoom out — person at table */
    [5200, [0,   0,   460, 175]], /* hold */
    [5800, [140, 82,  230, 88]],  /* zoom: glucometer + clock result */
    [8000, [140, 82,  230, 88]],  /* hold */
  ],
  rc: [ /* right clinical */
    [0,    [0,   0,   460, 175]], /* full */
    [350,  [5,   62,  265, 110]], /* zoom: patient + CPB circuit + KADI probe */
    [2600, [5,   62,  265, 110]], /* hold */
    [3300, [0,   0,   460, 175]], /* zoom out — full OR */
    [5300, [0,   0,   460, 175]], /* hold */
    [5900, [305, 22,  155, 105]], /* zoom: monitor with live waveform */
    [8000, [305, 22,  155, 105]], /* hold */
  ],
  rh: [ /* right home */
    [0,    [0,   0,   460, 175]], /* full */
    [350,  [62,  88,  210, 82]],  /* zoom: wrist + KADI device close-up */
    [2600, [62,  88,  210, 82]],  /* hold */
    [3300, [0,   0,   460, 175]], /* zoom out — person on couch + coffee */
    [5200, [0,   0,   460, 175]], /* hold */
    [5800, [218, 42,  200, 130]], /* zoom: phone screen with live data */
    [8000, [218, 42,  200, 130]], /* hold */
  ],
};

/* ── Captions: [startMs, endMs, text, cssClass] ── */
const CAPTIONS = {
  lc: [
    [0,    2600, "Blood sample collected — nurse leaves OR",  ""],
    [2600, 5400, "Walking to laboratory with sample...",      ""],
    [5400, 7000, "⏱  10–15 minute monitoring blind spot",    "problem"],
    [7000, 8000, "Result returned — monitoring gap ends",     ""],
  ],
  lh: [
    [0,    2700, "Finger-stick — drawing blood at home",      "problem"],
    [2700, 5300, "Waiting for the device to process...",      ""],
    [5300, 8000, "No monitoring option for DOAC patients",    "problem"],
  ],
  rc: [
    [0,    2700, "KADI fiber probe placed on the venous line","good"],
    [2700, 5400, "Continuous live coagulation signal — always on", "good"],
    [5400, 8000, "✓  Real-time data. No gaps. No delays.",    "good"],
  ],
  rh: [
    [0,    2700, "Simply put on the KADI wrist device",       "good"],
    [2700, 5300, "Coagulation data streams to your phone 24/7","good"],
    [5300, 8000, "✓  No blood draws. No waiting. Ever.",       "good"],
  ],
};

/* ── Helpers ── */
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function lerpViewBox(kf, elapsed) {
  const t = elapsed % SCENE_MS;
  let prev = kf[0], next = kf[kf.length - 1];
  for (let i = 0; i < kf.length - 1; i++) {
    if (t >= kf[i][0] && t <= kf[i + 1][0]) {
      prev = kf[i]; next = kf[i + 1]; break;
    }
  }
  const span = next[0] - prev[0];
  if (span === 0) return next[1];
  const a = easeInOut(Math.min((t - prev[0]) / span, 1));
  return prev[1].map((v, i) => v + (next[1][i] - v) * a);
}

function setVB(svgEl, vb) {
  if (svgEl) svgEl.setAttribute('viewBox', vb.join(' '));
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

function updateCaptions(zone, schedule, elapsed) {
  const t = elapsed % SCENE_MS;
  const caps = zone.querySelectorAll('.cap');
  caps.forEach((el, i) => {
    const [s, e] = schedule[i] || [];
    el.classList.toggle('visible', t >= s && t < e);
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

/* ── Main ── */
function init() {
  buildCaptions('cap-lc', CAPTIONS.lc);
  buildCaptions('cap-lh', CAPTIONS.lh);
  buildCaptions('cap-rc', CAPTIONS.rc);
  buildCaptions('cap-rh', CAPTIONS.rh);

  const svgLC = document.getElementById('svg-lc');
  const svgLH = document.getElementById('svg-lh');
  const svgRC = document.getElementById('svg-rc');
  const svgRH = document.getElementById('svg-rh');
  const rightPanel = document.querySelector('.panel-right');
  const leftBar    = document.querySelector('.panel-left  .progress-bar');
  const rightBar   = document.querySelector('.panel-right .progress-bar');

  const lcZone = document.getElementById('cap-lc');
  const lhZone = document.getElementById('cap-lh');
  const rcZone = document.getElementById('cap-rc');
  const rhZone = document.getElementById('cap-rh');

  animateBar(leftBar, PANEL_MS);

  const leftStart = performance.now();
  let rightStart  = null;

  function tick(now) {
    const leftElapsed = now - leftStart;
    const leftCycle   = leftElapsed % PANEL_MS;

    /* Left clinical / home split at 8s within each cycle */
    if (leftCycle < SCENE_MS) {
      setVB(svgLC, lerpViewBox(VB.lc, leftCycle));
      updateCaptions(lcZone, CAPTIONS.lc, leftCycle);
    } else {
      setVB(svgLH, lerpViewBox(VB.lh, leftCycle - SCENE_MS));
      updateCaptions(lhZone, CAPTIONS.lh, leftCycle - SCENE_MS);
    }

    /* Start right panel after first left cycle */
    if (!rightStart && leftElapsed >= PANEL_MS) {
      rightStart = now;
      rightPanel.classList.add('active');
      animateBar(rightBar, PANEL_MS);
    }

    if (rightStart) {
      const rightElapsed = (now - rightStart) % PANEL_MS;
      if (rightElapsed < SCENE_MS) {
        setVB(svgRC, lerpViewBox(VB.rc, rightElapsed));
        updateCaptions(rcZone, CAPTIONS.rc, rightElapsed);
      } else {
        setVB(svgRH, lerpViewBox(VB.rh, rightElapsed - SCENE_MS));
        updateCaptions(rhZone, CAPTIONS.rh, rightElapsed - SCENE_MS);
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
