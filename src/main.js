import './style.css';

const seedTasks = [
  { id: 1, title: 'Reply to the design review thread', project: 'Work', priority: 'high', due: 'Today', tag: 'Communication', done: false, notes: 'Close the loop on the new navigation states.' },
  { id: 2, title: 'Outline Q4 launch story', project: 'Work', priority: 'medium', due: 'Tomorrow', tag: 'Strategy', done: false, notes: '' },
  { id: 3, title: 'Book a table for Friday dinner', project: 'Personal', priority: 'low', due: 'Today', tag: 'Errands', done: false, notes: '' },
  { id: 4, title: 'Refine onboarding empty states', project: 'Work', priority: 'medium', due: 'Sep 18', tag: 'Design', done: false, notes: '' },
  { id: 5, title: 'Read 20 pages of The Creative Act', project: 'Personal', priority: 'low', due: 'Sep 19', tag: 'Reading', done: false, notes: '' },
  { id: 6, title: 'Send weekly metrics snapshot', project: 'Work', priority: 'high', due: 'Sep 20', tag: 'Reporting', done: false, notes: '' },
  { id: 7, title: 'Plan Saturday morning run', project: 'Personal', priority: 'low', due: 'Sep 21', tag: 'Health', done: true, notes: '' }
];

function readStoredJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    console.warn(`Ignoring invalid saved data for ${key}.`, error);
    return fallback;
  }
}

const taskStorageKey = localStorage.getItem('markway-tasks') !== null ? 'markway-tasks' : 'daymark-tasks';
const savedTasks = readStoredJson(taskStorageKey, null);
const savedProfile = readStoredJson('markway-profile', null);
const savedTheme = localStorage.getItem('markway-theme') || 'light';
const savedDailyChecks = readStoredJson('markway-daily-checks', null);
const savedNoteVault = readStoredJson('markway-note-vault', null);
const state = {
  tasks: Array.isArray(savedTasks) ? savedTasks.filter((task) => task && typeof task === 'object' && typeof task.title === 'string').map((task, index) => ({
    id: task.id ?? index + 1,
    title: task.title,
    project: typeof task.project === 'string' ? task.project : 'Personal',
    priority: ['low', 'medium', 'high'].includes(task.priority) ? task.priority : 'medium',
    due: typeof task.due === 'string' ? task.due : 'Today',
    tag: typeof task.tag === 'string' ? task.tag : 'General',
    notes: typeof task.notes === 'string' ? task.notes : '',
    done: task.done === true
  })) : seedTasks,
  activeView: 'Today',
  activeProject: 'All tasks',
  query: '',
  priority: 'All priorities',
  showCompleted: false,
  filterOpen: false,
  profile: savedProfile && typeof savedProfile.name === 'string' && typeof savedProfile.space === 'string' ? savedProfile : { name: 'Akash', space: 'Personal space' },
  profileEditing: false,
  theme: savedTheme,
  dailyChecks: Array.isArray(savedDailyChecks) ? savedDailyChecks.filter((item) => item && typeof item.text === 'string') : [],
  noteVault: savedNoteVault,
  notesUnlocked: false,
  noteKey: null,
  noteContent: '',
  noteEntries: [],
  noteDraft: '',
  editingNoteId: null,
  noteEditing: false,
  noteError: '',
  noteResetMode: false,
  noteRestoreMode: false,
  noteRecoveryStage: null,
  noteRecoveryEmail: '',
  noteRecoveryMessage: '',
  noteOtpCooldownUntil: 0,
  moreOpen: false,
  editingId: null
};

const app = document.querySelector('#app');
const save = () => localStorage.setItem('markway-tasks', JSON.stringify(state.tasks));
const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const icon = (name) => ({ plus: '+', search: '⌕', inbox: '▦', today: '○', upcoming: '◷', check: '✓', more: '•••', close: '×', archive: '□', calendar: '▣' }[name] || '•');
const shortcutLabel = () => /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K';
const todayLabel = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const tagOptions = ['General', 'Planning', 'Communication', 'Strategy', 'Errands', 'Design', 'Reading', 'Reporting', 'Health'];

function filteredTasks() {
  return state.tasks.filter((task) => {
    const searchText = state.query.trim().toLowerCase();
    const matchesQuery = !searchText || [task.title, task.tag, task.notes, task.project, task.due, task.priority].some((value) => String(value || '').toLowerCase().includes(searchText));
    const matchesProject = state.activeProject === 'All tasks' || task.project === state.activeProject;
    const matchesPriority = state.priority === 'All priorities' || task.priority === state.priority;
    const matchesView = state.activeView === 'Today' ? task.due === 'Today' : state.activeView === 'Upcoming' ? task.due !== 'Today' : state.activeView === 'Completed' ? task.done : true;
    const matchesDone = state.activeView === 'Completed' ? task.done : state.showCompleted || !task.done;
    return matchesQuery && matchesProject && matchesPriority && matchesView && matchesDone;
  });
}

function taskCount(project) {
  if (project === 'Completed') return state.tasks.filter((task) => task.done).length;
  return state.tasks.filter((task) => !task.done && (project === 'All tasks' || task.project === project)).length;
}

