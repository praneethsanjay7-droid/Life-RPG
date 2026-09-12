/* ============================================================
   DRAGON'S CONQUEST — Map & Dragon Animations (map.js)
   ============================================================ */

// Predefined kingdom map positions (% from left, % from top)
window.DC_MAP_POSITIONS = [
  { x: 18, y: 22 }, { x: 48, y: 14 }, { x: 76, y: 20 },
  { x: 22, y: 52 }, { x: 52, y: 46 }, { x: 80, y: 48 },
  { x: 16, y: 76 }, { x: 46, y: 72 }, { x: 74, y: 70 },
  { x: 35, y: 34 }, { x: 64, y: 30 }, { x: 30, y: 62 },
  { x: 63, y: 64 }, { x: 88, y: 78 }, { x: 8,  y: 42 },
];

// Dragon initial position
const DRAGON_HOME = { x: 10, y: 15 };

document.addEventListener('DOMContentLoaded', () => {
  const dragonEl = document.getElementById('dragon');
  if (dragonEl) {
    dragonEl.style.left = DRAGON_HOME.x + '%';
    dragonEl.style.top  = DRAGON_HOME.y + '%';
  }

  // Add subtle smoke to conquered kingdoms
  document.querySelectorAll('.dc-kingdom--conquered').forEach(k => {
    addSmoke(k);
  });

  // Add fire flicker to overdue kingdoms
  document.querySelectorAll('.dc-kingdom--overdue').forEach(k => {
    addTorchGlow(k);
  });
});

function addSmoke(kingdomEl) {
  const smoke = document.createElement('div');
  smoke.style.cssText = `
    position:absolute; top:-16px; left:50%; transform:translateX(-50%);
    font-size:1rem; opacity:0.5; animation:flameRise 2s ease-in-out infinite;
    pointer-events:none; animation-delay:${Math.random()*2}s;`;
  smoke.textContent = '💨';
  kingdomEl.style.position = 'relative';
  kingdomEl.appendChild(smoke);
}

function addTorchGlow(kingdomEl) {
  kingdomEl.style.filter = 'drop-shadow(0 0 8px rgba(200,50,0,0.7))';
}