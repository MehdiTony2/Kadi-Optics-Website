/*
 * Animation engine — captions + right-panel sequencing.
 * ViewBox zoom removed; all four scenes display full-frame.
 */

const SCENE_MS = 8000;
const PANEL_MS = 16000;

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
    [5300, 8000, "✓  No blood draws. No waiting. Ever.",      "good"],
  ],
};

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

function init() {
  buildCaptions('cap-lc', CAPTIONS.lc);
  buildCaptions('cap-lh', CAPTIONS.lh);
  buildCaptions('cap-rc', CAPTIONS.rc);
  buildCaptions('cap-rh', CAPTIONS.rh);

  const rightPanel = document.querySelector('.panel-right');
  const leftBar    = document.querySelector('.panel-left  .progress-bar');
  const rightBar   = document.querySelector('.panel-right .progress-bar');
  const lcZone     = document.getElementById('cap-lc');
  const lhZone     = document.getElementById('cap-lh');
  const rcZone     = document.getElementById('cap-rc');
  const rhZone     = document.getElementById('cap-rh');

  animateBar(leftBar, PANEL_MS);

  const leftStart = performance.now();
  let rightStart  = null;

  function tick(now) {
    const leftElapsed = now - leftStart;
    const leftCycle   = leftElapsed % PANEL_MS;

    if (leftCycle < SCENE_MS) {
      updateCaptions(lcZone, CAPTIONS.lc, leftCycle);
    } else {
      updateCaptions(lhZone, CAPTIONS.lh, leftCycle - SCENE_MS);
    }

    if (!rightStart && leftElapsed >= PANEL_MS) {
      rightStart = now;
      rightPanel.classList.add('active');
      animateBar(rightBar, PANEL_MS);
    }

    if (rightStart) {
      const rightElapsed = (now - rightStart) % PANEL_MS;
      if (rightElapsed < SCENE_MS) {
        updateCaptions(rcZone, CAPTIONS.rc, rightElapsed);
      } else {
        updateCaptions(rhZone, CAPTIONS.rh, rightElapsed - SCENE_MS);
      }
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

/* ── Nav: scroll opacity + active section highlight ── */
function initNav() {
  const nav     = document.getElementById('site-nav');
  const links   = document.querySelectorAll('.nav-links a[href^="#"]');
  const burger  = document.getElementById('hamburger');
  const navMenu = document.getElementById('nav-menu');

  /* Hamburger toggle */
  if (burger && navMenu) {
    burger.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      burger.classList.toggle('active');
    });
    navMenu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navMenu.classList.remove('open');
        burger.classList.remove('active');
      });
    });
  }

  /* Active section on scroll */
  const sections = Array.from(document.querySelectorAll('section[id], footer[id]'));

  function onScroll() {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);

    const scrollY = window.scrollY + 120;
    let current = '';
    sections.forEach(s => {
      if (s.offsetTop <= scrollY) current = s.id;
    });
    links.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { init(); initNav(); });
} else {
  init(); initNav();
}