function render() {
  document.documentElement.dataset.theme = state.theme;
  const visible = filteredTasks();
  const doneCount = state.tasks.filter((task) => task.done).length;
  const completion = Math.round((doneCount / state.tasks.length) * 100) || 0;
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand"><span class="brand-mark">m</span><span>markWay</span></div>
        <button class="add-task primary-button" data-action="new-task">${icon('plus')} <span>New task</span><kbd>N</kbd></button>
        <nav class="main-nav" aria-label="Main navigation">
          ${navItem('Inbox', 'inbox', taskCount('All tasks'), state.activeView === 'Inbox')}
          ${navItem('Today', 'today', state.tasks.filter((t) => !t.done && t.due === 'Today').length, state.activeView === 'Today')}
          ${navItem('Upcoming', 'upcoming', state.tasks.filter((t) => !t.done && t.due !== 'Today').length, state.activeView === 'Upcoming')}
          ${navItem('Completed', 'check', taskCount('Completed'), state.activeView === 'Completed')}
          ${navItem('Daily Check', 'check', state.dailyChecks.filter((item) => !item.done).length, state.activeView === 'Daily Check')}
          ${navItem('Notes', 'archive', !state.noteVault ? 'new' : state.notesUnlocked ? state.noteEntries.length : 'locked', state.activeView === 'Notes')}
        </nav>
        <div class="nav-label">Projects <button class="tiny-button" data-action="new-project" aria-label="Add project">+</button></div>
        <nav class="project-nav">
          ${projectItem('All tasks', '◈')}
          ${projectItem('Work', '◆')}
          ${projectItem('Personal', '◇')}
        </nav>
        <div class="sidebar-spacer"></div>
        <div class="weekly-card">
          <div class="weekly-top"><span class="eyebrow">Weekly focus</span><span>${completion}%</span></div>
          <div class="progress-track"><div class="progress-fill" style="width:${completion}%"></div></div>
          <p>${doneCount} of ${state.tasks.length} tasks complete</p>
          <button data-action="show-completed" class="text-button">View completed <span>→</span></button>
        </div>
        <button class="profile" data-action="edit-profile"><div class="avatar">${escapeHtml(state.profile.name.slice(0, 2).toUpperCase())}</div><div><strong>${escapeHtml(state.profile.name)}</strong><span>${escapeHtml(state.profile.space)}</span></div><span class="more-button">•••</span></button>
      </aside>
      <main class="main-content">
        <header class="topbar">
          <div class="breadcrumb"><span>My workspace</span><span>/</span><strong>${escapeHtml(state.activeProject)}</strong></div>
          <div class="top-actions"><label class="search-box">${icon('search')}<input id="search" type="search" placeholder="Search tasks" value="${escapeHtml(state.query)}" /><button type="button" class="shortcut-hint" data-action="focus-search">${shortcutLabel()}</button></label><button class="icon-button" data-action="toggle-theme" title="Switch to ${state.theme === 'light' ? 'dark' : 'light'} mode">${state.theme === 'light' ? '☾' : '☀'}</button><div class="corner-menu"><button class="icon-button ${state.moreOpen ? 'open' : ''}" data-action="toggle-more" title="More options">${icon('more')}</button>${state.moreOpen ? moreMenu() : ''}</div></div>
        </header>
        <section class="content-wrap">
          <div class="page-heading"><div><p class="eyebrow accent">${state.activeView === 'Today' ? todayLabel() : state.activeView}</p><h1>${escapeHtml(state.activeProject === 'All tasks' ? state.activeView : state.activeProject)}</h1><p class="heading-subtitle">${state.activeView === 'Daily Check' ? 'Small points, checked off one by one.' : state.activeView === 'Completed' ? 'Finished tasks stay here until you remove them.' : state.activeView === 'Today' ? 'A clear mind starts with a clear list.' : 'Keep the momentum going.'}</p></div><div class="filter-wrap">${state.activeView === 'Daily Check' ? '' : `<button class="filter-button ${state.filterOpen ? 'open' : ''}" data-action="toggle-filter">Filter <span>⌄</span></button>${state.filterOpen ? filterMenu() : ''}`}</div></div>
          ${state.priority !== 'All priorities' || state.showCompleted ? `<div class="active-filters"><span>Filters:</span>${state.priority !== 'All priorities' ? `<button data-action="clear-priority">${state.priority} ×</button>` : ''}${state.showCompleted ? '<button data-action="show-completed">Including completed ×</button>' : ''}</div>` : ''}
          ${state.activeView === 'Daily Check' ? dailyCheckView() : `<div class="task-list-header"><span>${visible.length} ${visible.length === 1 ? 'task' : 'tasks'}</span><select id="priority-filter"><option>All priorities</option><option ${state.priority === 'high' ? 'selected' : ''} value="high">High priority</option><option ${state.priority === 'medium' ? 'selected' : ''} value="medium">Medium priority</option><option ${state.priority === 'low' ? 'selected' : ''} value="low">Low priority</option></select></div><div class="task-list">${visible.length ? visible.map(taskCard).join('') : emptyState()}</div><button class="quick-add" data-action="new-task">${icon('plus')}<span>Add a task</span><kbd>N</kbd></button>`}
        </section>
      </main>
    </div>
    ${state.editingId !== null ? taskModal(state.editingId === 'new' ? null : state.tasks.find((task) => task.id === state.editingId)) : ''}
    ${state.profileEditing ? profileModal() : ''}
  `;
  if (state.activeView === 'Notes') document.querySelector('.content-wrap').innerHTML = noteRecoveryView() || safeNotesView();
  bindEvents();
}

function navItem(label, glyph, count, active = false) { return `<button class="nav-item ${active ? 'active' : ''}" data-view="${label}"><span class="nav-glyph">${icon(glyph)}</span><span>${label}</span><b>${count}</b></button>`; }
function projectItem(label, glyph) { return `<button class="project-item ${state.activeProject === label ? 'active' : ''}" data-project="${label}"><span class="project-glyph">${glyph}</span><span>${label}</span><b>${taskCount(label)}</b></button>`; }
function filterMenu() { return `<div class="filter-menu"><span class="filter-menu-title">Priority</span>${['All priorities', 'high', 'medium', 'low'].map((priority) => `<button class="filter-option ${state.priority === priority ? 'selected' : ''}" data-action="set-priority" data-priority="${priority}"><span class="filter-radio"></span>${priority === 'All priorities' ? priority : `${priority.charAt(0).toUpperCase()}${priority.slice(1)} priority`}<b>${state.priority === priority ? '✓' : ''}</b></button>`).join('')}<span class="filter-divider"></span><button class="filter-option" data-action="show-completed"><span class="filter-check ${state.showCompleted ? 'selected' : ''}">${state.showCompleted ? '✓' : ''}</span>Include completed<b></b></button></div>`; }
function moreMenu() { return `<div class="corner-dropdown"><button class="filter-option" data-action="show-completed"><span class="filter-check ${state.showCompleted ? 'selected' : ''}">${state.showCompleted ? '✓' : ''}</span>${state.showCompleted ? 'Hide completed' : 'Show completed'}<b></b></button><button class="filter-option" data-action="complete-visible">Complete visible tasks<b>✓</b></button><button class="filter-option" data-action="clear-completed">Remove completed tasks<b>×</b></button><button class="filter-option" data-action="export-tasks">Export task list<b>↓</b></button><span class="filter-divider"></span><button class="filter-option" data-action="clear-filters">Clear filters<b></b></button><button class="filter-option" data-action="clear-search">Clear search<b></b></button></div>`; }
function taskCard(task) { return `<article class="task-card ${task.done ? 'is-done' : ''}" data-task-id="${task.id}"><button class="check-button priority-${task.priority} ${task.done ? 'checked' : ''}" data-action="toggle" data-id="${task.id}" aria-label="Mark task complete">${task.done ? '✓' : ''}</button><div class="task-copy"><button class="task-title" data-action="edit" data-id="${task.id}">${escapeHtml(task.title)}</button><div class="task-meta"><span class="tag">${escapeHtml(task.tag)}</span><span class="dot">·</span><span class="due ${task.due === 'Today' ? 'due-today' : ''}">${escapeHtml(task.due)}</span>${task.notes ? '<span class="dot">·</span><span class="has-note">note</span>' : ''}</div></div><span class="priority-label ${task.priority}">${task.priority}</span><button class="task-more" data-action="edit" data-id="${task.id}">•••</button></article>`; }
function emptyState() { return `<div class="empty-state"><div class="empty-icon">✓</div><h2>All clear here</h2><p>Nothing matches these filters. Add a task or enjoy the breathing room.</p><button class="primary-button" data-action="new-task">${icon('plus')} New task</button></div>`; }
function dailyCheckView() { return `<div class="daily-check-panel"><form id="daily-check-form" class="daily-check-form"><input name="checkText" required placeholder="Add a check note, one point at a time..." /><input name="checkTag" placeholder="Tag (e.g. Health)" /><select name="checkPriority" aria-label="Check priority"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select><button class="primary-button" type="submit">${icon('plus')} Add point</button></form><div class="daily-check-list">${state.dailyChecks.length ? state.dailyChecks.map((item) => `<article class="daily-check-item ${item.done ? 'is-done' : ''}"><button class="check-button priority-${item.priority || 'low'} ${item.done ? 'checked' : ''}" data-action="toggle-daily" data-id="${item.id}" aria-label="Mark check complete">${item.done ? '✓' : ''}</button><div class="daily-check-copy"><span>${escapeHtml(item.text)}</span><div class="daily-check-meta">${item.tag ? `<span class="tag">${escapeHtml(item.tag)}</span>` : ''}${item.priority ? `<span class="priority-label ${item.priority}">${item.priority}</span>` : ''}</div></div><button class="delete-check" data-action="delete-daily" data-id="${item.id}" aria-label="Delete check">×</button></article>`).join('') : '<div class="daily-empty"><div class="empty-icon">✓</div><h2>No daily checks yet</h2><p>Add small point-wise reminders for today.</p></div>'}</div></div>`; }
function lockedNotesView() {
  if (!state.noteVault) return `<div class="notes-panel"><div class="notes-lock-card"><div class="notes-lock-icon">◆</div><h2>Create your private note vault</h2><p>Set a password once to protect personal information on this device.</p><form id="note-setup-form" class="notes-form"><input name="notePassword" type="password" required minlength="6" autocomplete="new-password" placeholder="Create password (6+ characters)" /><input name="noteConfirm" type="password" required minlength="6" autocomplete="new-password" placeholder="Confirm password" /><button class="primary-button" type="submit">Create vault <span>→</span></button></form>${state.noteError ? `<p class="note-error">${escapeHtml(state.noteError)}</p>` : ''}<small>Notes are encrypted locally. Your password is never stored.</small></div></div>`;
  if (!state.notesUnlocked) return `<div class="notes-panel"><div class="notes-lock-card"><div class="notes-lock-icon">🔒</div><h2>Private notes locked</h2><p>Enter the password you created to unlock your notes.</p><form id="note-unlock-form" class="notes-form"><input name="notePassword" type="password" required autocomplete="current-password" placeholder="Enter your password" /><button class="primary-button" type="submit">Unlock notes <span>→</span></button></form>${state.noteError ? `<p class="note-error">${escapeHtml(state.noteError)}</p>` : ''}<small>Encrypted locally on this device.</small></div></div>`;
  if (state.noteEditing) return `<div class="notes-panel notes-editor"><div class="notes-editor-top"><div><span class="eyebrow accent">Private vault</span><h2>${state.editingNoteId ? 'Edit note' : 'New note'}</h2></div><button class="filter-button" data-action="lock-notes">Lock</button></div><textarea id="private-note" autofocus placeholder="Write a private note...">${escapeHtml(state.noteDraft)}</textarea><div class="notes-editor-footer"><button type="button" class="filter-button" data-action="cancel-note">Cancel</button><button class="primary-button" data-action="save-note">Save note <span>✓</span></button></div></div>`;
  return `<div class="notes-panel notes-list"><div class="notes-list-header"><div><span class="eyebrow accent">Private vault</span><h2>Personal notes</h2></div><div class="notes-list-actions"><button class="primary-button" data-action="add-note">+ Add note</button><button class="filter-button" data-action="lock-notes">Lock</button></div></div>${state.noteEntries.length ? state.noteEntries.map((note) => `<article class="note-text-card"><p>${escapeHtml(note.text).replace(/\n/g, '<br>')}</p><div><span>Private note</span><button class="text-button" data-action="edit-note" data-id="${note.id}">Edit note →</button></div></article>`).join('') : '<div class="note-empty"><p>No private notes saved yet.</p></div>'}</div>`;
}
function safeNotesView() {
  if (!state.noteVault) return `<div class="notes-panel"><div class="notes-lock-card"><div class="notes-lock-icon">◆</div><h2>Create your private note vault</h2><p>Set a password once to protect personal information on this device.</p><form id="note-setup-form" class="notes-form" autocomplete="off"><input name="notePassword" type="text" data-password-input class="password-masked" required minlength="6" autocomplete="off" placeholder="Create password (6+ characters)" /><input name="noteConfirm" type="text" data-password-input class="password-masked" required minlength="6" autocomplete="off" placeholder="Confirm password" /><button class="primary-button" type="submit">Create vault <span>→</span></button></form>${state.noteError ? `<p class="note-error">${escapeHtml(state.noteError)}</p>` : ''}<small>Notes are encrypted locally. Your password is never stored.</small></div></div>`;
  if (!state.notesUnlocked) return `<div class="notes-panel"><div class="notes-lock-card"><div class="notes-lock-icon">🔒</div><h2>Private notes locked</h2><p>Enter the password you created to unlock your notes.</p><form id="note-unlock-form" class="notes-form" autocomplete="off"><input name="notePassword" type="text" data-password-input class="password-masked" required autocomplete="off" placeholder="Enter your password" /><button class="primary-button" type="submit">Unlock notes <span>→</span></button></form>${state.noteError ? `<p class="note-error">${escapeHtml(state.noteError)}</p>` : ''}<small>Encrypted locally on this device.</small></div></div>`;
  return lockedNotesView();
}
let cooldownTimer = null;
function scheduleCooldownTick() {
  if (cooldownTimer) return;
  cooldownTimer = window.setTimeout(() => { cooldownTimer = null; if (state.activeView === 'Notes' && state.noteRecoveryStage === 'email') render(); }, 1000);
}
function noteRecoveryView() {
  if (!state.noteRecoveryStage) return '';
  const message = state.noteRecoveryMessage ? `<p class="note-error">${escapeHtml(state.noteRecoveryMessage)}</p>` : '';
  if (state.noteRecoveryStage === 'email') {
    const seconds = Math.max(0, Math.ceil((state.noteOtpCooldownUntil - Date.now()) / 1000));
    if (seconds) scheduleCooldownTick();
    return `<div class="notes-panel"><div class="notes-lock-card"><div class="notes-lock-icon">@</div><h2>Reset your password</h2><p>Enter your email address and we will send a one-time password.</p><form id="note-recovery-form" class="notes-form"><input name="recoveryEmail" type="email" required autocomplete="email" value="${escapeHtml(state.noteRecoveryEmail)}" placeholder="you@gmail.com" /><button class="primary-button" type="submit" ${seconds ? 'disabled' : ''}>${seconds ? `Try again in ${seconds}s` : 'Send OTP'} <span>→</span></button></form>${message}<small>Check Gmail Inbox, Spam, and Promotions after requesting an OTP.</small><button type="button" class="forgot-note-button" data-action="cancel-recovery">← Back to unlock</button></div></div>`;
  }
  if (state.noteRecoveryStage === 'otp') return `<div class="notes-panel"><div class="notes-lock-card"><div class="notes-lock-icon">@</div><h2>Enter OTP</h2><p>We sent a six-digit OTP to ${escapeHtml(state.noteRecoveryEmail)}.</p><form id="note-recovery-form" class="notes-form"><input name="recoveryOtp" inputmode="numeric" pattern="[0-9]{6}" required autocomplete="one-time-code" placeholder="Enter 6-digit OTP" /><button class="primary-button" type="submit">Verify OTP <span>→</span></button></form>${message}<button type="button" class="forgot-note-button" data-action="cancel-recovery">← Back to unlock</button></div></div>`;
  return `<div class="notes-panel"><div class="notes-lock-card"><div class="notes-lock-icon">✓</div><h2>Create new password</h2><p>OTP verified. Create a new password for this vault.</p><form id="note-reset-form" class="notes-form"><input name="notePassword" type="password" required minlength="6" autocomplete="new-password" placeholder="New password (6+ characters)" /><input name="noteConfirm" type="password" required minlength="6" autocomplete="new-password" placeholder="Confirm new password" /><button class="primary-button" type="submit">Save new password <span>→</span></button></form>${message}<small>Your old encrypted notes are securely backed up on this device.</small></div></div>`;
}

function taskModal(task) { const isNew = !task; const defaultDue = task?.due || state.taskDueDraft || 'Today'; return `<div class="modal-backdrop" data-action="close-modal"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-header"><div><p class="eyebrow accent">${isNew ? 'Capture an idea' : 'Edit task'}</p><h2 id="modal-title">${isNew ? 'What needs doing?' : 'Make it happen.'}</h2></div><button class="close-button" data-action="close-modal">×</button></div><form id="task-form"><label class="field-label">Task name<input name="title" required autofocus value="${isNew ? '' : escapeHtml(task.title)}" placeholder="e.g. Prepare the project brief" /></label><div class="form-grid"><label class="field-label">Project<select name="project"><option ${(!task || task.project === 'Work') ? 'selected' : ''}>Work</option><option ${task?.project === 'Personal' ? 'selected' : ''}>Personal</option></select></label><label class="field-label">Priority<select name="priority"><option value="low" ${task?.priority === 'low' ? 'selected' : ''}>Low</option><option value="medium" ${(!task || task.priority === 'medium') ? 'selected' : ''}>Medium</option><option value="high" ${task?.priority === 'high' ? 'selected' : ''}>High</option></select></label></div><div class="form-grid"><label class="field-label">Due date<select name="due"><option ${defaultDue === 'Today' ? 'selected' : ''}>Today</option><option ${defaultDue === 'Tomorrow' ? 'selected' : ''}>Tomorrow</option><option ${defaultDue === 'Sep 18' ? 'selected' : ''}>Sep 18</option><option ${defaultDue === 'Sep 20' ? 'selected' : ''}>Sep 20</option></select></label><label class="field-label">Tag<input name="tag" value="${task ? escapeHtml(task.tag) : 'General'}" placeholder="e.g. Planning" /></label></div><label class="field-label">Notes <span class="optional">optional</span><textarea name="notes" rows="3" placeholder="Add a little context...">${task ? escapeHtml(task.notes) : ''}</textarea></label><div class="modal-footer">${!isNew ? '<button type="button" class="delete-button" data-action="delete" data-id="' + task.id + '">Delete task</button>' : '<span></span>'}<button class="primary-button" type="submit">${isNew ? 'Create task' : 'Save changes'} <span>→</span></button></div></form></section></div>`; }
function profileModal() { return `<div class="modal-backdrop" data-action="close-profile"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title"><div class="modal-header"><div><p class="eyebrow accent">Your workspace</p><h2 id="profile-modal-title">Profile details</h2></div><button class="close-button" data-action="close-profile">×</button></div><form id="profile-form"><label class="field-label">Your name<input name="profileName" required value="${escapeHtml(state.profile.name)}" /></label><label class="field-label">Space name<input name="profileSpace" required value="${escapeHtml(state.profile.space)}" /></label><div class="modal-footer"><span></span><button class="primary-button" type="submit">Save profile <span>→</span></button></div></form></section></div>`; }

function bindEvents() {
  document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => { state.activeView = button.dataset.view; state.activeProject = 'All tasks'; render(); }));
  document.querySelectorAll('[data-project]').forEach((button) => button.addEventListener('click', () => { state.activeProject = button.dataset.project; state.activeView = 'Inbox'; render(); }));
  document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', handleAction));
  document.querySelector('#search')?.addEventListener('input', (event) => { const cursor = event.target.selectionStart; state.query = event.target.value; render(); const search = document.querySelector('#search'); search?.focus(); search?.setSelectionRange(cursor, cursor); });
  document.querySelector('#priority-filter')?.addEventListener('change', (event) => { state.priority = event.target.value; render(); });
  document.querySelector('#task-form')?.addEventListener('submit', saveTask);
  document.querySelector('#profile-form')?.addEventListener('submit', saveProfile);
  document.querySelector('#daily-check-form')?.addEventListener('submit', saveDailyCheck);
  document.querySelector('#note-setup-form')?.addEventListener('submit', setupNoteVault);
  document.querySelector('#note-unlock-form')?.addEventListener('submit', unlockNoteVaultWithRecovery);
  document.querySelector('#note-recovery-form')?.addEventListener('submit', submitNoteRecovery);
  document.querySelector('#note-reset-form')?.addEventListener('submit', saveResetPassword);
  if (state.activeView === 'Notes' && state.noteVault && !state.notesUnlocked && !state.noteRecoveryStage) {
    const card = document.querySelector('.notes-lock-card');
    const forgot = document.createElement('button');
    forgot.type = 'button'; forgot.className = 'forgot-note-button'; forgot.textContent = 'Forgot password?';
    forgot.addEventListener('click', () => { state.noteRecoveryStage = 'email'; state.noteRecoveryMessage = ''; render(); });
    card?.appendChild(forgot);
  }
  setupPasswordEyes();
  setupTagField();
  document.querySelector('.modal')?.addEventListener('click', (event) => event.stopPropagation());
}

