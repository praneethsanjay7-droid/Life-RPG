/* ============================================================
   DRAGON'S CONQUEST — App Logic (app.js)
   ============================================================ */

// ── Toast System ─────────────────────────────────────────────
function showToast(type, title, msg, duration = 4000) {
  const existing = document.querySelectorAll('.dc-toast');
  existing.forEach(el => el.remove());

  const toast = document.createElement('div');
  toast.className = `dc-toast dc-toast-${type}`;
  const icons = { success: '⚔️', error: '🔥', conquest: '👑', info: '📜' };
  toast.innerHTML = `
    <div class="dc-toast-icon">${icons[type] || '📜'}</div>
    <div class="dc-toast-content">
      <div class="dc-toast-title">${title}</div>
      <div class="dc-toast-msg">${msg}</div>
    </div>`;
  document.body.appendChild(toast);

  toast.addEventListener('click', () => dismissToast(toast));
  setTimeout(() => dismissToast(toast), duration);
}

function dismissToast(toast) {
  if (!toast || !toast.parentNode) return;
  toast.classList.add('dc-toast-hide');
  setTimeout(() => toast.remove(), 300);
}

// ── Modal System ──────────────────────────────────────────────
function openModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.add('hidden');
  document.body.style.overflow = '';
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('dc-overlay')) {
    e.target.classList.add('hidden');
    document.body.style.overflow = '';
  }
});

// ESC key closes modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.dc-overlay:not(.hidden)').forEach(el => {
      el.classList.add('hidden');
    });
    document.body.style.overflow = '';
  }
});

// ── Priority Toggle ───────────────────────────────────────────
function initToggleGroup(groupSelector, inputName) {
  const btns = document.querySelectorAll(`${groupSelector} .dc-toggle-btn`);
  const input = document.querySelector(`input[name="${inputName}"]`);
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.className = 'dc-toggle-btn');
      const val = btn.dataset.value;
      btn.classList.add(`active-${val}`);
      if (input) input.value = val;
    });
  });
}

// ── Kingdom Details Modal ─────────────────────────────────────
function openKingdomDetails(taskData) {
  const modal   = document.getElementById('details-modal');
  const overlay = document.getElementById('details-overlay');
  if (!modal || !overlay) return;

  const isConquered = taskData.completed === 'true' || taskData.completed === true;
  const priority = taskData.priority || 'medium';
  const category = taskData.category || 'other';
  const deadline = taskData.deadline ? new Date(taskData.deadline) : null;
  const now = new Date();

  let statusBadge = '';
  if (isConquered) {
    statusBadge = '<span class="dc-badge dc-badge-conquered">⚔️ CONQUERED</span>';
  } else if (deadline && deadline < now) {
    statusBadge = '<span class="dc-badge dc-badge-siege">⚠ UNDER SIEGE</span>';
  } else if (deadline && (deadline - now) < 86400000 * 2) {
    statusBadge = '<span class="dc-badge dc-badge-warning">⏰ SIEGE APPROACHING</span>';
  } else {
    statusBadge = '<span class="dc-badge dc-badge-guarded">🛡️ KINGDOM GUARDED</span>';
  }

  const guardCount = { low:1, medium:2, high:3, critical:4 }[priority] || 2;
  const guards = '🛡️'.repeat(guardCount);

  const catIcons = { study:'📚', work:'⚒️', personal:'🧙', other:'🌐' };
  const priorityLabels = { low:'LOW', medium:'MEDIUM', high:'HIGH', critical:'CRITICAL' };

  const castleEmoji = isConquered ? '🏚️' : (priority === 'critical' ? '🏯' : '🏰');
  const deadlineStr = deadline ? deadline.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : 'No deadline';

  modal.innerHTML = `
    <div class="dc-details-castle">${castleEmoji}</div>
    <div class="dc-details-name">${taskData.title || ''}</div>
    <div class="dc-details-status">${statusBadge}</div>
    <div class="dc-details-desc">${taskData.description || '<em>No decree inscribed.</em>'}</div>
    <div class="dc-details-grid">
      <div class="dc-details-field">
        <div class="dc-details-field-label">⚔️ KINGDOM STRENGTH</div>
        <div class="dc-details-field-value">
          <span class="dc-badge dc-badge-${priority}">${priorityLabels[priority]}</span>
        </div>
      </div>
      <div class="dc-details-field">
        <div class="dc-details-field-label">📜 CATEGORY</div>
        <div class="dc-details-field-value">${catIcons[category] || ''} ${category.toUpperCase()}</div>
      </div>
      <div class="dc-details-field">
        <div class="dc-details-field-label">⏳ SIEGE DEADLINE</div>
        <div class="dc-details-field-value">${deadlineStr}</div>
      </div>
      <div class="dc-details-field">
        <div class="dc-details-field-label">🏰 STATUS</div>
        <div class="dc-details-field-value">${isConquered ? 'Ruins' : 'Standing'}</div>
      </div>
    </div>
    ${!isConquered ? `<div class="dc-details-guards">${guards}</div>` : ''}
    <div class="dc-details-actions">
      ${!isConquered ? `
        <button class="dc-btn dc-btn-primary dc-btn-full" onclick="initiateConquer('${taskData.id}','${(taskData.title||'').replace(/'/g,"\\'")}')">🔥 CONQUER KINGDOM</button>
        <a href="/editTask/${taskData.id}" class="dc-btn dc-btn-gold dc-btn-full" style="text-align:center">📜 EDIT KINGDOM</a>
      ` : `
        <a href="/editTask/${taskData.id}" class="dc-btn dc-btn-gold dc-btn-full" style="text-align:center">📜 VIEW DETAILS</a>
      `}
      <form action="/deleteTask/${taskData.id}" method="post" onsubmit="return confirmAbandon()">
        <button type="submit" class="dc-btn dc-btn-danger dc-btn-full">🚩 ABANDON KINGDOM</button>
      </form>
    </div>`;

  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function confirmAbandon() {
  return confirm('Are you sure you want to abandon this kingdom? It will be lost forever.');
}

// ── Completion Card ───────────────────────────────────────────
function showCompletionCard(taskName) {
  const card = document.getElementById('completion-card');
  if (!card) return;
  card.querySelector('.dc-completion-name').textContent = taskName;
  card.classList.add('show');
  setTimeout(() => { card.classList.remove('show'); }, 3000);
}

// ── Counter Animations ────────────────────────────────────────
function animateCounter(el, newVal) {
  if (!el) return;
  el.textContent = newVal;
  el.classList.remove('dc-counter-pop');
  void el.offsetWidth;
  el.classList.add('dc-counter-pop');
  setTimeout(() => el.classList.remove('dc-counter-pop'), 600);
}

// ── Conquer Kingdom (main flow) ───────────────────────────────
function initiateConquer(taskId, taskName) {
  closeModal('details-overlay');

  const kingdomEl = document.querySelector(`.dc-kingdom[data-task-id="${taskId}"]`);
  const dragonEl  = document.getElementById('dragon');
  const mapEl     = document.getElementById('kingdom-map');

  if (!kingdomEl || !dragonEl || !mapEl) {
    // fallback: just do AJAX call
    doConquer(taskId, taskName);
    return;
  }

  // Calculate target position
  const mapRect  = mapEl.getBoundingClientRect();
  const kRect    = kingdomEl.getBoundingClientRect();
  const targetX  = ((kRect.left + kRect.width / 2 - mapRect.left) / mapRect.width) * 100;
  const targetY  = ((kRect.top  + kRect.height / 2 - mapRect.top ) / mapRect.height) * 100;

  // Step 1 — dragon flies
  dragonEl.classList.add('dc-flying');
  dragonEl.classList.remove('dc-breathing-fire');
  dragonEl.style.left = targetX + '%';
  dragonEl.style.top  = (targetY - 12) + '%';

  showToast('info', 'THE DRAGON FLIES', `Soaring toward ${taskName}...`, 2500);

  // Step 2 — on arrival: fire breath
  setTimeout(() => {
    dragonEl.classList.remove('dc-flying');
    dragonEl.classList.add('dc-breathing-fire');
    kingdomEl.classList.add('dc-on-fire');

    // Step 3 — castle burns, DB update
    setTimeout(() => {
      doConquer(taskId, taskName);
    }, 1200);
  }, 1600);
}