function setupPasswordEyes() {
  document.querySelectorAll('.notes-form input[data-password-input], .notes-form input[type="password"]').forEach((input) => {
    input.autocomplete = 'off';
    input.setAttribute('data-lpignore', 'true');
    input.setAttribute('data-1p-ignore', 'true');
    input.setAttribute('data-bwignore', 'true');
    input.type = 'text';
    input.classList.add('password-masked');
    const wrapper = document.createElement('div');
    wrapper.className = 'password-field';
    input.parentElement.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    const eye = document.createElement('button');
    eye.type = 'button';
    eye.className = 'password-eye';
    eye.title = 'Show password';
    eye.setAttribute('aria-label', 'Show password');
    eye.textContent = '◉';
    eye.addEventListener('click', () => {
      const show = input.classList.contains('password-masked');
      input.classList.toggle('password-masked', !show);
      eye.textContent = show ? '◌' : '◉';
      eye.title = show ? 'Hide password' : 'Show password';
      eye.setAttribute('aria-label', eye.title);
    });
    wrapper.appendChild(eye);
  });
}

function setupTagField() {
  const tagInput = document.querySelector('#task-form input[name="tag"]');
  if (!tagInput) return;
  const currentTag = tagInput.value || 'General';
  tagInput.name = 'tagOther';
  tagInput.id = 'tag-other';
  tagInput.placeholder = 'Enter custom tag';
  const tagSelect = document.createElement('select');
  tagSelect.name = 'tagChoice';
  tagSelect.id = 'tag-choice';
  tagSelect.innerHTML = `${tagOptions.map((tag) => `<option value="${tag}" ${currentTag === tag ? 'selected' : ''}>${tag}</option>`).join('')}<option value="__other" ${tagOptions.includes(currentTag) ? '' : 'selected'}>+ Other</option>`;
  tagInput.parentElement.insertBefore(tagSelect, tagInput);
  tagInput.style.display = tagOptions.includes(currentTag) ? 'none' : '';
  tagSelect.addEventListener('change', (event) => { tagInput.style.display = event.target.value === '__other' ? '' : 'none'; if (event.target.value === '__other') tagInput.focus(); });
}