async function doConquer(taskId, taskName) {
  try {
    const resp = await fetch(`/tasks/${taskId}/complete`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!resp.ok) throw new Error('Server error');
    const data = await resp.json();

    // Update DOM
    const kingdomEl = document.querySelector(`.dc-kingdom[data-task-id="${taskId}"]`);
    const dragonEl  = document.getElementById('dragon');

    if (kingdomEl) {
      kingdomEl.classList.remove('dc-on-fire');
      kingdomEl.classList.add('dc-kingdom--conquered');
      kingdomEl.dataset.completed = 'true';
      const castleEl = kingdomEl.querySelector('.dc-kingdom-castle');
      if (castleEl) castleEl.textContent = '🏚️';
      const statusEl = kingdomEl.querySelector('.dc-kingdom-status');
      if (statusEl) { statusEl.className = 'dc-kingdom-status dc-status-conquered'; statusEl.textContent = 'CONQUERED ✓'; }
      const guardsEl = kingdomEl.querySelector('.dc-kingdom-guards');
      if (guardsEl) guardsEl.remove();
    }

    if (dragonEl) {
      dragonEl.classList.remove('dc-breathing-fire', 'dc-flying');
      // Return dragon to home
      setTimeout(() => {
        dragonEl.style.left = '10%';
        dragonEl.style.top  = '15%';
      }, 800);
    }

    // Update counters
    animateCounter(document.getElementById('count-conquered'), data.conquered);
    animateCounter(document.getElementById('count-remaining'), data.remaining);
    const fillEl = document.getElementById('evolution-fill');
    if (fillEl && data.total > 0) fillEl.style.width = ((data.conquered / data.total) * 100) + '%';

    // Add to conquered list
    appendConqueredItem(taskId, taskName);

    // Show completion card
    showCompletionCard(taskName);
    showToast('conquest', 'KINGDOM CONQUERED', `${taskName} has fallen!`, 4000);

    // Check evolution
    if (data.conquered > 0 && data.remaining === 0) {
      setTimeout(() => triggerEvolution(data.newLevel || 2), 2000);
    }

  } catch (err) {
    console.error(err);
    showToast('error', 'THE REALM RESISTS', 'Could not conquer kingdom. Try again.', 4000);
    const dragonEl = document.getElementById('dragon');
    if (dragonEl) dragonEl.classList.remove('dc-breathing-fire', 'dc-flying');
  }
}

function appendConqueredItem(taskId, taskName) {
  const list = document.getElementById('conquered-list');
  if (!list) return;
  const empty = list.querySelector('.dc-conquered-empty');
  if (empty) empty.remove();

  const item = document.createElement('div');
  item.className = 'dc-conquered-item';
  item.innerHTML = `
    <span>🏚️</span>
    <span class="dc-conquered-item-name">${taskName}</span>
    <span class="dc-conquered-item-check">✓</span>`;
  list.prepend(item);
}

// ── Dragon Evolution ──────────────────────────────────────────
function triggerEvolution(newLevel) {
  const overlay = document.getElementById('evolution-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  overlay.classList.add('phase-darken');
  const levelEl = overlay.querySelector('#evolution-new-level');
  if (levelEl) levelEl.textContent = newLevel || 2;
}

function beginNewConquest() {
  window.location.href = '/newConquest';
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Toggle groups
  if (document.querySelector('.dc-priority-group')) initToggleGroup('.dc-priority-group', 'priority');
  if (document.querySelector('.dc-category-group'))  initToggleGroup('.dc-category-group', 'category');

  // Auto-dismiss server-side flash toasts
  document.querySelectorAll('.dc-toast[data-auto-dismiss]').forEach(toast => {
    setTimeout(() => dismissToast(toast), 4000);
    toast.addEventListener('click', () => dismissToast(toast));
  });

  // Kingdom node clicks
  document.querySelectorAll('.dc-kingdom').forEach(el => {
    el.addEventListener('click', () => {
      openKingdomDetails({
        id:          el.dataset.taskId,
        title:       el.dataset.taskTitle,
        description: el.dataset.taskDesc,
        deadline:    el.dataset.taskDeadline,
        priority:    el.dataset.taskPriority,
        category:    el.dataset.taskCategory,
        completed:   el.dataset.taskCompleted
      });
    });
  });
});