function handleAction(event) {
  const { action, id } = event.currentTarget.dataset;
  if (action === 'new-task' || action === 'new-task-date') { state.taskDueDraft = action === 'new-task-date' ? (state.dateFilter || 'Today') : null; state.editingId = 'new'; state.calendarOpen = false; state.moreOpen = false; render(); document.querySelector('[name="title"]')?.focus(); }
  if (action === 'toggle-theme') { state.theme = state.theme === 'light' ? 'dark' : 'light'; localStorage.setItem('markway-theme', state.theme); render(); }
  if (action === 'lock-notes') { saveRecoveryCache(); state.notesUnlocked = false; state.noteKey = null; state.noteContent = ''; state.noteEntries = []; state.noteDraft = ''; state.editingNoteId = null; state.noteEditing = false; state.noteError = ''; render(); }
  if (action === 'cancel-note') { state.noteEditing = false; state.noteDraft = ''; state.editingNoteId = null; render(); }
  if (action === 'cancel-recovery') { state.noteRecoveryStage = null; state.noteRecoveryMessage = ''; render(); }
  if (action === 'cancel-reset') { state.noteResetMode = false; state.noteError = ''; render(); }
  if (action === 'add-note') { state.activeView = 'Notes'; state.noteEditing = true; state.noteDraft = ''; state.editingNoteId = null; state.noteError = ''; render(); document.querySelector('#private-note')?.focus(); }
  if (action === 'edit-note') { state.activeView = 'Notes'; state.noteEditing = true; state.editingNoteId = Number(id); state.noteDraft = state.noteEntries.find((note) => note.id === Number(id))?.text || ''; state.noteError = ''; render(); document.querySelector('#private-note')?.focus(); }
  if (action === 'save-note') saveNoteWithRecovery();
  if (action === 'toggle-daily') { const item = state.dailyChecks.find((check) => check.id === Number(id)); if (!item) return; item.done = !item.done; saveDailyChecks(); render(); }
  if (action === 'delete-daily') { state.dailyChecks = state.dailyChecks.filter((check) => check.id !== Number(id)); saveDailyChecks(); render(); }
  if (action === 'focus-search') { document.querySelector('#search')?.focus(); }
  if (action === 'toggle-calendar') { state.calendarOpen = !state.calendarOpen; state.moreOpen = false; render(); }
  if (action === 'toggle-more') { state.moreOpen = !state.moreOpen; state.calendarOpen = false; render(); }
  if (action === 'calendar-date') { state.dateFilter = event.currentTarget.dataset.date; state.activeView = state.dateFilter === 'Today' ? 'Today' : 'Inbox'; state.activeProject = 'All tasks'; state.calendarOpen = false; render(); }
  if (action === 'clear-date') { state.dateFilter = null; state.activeView = 'Today'; state.calendarOpen = false; render(); }
  if (action === 'complete-visible') { filteredTasks().forEach((task) => { task.done = true; }); state.moreOpen = false; save(); render(); }
  if (action === 'clear-completed') { state.tasks = state.tasks.filter((task) => !task.done); state.showCompleted = false; state.moreOpen = false; save(); render(); }
  if (action === 'export-tasks') { exportTasks(); state.moreOpen = false; render(); }
  if (action === 'clear-filters') { state.priority = 'All priorities'; state.showCompleted = false; state.dateFilter = null; state.moreOpen = false; render(); }
  if (action === 'clear-search') { state.query = ''; state.moreOpen = false; render(); }
  if (action === 'close-modal') { state.editingId = null; render(); }
  if (action === 'edit-profile') { state.profileEditing = true; render(); document.querySelector('[name="profileName"]')?.focus(); }
  if (action === 'close-profile') { state.profileEditing = false; render(); }
  if (action === 'toggle') { const task = state.tasks.find((item) => item.id === Number(id)); if (!task) return; task.done = !task.done; save(); render(); }
  if (action === 'edit') { state.editingId = Number(id); render(); document.querySelector('[name="title"]')?.focus(); }
  if (action === 'delete') { state.tasks = state.tasks.filter((task) => task.id !== Number(id)); state.editingId = null; save(); render(); }
  if (action === 'show-completed') { state.showCompleted = !state.showCompleted; render(); }
  if (action === 'toggle-filter') { state.filterOpen = !state.filterOpen; render(); }
  if (action === 'set-priority') { state.priority = event.currentTarget.dataset.priority; state.filterOpen = false; render(); }
  if (action === 'clear-priority') { state.priority = 'All priorities'; render(); }
  if (action === 'new-project') { window.alert('Projects are ready for your next workspace idea.'); }
}

function exportTasks() {
  const blob = new Blob([JSON.stringify(state.tasks, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'markway-tasks.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

function saveProfile(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  state.profile = { name: form.get('profileName').trim(), space: form.get('profileSpace').trim() };
  localStorage.setItem('markway-profile', JSON.stringify(state.profile));
  state.profileEditing = false;
  render();
}

function saveDailyCheck(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const text = form.get('checkText').trim();
  if (!text) return;
  state.dailyChecks.unshift({ id: Date.now(), text, tag: form.get('checkTag').trim(), priority: form.get('checkPriority'), done: false });
  saveDailyChecks();
  render();
}

function saveDailyChecks() {
  localStorage.setItem('markway-daily-checks', JSON.stringify(state.dailyChecks));
}

async function submitNoteRecovery(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) { state.noteRecoveryMessage = 'Email OTP is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.'; render(); return; }
  if (state.noteRecoveryStage === 'email' && Date.now() < state.noteOtpCooldownUntil) { render(); return; }
  // In development, go through Vite's /supabase proxy (see vite.config.js) so browser
  // ad-blockers / filters that block *.supabase.co cannot stop the request.
  const apiBase = import.meta.env.DEV ? '/supabase' : url.replace(/\/+$/, '');
  try {
    if (state.noteRecoveryStage === 'email') {
      const email = String(form.get('recoveryEmail') || '').trim();
      state.noteRecoveryEmail = email;
      if (state.noteVault.recoveryEmail && state.noteVault.recoveryEmail !== email.toLowerCase()) {
        state.noteRecoveryMessage = 'Use the email address linked to this vault.'; render(); return;
      }
      const response = await fetch(`${apiBase}/auth/v1/otp`, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, create_user: true }) });
      if (!response.ok) {
        const details = await response.json().catch(() => ({}));
        const reason = details.msg || details.message || details.error_description || details.error;
        if (response.status === 429) {
          const retrySeconds = Math.max(60, Number(response.headers.get('retry-after')) || 60);
          state.noteOtpCooldownUntil = Date.now() + retrySeconds * 1000;
          throw new Error(`OTP service is temporarily rate-limited. Try again in ${Math.ceil(retrySeconds / 60)} minute(s).`);
        }
        throw new Error(reason || `Could not send OTP (error ${response.status}).`);
      }
      state.noteRecoveryEmail = email; state.noteRecoveryStage = 'otp'; state.noteRecoveryMessage = ''; state.noteOtpCooldownUntil = 0;
    } else {
      const token = String(form.get('recoveryOtp') || '').trim();
      const response = await fetch(`${apiBase}/auth/v1/verify`, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: state.noteRecoveryEmail, token, type: 'email' }) });
      if (!response.ok) throw new Error('Invalid or expired OTP.');
      state.noteRecoveryStage = 'reset'; state.noteRecoveryMessage = '';
    }
  } catch (error) {
    state.noteRecoveryMessage = error instanceof TypeError
      ? 'Could not reach the email service. Check your internet connection, and turn off any ad-blocker or antivirus web filter for this site.'
      : error.message || 'Could not reach the email service. Check your connection and try again.';
  }
  render();
}

async function saveResetPassword(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const password = String(form.get('notePassword') || '');
  if (password !== form.get('noteConfirm')) { state.noteRecoveryMessage = 'Passwords do not match.'; render(); return; }
  const backupKey = `markway-note-vault-backup-${new Date().toISOString()}`;
  // Preserve the previous encrypted vault; it is never overwritten during recovery.
  localStorage.setItem(backupKey, JSON.stringify(state.noteVault));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  state.noteKey = await deriveNoteKey(password, salt);
  state.noteEntries = loadRecoveryCache();
  state.noteVault = { recoveryEmail: state.noteRecoveryEmail.toLowerCase(), salt: bytesToBase64(salt), iv: bytesToBase64(iv), data: await encryptNote(JSON.stringify(state.noteEntries), state.noteKey, iv) };
  localStorage.setItem('markway-note-vault', JSON.stringify(state.noteVault));
  saveRecoveryCache();
  state.notesUnlocked = true;
  state.noteRecoveryStage = null;
  state.noteRecoveryEmail = '';
  state.noteRecoveryMessage = '';
  state.noteEditing = false;
  render();
}


function getNoteBackupKeys() { return Object.keys(localStorage).filter((key) => key.startsWith('markway-note-vault-backup-')).sort().reverse(); }
function loadRecoveryCache() { try { const notes = JSON.parse(localStorage.getItem('markway-note-recovery-cache') || '[]'); return Array.isArray(notes) ? notes : []; } catch { return []; } }
function saveRecoveryCache() { localStorage.setItem('markway-note-recovery-cache', JSON.stringify(state.noteEntries)); }

function bytesToBase64(bytes) { return btoa(String.fromCharCode(...new Uint8Array(bytes))); }
function base64ToBytes(value) { return Uint8Array.from(atob(value), (char) => char.charCodeAt(0)); }
async function deriveNoteKey(password, salt) { const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']); return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }
async function encryptNote(content, key, iv) { const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(content)); return bytesToBase64(encrypted); }
async function decryptNote(data, key, iv) { const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, base64ToBytes(data)); return new TextDecoder().decode(decrypted); }
async function unlockNoteVaultWithRecovery(event) { event.preventDefault(); const password = new FormData(event.target).get('notePassword'); try { const salt = base64ToBytes(state.noteVault.salt); const iv = base64ToBytes(state.noteVault.iv); state.noteKey = await deriveNoteKey(password, salt); const decrypted = await decryptNote(state.noteVault.data, state.noteKey, iv); const parsed = JSON.parse(decrypted); state.noteEntries = Array.isArray(parsed) ? parsed : parsed ? [{ id: Date.now(), text: parsed }] : []; saveRecoveryCache(); state.noteContent = ''; state.notesUnlocked = true; state.noteEditing = false; state.noteError = ''; render(); } catch { state.noteKey = null; state.noteError = 'Incorrect password. Your notes are still locked.'; render(); } }
async function saveNoteWithRecovery() { if (!state.noteKey || !state.noteVault) return; const note = document.querySelector('#private-note')?.value.trim() || ''; if (!note) return; const entry = { id: state.editingNoteId || Date.now(), text: note }; state.noteEntries = state.editingNoteId ? state.noteEntries.map((item) => item.id === state.editingNoteId ? entry : item) : [entry, ...state.noteEntries]; const iv = crypto.getRandomValues(new Uint8Array(12)); state.noteVault = { ...state.noteVault, iv: bytesToBase64(iv), data: await encryptNote(JSON.stringify(state.noteEntries), state.noteKey, iv) }; localStorage.setItem('markway-note-vault', JSON.stringify(state.noteVault)); saveRecoveryCache(); state.noteContent = ''; state.noteDraft = ''; state.editingNoteId = null; state.noteEditing = false; state.noteError = ''; render(); }
async function setupNoteVault(event) { event.preventDefault(); const form = new FormData(event.target); const password = form.get('notePassword'); const profileCheck = String(form.get('profileCheck') || '').trim().toLowerCase(); const resetPhrase = String(form.get('resetPhrase') || '').trim().toUpperCase(); if (state.noteResetMode && (profileCheck !== state.profile.name.trim().toLowerCase() || resetPhrase !== 'RESET NOTES')) { state.noteError = `Enter your profile name (${state.profile.name}) and type RESET NOTES.`; render(); return; } if (password !== form.get('noteConfirm')) { state.noteError = 'New passwords do not match.'; render(); return; } let restoredEntries = []; if (state.noteResetMode) { const backupKey = getNoteBackupKeys()[0]; if (!backupKey) { state.noteError = 'No encrypted notes backup was found on this device.'; render(); return; } try { const backup = JSON.parse(localStorage.getItem(backupKey)); const oldKey = await deriveNoteKey(String(form.get('oldNotePassword') || ''), base64ToBytes(backup.salt)); const decrypted = await decryptNote(backup.data, oldKey, base64ToBytes(backup.iv)); const parsed = JSON.parse(decrypted); restoredEntries = Array.isArray(parsed) ? parsed : parsed ? [{ id: Date.now(), text: parsed }] : []; } catch { state.noteError = 'Old vault password is incorrect. Your backup was not changed.'; render(); return; } } const salt = crypto.getRandomValues(new Uint8Array(16)); const iv = crypto.getRandomValues(new Uint8Array(12)); state.noteKey = await deriveNoteKey(password, salt); state.noteEntries = restoredEntries; state.noteVault = { salt: bytesToBase64(salt), iv: bytesToBase64(iv), data: await encryptNote(JSON.stringify(restoredEntries), state.noteKey, iv) }; localStorage.setItem('markway-note-vault', JSON.stringify(state.noteVault)); state.notesUnlocked = true; state.noteResetMode = false; state.noteContent = ''; state.noteEditing = false; state.noteError = ''; render(); }

function saveTask(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const selectedTag = form.get('tagChoice') === '__other' ? form.get('tagOther').trim() : form.get('tagChoice');
  const data = { title: form.get('title').trim(), project: form.get('project'), priority: form.get('priority'), due: form.get('due'), tag: selectedTag || 'General', notes: form.get('notes').trim() };
  if (!data.title) return;
  if (state.editingId === 'new') state.tasks.unshift({ ...data, id: Date.now(), done: false });
  else { const existing = state.tasks.find((task) => task.id === state.editingId); if (existing) Object.assign(existing, data); }
  state.editingId = null; state.taskDueDraft = null; save(); render();
}

document.addEventListener('keydown', (event) => {
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector('#search')?.focus(); return; }
  if (event.key.toLowerCase() === 'n' && !event.metaKey && !event.ctrlKey && !event.altKey && !typing && state.editingId === null && !state.profileEditing) { event.preventDefault(); state.taskDueDraft = null; state.editingId = 'new'; render(); document.querySelector('[name="title"]')?.focus(); return; }
  if (event.key === 'Escape') {
    if (state.editingId !== null) state.editingId = null;
    else if (state.profileEditing) state.profileEditing = false;
    else if (state.filterOpen || state.moreOpen) { state.filterOpen = false; state.moreOpen = false; }
    else return;
    render();
  }
});

// Close the Filter / More dropdowns when clicking anywhere outside them.
document.addEventListener('click', (event) => {
  if (!state.filterOpen && !state.moreOpen) return;
  if (event.target.closest?.('.filter-wrap, .corner-menu')) return;
  state.filterOpen = false; state.moreOpen = false; render();
});

render();
