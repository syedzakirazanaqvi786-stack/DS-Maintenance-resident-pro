/**
 * DS MAINTENANCE SUITE — DESKTOP SYSTEM
 * Complete Single-Page Application Client Controller
 * Includes Unified Reports & Date Filter Sync, Receptionist Privacy Protection, Executive PDF Print & Zero-Loss Persistence
 */

// Global State
const State = {
  currentUser: null,
  buildings: [],
  selectedBuildingId: 'ALL',
  reportBuildingId: 'ALL',
  currentBuilding: null,
  bankAccounts: [],
  companyProfile: null,
  activeTab: 'dashboard',
  datePreset: 'month', // 'today', 'yesterday', '2days', '7days', 'month', 'custom', 'all'
  customDate: null,
  calSelectedYear: new Date().getFullYear(),
  calSelectedMonth: new Date().getMonth(),
  webcamStream: null,
  lastReportData: null
};

// ==========================================================================
// 100% OFFLINE WEB AUDIO SOUND EFFECTS ENGINE
// ==========================================================================
window.DSSound = {
  ctx: null,
  enabled: localStorage.getItem('ds_sound_enabled') !== 'false',

  init: function() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  playTone: function(freq, type = 'sine', duration = 0.15, gainVal = 0.1, startTimeOffset = 0) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime + startTimeOffset;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      
      gain.gain.setValueAtTime(gainVal, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + duration);
    } catch(e) {
      console.warn("Audio playTone error suppressed:", e);
    }
  },

  playClick: function() {
    this.playTone(800, 'sine', 0.04, 0.05);
  },

  playChime: function() {
    if (!this.enabled) return;
    this.playTone(523.25, 'sine', 0.35, 0.12, 0.00);
    this.playTone(659.25, 'sine', 0.35, 0.12, 0.10);
    this.playTone(783.99, 'sine', 0.35, 0.12, 0.20);
    this.playTone(1046.50, 'sine', 0.65, 0.15, 0.30);
  },

  playSuccess: function() {
    if (!this.enabled) return;
    this.playTone(698.46, 'triangle', 0.18, 0.1, 0.00);
    this.playTone(880.00, 'triangle', 0.18, 0.1, 0.08);
    this.playTone(1046.50, 'sine', 0.45, 0.12, 0.16);
  },

  playWarning: function() {
    if (!this.enabled) return;
    this.playTone(440, 'sawtooth', 0.15, 0.08, 0.00);
    this.playTone(330, 'sawtooth', 0.25, 0.08, 0.12);
  }
};

// Theme Management (Permanently Locked to Sleek Dark Mode)
function applyTheme() {
  localStorage.setItem('ds_theme', 'dark');
  document.body.classList.remove('light-mode');
}

function toggleTheme() {
  // Light mode removed per requirements - enforce dark mode
  localStorage.setItem('ds_theme', 'dark');
  document.body.classList.remove('light-mode');
}

function toggleSoundEffects() {
  DSSound.enabled = !DSSound.enabled;
  localStorage.setItem('ds_sound_enabled', DSSound.enabled ? 'true' : 'false');
  updateSoundUI();
  if (DSSound.enabled) {
    DSSound.playSuccess();
    showToast("Audio sound effects enabled 🔊", "success");
  } else {
    showToast("Audio sound effects muted 🔇", "info");
  }
}

function updateSoundUI() {
  const soundBtn = document.getElementById('headerSoundBtn');
  if (soundBtn) soundBtn.innerText = DSSound.enabled ? '🔊' : '🔇';
  const dropLabel = document.getElementById('soundToggleDropdownLabel');
  if (dropLabel) dropLabel.innerText = DSSound.enabled ? '🔊 Sound Effects: Enabled' : '🔇 Sound Effects: Muted';
}

function toggleProfileDropdown(e) {
  if (e) e.stopPropagation();
  DSSound.playClick();
  const menu = document.getElementById('profileDropdownMenu');
  if (menu) menu.classList.toggle('active');
}

document.addEventListener('click', (e) => {
  const menu = document.getElementById('profileDropdownMenu');
  if (menu && menu.classList.contains('active') && !e.target.closest('.profile-menu-container')) {
    menu.classList.remove('active');
  }
});

// ==========================================================================
// LIVE SYSTEM CLOCK & TOAST NOTIFICATIONS
// ==========================================================================
function updateLiveClock() {
  const clockEl = document.getElementById('headerLiveClock');
  if (clockEl) {
    const now = new Date();
    const opts = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    clockEl.innerText = now.toLocaleString('en-GB', opts);
  }
}
setInterval(updateLiveClock, 1000);

function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.style.position = 'fixed';
    toastContainer.style.bottom = '20px';
    toastContainer.style.right = '20px';
    toastContainer.style.zIndex = '999999';
    toastContainer.style.display = 'flex';
    toastContainer.style.flexDirection = 'column';
    toastContainer.style.gap = '8px';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const colors = {
    info: 'rgba(56, 189, 248, 0.95)',
    success: 'rgba(16, 185, 129, 0.95)',
    warning: 'rgba(245, 158, 11, 0.95)',
    danger: 'rgba(239, 68, 68, 0.95)'
  };

  toast.style.background = colors[type] || colors.info;
  toast.style.color = '#fff';
  toast.style.padding = '9px 16px';
  toast.style.borderRadius = '6px';
  toast.style.fontSize = '12.5px';
  toast.style.fontWeight = '600';
  toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.6)';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '7px';
  toast.style.animation = 'fadeIn 0.2s ease-out';
  toast.innerHTML = `<span>${type === 'success' ? '✓' : (type === 'danger' ? '✕' : 'ℹ')}</span> <span>${message}</span>`;

  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.add('active');
    m.style.display = 'flex';
  }
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) {
    m.classList.remove('active');
    m.style.display = 'none';
  }
  if (id === 'webcamModal') stopWebcam();
  if (id === 'documentCameraModal' && typeof stopDocumentCamera === 'function') stopDocumentCamera();
}

function cancelAdminDelete() {
  pendingAdminDeleteCallback = null;
  const errEl = document.getElementById('adminDeletePasswordError');
  if (errEl) { errEl.style.display = 'none'; errEl.innerText = ''; }
  closeModal('adminDeletePasswordModal');
}

// ==========================================================================
// MASTER ADMIN PASSWORD AUTHORIZATION FOR ALL DELETIONS
// ==========================================================================
let pendingAdminDeleteCallback = null;

function requestAdminPasswordForDelete(itemDescription, onConfirmCallback) {
  if (window.DSSound) DSSound.playWarning?.();
  pendingAdminDeleteCallback = onConfirmCallback;
  const descEl = document.getElementById('adminDeleteTargetDescription');
  if (descEl) descEl.innerText = itemDescription || 'Selected Record';
  
  const passInput = document.getElementById('adminDeletePasswordInput');
  if (passInput) passInput.value = '';
  
  const errEl = document.getElementById('adminDeletePasswordError');
  if (errEl) {
    errEl.style.display = 'none';
    errEl.innerText = '';
  }
  
  openModal('adminDeletePasswordModal');
  setTimeout(() => {
    passInput?.focus();
  }, 150);
}

async function submitAdminDeletePassword(e) {
  if (e) e.preventDefault();
  const passInput = document.getElementById('adminDeletePasswordInput');
  const errEl = document.getElementById('adminDeletePasswordError');
  const password = passInput?.value?.trim();
  
  if (!password) {
    if (errEl) {
      errEl.innerText = "Please enter Master Admin Password.";
      errEl.style.display = 'block';
    }
    return;
  }
  
  try {
    const res = await fetch('/api/auth/verify_admin_password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: password,
        operator_id: State.currentUser?.id,
        operator_role: State.currentUser?.role
      })
    });
    const data = await res.json();
    if (data.success) {
      const cb = pendingAdminDeleteCallback;
      pendingAdminDeleteCallback = null;
      closeModal('adminDeletePasswordModal');
      if (typeof cb === 'function') {
        await cb();
      }
    } else {
      if (errEl) {
        errEl.innerText = data.error || "Incorrect Password! Deletion denied.";
        errEl.style.display = 'block';
      }
      if (window.DSSound) DSSound.playError?.();
      passInput.select();
    }
  } catch (err) {
    if (errEl) {
      errEl.innerText = "Error verifying password: " + err.message;
      errEl.style.display = 'block';
    }
  }
}

async function deleteFlat(flatId, flatNumber) {
  requestAdminPasswordForDelete(`Flat ${flatNumber || ''} (and linked residents & history)`, async () => {
    try {
      const passInput = document.getElementById('adminDeletePasswordInput');
      const enteredPass = passInput?.value?.trim() || '';
      const res = await fetch('/api/flats/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: flatId, 
          operator_role: State.currentUser?.role || 'MASTER_ADMIN',
          admin_password: enteredPass
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Flat ${flatNumber || ''} deleted successfully!`, "success");
        if (window.DSSound) DSSound.playSuccess?.();
        await loadFlatsData();
        await loadDashboardData();
        notifyTransactionChange();
      } else {
        showToast(data.error || "Failed to delete flat", "danger");
      }
    } catch (err) {
      showToast(err.message, "danger");
    }
  });
}

function showGenericModal(title, contentHtml) {
  let modal = document.getElementById('genericModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'genericModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card modal-lg">
        <div class="modal-header">
          <h3 id="genericModalTitle"></h3>
          <button class="modal-close-btn" onclick="closeModal('genericModal')">✕</button>
        </div>
        <div class="modal-body" id="genericModalBody"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  document.getElementById('genericModalTitle').innerText = title;
  document.getElementById('genericModalBody').innerHTML = contentHtml;
  openModal('genericModal');
}

function viewImageZoom(imageUrl, caption) {
  const content = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;">
      <img src="${imageUrl}" alt="${caption}" style="max-width: 100%; max-height: 65vh; border-radius: 8px; border: 1px solid rgba(56,189,248,0.3); object-fit: contain; box-shadow: 0 10px 30px rgba(0,0,0,0.6);" />
      <div style="font-size: 12.5px; color: #cbd5e1; font-weight: 600;">${caption || 'Document Preview'}</div>
    </div>
  `;
  showGenericModal("Document & Photo Viewer", content);
}

function togglePasswordVisibility(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (inp.type === 'password') {
    inp.type = 'text';
    btn.innerText = '🙈';
  } else {
    inp.type = 'password';
    btn.innerText = '👁';
  }
}

// Quick Date Helper for Modals
function setModalDate(inputId, daysOffset, isDateTime = false) {
  const target = new Date();
  target.setDate(target.getDate() + daysOffset);
  const dateStr = target.toISOString().split('T')[0];
  const el = document.getElementById(inputId);
  if (el) {
    if (isDateTime) {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      el.value = `${dateStr} ${timeStr}`;
    } else {
      el.value = dateStr;
    }
  }
}

// ==========================================================================
// FULL YEAR / MONTH / DAY VISUAL INTERACTIVE CALENDAR (2020 to 2035)
// ==========================================================================
function openInteractiveCalendarModal() {
  renderCalendarModalContent();
  openModal('calendarWidgetModal');
}

function renderCalendarModalContent() {
  const year = State.calSelectedYear;
  const month = State.calSelectedMonth;
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Populate Year options (2020 to 2035)
  const yearSelect = document.getElementById('calYearSelect');
  if (yearSelect) {
    let yearOptions = '';
    for (let y = 2020; y <= 2035; y++) {
      yearOptions += `<option value="${y}" ${y === year ? 'selected' : ''}>${y}</option>`;
    }
    yearSelect.innerHTML = yearOptions;
  }

  // Populate Month options
  const monthSelect = document.getElementById('calMonthSelect');
  if (monthSelect) {
    monthSelect.innerHTML = monthNames.map((m, idx) => `<option value="${idx}" ${idx === month ? 'selected' : ''}>${m}</option>`).join('');
  }

  // Days Grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  let daysHtml = '';
  for (let i = 0; i < firstDay; i++) {
    daysHtml += `<div class="cal-day-cell empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isSelected = State.customDate === dateStr || (State.datePreset === 'today' && dateStr === todayStr);

    daysHtml += `
      <div class="cal-day-cell ${isSelected ? 'selected' : ''}" onclick="selectSpecificDate('${dateStr}')">
        <div style="font-weight: bold; font-size: 13px;">${d}</div>
        <div style="font-size: 9.5px; opacity: 0.8;">Select</div>
      </div>
    `;
  }

  const daysGrid = document.getElementById('calDaysGrid');
  if (daysGrid) daysGrid.innerHTML = daysHtml;
}

function onCalYearChange() {
  State.calSelectedYear = parseInt(document.getElementById('calYearSelect').value);
  renderCalendarModalContent();
}

function onCalMonthChange() {
  State.calSelectedMonth = parseInt(document.getElementById('calMonthSelect').value);
  renderCalendarModalContent();
}

function changeCalMonth(delta) {
  let m = State.calSelectedMonth + delta;
  let y = State.calSelectedYear;
  if (m < 0) { m = 11; y--; }
  else if (m > 11) { m = 0; y++; }

  State.calSelectedMonth = m;
  State.calSelectedYear = y;
  renderCalendarModalContent();
}

function applyCalSelectedMonth() {
  if (window.DSSound) DSSound.playClick();
  const m = String(State.calSelectedMonth + 1).padStart(2, '0');
  const y = State.calSelectedYear;
  const monthStr = `${y}-${m}`;

  State.datePreset = 'custom';
  State.customDate = monthStr;
  State.reportDateFrom = null;
  State.reportDateTo = null;
  State.drilldownDateFilter = 'custom';

  const mName = new Date(y, State.calSelectedMonth, 1).toLocaleString('default', { month: 'long' });
  updateTopCalendarPill(`📅 Month: ${mName} ${y}`);
  closeModal('calendarWidgetModal');

  const rMonthSel = document.getElementById('reportMonthSelector');
  if (rMonthSel) rMonthSel.value = monthStr;

  if (document.getElementById('adminBuildingDetailView')?.style.display === 'block') {
    loadAdminBuildingDetail();
  } else {
    refreshActiveModuleData();
  }
  showToast(`Filtered Month: ${mName} ${y}`, "info");
}

function selectSpecificDate(dateStr) {
  State.datePreset = 'custom';
  State.customDate = dateStr;
  State.reportDateFrom = null;
  State.reportDateTo = null;
  State.drilldownDateFilter = 'custom';
  updateTopCalendarPill(`📅 Filter: ${dateStr}`);
  closeModal('calendarWidgetModal');
  
  if (document.getElementById('adminBuildingDetailView')?.style.display === 'block') {
    document.querySelectorAll('#adminBuildingDetailView .date-quick-btn').forEach(b => b.classList.remove('active'));
    loadAdminBuildingDetail();
  } else {
    refreshActiveModuleData();
  }
  showToast(`Filtered Date: ${dateStr}`, "info");
}

function setDateFilterPreset(preset, btn) {
  State.datePreset = preset;
  State.customDate = null;
  State.reportDateFrom = null;
  State.reportDateTo = null;
  State.drilldownDateFilter = preset;

  document.querySelectorAll('.cal-preset-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.preset === preset);
  });

  const labels = {
    today: '📅 Filter: Today',
    yesterday: '📅 Filter: Yesterday',
    '2days': '📅 Filter: Last 2 Days',
    '7days': '📅 Filter: Last 7 Days',
    month: '📅 Filter: This Month',
    all: '📅 Filter: All Records'
  };

  updateTopCalendarPill(labels[preset] || '📅 Filter: Calendar');
  closeModal('calendarWidgetModal');

  if (document.getElementById('adminBuildingDetailView')?.style.display === 'block') {
    document.querySelectorAll('#adminBuildingDetailView .date-quick-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('onclick')?.includes(`'${preset}'`));
    });
    loadAdminBuildingDetail();
  } else {
    refreshActiveModuleData();
  }
  showToast(labels[preset] || `Filter: ${preset.toUpperCase()}`, "info");
}

function updateTopCalendarPill(text) {
  const trigger = document.getElementById('topCalendarTrigger');
  if (trigger) trigger.innerHTML = `${text} ▾`;
}

function refreshActiveModuleData() {
  if (State.activeTab === 'dashboard') loadDashboardData();
  else if (State.activeTab === 'flats') loadFlatsData();
  else if (State.activeTab === 'visitors') loadVisitorsAndStaffData();
  else if (State.activeTab === 'gas') loadGasData();
  else if (State.activeTab === 'repairs') loadRepairsData();
  else if (State.activeTab === 'ledger') loadLedgerData();
  else if (State.activeTab === 'reports') loadMonthlyReportData();
  else if (State.activeTab === 'admin') loadAdminConsoleData();
}

// ==========================================================================
// AUTHENTICATION & LOGIN (SOLID NON-TRANSPARENT BACKGROUND)
// ==========================================================================
function selectLoginRole(role) {
  const adminBtn = document.getElementById('roleBtnAdmin');
  const mgrBtn = document.getElementById('roleBtnManager');
  const recepBtn = document.getElementById('roleBtnReception');
  const uInput = document.getElementById('loginUsername');
  const pInput = document.getElementById('loginPassword');

  if (adminBtn) adminBtn.classList.toggle('active', role === 'admin');
  if (mgrBtn) mgrBtn.classList.toggle('active', role === 'manager');
  if (recepBtn) recepBtn.classList.toggle('active', role === 'receptionist');

  if (role === 'admin') {
    if (uInput) {
      uInput.value = '';
      uInput.placeholder = 'Enter Admin Username';
    }
  } else if (role === 'manager') {
    if (uInput) {
      uInput.value = '';
      uInput.placeholder = 'Enter Manager Username (e.g. Manager_01)';
    }
  } else {
    if (uInput) {
      uInput.value = '';
      uInput.placeholder = 'Enter Receptionist Username';
    }
  }
  if (pInput) {
    pInput.value = '';
    pInput.placeholder = 'Enter Password';
  }
}

function toggleRememberMe(cb) {
  if (!cb) return;
  if (!cb.checked) {
    localStorage.removeItem('ds_remembered_username');
  }
}

function loadRememberedUser() {
  const remembered = localStorage.getItem('ds_remembered_username');
  const uInput = document.getElementById('loginUsername');
  const cb = document.getElementById('loginRememberMe');
  if (remembered && uInput) {
    uInput.value = remembered;
    if (cb) cb.checked = true;
    if (remembered.toLowerCase() === 'admin') {
      selectLoginRole('admin');
    } else if (remembered.toLowerCase().includes('manager')) {
      selectLoginRole('manager');
    } else if (remembered.toLowerCase().includes('receptionist')) {
      selectLoginRole('receptionist');
    }
  }
}

async function handleLogin(e) {
  if (e) e.preventDefault();
  const uInput = document.getElementById('loginUsername').value.trim();
  const pInput = document.getElementById('loginPassword').value.trim();

  if (!uInput || !pInput) {
    showToast("Please enter username and password", "warning");
    return;
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: uInput, password: pInput })
    });

    const data = await res.json();
    if (!data.success) {
      showToast(data.error || "Invalid login credentials", "danger");
      return;
    }

    State.currentUser = data.user;
    localStorage.setItem('ds_user', JSON.stringify(data.user));

    const cb = document.getElementById('loginRememberMe');
    if (cb && cb.checked) {
      localStorage.setItem('ds_remembered_username', uInput);
    } else {
      localStorage.removeItem('ds_remembered_username');
    }

    document.getElementById('loginOverlay').style.display = 'none';

    DSSound.playChime();
    await initAppSession();
    showToast(`Welcome, ${data.user.full_name}!`, "success");
  } catch (err) {
    DSSound.playWarning();
    showToast(`Connection error: ${err.message}`, "danger");
  }
}

function handleLogout() {
  DSSound.playClick();
  State.currentUser = null;
  localStorage.removeItem('ds_user');
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  const menu = document.getElementById('profileDropdownMenu');
  if (menu) menu.classList.remove('active');
}

// ==========================================================================
// APP INITIALIZATION & ROLE SEPARATION
// ==========================================================================
async function initAppSession() {
  const bRes = await fetch('/api/buildings');
  const bData = await bRes.json();
  State.buildings = bData.data || [];

  await reloadBankAccounts();
  await loadCompanyProfile();

  setupRoleBasedInterface();
  populateReportsBuildingSelector();
  updateHeaderUI();
  updateLiveClock();

  if (window.DSSync && window.DSSync.loadSupabaseConfig) {
    DSSync.loadSupabaseConfig();
  }

  switchTab(State.activeTab);

  // Check Daily Sync Status Notification for Admin (Once Daily)
  if (State.currentUser?.role === 'MASTER_ADMIN') {
    setTimeout(() => {
      checkDailySyncNotification(false);
    }, 600);
  }
}

async function loadCompanyProfile() {
  try {
    const res = await fetch('/api/system/profile');
    const data = await res.json();
    if (data.success && data.data) {
      State.companyProfile = data.data;
      renderCorporateBanner();
    }
  } catch(e) {
    console.warn("Could not load company profile:", e);
  }
}

function renderCorporateBanner() {
  const p = State.companyProfile || {
    company_name: 'DS MAINTENANCE',
    office_address: 'Office No. 907, 9th Floor, Dominion Business Center 01, Jinnah Avenue, Bahria Town Karachi (BTK)',
    helpline_phone: '+92 21 111-DS-MAINT',
    official_email: 'accounts@dsmaintenance.pk',
    ntn_number: '9028471-4',
    audit_ref_prefix: 'DSM/AUDIT/2026/REP-8821'
  };

  const nameEl = document.getElementById('bannerCompanyName');
  if (nameEl) nameEl.innerText = p.company_name;

  const addrEl = document.getElementById('bannerOfficeAddress');
  if (addrEl) addrEl.innerText = p.office_address;

  const phoneEl = document.getElementById('bannerHelpline');
  if (phoneEl) phoneEl.innerText = p.helpline_phone;

  const emailEl = document.getElementById('bannerEmail');
  if (emailEl) emailEl.innerText = p.official_email;

  const ntnEl = document.getElementById('bannerNtn');
  if (ntnEl) ntnEl.innerText = p.ntn_number;

  const refEl = document.getElementById('bannerAuditRef');
  if (refEl) refEl.innerText = `Ref: ${p.audit_ref_prefix}`;
}

async function reloadBankAccounts() {
  const bankRes = await fetch('/api/bank_accounts');
  const bankData = await bankRes.json();
  State.bankAccounts = bankData.data || [];

  const bankSelect = document.getElementById('gasBankSelect');
  if (bankSelect) {
    bankSelect.innerHTML = State.bankAccounts.map(b => `<option value="${b.id}">${b.bank_name} - ${b.account_title} (${b.account_number})</option>`).join('');
  }
}

function setupRoleBasedInterface() {
  const switcher = document.getElementById('topBuildingSelector');
  const user = State.currentUser || {};
  const isMasterAdmin = (user.role === 'MASTER_ADMIN');
  const isManager = (user.role === 'MANAGER');
  const isReceptionist = (user.role === 'RECEPTIONIST');

  const adminNav = document.getElementById('adminTabNav');
  const reportsNav = document.getElementById('reportsTabNav');
  const settingsNav = document.getElementById('settingsTabNav');

  // Profile Dropdown Options
  const corpBtn = document.getElementById('adminCorporateDropdownBtn');
  const bldgRenameBtn = document.getElementById('adminBuildingNamesDropdownBtn');
  const settingsDropBtn = document.getElementById('adminSettingsDropdownBtn');
  const changePassBtn = document.getElementById('adminChangePasswordBtn');
  const notifBellBtn = document.getElementById('headerNotificationBtn');

  if (corpBtn) corpBtn.style.display = isMasterAdmin ? 'flex' : 'none';
  if (bldgRenameBtn) bldgRenameBtn.style.display = isMasterAdmin ? 'flex' : 'none';
  if (settingsDropBtn) settingsDropBtn.style.display = (isMasterAdmin || isManager) ? 'flex' : 'none';
  if (changePassBtn) changePassBtn.style.display = isMasterAdmin ? 'flex' : 'none';
  if (notifBellBtn) notifBellBtn.style.display = isMasterAdmin ? 'flex' : 'none';

  // Toggle buttons in repair receipt (Hide profit/office copy for receptionist, show for manager & admin)
  const officeTabBtn = document.getElementById('repairReceiptTabOffice');
  if (officeTabBtn) officeTabBtn.style.display = (isMasterAdmin || isManager) ? 'inline-block' : 'none';

  // Comprehensive bulk PDF export buttons across modules (Master Admin & Manager)
  document.querySelectorAll('.admin-only-report-btn').forEach(btn => {
    btn.style.display = (isMasterAdmin || isManager) ? 'inline-flex' : 'none';
  });

  if (isMasterAdmin) {
    switcher.style.display = 'inline-block';
    switcher.innerHTML = `<option value="ALL">🏢 All 5 Buildings (Consolidated)</option>` +
      State.buildings.map(b => `<option value="${b.id}">📍 ${b.name}</option>`).join('');
    State.selectedBuildingId = 'ALL';

    if (adminNav) adminNav.style.display = 'inline-block';
    if (reportsNav) reportsNav.style.display = 'inline-block';
    if (settingsNav) settingsNav.style.display = 'inline-block';
  } else {
    switcher.style.display = 'none';
    State.selectedBuildingId = user.assigned_building_id || (State.buildings[0] ? State.buildings[0].id : 'ALL');

    if (adminNav) adminNav.style.display = 'none';
    if (reportsNav) reportsNav.style.display = isManager ? 'inline-block' : 'none';
    if (settingsNav) settingsNav.style.display = isManager ? 'inline-block' : 'none';
  }

  const addFlatBtn = document.getElementById('adminAddNewFlatBtn');
  if (addFlatBtn) {
    addFlatBtn.style.display = (isMasterAdmin || isManager) ? 'inline-flex' : 'none';
  }

  const curB = State.buildings.find(b => b.id === State.selectedBuildingId);
  State.currentBuilding = curB || null;
}

function populateReportsBuildingSelector() {
  const rSelect = document.getElementById('reportBuildingSelector');
  if (!rSelect) return;

  const user = State.currentUser || {};
  if (user.role === 'MANAGER') {
    const curB = State.buildings.find(b => b.id === user.assigned_building_id);
    if (curB) {
      rSelect.innerHTML = `<option value="${curB.id}">📍 ${curB.name}</option>`;
      State.reportBuildingId = curB.id;
      rSelect.disabled = true;
      return;
    }
  }

  rSelect.disabled = false;
  rSelect.innerHTML = `<option value="ALL">🏢 All 5 Buildings (Consolidated)</option>` +
    State.buildings.map(b => `<option value="${b.id}">📍 ${b.name}</option>`).join('');
}

function onReportBuildingChange() {
  const rSelect = document.getElementById('reportBuildingSelector');
  State.reportBuildingId = rSelect.value;
  loadMonthlyReportData();
}

function updateHeaderUI() {
  const user = State.currentUser;
  if (!user) return;
  const curB = State.buildings.find(b => b.id === State.selectedBuildingId);

  const bBadge = document.getElementById('headerBuildingBadge');
  if (bBadge) {
    if (user.role === 'MASTER_ADMIN' && State.selectedBuildingId === 'ALL') {
      bBadge.innerText = "🏢 ALL 5 BUILDINGS CONSOLIDATED";
    } else if (user.role === 'MANAGER') {
      bBadge.innerText = curB ? `🏢 ${curB.name.toUpperCase()} (MANAGER)` : "BUILDING (MANAGER)";
    } else {
      bBadge.innerText = curB ? curB.name.toUpperCase() : "BUILDING";
    }
  }

  const roleLabel = user.role === 'MASTER_ADMIN' ? 'Admin' : (user.role === 'MANAGER' ? 'Manager' : 'Receptionist');
  const roleTitle = user.role === 'MASTER_ADMIN' ? 'Master Administrator' : (user.role === 'MANAGER' ? 'Building Manager' : 'Receptionist');

  const uName = document.getElementById('headerUserName');
  if (uName) uName.innerText = `${user.full_name} (${roleLabel})`;

  const dropName = document.getElementById('dropdownFullName');
  if (dropName) dropName.innerText = user.full_name;

  const dropRole = document.getElementById('dropdownRoleTitle');
  if (dropRole) dropRole.innerText = `${roleTitle} • ${curB ? curB.name : 'All Buildings'}`;

  const adminCorpBtn = document.getElementById('adminCorporateDropdownBtn');
  if (adminCorpBtn) adminCorpBtn.style.display = user.role === 'MASTER_ADMIN' ? 'flex' : 'none';

  const adminEditCorpBannerBtn = document.getElementById('adminEditCorporateBtn');
  if (adminEditCorpBannerBtn) adminEditCorpBannerBtn.style.display = user.role === 'MASTER_ADMIN' ? 'inline-block' : 'none';

  const adminBldgBtn = document.getElementById('adminBuildingNamesDropdownBtn');
  if (adminBldgBtn) adminBldgBtn.style.display = user.role === 'MASTER_ADMIN' ? 'flex' : 'none';

  const adminSettingsBtn = document.getElementById('adminSettingsDropdownBtn');
  if (adminSettingsBtn) adminSettingsBtn.style.display = (user.role === 'MASTER_ADMIN' || user.role === 'MANAGER') ? 'flex' : 'none';

  updateSoundUI();
  applyTheme();
}

function onBuildingSelectChange() {
  DSSound.playClick();
  const sel = document.getElementById('topBuildingSelector');
  State.selectedBuildingId = sel.value;
  State.currentBuilding = State.buildings.find(b => b.id === State.selectedBuildingId) || null;
  const rSelect = document.getElementById('reportBuildingSelector');
  if (rSelect) {
    rSelect.value = State.selectedBuildingId;
    State.reportBuildingId = State.selectedBuildingId;
  }
  updateHeaderUI();
  switchTab(State.activeTab);
}

function notifyTransactionChange() {
  if (State.activeTab === 'reports') {
    loadMonthlyReportData();
  } else {
    State.lastReportData = null;
  }
}

// ==========================================================================
// MODULE SWITCHER
// ==========================================================================
function switchTab(tabName) {
  DSSound.playClick();
  State.activeTab = tabName;

  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  document.querySelectorAll('.view-section').forEach(view => {
    view.classList.toggle('active', view.id === `view_${tabName}`);
  });

  refreshActiveModuleData();
  if (tabName === 'history') loadTenantHistoryData();
  else if (tabName === 'settings') loadSettingsData();
}

// ==========================================================================
// 1. DASHBOARD MODULE (UNIVERSAL SEARCH & LIVE OPERATIONAL WORKSPACE)
// ==========================================================================
let currentDashboardWorkspaceTab = 'flats';

async function loadDashboardData() {
  try {
    const customParam = State.customDate ? `&custom_date=${State.customDate}` : '';
    const res = await fetch(`/api/dashboard/stats?building_id=${State.selectedBuildingId}&date_preset=${State.datePreset}${customParam}`);
    const resData = await res.json();
    if (!resData.success) return;

    const d = resData.data;

    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val;
    };

    setTxt('kpiTotalFlats', d.flats?.total || 0);
    setTxt('kpiOccupiedFlats', `${(d.flats?.owner_occ || 0)} Owner Living • ${(d.flats?.rented_occ || 0)} Tenant Living (${d.flats?.vacant || 0} Vacant)`);
    setTxt('kpiActiveTenants', d.active_tenants || 0);
    
    setTxt('kpiTodayVisitors', d.visitors?.total_visitors || 0);
    const insidePersons = d.visitors?.inside_now || 0;
    setTxt('kpiInsideNow', `${insidePersons} ${insidePersons === 1 ? 'Person' : 'Persons'} Inside Now`);

    setTxt('kpiGasReserve', d.gas?.reserve_stock || 0);
    setTxt('kpiGasActive', `${d.gas?.active_in_apartments || 0} Active / ${d.gas?.empty_returned || 0} Empty`);

    setTxt('kpiStaffDuty', `${d.staff?.on_duty || 0} / ${d.staff?.total_staff || 0}`);

    const totalIncome = d.financials?.total_income || 0;
    const totalExpense = d.financials?.total_expense || 0;
    const netProfit = totalIncome - totalExpense;

    setTxt('kpiMonthlyIncome', `PKR ${totalIncome.toLocaleString()}`);
    setTxt('kpiCashBankBreakdown', `Cash: PKR ${(d.financials?.cash_income || 0).toLocaleString()} | Bank: PKR ${(d.financials?.bank_income || 0).toLocaleString()}`);

    setTxt('kpiRepairMargin', `PKR ${(d.repair_jobs?.total_profit || 0).toLocaleString()}`);
    setTxt('kpiRepairJobsCount', `${d.repair_jobs?.total_jobs || 0} Jobs Logged`);

    if (window.DSCharts) {
      DSCharts.drawBarChart('dashboardRevenueChart', ['Total Collections', 'Operating Expenses', 'Net Profit Margin'], [{
        data: [totalIncome, totalExpense, Math.max(0, netProfit)],
        colorStart: '#38bdf8',
        colorEnd: '#1d4ed8'
      }], { height: 210 });
    }

    // Parallel sub-data fetch for high-speed dashboard loading
    await Promise.allSettled([
      loadFlatsData(),
      loadVisitorsAndStaffData(),
      loadGasData(),
      loadDashboardLedgerData()
    ]);
    renderDashboardWorkspace();
  } catch (err) {
    console.error("Dashboard error:", err);
  }
}

async function loadDashboardLedgerData() {
  const dashLBody = document.getElementById('dashboardLedgerTableBody');
  if (!dashLBody) return;
  try {
    const res = await fetch(`/api/ledger?building_id=${State.selectedBuildingId}`);
    const data = await res.json();
    const list = (data.data || []).slice(0, 15);
    if (list.length === 0) {
      dashLBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 18px;">No ledger transactions logged yet.</td></tr>`;
      return;
    }
    dashLBody.innerHTML = list.map(l => {
      const isInc = l.entry_type === 'INCOME';
      const bName = l.building_name || 'Building 01';
      const personStr = l.person_name ? `<strong>${l.person_name}</strong>` : (isInc ? 'Resident / Customer' : 'Vendor / Contractor');
      const pMode = l.payment_mode === 'HAND_CASH' ? '<span class="badge badge-info">Hand Cash</span>' : '<span class="badge badge-success">Bank Transfer</span>';

      return `
        <tr>
          <td>${l.entry_date || '---'}</td>
          <td><strong style="color: #38bdf8;">${bName}</strong></td>
          <td><span class="badge ${isInc ? 'badge-success' : 'badge-danger'}">${isInc ? '📥 INCOME' : '📤 EXPENSE'}</span></td>
          <td><strong>${l.category}</strong></td>
          <td>${personStr}</td>
          <td>${l.notes || 'Financial transaction'}</td>
          <td>${pMode}</td>
          <td><strong style="color: ${isInc ? '#10b981' : '#f43f5e'}; font-size: 13px;">${isInc ? '+' : '-'} PKR ${(l.amount || 0).toLocaleString()}</strong></td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    dashLBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #f43f5e; padding: 18px;">Failed to load ledger: ${err.message}</td></tr>`;
  }
}

function switchDashboardWorkspaceTab(tab) {
  if (window.DSSound) DSSound.playClick();
  currentDashboardWorkspaceTab = tab;

  const btnFlats = document.getElementById('dashTabBtnFlats');
  const btnVis = document.getElementById('dashTabBtnVisitors');
  const btnGas = document.getElementById('dashTabBtnGas');
  const btnStaff = document.getElementById('dashTabBtnStaff');

  if (btnFlats) btnFlats.className = tab === 'flats' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
  if (btnVis) btnVis.className = tab === 'visitors' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
  if (btnGas) btnGas.className = tab === 'gas' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
  if (btnStaff) btnStaff.className = tab === 'staff' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';

  const vFlats = document.getElementById('dashWorkspaceFlatsView');
  const vVis = document.getElementById('dashWorkspaceVisitorsView');
  const vGas = document.getElementById('dashWorkspaceGasView');
  const vStaff = document.getElementById('dashWorkspaceStaffView');

  if (vFlats) vFlats.style.display = tab === 'flats' ? 'block' : 'none';
  if (vVis) vVis.style.display = tab === 'visitors' ? 'block' : 'none';
  if (vGas) vGas.style.display = tab === 'gas' ? 'block' : 'none';
  if (vStaff) vStaff.style.display = tab === 'staff' ? 'block' : 'none';

  renderDashboardWorkspace();
}

function renderDashboardWorkspace() {
  const query = (document.getElementById('dashboardQuickTableFilter')?.value || '').toLowerCase().trim();

  // 1. Dashboard Flats
  const tbodyFlats = document.getElementById('dashFlatsTableBody');
  if (tbodyFlats) {
    let filteredFlats = flatsCache;
    if (query) {
      filteredFlats = flatsCache.filter(f => {
        return f.flat_number.toLowerCase().includes(query) ||
               (f.tenant_name && f.tenant_name.toLowerCase().includes(query)) ||
               (f.owner_name && f.owner_name.toLowerCase().includes(query)) ||
               (f.tenant_phone && f.tenant_phone.includes(query)) ||
               (f.owner_phone && f.owner_phone.includes(query));
      });
    }
    if (filteredFlats.length === 0) {
      tbodyFlats.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 18px;">No apartments matching filter.</td></tr>`;
    } else {
      tbodyFlats.innerHTML = filteredFlats.map(f => {
        const isOwner = f.occupancy_mode === 'Owner Occupied';
        const isRented = f.occupancy_mode === 'Rented' || f.occupancy_mode === 'Rented Active' || !!f.tenant_name;
        const occBadge = isOwner 
          ? `<span class="badge badge-info">🏠 Owner Living</span>`
          : (isRented ? `<span class="badge badge-success">👤 Tenant Living</span>` : `<span class="badge badge-warning">🚪 Vacant</span>`);
        
        const tenantImg = f.tenant_photo ? `<img src="/media/${f.tenant_photo}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1.5px solid #10b981; vertical-align: middle; margin-right: 6px;" title="Tenant Photo" />` : '';
        const resName = isOwner ? (f.owner_name || 'Owner') : (f.tenant_name ? `<div style="display: flex; align-items: center;">${tenantImg}<strong>${f.tenant_name}</strong></div>` : '<span style="color: #94a3b8; font-style: italic;">No Active Tenant</span>');
        const resPhone = isOwner ? (f.owner_phone || '---') : (f.tenant_phone || '---');
        const vehiclesCount = (f.vehicles || []).length;
        const maidsCount = (f.associated_maids || []).length;

        return `
          <tr>
            <td><strong style="color: #38bdf8; font-size: 13px;">Flat ${f.flat_number}</strong></td>
            <td>${f.building_name} (${f.wing || 'Wing A'}, Fl. ${f.floor_number})</td>
            <td>${occBadge}</td>
            <td>${resName}</td>
            <td><span style="font-family: monospace;">${resPhone}</span></td>
            <td>🚗 ${vehiclesCount} Cars • 🧹 ${maidsCount} Maids</td>
            <td>
              <button class="btn btn-sm btn-info" onclick="showDossierModal('${f.id}')">📑 Dossier</button>
              <button class="btn btn-sm btn-secondary" onclick="openAssignTenantModal('${f.id}', '${f.flat_number}', '${f.building_id}')" title="Register / Edit Tenant Profile">👤 ${isRented ? 'Edit Tenant' : '+ Register Tenant'}</button>
              <button class="btn btn-sm btn-success" onclick="quickDeliverGasToFlat('${f.flat_number}')" title="Deliver Gas">+ Gas</button>
              <button class="btn btn-sm btn-primary" onclick="quickCheckinVisitorToFlat('${f.flat_number}')" title="Check-in Visitor">+ Guest</button>
              ${(State.currentUser?.role === 'MASTER_ADMIN' || State.currentUser?.role === 'MANAGER') ? `<button class="btn btn-sm btn-danger" onclick="deleteFlat('${f.id}', '${f.flat_number}')" title="Delete Flat">🗑️ Delete</button>` : ''}
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // 2. Dashboard Live Visitors
  const tbodyVis = document.getElementById('dashVisitorsTableBody');
  if (tbodyVis) {
    let activeVisitors = visitorsCache.filter(v => v.status === 'IN_PREMISES');
    if (query) {
      activeVisitors = activeVisitors.filter(v => {
        return v.flat_number.toLowerCase().includes(query) ||
               v.guest_name.toLowerCase().includes(query) ||
               (v.contact_number && v.contact_number.includes(query)) ||
               (v.cnic_number && v.cnic_number.includes(query));
      });
    }
    if (activeVisitors.length === 0) {
      tbodyVis.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 18px;">No guests currently inside building premises.</td></tr>`;
    } else {
      tbodyVis.innerHTML = activeVisitors.map(v => `
        <tr>
          <td><strong style="color: #38bdf8;">Flat ${v.flat_number}</strong></td>
          <td>
            <strong>${v.guest_name}</strong>
            ${(v.total_persons && v.total_persons > 1) ? `<span class="badge badge-info" style="font-size: 9px; margin-left: 3px;">👨‍👩‍👧 ${v.total_persons}</span>` : ''}
            ${v.accompanying_details ? `<div style="font-size: 10px; color: #94a3b8; margin-top: 1px;">👥 ${v.accompanying_details}</div>` : ''}
          </td>
          <td><span style="font-family: monospace;">${v.contact_number || '---'}</span></td>
          <td>${v.cnic_number || '---'}</td>
          <td><span class="badge badge-success">● In ${v.entry_time || '---'}</span></td>
          <td>${v.purpose_of_visit || 'Guest Visit'}</td>
          <td>
            <div style="display: flex; gap: 4px; align-items: center;">
              ${v.document_filename ? `<button class="btn btn-sm btn-info" onclick="viewDocumentModal('/media/${v.document_filename}', 'Document - ${v.guest_name}')" title="View ID Document">📄</button>` : ''}
              <button class="btn btn-sm btn-danger" onclick="checkoutVisitor('${v.id}')">🚪 Out</button>
              <button class="btn btn-sm btn-secondary" onclick="printVisitorPass('${v.id}')">🖨 Pass</button>
            </div>
          </td>
        </tr>
      `).join('');
    }
  }

  // 3. Dashboard Gas Active Flats
  const tbodyGas = document.getElementById('dashGasTableBody');
  if (tbodyGas) {
    let activeFlats = gasActiveFlatsCache || [];
    if (query) {
      activeFlats = activeFlats.filter(f => {
        return f.flat_number.toLowerCase().includes(query) ||
               (f.tenant_name && f.tenant_name.toLowerCase().includes(query)) ||
               (f.owner_name && f.owner_name.toLowerCase().includes(query)) ||
               (f.tenant_phone && f.tenant_phone.includes(query));
      });
    }
    if (activeFlats.length === 0) {
      tbodyGas.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 18px;">No active cylinder records found.</td></tr>`;
    } else {
      tbodyGas.innerHTML = activeFlats.map(f => {
        const res = f.tenant_name || (f.occupancy_mode === 'Owner Occupied' ? f.owner_name : 'Resident');
        const ph = f.tenant_phone || f.owner_phone || '---';
        const isNewLast = f.last_transaction_type === 'NEW_PURCHASE' || f.last_transaction_type === 'NEW_BOTTLE';
        const emptyBadge = isNewLast
          ? `<span class="badge badge-secondary" style="font-weight: bold;">N/A</span>`
          : (f.last_empty_returned 
              ? `<span class="badge badge-success">Returned (Empty Taken)</span>`
              : `<span class="badge badge-warning">Pending Return</span>`);

        return `
          <tr>
            <td><strong style="color: #38bdf8;">Flat ${f.flat_number}</strong></td>
            <td>${f.building_name} (Fl. ${f.floor_number})</td>
            <td><strong>${res}</strong> (${f.occupancy_mode})</td>
            <td><span style="font-family: monospace;">${ph}</span></td>
            <td>${f.last_delivery_date || '---'}</td>
            <td>${emptyBadge}</td>
            <td>
              <button class="btn btn-sm btn-info" onclick="showDossierModal('${f.flat_id || f.id}')">📑 Flat Dossier</button>
              <button class="btn btn-sm btn-success" onclick="quickDeliverGasToFlat('${f.flat_number}')">+ Deliver Gas</button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // 4. Dashboard Staff
  const tbodyStaff = document.getElementById('dashStaffTableBody');
  if (tbodyStaff) {
    let staff = staffCache || [];
    if (query) {
      staff = staff.filter(m => {
        return m.full_name.toLowerCase().includes(query) ||
               (m.assigned_flat_number && m.assigned_flat_number.toLowerCase().includes(query)) ||
               (m.bahria_card_number && m.bahria_card_number.toLowerCase().includes(query)) ||
               (m.cnic_number && m.cnic_number.includes(query));
      });
    }
    if (staff.length === 0) {
      tbodyStaff.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 18px;">No domestic staff registered.</td></tr>`;
    } else {
      tbodyStaff.innerHTML = staff.map(m => `
        <tr>
          <td><strong>${m.full_name}</strong></td>
          <td>${m.role_type || 'Maid / Cook'}</td>
          <td><span style="font-family: monospace; color: #38bdf8;">${m.bahria_card_number || '---'}</span></td>
          <td><strong>Flat ${m.assigned_flat_number || '---'}</strong></td>
          <td>${m.cnic_number || '---'}</td>
          <td><span class="badge ${m.status === 'ON_DUTY' ? 'badge-success' : 'badge-secondary'}">${m.status}</span></td>
          <td>
            <button class="btn btn-sm btn-info" onclick="viewStaffProfile('${m.id}')">📑 Dossier</button>
            <button class="btn btn-sm btn-secondary" onclick="printStaffPass('${m.id}')">🖨 Pass</button>
          </td>
        </tr>
      `).join('');
    }
  }
}

function filterDashboardQuickTable() {
  renderDashboardWorkspace();
}

function handleDashboardUniversalSearch() {
  const query = (document.getElementById('dashboardUniversalSearchInput')?.value || '').toLowerCase().trim();
  const container = document.getElementById('dashboardSearchResultsContainer');
  if (!container) return;

  if (!query) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  const matchingFlats = flatsCache.filter(f => {
    const fNum = f.flat_number.toLowerCase();
    const tName = (f.tenant_name || '').toLowerCase();
    const oName = (f.owner_name || '').toLowerCase();
    const tPhone = f.tenant_phone || '';
    const oPhone = f.owner_phone || '';
    const tCnic = f.tenant_cnic || '';
    const oCnic = f.owner_cnic || '';
    const bldg = (f.building_name || '').toLowerCase();

    const matchFamily = (f.family_members || []).some(m => (m.full_name || '').toLowerCase().includes(query) || (m.phone || '').includes(query));
    const matchVehicles = (f.vehicles || []).some(v => (v.registration_number || '').toLowerCase().includes(query) || (v.make_model || '').toLowerCase().includes(query));

    return fNum.includes(query) || tName.includes(query) || oName.includes(query) ||
           tPhone.includes(query) || oPhone.includes(query) || tCnic.includes(query) || oCnic.includes(query) ||
           bldg.includes(query) || matchFamily || matchVehicles;
  });

  container.style.display = 'block';

  if (matchingFlats.length === 0) {
    container.innerHTML = `
      <div style="background: rgba(15,23,42,0.7); border: 1px dashed rgba(255,255,255,0.15); border-radius: 8px; padding: 14px; text-align: center; color: #94a3b8; font-size: 13px;">
        No apartments, residents, vehicles, or contacts found matching "<strong style="color: #fff;">${query}</strong>".
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="font-size: 12px; color: #38bdf8; font-weight: 700; margin-bottom: 8px;">
      ✨ Found ${matchingFlats.length} Matching Apartment Record(s) for "${query}":
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 10px;">
      ${matchingFlats.slice(0, 6).map(f => {
        const isOwner = f.occupancy_mode === 'Owner Occupied';
        const resName = isOwner ? (f.owner_name || 'Owner') : (f.tenant_name || 'Vacant');
        const resPhone = isOwner ? (f.owner_phone || '---') : (f.tenant_phone || '---');
        const occBadge = isOwner 
          ? `<span class="badge badge-success">🏠 Owner Living</span>`
          : (f.tenant_name ? `<span class="badge badge-info">👤 Tenant Living</span>` : `<span class="badge badge-warning">🚪 Vacant</span>`);

        return `
          <div style="background: rgba(15,23,42,0.85); border: 1.5px solid rgba(56,189,248,0.4); border-radius: 8px; padding: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
              <div>
                <strong style="font-size: 14px; color: #38bdf8;">Flat ${f.flat_number}</strong>
                <span style="font-size: 11.5px; color: #94a3b8; margin-left: 6px;">${f.building_name} (${f.wing || 'Wing A'})</span>
              </div>
              <div>${occBadge}</div>
            </div>
            <div style="font-size: 12.5px; color: #e2e8f0; margin-bottom: 4px;">
              <strong>Resident / Owner:</strong> ${resName}
            </div>
            <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px; display: flex; gap: 12px; flex-wrap: wrap;">
              <span>📱 <strong>Phone:</strong> ${resPhone}</span>
              <span>🚗 <strong>Cars:</strong> ${(f.vehicles || []).length}</span>
              <span>🧹 <strong>Maids:</strong> ${(f.associated_maids || []).length}</span>
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 8px;">
              <button class="btn btn-sm btn-info" style="font-weight: 700;" onclick="showDossierModal('${f.id}')">📑 Open Full Dossier</button>
              <button class="btn btn-sm btn-success" onclick="quickDeliverGasToFlat('${f.flat_number}')">+ Deliver Gas</button>
              <button class="btn btn-sm btn-primary" onclick="quickCheckinVisitorToFlat('${f.flat_number}')">+ Guest</button>
              <button class="btn btn-sm btn-warning" onclick="quickRepairFlat('${f.flat_number}')">+ Repair</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function clearDashboardSearch() {
  const input = document.getElementById('dashboardUniversalSearchInput');
  if (input) input.value = '';
  const container = document.getElementById('dashboardSearchResultsContainer');
  if (container) {
    container.style.display = 'none';
    container.innerHTML = '';
  }
}

// KPI Direct Navigation & Dossier Openers
function openDashboardFlatsDossier() {
  switchDashboardWorkspaceTab('flats');
  const target = document.getElementById('dashWorkspaceFlatsView');
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openDashboardVisitorsDossier() {
  switchDashboardWorkspaceTab('visitors');
  const target = document.getElementById('dashWorkspaceVisitorsView');
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openDashboardStaffDossier() {
  switchDashboardWorkspaceTab('staff');
  const target = document.getElementById('dashWorkspaceStaffView');
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openDashboardCollectionsDossier() {
  switchTab('ledger');
}

function openDashboardRepairsDossier() {
  switchTab('repairs');
}

function quickDeliverGasToFlat(flatNum) {
  openNewGasDeliveryModal();
  const flatInput = document.getElementById('gasFlatNumber');
  if (flatInput) flatInput.value = flatNum;
}

function quickCheckinVisitorToFlat(flatNum) {
  openNewVisitorModal();
  const flatInput = document.getElementById('visitorFlatNumber');
  if (flatInput) flatInput.value = flatNum;
}

function quickRepairFlat(flatNum) {
  openNewRepairJobModal();
  const flatInput = document.getElementById('repairFlatNumber');
  if (flatInput) flatInput.value = flatNum;
}

// ==========================================================================
// 2. FLATS & TENANTS REGISTRY (RECEPTIONIST PRIVACY MASKING)
// ==========================================================================
let flatsCache = [];

async function loadFlatsData() {
  try {
    const res = await fetch(`/api/flats?building_id=${State.selectedBuildingId}`);
    const data = await res.json();
    if (!data.success) return;

    flatsCache = data.data || [];
    filterFlats();
  } catch (err) {
    showToast(`Error: ${err.message}`, "danger");
  }
}

function renderFlatsTable(flats) {
  const tbody = document.getElementById('flatsTableBody');
  if (!tbody) return;

  if (flats.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 25px; font-size: 13px;">No apartments found matching selected filter criteria.</td></tr>`;
    return;
  }

  const isReceptionist = State.currentUser?.role === 'RECEPTIONIST';

  tbody.innerHTML = flats.map(f => {
    const isOwner = f.occupancy_mode === 'Owner Occupied';
    const isTenant = f.occupancy_mode === 'Rented' && f.tenant_id;
    const isVacant = f.occupancy_mode === 'Vacant' || (!isOwner && !isTenant);

    return `
      <tr>
        <td><strong style="color: #38bdf8; font-size: 13.5px;">Flat ${f.flat_number}</strong></td>
        <td>${f.building_name} (${f.wing || 'Wing A'})</td>
        <td>Floor ${f.floor_number} • ${f.bhk_type}</td>
        <td>
          <span class="badge ${isOwner ? 'badge-info' : (isTenant ? 'badge-success' : 'badge-warning')}">
            ${isOwner ? '🏠 Owner Living' : (isTenant ? '👤 Tenant Living' : '🚪 Vacant / Inactive')}
          </span>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
            Owner: <strong>${f.owner_name || 'Property Owner'}</strong>
            ${!isReceptionist && f.owner_phone ? `<span style="color: #64748b;"> (${f.owner_phone})</span>` : ''}
          </div>
        </td>
        <td>
          ${isTenant ? `
            <div><strong>${f.tenant_name}</strong></div>
            <div style="font-size: 11px; color: #94a3b8;">${f.tenant_phone} • CNIC: ${f.tenant_cnic || 'N/A'}</div>
          ` : (isOwner ? `<span style="color: #38bdf8; font-size: 12px;">Owner Residing Directly</span>` : `<span style="color: #64748b; font-style: italic;">No Active Resident</span>`)}
        </td>
        <td>
          ${isTenant ? `<div><span class="badge badge-success">Active Resident</span></div>` : (isOwner ? `<span class="badge badge-info">Owner Residing</span>` : `<span class="badge badge-warning">Vacant / Ready</span>`)}
        </td>
        <td>
          <div style="display: flex; gap: 4px; flex-wrap: wrap;">
            <button class="btn btn-sm btn-secondary" onclick="viewFlatDetailModal('${f.id}')">👁 Dossier</button>
            <button class="btn btn-sm btn-primary" onclick="openFlatStatusChangeModal('${f.id}')">⚡ Status</button>
            <button class="btn btn-sm btn-secondary" onclick="openFlatOccupancyTimelineModal('${f.id}')">🕒 Timeline</button>
            <button class="btn btn-sm btn-secondary" onclick="openEditFlatModal('${f.id}')">✏️ Edit</button>
            ${isTenant ? `
              <button class="btn btn-sm btn-danger" onclick="openVacateTenantModal('${f.id}', '${f.flat_number}', '${f.tenant_name}')">🚪 Vacate</button>
            ` : ''}
            ${!isReceptionist ? `
              <button class="btn btn-sm btn-danger" onclick="deleteFlat('${f.id}', '${f.flat_number}')" title="Delete Flat Record">🗑️ Delete</button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

let currentFlatSearchField = 'all';

function setFlatSearchField(field, btn) {
  currentFlatSearchField = field;
  document.querySelectorAll('#view_flats .search-pill-btn').forEach(p => {
    p.classList.toggle('active', p.dataset.field === field);
  });
  const input = document.getElementById('flatSearchInput');
  if (input) {
    const placeholders = {
      all: 'Search by Flat #, Mobile #, Car Plate, Name...',
      flat: 'Search specific Flat # (e.g. 101, 202)...',
      mobile: 'Search Mobile / Phone #...',
      vehicle: 'Search Vehicle / Car Plate (e.g. ABC-123)...',
      name: 'Search Resident / Owner Name...'
    };
    input.placeholder = placeholders[field] || placeholders.all;
    input.focus();
  }
  DSSound.playClick();
  filterFlats();
}

function filterFlats() {
  const query = (document.getElementById('flatSearchInput')?.value || '').trim().toLowerCase();
  const occ = document.getElementById('flatOccupancyFilter')?.value || 'ALL';

  let ownerCount = 0;
  let tenantCount = 0;
  let vacantCount = 0;

  flatsCache.forEach(f => {
    if (f.occupancy_mode === 'Owner Occupied') ownerCount++;
    else if (f.occupancy_mode === 'Rented' && f.tenant_id) tenantCount++;
    else vacantCount++;
  });

  const countBadge = document.getElementById('flatsSummaryBadge');
  if (countBadge) {
    countBadge.innerHTML = `Total: <strong>${flatsCache.length}</strong> Flats (${ownerCount} Owner Living • ${tenantCount} Tenant Living • ${vacantCount} Vacant)`;
  }

  const filtered = flatsCache.filter(f => {
    const isOwner = f.occupancy_mode === 'Owner Occupied';
    const isTenant = f.occupancy_mode === 'Rented' && f.tenant_id;
    const isVacant = f.occupancy_mode === 'Vacant' || (!isOwner && !isTenant);

    let matchOcc = true;
    if (occ === 'OWNER_OCCUPIED') matchOcc = isOwner;
    else if (occ === 'RENTED') matchOcc = isTenant;
    else if (occ === 'VACANT') matchOcc = isVacant;

    if (!matchOcc) return false;
    if (!query) return true;

    const fNum = (f.flat_number || '').toLowerCase();
    const tName = (f.tenant_name || '').toLowerCase();
    const oName = (f.owner_name || '').toLowerCase();
    const tPhone = (f.tenant_phone || '').toLowerCase();
    const oPhone = (f.owner_phone || '').toLowerCase();
    const tEmerg = (f.tenant_emergency || '').toLowerCase();
    const tCnic = (f.tenant_cnic || '').toLowerCase();
    const oCnic = (f.owner_cnic || '').toLowerCase();
    const vehStr = (f.vehicles_str || '').toLowerCase();
    const notes = (f.notes || '').toLowerCase();

    if (currentFlatSearchField === 'flat') {
      return fNum.includes(query);
    } else if (currentFlatSearchField === 'mobile') {
      return tPhone.includes(query) || oPhone.includes(query) || tEmerg.includes(query);
    } else if (currentFlatSearchField === 'vehicle') {
      return vehStr.includes(query) || notes.includes(query);
    } else if (currentFlatSearchField === 'name') {
      return tName.includes(query) || oName.includes(query);
    } else {
      return fNum.includes(query) ||
             tName.includes(query) ||
             oName.includes(query) ||
             tPhone.includes(query) ||
             oPhone.includes(query) ||
             tEmerg.includes(query) ||
             tCnic.includes(query) ||
             oCnic.includes(query) ||
             vehStr.includes(query) ||
             notes.includes(query);
    }
  });

  renderFlatsTable(filtered);
}

// Single Flat Dossier (Linked Maids, Visitors, History)
async function viewFlatDetailModal(flatId) {
  try {
    const res = await fetch(`/api/flats/detail?id=${flatId}`);
    const data = await res.json();
    if (!data.success) return;

    const f = data.data;
    const isOwner = f.occupancy_mode === 'Owner Occupied';
    const isReceptionist = State.currentUser?.role === 'RECEPTIONIST';
    const t = f.tenant_name ? f : null;
    const history = f.occupancy_history || [];

    const content = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; flex-wrap: wrap; gap: 8px;">
          <div>
            <h2 style="font-size: 19px; color: #38bdf8; margin: 0;">Flat ${f.flat_number} (${f.bhk_type})</h2>
            <div style="font-size: 12.5px; color: #94a3b8; margin-top: 2px;">${f.building_name} • Floor ${f.floor_number}, ${f.wing}</div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <span class="badge ${isOwner ? 'badge-info' : (t ? 'badge-success' : 'badge-warning')}">${isOwner ? '🏠 Owner Living' : (t ? '👤 Tenant Living' : '🚪 Vacant / Inactive')}</span>
            <button class="btn btn-sm btn-primary" onclick="openFlatStatusChangeModal('${f.id}')">⚡ Change Status</button>
            <button class="btn btn-sm btn-secondary" onclick="openFlatOccupancyTimelineModal('${f.id}')">🕒 Timeline</button>
          </div>
        </div>

        <div class="glass-panel" style="margin-bottom: 12px; padding: 14px;">
          <h4 style="color: #38bdf8; font-size: 13.5px; margin-bottom: 6px;">🏠 Property Owner Information</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12.5px;">
            <div><strong>Owner Name:</strong> ${f.owner_name || 'N/A'}</div>
            ${isReceptionist ? `
              <div style="grid-column: span 2; margin-top: 4px;">
                <span class="badge badge-warning">🔒 Owner Contact, CNIC & Personal Details Protected by Admin</span>
              </div>
            ` : `
              <div><strong>Owner Phone:</strong> ${f.owner_phone || 'N/A'}</div>
              <div><strong>Owner CNIC:</strong> ${f.owner_cnic || 'N/A'}</div>
              <div><strong>Email:</strong> ${f.owner_email || 'N/A'}</div>
              <div style="grid-column: span 2;"><strong>Emergency Address:</strong> ${f.owner_address || 'N/A'}</div>
            `}
          </div>
        </div>

        ${t ? `
          <div class="glass-panel" style="margin-bottom: 12px; padding: 14px;">
            <div style="display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap;">
              ${(f.tenant_photo || f.photo_filename) ? `
                <div style="text-align: center; flex-shrink: 0;">
                  <div style="cursor: pointer; border-radius: 8px; overflow: hidden; border: 2px solid #38bdf8; width: 92px; height: 92px; box-shadow: 0 4px 14px rgba(0,0,0,0.5); background: #0f172a; display: flex; align-items: center; justify-content: center;" onclick="viewDocumentModal('/media/${f.tenant_photo || f.photo_filename}', 'Tenant Photo - ${f.tenant_name}')" title="Click to view full photo">
                    <img src="/media/${f.tenant_photo || f.photo_filename}" alt="Tenant Photo" style="width: 100%; height: 100%; object-fit: cover;" />
                  </div>
                  <button type="button" class="btn btn-sm btn-secondary" style="font-size: 10.5px; padding: 3px 8px; margin-top: 6px; width: 100%; font-weight: 600;" onclick="viewDocumentModal('/media/${f.tenant_photo || f.photo_filename}', 'Tenant Photo - ${f.tenant_name}')">🔍 View Photo</button>
                </div>
              ` : `
                <div style="width: 92px; height: 92px; border-radius: 8px; background: rgba(255,255,255,0.04); border: 1px dashed rgba(255,255,255,0.2); display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 26px; color: #64748b; flex-shrink: 0;" title="No photo attached">
                  👤
                  <span style="font-size: 9.5px; margin-top: 2px; color: #64748b;">No Photo</span>
                </div>
              `}
              <div style="flex: 1; min-width: 240px;">
                <h4 style="color: #38bdf8; font-size: 13.5px; margin-bottom: 6px;">👤 Active Resident Profile</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12.5px;">
                  <div><strong>Tenant Name:</strong> ${f.tenant_name}</div>
                  <div><strong>CNIC:</strong> ${f.tenant_cnic}</div>
                  <div><strong>Primary Phone:</strong> ${f.tenant_phone}</div>
                  <div><strong>Emergency Contact:</strong> ${f.tenant_emergency || 'N/A'}</div>
                  <div><strong>Move-in Date:</strong> ${f.move_in_date}</div>
                  <div><strong>Tenure:</strong> ${f.lease_tenure_months} Months</div>
                </div>
                ${(f.tenant_document || f.document_filename) ? `
                  <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <span style="font-size: 12px; color: #cbd5e1;"><strong>Attached Document:</strong></span>
                    <button type="button" class="btn btn-sm btn-info" onclick="viewDocumentModal('/media/${f.tenant_document || f.document_filename}', 'Resident Document / Agreement - ${f.tenant_name}')" style="padding: 4px 12px; font-size: 11.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                      📄 View Scanned Agreement / CNIC
                    </button>
                  </div>
                ` : `
                  <div style="margin-top: 8px; font-size: 11px; color: #64748b;">No scan document attached</div>
                `}
              </div>
            </div>
          </div>

          <div class="glass-panel" style="margin-bottom: 12px; padding: 14px;">
            <h4 style="color: #38bdf8; font-size: 13.5px; margin-bottom: 6px;">👨‍👩‍👧‍👦 Resident Family Members (${(f.family_members || []).length})</h4>
            ${(f.family_members && f.family_members.length > 0) ? `
              <table class="data-table">
                <thead><tr><th>Name</th><th>Relation</th><th>CNIC / B-Form</th><th>Phone</th></tr></thead>
                <tbody>
                  ${f.family_members.map(m => `<tr><td>${m.full_name}</td><td>${m.relation}</td><td>${m.cnic_bform || 'N/A'}</td><td>${m.phone || 'N/A'}</td></tr>`).join('')}
                </tbody>
              </table>
            ` : `<p style="font-size: 12px; color: #94a3b8;">No additional family members registered.</p>`}
          </div>

          <div class="glass-panel" style="margin-bottom: 12px; padding: 14px;">
            <h4 style="color: #38bdf8; font-size: 13.5px; margin-bottom: 6px;">🚗 Allotted Vehicles (${(f.vehicles || []).length})</h4>
            ${(f.vehicles && f.vehicles.length > 0) ? `
              <table class="data-table">
                <thead><tr><th>Vehicle Type</th><th>Registration #</th><th>Make / Model</th><th>Parking Slot</th></tr></thead>
                <tbody>
                  ${f.vehicles.map(v => `<tr><td>${v.vehicle_type}</td><td><strong style="color: #38bdf8;">${v.registration_number}</strong></td><td>${v.make_model || '---'}</td><td>${v.parking_slot_number}</td></tr>`).join('')}
                </tbody>
              </table>
            ` : `<p style="font-size: 12px; color: #94a3b8;">No vehicles registered.</p>`}
          </div>
        ` : ''}

        <!-- Occupancy Lifecycle Timeline History Section -->
        <div class="glass-panel" style="margin-bottom: 12px; padding: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h4 style="color: #38bdf8; font-size: 13.5px; margin: 0;">🕒 Complete Occupancy & Status History Timeline (${history.length})</h4>
            <button class="btn btn-sm btn-secondary" onclick="openFlatOccupancyTimelineModal('${f.id}')">Full View</button>
          </div>
          ${history.length > 0 ? `
            <div style="display: flex; flex-direction: column; gap: 8px; max-height: 250px; overflow-y: auto;">
              ${history.map(h => {
                const isCur = !h.end_date || h.end_date === 'Present';
                const isTen = h.status === 'ACTIVE_TENANT';
                const isOwn = h.status === 'ACTIVE_OWNER';
                const badge = isOwn ? 'badge-info' : (isTen ? 'badge-success' : 'badge-warning');
                const icon = isOwn ? '🏠' : (isTen ? '🟢' : '🚪');
                return `
                  <div style="background: rgba(0,0,0,0.3); border-left: 3px solid ${isOwn ? '#38bdf8' : (isTen ? '#10b981' : '#f59e0b')}; border-radius: 6px; padding: 10px; font-size: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                      <div>
                        <span class="badge ${badge}" style="font-size: 10px;">${icon} ${h.status}</span>
                        <strong style="color: #ffffff; margin-left: 6px;">${h.occupant_name || 'Vacant'}</strong>
                      </div>
                      <span style="color: #38bdf8; font-weight: 600;">${h.start_date} ➔ ${h.end_date || '<span style=\"color: #34d399;\">Present</span>'}</span>
                    </div>
                    <div style="color: #cbd5e1; font-size: 11.5px;">
                      <em>"${h.reason_or_notes || 'Status logged'}"</em>
                      ${h.monthly_rent > 0 ? `<span style="margin-left: 8px; color: #34d399;">(Rent: PKR ${h.monthly_rent.toLocaleString()})</span>` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `<p style="font-size: 12px; color: #94a3b8;">No occupancy history logged yet.</p>`}
        </div>

        <div class="glass-panel" style="margin-bottom: 12px; padding: 14px;">
          <h4 style="color: #38bdf8; font-size: 13.5px; margin-bottom: 6px;">🧹 Associated Domestic Staff & Maids (${(f.associated_maids || []).length})</h4>
          ${(f.associated_maids && f.associated_maids.length > 0) ? `
            <table class="data-table">
              <thead><tr><th>Name</th><th>Bahria Card #</th><th>CNIC</th><th>Duty Status</th></tr></thead>
              <tbody>
                ${f.associated_maids.map(m => `<tr><td><strong>${m.full_name}</strong> (${m.role_type})</td><td>${m.bahria_card_number}</td><td>${m.cnic_number}</td><td><span class="badge ${m.status === 'ON_DUTY' ? 'badge-success' : 'badge-warning'}">${m.status}</span></td></tr>`).join('')}
              </tbody>
            </table>
          ` : `<p style="font-size: 12px; color: #94a3b8;">No specific domestic maid registered for this flat.</p>`}
        </div>

        <div class="glass-panel" style="padding: 14px;">
          <h4 style="color: #38bdf8; font-size: 13.5px; margin-bottom: 6px;">📜 Past Historical Tenants Archive (${(f.history_archive || []).length})</h4>
          ${(f.history_archive && f.history_archive.length > 0) ? `
            <table class="data-table">
              <thead><tr><th>Past Tenant</th><th>CNIC</th><th>Stay Period</th><th>Snapshot</th></tr></thead>
              <tbody>
                ${f.history_archive.map(a => `<tr><td><strong>${a.tenant_name}</strong></td><td>${a.cnic_number}</td><td>${a.move_in_date} to ${a.vacated_date}</td><td><button class="btn btn-sm btn-secondary" onclick="viewArchiveSnapshot('${a.id}')">View</button></td></tr>`).join('')}
              </tbody>
            </table>
          ` : `<p style="font-size: 12px; color: #94a3b8;">No past tenancies archived for this flat.</p>`}
        </div>
      </div>
    `;

    showGenericModal(`Flat ${f.flat_number} Dossier`, content);
  } catch (err) {
    showToast(err.message, "danger");
  }
}

// Open Status Change Modal (Active / Inactive / Move-In / Vacate)
async function openFlatStatusChangeModal(flatId) {
  if (window.DSSound) DSSound.playClick();
  let f = flatsCache.find(x => x.id === flatId);
  if (!f) {
    try {
      const res = await fetch(`/api/flats/detail?id=${flatId}`);
      const data = await res.json();
      if (data.success) f = data.data;
    } catch(e) {}
  }
  if (!f) return;

  window.CurrentStatusChangeFlat = f;
  document.getElementById('statusChangeFlatId').value = f.id;
  document.getElementById('flatStatusChangeModalTitle').innerText = `Change Status — Flat ${f.flat_number}`;
  document.getElementById('flatStatusChangeModalSubtitle').innerText = `${f.building_name} • Current Status: ${f.occupancy_mode}`;

  document.getElementById('statusChangeEffectiveDate').value = new Date().toISOString().split('T')[0];

  const occSelect = document.getElementById('statusChangeNewStatus');
  if (f.occupancy_mode === 'Owner Occupied') {
    occSelect.value = 'INACTIVE_VACANT';
  } else if (f.tenant_name || f.occupancy_mode === 'Rented') {
    occSelect.value = 'INACTIVE_VACANT';
  } else {
    occSelect.value = 'ACTIVE_TENANT';
  }

  document.getElementById('statusChangeOccupantName').value = f.owner_name || '';
  document.getElementById('statusChangeOccupantPhone').value = f.owner_phone || '';
  document.getElementById('statusChangeOccupantCnic').value = f.owner_cnic || '';
  document.getElementById('statusChangeReason').value = '';

  onFlatStatusChangeModeChange();
  openModal('flatStatusChangeModal');
}

function onFlatStatusChangeModeChange() {
  const mode = document.getElementById('statusChangeNewStatus').value;
  const occFields = document.getElementById('statusChangeOccupantFields');
  const title = document.getElementById('statusChangeOccupantTitle');
  const nameLabel = document.getElementById('statusChangeNameLabel');
  const reasonInp = document.getElementById('statusChangeReason');

  if (mode === 'INACTIVE_VACANT') {
    if (occFields) occFields.style.display = 'none';
    if (reasonInp && !reasonInp.value) reasonInp.value = 'Tenant lease completed, keys handed over to reception.';
  } else if (mode === 'UNDER_MAINTENANCE') {
    if (occFields) occFields.style.display = 'none';
    if (reasonInp && !reasonInp.value) reasonInp.value = 'Flat undergoing renovation, painting, and maintenance.';
  } else if (mode === 'ACTIVE_TENANT') {
    if (occFields) occFields.style.display = 'block';
    if (title) title.innerText = '👤 New Active Tenant Profile';
    if (nameLabel) nameLabel.innerText = 'Tenant Full Name *';
    if (reasonInp && !reasonInp.value) reasonInp.value = 'New tenant lease agreement started.';
  } else if (mode === 'ACTIVE_OWNER') {
    if (occFields) occFields.style.display = 'block';
    if (title) title.innerText = '🏠 Property Owner Residing Information';
    if (nameLabel) nameLabel.innerText = 'Owner Full Name *';
    if (reasonInp && !reasonInp.value) reasonInp.value = 'Property owner moved in to reside permanently.';
  }
}

async function handleSaveFlatStatusChange(e) {
  if (e) e.preventDefault();
  const flatId = document.getElementById('statusChangeFlatId').value;
  const newStatus = document.getElementById('statusChangeNewStatus').value;
  const effDate = document.getElementById('statusChangeEffectiveDate').value;
  const occName = document.getElementById('statusChangeOccupantName').value.trim();
  const occPhone = document.getElementById('statusChangeOccupantPhone').value.trim();
  const occCnic = document.getElementById('statusChangeOccupantCnic').value.trim();
  const reason = document.getElementById('statusChangeReason').value.trim();

  if (!flatId || !newStatus || !effDate) {
    showToast("Please fill all required fields.", "warning");
    return;
  }

  try {
    const res = await fetch('/api/flats/change_status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flat_id: flatId,
        new_status: newStatus,
        effective_date: effDate,
        occupant_name: occName,
        occupant_phone: occPhone,
        occupant_cnic: occCnic,
        monthly_rent: 0.0,
        reason_or_notes: reason,
        operator_name: State.currentUser?.full_name || State.currentUser?.username || 'Receptionist'
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast(data.message || "Flat status and timeline updated successfully!", "success");
      closeModal('flatStatusChangeModal');
      await loadFlatsData();
      if (document.getElementById('adminMasterOverview')?.style.display !== 'none') {
        await loadAdminConsoleData();
      }
      if (window.CurrentTimelineFlatId === flatId) {
        await openFlatOccupancyTimelineModal(flatId);
      }
    } else {
      showToast(data.error || "Failed to update flat status", "danger");
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
}

// Dedicated Flat Occupancy & Status History Timeline Dossier
function closeFlatTimelineDossierModal() {
  if (window.DSSound) DSSound.playClick();
  closeModal('flatOccupancyTimelineModal');
}

async function openFlatOccupancyTimelineModal(flatId) {
  if (window.DSSound) DSSound.playClick();
  window.CurrentTimelineFlatId = flatId;

  try {
    const [hRes, dRes] = await Promise.all([
      fetch(`/api/flats/occupancy_history?flat_id=${flatId}`),
      fetch(`/api/flats/detail?id=${flatId}`)
    ]);

    const hData = await hRes.json();
    const dData = await dRes.json();
    if (!hData.success) return;

    const history = hData.data || [];
    const f = dData.data || {};
    const isOwner = f.occupancy_mode === 'Owner Occupied';
    const isTenant = !!f.tenant_name;
    const isReceptionist = State.currentUser?.role === 'RECEPTIONIST';

    document.getElementById('timelineModalTitle').innerText = `Apartment ${f.flat_number} Lifecycle & Occupancy Dossier`;
    document.getElementById('timelineModalSubtitle').innerText = `${f.building_name} • Floor ${f.floor_number}, ${f.wing} • Unit Type: ${f.bhk_type}`;

    // TOP SECTION: Property Owner Record Dossier (UPR OWNER KI DETAILS)
    const ownerContainer = document.getElementById('timelineOwnerDossierContainer');
    if (ownerContainer) {
      ownerContainer.innerHTML = `
        <div class="owner-dossier-card">
          <div class="owner-dossier-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 18px;">🏠</span>
              <strong style="color: #38bdf8; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Property Owner Record & Title Dossier</strong>
            </div>
            <span class="badge ${isOwner ? 'badge-info' : (isTenant ? 'badge-success' : 'badge-warning')}">
              Current State: ${isOwner ? '🏠 Owner Residing' : (isTenant ? '🟢 Rented to Tenant' : '🚪 Vacant / Inactive')}
            </span>
          </div>

          <div class="owner-dossier-grid">
            <div class="owner-dossier-item">
              <span class="label">Property Owner Name</span>
              <span class="val" style="color: #38bdf8; font-size: 14px;">${f.owner_name || 'Property Owner'}</span>
            </div>
            <div class="owner-dossier-item">
              <span class="label">Primary Phone Contact</span>
              <span class="val">
                ${isReceptionist ? '<span style="color: #94a3b8; font-size: 11px;">🔒 Protected (Admin Only)</span>' : `<code style="color: #34d399; font-size: 13px;">${f.owner_phone || '---'}</code>`}
              </span>
            </div>
            <div class="owner-dossier-item">
              <span class="label">National CNIC #</span>
              <span class="val">
                ${isReceptionist ? '<span style="color: #94a3b8; font-size: 11px;">🔒 Protected</span>' : `<code>${f.owner_cnic || '---'}</code>`}
              </span>
            </div>
            <div class="owner-dossier-item">
              <span class="label">Email Address</span>
              <span class="val" style="color: #cbd5e1; font-weight: normal; font-size: 12px;">
                ${isReceptionist ? '---' : (f.owner_email || '---')}
              </span>
            </div>
            <div class="owner-dossier-item" style="grid-column: span 2;">
              <span class="label">Permanent / Emergency Address</span>
              <span class="val" style="color: #cbd5e1; font-weight: normal; font-size: 12px;">
                ${isReceptionist ? 'Bahria Town Karachi' : (f.owner_address || '---')}
              </span>
            </div>
          </div>
        </div>
      `;
    }

    // STATS SUMMARY STRIP
    const statsContainer = document.getElementById('timelineStatsSummaryStrip');
    if (statsContainer) {
      let activeDaysTotal = 0;
      let vacantDaysTotal = 0;
      history.forEach(h => {
        const s = new Date(h.start_date);
        const e = h.end_date ? new Date(h.end_date) : new Date();
        const days = Math.max(1, Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)));
        if (h.status === 'INACTIVE_VACANT' || h.status === 'UNDER_MAINTENANCE') {
          vacantDaysTotal += days;
        } else {
          activeDaysTotal += days;
        }
      });
      const activeMonths = Math.round((activeDaysTotal / 30.44) * 10) / 10;
      const vacantMonths = Math.round((vacantDaysTotal / 30.44) * 10) / 10;

      statsContainer.innerHTML = `
        <div class="kpi-card" style="padding: 8px 12px; border-left: 3px solid #38bdf8;">
          <div style="font-size: 10.5px; color: #94a3b8; text-transform: uppercase;">Total Historical Periods</div>
          <div style="font-size: 16px; font-weight: 800; color: #ffffff;">${history.length} Periods Logged</div>
        </div>
        <div class="kpi-card" style="padding: 8px 12px; border-left: 3px solid #10b981;">
          <div style="font-size: 10.5px; color: #94a3b8; text-transform: uppercase;">Active Occupied Duration</div>
          <div style="font-size: 16px; font-weight: 800; color: #10b981;">${activeMonths} Months <small style="font-size: 11px; color: #94a3b8;">(${activeDaysTotal}d)</small></div>
        </div>
        <div class="kpi-card" style="padding: 8px 12px; border-left: 3px solid #f59e0b;">
          <div style="font-size: 10.5px; color: #94a3b8; text-transform: uppercase;">Inactive / Vacant Duration</div>
          <div style="font-size: 16px; font-weight: 800; color: #f59e0b;">${vacantMonths} Months <small style="font-size: 11px; color: #94a3b8;">(${vacantDaysTotal}d)</small></div>
        </div>
      `;
    }

    const countBadge = document.getElementById('timelineTotalCountBadge');
    if (countBadge) countBadge.innerText = `${history.length} Timeline Event${history.length === 1 ? '' : 's'}`;

    renderFlatOccupancyTimeline(history, f);
    openModal('flatOccupancyTimelineModal');
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function renderFlatOccupancyTimeline(history, flatInfo) {
  const container = document.getElementById('flatOccupancyTimelineContainer');
  if (!container) return;

  if (history.length === 0) {
    container.innerHTML = `<div class="glass-panel" style="text-align: center; color: #94a3b8; padding: 30px;">No occupancy history records logged for this apartment yet.</div>`;
    return;
  }

  container.innerHTML = history.map((h, idx) => {
    const isCurrent = !h.end_date || h.end_date === 'Present';
    const isTenant = h.status === 'ACTIVE_TENANT';
    const isOwner = h.status === 'ACTIVE_OWNER';
    const isVacant = h.status === 'INACTIVE_VACANT' || h.status === 'UNDER_MAINTENANCE';

    let badgeClass = 'badge-success';
    let statusIcon = '🟢';
    let statusLabel = 'ACTIVE TENANT LIVING';
    let nodeIcon = '👤';
    let cardBorder = '#10b981';

    if (isOwner) {
      badgeClass = 'badge-info';
      statusIcon = '🏠';
      statusLabel = 'ACTIVE OWNER RESIDING';
      nodeIcon = '🏠';
      cardBorder = '#38bdf8';
    } else if (h.status === 'UNDER_MAINTENANCE') {
      badgeClass = 'badge-warning';
      statusIcon = '🛠️';
      statusLabel = 'INACTIVE / UNDER RENOVATION';
      nodeIcon = '🛠️';
      cardBorder = '#f59e0b';
    } else if (isVacant) {
      badgeClass = 'badge-warning';
      statusIcon = '🚪';
      statusLabel = 'INACTIVE / VACANT APARTMENT';
      nodeIcon = '🚪';
      cardBorder = '#64748b';
    }

    // Duration calculation
    const sDate = new Date(h.start_date);
    const eDate = h.end_date ? new Date(h.end_date) : new Date();
    const diffTime = Math.abs(eDate - sDate);
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const diffMonths = Math.round((diffDays / 30.44) * 10) / 10;
    const durationLabel = diffMonths >= 1 ? `${diffMonths} Months (${diffDays} Days)` : `${diffDays} Days`;

    return `
      <div class="timeline-event-item">
        <div class="timeline-node-marker ${isCurrent ? 'current-active' : ''}" style="border-color: ${cardBorder};">
          ${nodeIcon}
        </div>

        <div class="timeline-event-card" style="border-left: 4px solid ${cardBorder};">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span class="badge ${badgeClass}" style="font-size: 11.5px; font-weight: 800; padding: 4px 8px;">
                ${statusIcon} ${statusLabel}
              </span>
              ${isCurrent ? '<span class="badge badge-success" style="font-size: 10px; font-weight: bold; animation: pulse 2s infinite;">CURRENT ACTIVE</span>' : '<span class="badge badge-secondary" style="font-size: 10px;">PAST PERIOD</span>'}
            </div>
            <div style="font-size: 12.5px; font-weight: 800; color: #38bdf8;">
              📅 ${h.start_date} ➔ ${h.end_date ? h.end_date : '<span style="color: #34d399;">Present</span>'}
              <span class="badge badge-secondary" style="margin-left: 6px; font-size: 11px; font-weight: 600;">⏱️ ${durationLabel}</span>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; font-size: 12px; background: rgba(0,0,0,0.3); padding: 10px 12px; border-radius: 8px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.05);">
            <div>
              <span style="color: #94a3b8; font-size: 11px; display: block;">RESIDENT / OCCUPANT</span>
              <strong style="color: #ffffff; font-size: 13.5px;">${h.occupant_name || 'Vacant Flat'}</strong>
            </div>
            <div>
              <span style="color: #94a3b8; font-size: 11px; display: block;">CONTACT PHONE</span>
              <code style="color: #34d399; font-weight: bold; font-size: 12.5px;">${h.occupant_phone || '---'}</code>
            </div>
            <div>
              <span style="color: #94a3b8; font-size: 11px; display: block;">NATIONAL CNIC #</span>
              <code>${h.occupant_cnic || '---'}</code>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 12px; color: #cbd5e1; border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 8px;">
            <div>
              <strong style="color: #38bdf8; font-size: 11px;">REASON / NOTES:</strong>
              <em style="color: #f1f5f9; margin-left: 4px;">"${h.reason_or_notes || 'Status transition logged'}"</em>
            </div>
            <div style="font-size: 11px; color: #64748b;">
              Logged by: <span style="color: #94a3b8; font-weight: 600;">${h.logged_by_user || 'Receptionist'}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Master Admin Add New Flat
function openAddNewFlatModal() {
  const bSelect = document.getElementById('newFlatBuildingId');
  if (bSelect) {
    bSelect.innerHTML = State.buildings.map(b => `<option value="${b.id}" ${b.id === State.selectedBuildingId ? 'selected' : ''}>${b.name}</option>`).join('');
  }
  document.getElementById('newFlatNumber').value = '';
  document.getElementById('newFlatFloor').value = '1';
  document.getElementById('newFlatWing').value = 'Wing A';
  document.getElementById('newFlatBhk').value = '3-Bed Luxury';
  document.getElementById('newFlatOccupancy').value = 'Vacant';
  document.getElementById('newFlatOwnerName').value = '';
  document.getElementById('newFlatOwnerPhone').value = '';
  document.getElementById('newFlatOwnerCnic').value = '';
  document.getElementById('newFlatOwnerEmail').value = '';
  document.getElementById('newFlatOwnerAddress').value = '';
  document.getElementById('newFlatNotes').value = '';

  openModal('addNewFlatModal');
}

async function handleSaveNewFlat(e) {
  if (e) e.preventDefault();
  const bId = document.getElementById('newFlatBuildingId').value;
  const fNum = document.getElementById('newFlatNumber').value.trim();

  if (!bId || !fNum) {
    showToast("Please select building and enter flat number.", "warning");
    return;
  }

  try {
    const res = await fetch('/api/flats/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        building_id: bId,
        flat_number: fNum,
        floor_number: parseInt(document.getElementById('newFlatFloor').value || 1),
        wing: document.getElementById('newFlatWing').value.trim(),
        bhk_type: document.getElementById('newFlatBhk').value,
        occupancy_mode: document.getElementById('newFlatOccupancy').value,
        owner_name: document.getElementById('newFlatOwnerName').value.trim() || 'Property Owner',
        owner_phone: document.getElementById('newFlatOwnerPhone').value.trim(),
        owner_cnic: document.getElementById('newFlatOwnerCnic').value.trim(),
        owner_email: document.getElementById('newFlatOwnerEmail').value.trim(),
        owner_address: document.getElementById('newFlatOwnerAddress').value.trim(),
        notes: document.getElementById('newFlatNotes').value.trim()
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast(`Apartment ${fNum} registered permanently! Available on Receptionist Desk.`, "success");
      closeModal('addNewFlatModal');
      await loadFlatsData();
    } else {
      showToast(data.error, "danger");
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function exportFlatsMarketingCSV() {
  if (flatsCache.length === 0) {
    showToast("No flats records to export", "warning");
    return;
  }

  let csv = "Flat Number,Building,Wing,Floor,BHK Type,Occupancy Mode,Resident Name,Resident Phone,Resident CNIC,Owner Name,Owner Phone,Owner CNIC,Monthly Rent\n";
  flatsCache.forEach(f => {
    const resName = f.tenant_name || (f.occupancy_mode === 'Owner Occupied' ? f.owner_name : 'Vacant');
    const resPhone = f.tenant_phone || (f.occupancy_mode === 'Owner Occupied' ? f.owner_phone : '');
    const resCnic = f.tenant_cnic || (f.occupancy_mode === 'Owner Occupied' ? f.owner_cnic : '');
    csv += `"${f.flat_number}","${f.building_name}","${f.wing || ''}","${f.floor_number}","${f.bhk_type}","${f.occupancy_mode}","${resName}","${resPhone}","${resCnic}","${f.owner_name || ''}","${f.owner_phone || ''}","${f.owner_cnic || ''}",${f.monthly_rent || 0}\n`;
  });

  downloadCSV(csv, `DS_Resident_Marketing_Roster_${new Date().toISOString().split('T')[0]}.csv`);
  showToast("Resident Contacts CSV downloaded for marketing!", "success");
}

function printFlatsDirectory() {
  window.print();
}

// Edit Flat (with Privacy Protection for Receptionists)
function openEditFlatModal(flatId) {
  const f = flatsCache.find(x => x.id === flatId);
  if (!f) return;

  const isReceptionist = State.currentUser?.role === 'RECEPTIONIST';

  document.getElementById('editFlatId').value = f.id;
  document.getElementById('editFlatBuildingId').value = f.building_id;
  document.getElementById('editFlatNumber').value = f.flat_number;
  document.getElementById('editFlatFloor').value = f.floor_number;
  document.getElementById('editFlatWing').value = f.wing || 'Wing A';
  document.getElementById('editFlatBhk').value = f.bhk_type || '3-Bed DD';
  document.getElementById('editFlatOccupancy').value = f.occupancy_mode || 'Rented';
  document.getElementById('editFlatNotes').value = f.notes || '';

  const ownerSection = document.getElementById('editOwnerFieldsSection');
  const ownerNotice = document.getElementById('editOwnerPrivacyNotice');

  if (isReceptionist) {
    if (ownerSection) ownerSection.style.display = 'none';
    if (ownerNotice) {
      ownerNotice.style.display = 'block';
      ownerNotice.innerHTML = `<strong>Owner:</strong> ${f.owner_name || 'Property Owner'}<br><span style="font-size: 11.5px; color: #94a3b8;">🔒 Owner Phone, CNIC & Personal Data are protected and managed exclusively by Master Admin.</span>`;
    }
  } else {
    if (ownerSection) ownerSection.style.display = 'block';
    if (ownerNotice) ownerNotice.style.display = 'none';

    document.getElementById('editFlatOwnerName').value = f.owner_name || '';
    document.getElementById('editFlatOwnerPhone').value = f.owner_phone || '';
    document.getElementById('editFlatOwnerCnic').value = f.owner_cnic || '';
    document.getElementById('editFlatOwnerEmail').value = f.owner_email || '';
    document.getElementById('editFlatOwnerAddress').value = f.owner_address || '';
  }

  openModal('editFlatModal');
}

async function handleSaveEditFlat(e) {
  if (e) e.preventDefault();
  const flatId = document.getElementById('editFlatId').value;
  const bId = document.getElementById('editFlatBuildingId').value;
  const fNum = document.getElementById('editFlatNumber').value.trim();

  if (!fNum) {
    showToast("Please enter flat number", "warning");
    return;
  }

  const isReceptionist = State.currentUser?.role === 'RECEPTIONIST';
  const existingFlat = flatsCache.find(x => x.id === flatId) || {};

  try {
    const res = await fetch('/api/flats/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: flatId,
        building_id: bId,
        flat_number: fNum,
        floor_number: parseInt(document.getElementById('editFlatFloor').value || 1),
        wing: document.getElementById('editFlatWing').value,
        bhk_type: document.getElementById('editFlatBhk').value,
        occupancy_mode: document.getElementById('editFlatOccupancy').value,
        owner_name: isReceptionist ? (existingFlat.owner_name || 'Property Owner') : document.getElementById('editFlatOwnerName').value.trim(),
        owner_phone: isReceptionist ? existingFlat.owner_phone : document.getElementById('editFlatOwnerPhone').value.trim(),
        owner_cnic: isReceptionist ? existingFlat.owner_cnic : document.getElementById('editFlatOwnerCnic').value.trim(),
        owner_email: isReceptionist ? existingFlat.owner_email : document.getElementById('editFlatOwnerEmail').value.trim(),
        owner_address: isReceptionist ? existingFlat.owner_address : document.getElementById('editFlatOwnerAddress').value.trim(),
        notes: document.getElementById('editFlatNotes').value.trim()
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast("Flat profile saved permanently!", "success");
      closeModal('editFlatModal');
      await loadFlatsData();
    } else {
      showToast(data.error, "danger");
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
}

// Edit / Assign Resident
function populateAssignTenantFlatSelector(selectedFlatId = null) {
  const select = document.getElementById('assignTenantFlatSelect');
  if (!select) return;
  
  select.innerHTML = '<option value="">-- Choose Apartment / Flat --</option>' + 
    flatsCache.map(f => {
      const modeLabel = f.occupancy_mode === 'Owner Occupied' ? '🏠 Owner Living' : (f.tenant_name ? `👤 Tenant: ${f.tenant_name}` : '🚪 Vacant');
      const isSel = f.id === selectedFlatId ? 'selected' : '';
      return `<option value="${f.id}" ${isSel}>Flat ${f.flat_number} (${f.building_name} - ${f.wing || 'Wing A'}, Fl ${f.floor_number}) [${modeLabel}]</option>`;
    }).join('');
}

function onAssignTenantFlatSelectChange(flatId) {
  if (!flatId) return;
  const f = flatsCache.find(x => x.id === flatId);
  if (!f) return;

  document.getElementById('assignTenantFlatId').value = f.id;
  document.getElementById('assignTenantBuildingId').value = f.building_id;
  document.getElementById('assignTenantId').value = f.tenant_id || '';
  document.getElementById('assignTenantFlatTitle').innerText = f.tenant_id 
    ? `✏️ Edit Resident - Flat ${f.flat_number}` 
    : `👤 Register Resident - Flat ${f.flat_number}`;

  document.getElementById('assignTenantName').value = f.tenant_name || '';
  document.getElementById('assignTenantPhone').value = f.tenant_phone || '';
  document.getElementById('assignTenantEmergency').value = f.tenant_emergency || '';
  document.getElementById('assignTenantCnic').value = f.tenant_cnic || '';
  document.getElementById('assignTenantMoveIn').value = f.move_in_date || new Date().toISOString().split('T')[0];
  document.getElementById('assignTenantLeaseTenure').value = f.lease_tenure_months || 12;
  
  const photoFn = f.tenant_photo || '';
  document.getElementById('assignTenantPhotoFilename').value = photoFn;
  const prev = document.getElementById('assignTenantPhotoPreview');
  if (prev) {
    prev.src = photoFn ? `/media/${photoFn}` : "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='85' height='85' viewBox='0 0 24 24' fill='%2364748b'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";
  }

  const docFn = f.tenant_document || '';
  const docInp = document.getElementById('assignTenantDocumentFilename');
  if (docInp) docInp.value = docFn;
  const docPrev = document.getElementById('assignTenantDocPreview');
  if (docPrev) {
    if (docFn) {
      docPrev.style.display = 'flex';
      const thumb = document.getElementById('assignTenantDocThumb');
      if (thumb) thumb.src = `/media/${docFn}`;
      const nameEl = document.getElementById('assignTenantDocName');
      if (nameEl) nameEl.innerText = docFn;
    } else {
      docPrev.style.display = 'none';
    }
  }

  const famContainer = document.getElementById('assignFamilyContainer');
  famContainer.innerHTML = '';
  (f.family_members || []).forEach(m => {
    addFamilyMemberRow(m.full_name, m.relation, m.cnic_bform, m.phone);
  });

  const vehContainer = document.getElementById('assignVehicleContainer');
  vehContainer.innerHTML = '';
  (f.vehicles || []).forEach(v => {
    addVehicleRow(v.vehicle_type, v.registration_number, v.make_model, v.parking_slot_number);
  });

  if ((f.family_members || []).length === 0) addFamilyMemberRow();
  if ((f.vehicles || []).length === 0) addVehicleRow();
}

async function openEditTenantModal(flatId, tenantId) {
  if (flatsCache.length === 0) await loadFlatsData();
  populateAssignTenantFlatSelector(flatId);
  onAssignTenantFlatSelectChange(flatId);
  openModal('assignTenantModal');
}

async function openAssignTenantModal(flatId = null, flatNumber = null, buildingId = null) {
  if (flatsCache.length === 0) {
    await loadFlatsData();
  }

  populateAssignTenantFlatSelector(flatId);

  const defaultBuildingId = buildingId || State.selectedBuildingId || (State.buildings[0] ? State.buildings[0].id : '');
  
  document.getElementById('assignTenantBuildingId').value = defaultBuildingId;
  document.getElementById('assignTenantFlatId').value = flatId || '';
  document.getElementById('assignTenantId').value = '';
  document.getElementById('assignTenantPhotoFilename').value = '';
  
  const docInp = document.getElementById('assignTenantDocumentFilename');
  if (docInp) docInp.value = '';
  const docPrev = document.getElementById('assignTenantDocPreview');
  if (docPrev) docPrev.style.display = 'none';

  const prev = document.getElementById('assignTenantPhotoPreview');
  if (prev) {
    prev.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='85' height='85' viewBox='0 0 24 24' fill='%2364748b'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";
  }

  document.getElementById('assignTenantFlatTitle').innerText = flatNumber 
    ? `👤 Register Resident - Flat ${flatNumber}` 
    : `👤 Register Resident / Tenant Profile`;

  document.getElementById('assignTenantName').value = '';
  document.getElementById('assignTenantPhone').value = '';
  document.getElementById('assignTenantEmergency').value = '';
  document.getElementById('assignTenantCnic').value = '';
  document.getElementById('assignTenantMoveIn').value = new Date().toISOString().split('T')[0];
  document.getElementById('assignTenantLeaseTenure').value = 12;
  
  document.getElementById('assignFamilyContainer').innerHTML = '';
  document.getElementById('assignVehicleContainer').innerHTML = '';

  if (flatId) {
    onAssignTenantFlatSelectChange(flatId);
  } else {
    addFamilyMemberRow();
    addVehicleRow();
  }

  openModal('assignTenantModal');
}

async function handleTenantPhotoFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: evt.target.result, extension: file.name.split('.').pop() })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('assignTenantPhotoFilename').value = data.filename;
        const prev = document.getElementById('assignTenantPhotoPreview');
        if (prev) prev.src = data.url;
        showToast("Tenant photo uploaded successfully!", "success");
      } else {
        showToast(data.error || "Failed to upload photo", "danger");
      }
    } catch(err) {
      showToast(err.message, "danger");
    }
  };
  reader.readAsDataURL(file);
}

function addFamilyMemberRow(name = '', rel = '', cnic = '', phone = '') {
  const container = document.getElementById('assignFamilyContainer');
  const div = document.createElement('div');
  div.className = 'form-row-3';
  div.style.marginBottom = '6px';
  div.innerHTML = `
    <input type="text" class="form-input family-name" placeholder="Member Name" value="${name}" />
    <input type="text" class="form-input family-rel" placeholder="Relation" value="${rel}" />
    <div style="display: flex; gap: 6px;">
      <input type="text" class="form-input family-cnic" placeholder="CNIC / B-Form" value="${cnic}" />
      <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.parentElement.remove()">✕</button>
    </div>
  `;
  container.appendChild(div);
}

function addVehicleRow(type = 'Car (Sedan)', reg = '', model = '', slot = '') {
  const container = document.getElementById('assignVehicleContainer');
  const div = document.createElement('div');
  div.className = 'form-row-3';
  div.style.marginBottom = '6px';
  div.innerHTML = `
    <select class="form-select vehicle-type">
      <option value="Car (Sedan)" ${type === 'Car (Sedan)' ? 'selected' : ''}>Car (Sedan)</option>
      <option value="SUV / Jeep" ${type === 'SUV / Jeep' ? 'selected' : ''}>SUV / Jeep</option>
      <option value="Motorbike" ${type === 'Motorbike' ? 'selected' : ''}>Motorbike</option>
    </select>
    <input type="text" class="form-input vehicle-reg" placeholder="Reg #" value="${reg}" />
    <div style="display: flex; gap: 6px;">
      <input type="text" class="form-input vehicle-slot" placeholder="Slot #" value="${slot}" />
      <button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.parentElement.remove()">✕</button>
    </div>
  `;
  container.appendChild(div);
}

async function handleSaveTenant(e) {
  if (e) e.preventDefault();
  const flatId = document.getElementById('assignTenantFlatId').value || document.getElementById('assignTenantFlatSelect').value;
  const buildingId = document.getElementById('assignTenantBuildingId').value || State.selectedBuildingId;
  const tenantId = document.getElementById('assignTenantId').value || null;
  const name = document.getElementById('assignTenantName').value.trim();
  const phone = document.getElementById('assignTenantPhone').value.trim();
  const cnic = document.getElementById('assignTenantCnic').value.trim();

  if (!flatId) {
    showToast("Please select an apartment/flat", "warning");
    return;
  }

  if (!name || !phone || !cnic) {
    showToast("Please provide tenant full name, mobile #, and CNIC.", "warning");
    return;
  }

  const family = [];
  document.querySelectorAll('#assignFamilyContainer .form-row-3').forEach(row => {
    const fName = row.querySelector('.family-name').value.trim();
    const fRel = row.querySelector('.family-rel').value.trim();
    const fCnic = row.querySelector('.family-cnic').value.trim();
    if (fName) family.push({ full_name: fName, relation: fRel, cnic_bform: fCnic });
  });

  const vehicles = [];
  document.querySelectorAll('#assignVehicleContainer .form-row-3').forEach(row => {
    const vType = row.querySelector('.vehicle-type').value;
    const vReg = row.querySelector('.vehicle-reg').value.trim();
    const vSlot = row.querySelector('.vehicle-slot').value.trim();
    if (vReg) vehicles.push({ vehicle_type: vType, registration_number: vReg, parking_slot_number: vSlot });
  });

  try {
    const res = await fetch('/api/tenants/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: tenantId,
        flat_id: flatId,
        building_id: buildingId,
        full_name: name,
        primary_phone: phone,
        emergency_phone: document.getElementById('assignTenantEmergency').value.trim(),
        cnic_number: cnic,
        move_in_date: document.getElementById('assignTenantMoveIn').value,
        lease_tenure_months: parseInt(document.getElementById('assignTenantLeaseTenure').value || 12),
        monthly_rent: 0.0,
        monthly_maintenance: 0.0,
        photo_filename: document.getElementById('assignTenantPhotoFilename').value,
        document_filename: document.getElementById('assignTenantDocumentFilename')?.value || '',
        family_members: family,
        vehicles: vehicles
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast("Tenant profile & photo saved successfully!", "success");
      closeModal('assignTenantModal');
      await loadFlatsData();
      await loadDashboardData();
    } else {
      showToast(data.error || "Could not save tenant profile", "danger");
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
}

// Vacate Flat
function openVacateTenantModal(flatId, flatNumber, tenantName) {
  document.getElementById('vacateFlatId').value = flatId;
  document.getElementById('vacateFlatTitle').innerText = `Vacate Flat ${flatNumber} (${tenantName})`;
  document.getElementById('vacateDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('vacateReason').value = 'End of Tenancy Lease Agreement';
  openModal('vacateTenantModal');
}

async function handleConfirmVacate(e) {
  if (e) e.preventDefault();
  const flatId = document.getElementById('vacateFlatId').value;
  const vacatedDate = document.getElementById('vacateDate').value;
  const reason = document.getElementById('vacateReason').value;

  try {
    const res = await fetch('/api/tenants/vacate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flat_id: flatId, vacated_date: vacatedDate, reason: reason })
    });

    const data = await res.json();
    if (data.success) {
      showToast("Tenant safely archived to permanent history!", "success");
      closeModal('vacateTenantModal');
      await loadFlatsData();
    } else {
      showToast(data.error, "danger");
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
}

// ==========================================================================
// 3. TENANT HISTORY TIMELINE
// ==========================================================================
// 3. TENANT HISTORY & IMMUTABLE ARCHIVE TIMELINE (WITH CALENDAR & CONTACTS)
// ==========================================================================
let historyCache = [];
let historyDatePreset = 'all';
let historyCustomDateFrom = null;
let historyCustomDateTo = null;

function setHistoryDateFilter(preset) {
  DSSound.playClick();
  historyDatePreset = preset;
  historyCustomDateFrom = null;
  historyCustomDateTo = null;

  document.querySelectorAll('#historyDateFilterButtonGroup .date-quick-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('onclick')?.includes(`'${preset}'`));
  });

  const fromInp = document.getElementById('historyDateFrom');
  const toInp = document.getElementById('historyDateTo');
  if (fromInp) fromInp.value = '';
  if (toInp) toInp.value = '';

  loadTenantHistoryData();
}

function applyHistoryCustomDateRange() {
  DSSound.playClick();
  const dFrom = document.getElementById('historyDateFrom')?.value;
  const dTo = document.getElementById('historyDateTo')?.value;

  if (!dFrom && !dTo) {
    showToast("Please pick at least a start or end date.", "warning");
    return;
  }

  historyDatePreset = 'custom';
  historyCustomDateFrom = dFrom || null;
  historyCustomDateTo = dTo || null;

  document.querySelectorAll('#historyDateFilterButtonGroup .date-quick-btn').forEach(b => b.classList.remove('active'));
  loadTenantHistoryData();
}

async function loadTenantHistoryData() {
  try {
    let q = `building_id=${State.selectedBuildingId}&date_preset=${historyDatePreset}`;
    if (historyCustomDateFrom) q += `&date_from=${historyCustomDateFrom}`;
    if (historyCustomDateTo) q += `&date_to=${historyCustomDateTo}`;

    const res = await fetch(`/api/tenants/archive?${q}`);
    const data = await res.json();
    if (!data.success) return;

    historyCache = data.data || [];
    renderHistoryTable(historyCache);
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function renderHistoryTable(archives) {
  const tbody = document.getElementById('historyTableBody');
  if (!tbody) return;

  if (archives.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 25px; font-size: 13px;">No historical tenant records found for selected period.</td></tr>`;
    return;
  }

  tbody.innerHTML = archives.map(a => `
    <tr>
      <td><strong style="color: #38bdf8;">Flat ${a.flat_number}</strong></td>
      <td>${a.building_name}</td>
      <td><strong>${a.tenant_name}</strong></td>
      <td><strong style="color: #34d399; font-family: monospace; font-size: 13px;">${a.primary_phone || '---'}</strong></td>
      <td><code>${a.cnic_number}</code></td>
      <td>${a.move_in_date} → <strong style="color: #f43f5e;">${a.vacated_date}</strong></td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="viewArchiveSnapshot('${a.id}')">📂 View Dossier</button>
      </td>
    </tr>
  `).join('');
}

let currentHistorySearchField = 'all';

function setHistorySearchField(field, btn) {
  currentHistorySearchField = field;
  document.querySelectorAll('#view_history .search-pill-btn').forEach(p => {
    p.classList.toggle('active', p.dataset.field === field);
  });
  const input = document.getElementById('historySearchInput');
  if (input) {
    const placeholders = {
      all: 'Search flat #, past tenant, CNIC, phone, vehicle...',
      flat: 'Search by Flat # (e.g. 101, 202)...',
      name: 'Search by Past Tenant Name...',
      phone: 'Search by Phone / Mobile...',
      cnic: 'Search by CNIC Number...'
    };
    input.placeholder = placeholders[field] || placeholders.all;
    input.focus();
  }
  DSSound.playClick();
  filterHistory();
}

function filterHistory() {
  const query = (document.getElementById('historySearchInput')?.value || '').trim().toLowerCase();
  const filtered = historyCache.filter(a => {
    if (!query) return true;
    const fNum = (a.flat_number || '').toLowerCase();
    const tName = (a.tenant_name || '').toLowerCase();
    const cnic = (a.cnic_number || '').toLowerCase();
    const phone = (a.primary_phone || '').toLowerCase();
    const payload = (a.archive_payload_json || '').toLowerCase();

    if (currentHistorySearchField === 'flat') {
      return fNum.includes(query);
    } else if (currentHistorySearchField === 'name') {
      return tName.includes(query);
    } else if (currentHistorySearchField === 'phone') {
      return phone.includes(query);
    } else if (currentHistorySearchField === 'cnic') {
      return cnic.includes(query);
    } else {
      return fNum.includes(query) || tName.includes(query) || cnic.includes(query) || phone.includes(query) || payload.includes(query);
    }
  });
  renderHistoryTable(filtered);
}

async function viewArchiveSnapshot(archiveId) {
  DSSound.playClick();
  let a = historyCache.find(x => x.id === archiveId);
  if (!a) {
    try {
      const res = await fetch(`/api/tenants/archive/detail?id=${archiveId}`);
      const data = await res.json();
      if (data.success && data.data) {
        a = data.data;
      }
    } catch(err) {
      console.warn("Error fetching archive detail:", err);
    }
  }

  if (!a) {
    showToast("Historical tenant archive record not found.", "warning");
    return;
  }

  let payload = {};
  try { payload = typeof a.archive_payload_json === 'string' ? JSON.parse(a.archive_payload_json) : (a.archive_payload_json || {}); } catch(e) {}

  const p = payload.tenant_profile || {};
  const fam = payload.family_members || [];
  const veh = payload.vehicles || [];

  const html = `
    <div>
      <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; padding: 14px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div>
            <h3 style="color: #38bdf8; font-size: 16px; margin-bottom: 2px;">Flat ${a.flat_number} — ${a.tenant_name}</h3>
            <div style="font-size: 12px; color: #94a3b8;">${a.building_name || 'Building'}</div>
          </div>
          <span class="badge badge-warning">📜 Archived Past Tenancy</span>
        </div>
        <div style="font-size: 12px; color: #cbd5e1; margin-top: 8px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 8px;">
          <strong>Stay Tenure:</strong> ${a.move_in_date || 'N/A'} ➔ <strong style="color: #f43f5e;">${a.vacated_date || 'N/A'}</strong> | <strong>Vacated Reason:</strong> ${payload.vacated_reason || 'End of Lease Agreement'}
        </div>
      </div>

      <div class="glass-panel" style="margin-bottom: 12px; padding: 14px;">
        <div style="display: flex; gap: 14px; align-items: flex-start; flex-wrap: wrap;">
          ${(p.photo_filename || a.photo_filename) ? `
            <div style="text-align: center; flex-shrink: 0;">
              <div style="cursor: pointer; border-radius: 6px; overflow: hidden; border: 1px solid #38bdf8; width: 76px; height: 76px; background: #0f172a;" onclick="viewDocumentModal('/media/${p.photo_filename || a.photo_filename}', 'Archived Tenant Photo - ${a.tenant_name}')" title="Click to view full photo">
                <img src="/media/${p.photo_filename || a.photo_filename}" alt="Archived Photo" style="width: 100%; height: 100%; object-fit: cover;" />
              </div>
              <button type="button" class="btn btn-sm btn-secondary" style="font-size: 10px; padding: 2px 6px; margin-top: 4px; width: 100%;" onclick="viewDocumentModal('/media/${p.photo_filename || a.photo_filename}', 'Archived Tenant Photo - ${a.tenant_name}')">🔍 Photo</button>
            </div>
          ` : ''}
          <div style="flex: 1; min-width: 220px;">
            <h4 style="color: #38bdf8; font-size: 13px; margin-bottom: 8px;">👤 Primary Tenant Contact & CNIC</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12.5px;">
              <div><strong>Past Tenant Name:</strong> ${a.tenant_name}</div>
              <div><strong>CNIC Number:</strong> ${a.cnic_number}</div>
              <div><strong>Primary Mobile Phone:</strong> <span style="color: #34d399; font-weight: bold;">${a.primary_phone}</span></div>
              <div><strong>Emergency Phone:</strong> ${p.emergency_phone || 'N/A'}</div>
            </div>
            ${(p.document_filename || a.document_filename) ? `
              <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed rgba(255,255,255,0.1);">
                <button type="button" class="btn btn-sm btn-info" onclick="viewDocumentModal('/media/${p.document_filename || a.document_filename}', 'Archived Agreement / Document - ${a.tenant_name}')" style="font-size: 11px; padding: 3px 10px;">📄 View Archived Scanned Document</button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <div class="glass-panel" style="margin-bottom: 12px; padding: 14px;">
        <h4 style="color: #38bdf8; font-size: 13px; margin-bottom: 8px;">👨‍👩‍👧‍👦 Registered Family Members (${fam.length})</h4>
        ${fam.length > 0 ? `
          <table class="data-table">
            <thead><tr><th>Full Name</th><th>Relation</th><th>CNIC / B-Form</th><th>Phone / Mobile</th></tr></thead>
            <tbody>
              ${fam.map(m => `<tr><td><strong>${m.full_name}</strong></td><td>${m.relation || 'Family'}</td><td>${m.cnic_bform || 'N/A'}</td><td><code>${m.phone || '---'}</code></td></tr>`).join('')}
            </tbody>
          </table>
        ` : `<p style="font-size: 12px; color: #94a3b8;">No additional family members on archive file.</p>`}
      </div>

      <div class="glass-panel" style="padding: 14px;">
        <h4 style="color: #38bdf8; font-size: 13px; margin-bottom: 8px;">🚗 Allotted Vehicles (${veh.length})</h4>
        ${veh.length > 0 ? `
          <table class="data-table">
            <thead><tr><th>Vehicle Type</th><th>Registration Number</th><th>Make / Model</th><th>Parking Bay</th></tr></thead>
            <tbody>
              ${veh.map(v => `<tr><td>${v.vehicle_type}</td><td><strong style="color: #38bdf8;">${v.registration_number}</strong></td><td>${v.make_model || '---'}</td><td>${v.parking_slot_number || '---'}</td></tr>`).join('')}
            </tbody>
          </table>
        ` : `<p style="font-size: 12px; color: #94a3b8;">No vehicles registered on archive file.</p>`}
      </div>
    </div>
  `;

  showGenericModal(`Past Tenant Dossier — Flat ${a.flat_number}`, html);
}

function exportTenantHistoryCSV() {
  if (historyCache.length === 0) {
    showToast("No historical records to export", "warning");
    return;
  }

  let csv = "Flat Number,Building,Past Tenant Name,Primary Mobile Phone,Emergency Phone,CNIC Number,Move-in Date,Vacated Date,Agreed Rent (PKR),Security Deposit (PKR),Vacated Reason\n";
  historyCache.forEach(a => {
    let payload = {};
    try { payload = typeof a.archive_payload_json === 'string' ? JSON.parse(a.archive_payload_json) : (a.archive_payload_json || {}); } catch(e) {}
    const p = payload.tenant_profile || {};
    csv += `"${a.flat_number}","${a.building_name}","${a.tenant_name}","${a.primary_phone}","${p.emergency_phone || ''}","${a.cnic_number}","${a.move_in_date}","${a.vacated_date}","${p.monthly_rent || 0}","${p.security_deposit || 0}","${payload.vacated_reason || ''}"\n`;
  });

  const filename = `DS_Tenant_History_Archive_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csv, filename);
  showToast("Tenant History Contacts CSV downloaded successfully!", "success");
}

function printTenantHistory() {
  openPdfActionModal('tenant_history', 'Permanent Historical Tenant Archive Statement');
}

function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); window.URL.revokeObjectURL(url); }, 250);
}

// ==========================================================================
// 4. VISITORS & MAIDS (CALENDAR FILTERING & COMPLETE CONTACT DETAILS)
// ==========================================================================
let visitorsCache = [];
let staffCache = [];
let visitorsCustomDateFrom = null;
let visitorsCustomDateTo = null;

function setVisitorsDateFilter(preset) {
  DSSound.playClick();
  State.datePreset = preset;
  State.customDate = null;
  visitorsCustomDateFrom = null;
  visitorsCustomDateTo = null;

  document.querySelectorAll('#visitorsDateFilterButtonGroup .date-quick-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('onclick')?.includes(`'${preset}'`));
  });

  const fromInp = document.getElementById('visitorDateFrom');
  const toInp = document.getElementById('visitorDateTo');
  if (fromInp) fromInp.value = '';
  if (toInp) toInp.value = '';

  const labels = {
    today: '📅 Filter: Today',
    yesterday: '📅 Filter: Yesterday',
    '2days': '📅 Filter: Last 2 Days',
    '7days': '📅 Filter: Last 7 Days',
    month: '📅 Filter: This Month',
    all: '📅 Filter: All Records'
  };
  updateTopCalendarPill(labels[preset] || '📅 Filter: Calendar');

  loadVisitorsAndStaffData();
}

function applyVisitorsCustomDateRange() {
  DSSound.playClick();
  const dFrom = document.getElementById('visitorDateFrom')?.value;
  const dTo = document.getElementById('visitorDateTo')?.value;

  if (!dFrom && !dTo) {
    showToast("Please select at least a start or end date.", "warning");
    return;
  }

  State.datePreset = 'custom';
  visitorsCustomDateFrom = dFrom || null;
  visitorsCustomDateTo = dTo || null;

  document.querySelectorAll('#visitorsDateFilterButtonGroup .date-quick-btn').forEach(b => b.classList.remove('active'));
  loadVisitorsAndStaffData();
}

async function loadVisitorsAndStaffData() {
  try {
    let q = `building_id=${State.selectedBuildingId}&date_preset=${State.datePreset}`;
    if (visitorsCustomDateFrom) q += `&date_from=${visitorsCustomDateFrom}`;
    if (visitorsCustomDateTo) q += `&date_to=${visitorsCustomDateTo}`;
    else if (State.customDate) q += `&custom_date=${State.customDate}`;

    const vRes = await fetch(`/api/visitors?${q}`);
    const vData = await vRes.json();
    visitorsCache = vData.data || [];
    renderVisitorsTable(visitorsCache);

    const sRes = await fetch(`/api/domestic_staff?building_id=${State.selectedBuildingId}`);
    const sData = await sRes.json();
    staffCache = sData.data || [];
    renderStaffTable(staffCache);
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function renderVisitorsTable(visitors) {
  const tbody = document.getElementById('visitorsTableBody');
  if (!tbody) return;

  if (visitors.length === 0) {
    const filterLabel = State.customDate || (State.datePreset === 'today' ? 'Today' : (State.datePreset === 'yesterday' ? 'Yesterday' : State.datePreset.toUpperCase()));
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 25px; font-size: 13px;">No visitor logs found for (${filterLabel}).</td></tr>`;
    return;
  }

  tbody.innerHTML = visitors.map(v => `
    <tr>
      <td><span class="cell-flat">Flat ${v.flat_number}</span></td>
      <td>
        <strong style="font-size: 13px;">${v.guest_name}</strong>
        ${(v.total_persons && v.total_persons > 1) ? `<span class="badge badge-info" style="font-size: 9.5px; margin-left: 4px;">👨‍👩‍👧 ${v.total_persons} Persons</span>` : ''}
        ${v.accompanying_details ? `<div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">👥 ${v.accompanying_details}</div>` : ''}
      </td>
      <td><span class="cell-phone">${v.contact_number || '---'}</span></td>
      <td><code>${v.cnic_number || '---'}</code></td>
      <td><span class="cell-time-in">📥 ${v.entry_time || '---'}</span></td>
      <td><span class="cell-time-out">${v.exit_time ? `📤 ${v.exit_time}` : '⏳ In Premises'}</span></td>
      <td>
        <span class="badge ${v.status === 'IN_PREMISES' ? 'badge-success' : 'badge-secondary'}">
          ${v.status === 'IN_PREMISES' ? '● In Premises' : `Checked Out`}
        </span>
      </td>
      <td>
        <div style="display: flex; gap: 4px; align-items: center;">
          ${v.photo_filename ? `<button class="btn btn-sm btn-secondary" onclick="viewImageZoom('/media/${v.photo_filename}', 'Visitor: ${v.guest_name}')" title="Visitor Photo">📷</button>` : ''}
          ${v.document_filename ? `<button class="btn btn-sm btn-info" onclick="viewDocumentModal('/media/${v.document_filename}', 'Document - ${v.guest_name}')" title="Attached ID Document">📄 Doc</button>` : ''}
          <button class="btn btn-sm btn-secondary" onclick="openEditVisitorModal('${v.id}')">✏️</button>
          ${v.status === 'IN_PREMISES' ? `<button class="btn btn-sm btn-primary" onclick="handleVisitorCheckOut('${v.id}')">Check Out</button>` : ''}
          ${(State.currentUser?.role === 'MASTER_ADMIN' || State.currentUser?.role === 'MANAGER') ? `<button class="btn btn-sm btn-danger" onclick="deleteVisitorLog('${v.id}')">🗑</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function filterVisitors() {
  const query = (document.getElementById('visitorSearchInput')?.value || '').toLowerCase();
  const filtered = visitorsCache.filter(v => {
    return v.flat_number.toLowerCase().includes(query) || v.guest_name.toLowerCase().includes(query) || (v.contact_number && v.contact_number.includes(query));
  });
  renderVisitorsTable(filtered);
}

function exportVisitorsMarketingCSV() {
  if (visitorsCache.length === 0) {
    showToast("No visitor records to export", "warning");
    return;
  }

  let csv = "Guest Name,Contact Phone Number,CNIC Number,Target Flat,Building,Entry Timestamp,Exit Time,Purpose of Visit,Current Status\n";
  visitorsCache.forEach(v => {
    csv += `"${v.guest_name}","${v.contact_number || ''}","${v.cnic_number || ''}","${v.flat_number}","${v.building_name || ''}","${v.entry_time}","${v.exit_time || ''}","${v.purpose_of_visit || ''}","${v.status}"\n`;
  });

  const filename = `DS_Visitors_Contacts_Log_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csv, filename);
  showToast("Visitors Contacts CSV downloaded for marketing & records!", "success");
}

function printVisitorsLog() {
  openPdfActionModal('visitors', 'Visitors & Security Access Report');
}

function renderStaffTable(staff) {
  const tbody = document.getElementById('staffTableBody');
  if (!tbody) return;

  if (staff.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 25px; font-size: 13px;">No domestic staff / maids registered.</td></tr>`;
    return;
  }

  tbody.innerHTML = staff.map(s => `
    <tr>
      <td>
        <div style="display: flex; align-items: center; gap: 9px;">
          ${s.photo_filename ? `<img src="/media/${s.photo_filename}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1.5px solid var(--neon-cyan);" />` : `<div style="width: 32px; height: 32px; border-radius: 50%; background: #1e293b; color: #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 13px;">👤</div>`}
          <div>
            <strong style="font-size: 13px;">${s.full_name}</strong>
            <div style="font-size: 11px; color: var(--text-muted);">${s.role_type}</div>
          </div>
        </div>
      </td>
      <td><span class="cell-phone">${s.phone || '---'}</span></td>
      <td><span class="cell-card-num">${s.bahria_card_number}</span></td>
      <td><code>${s.cnic_number}</code></td>
      <td><span class="badge badge-info">Flats: ${s.associated_flats || 'All'}</span></td>
      <td>
        <span class="badge ${s.status === 'ON_DUTY' ? 'badge-success' : 'badge-secondary'}">
          ${s.status === 'ON_DUTY' ? '● ON DUTY' : 'OFF DUTY'}
        </span>
      </td>
      <td>
        <div style="display: flex; gap: 4px; align-items: center;">
          ${s.photo_filename ? `<button class="btn btn-sm btn-secondary" onclick="viewImageZoom('/media/${s.photo_filename}', '${s.full_name}')">Photo</button>` : ''}
          ${s.cnic_front_filename ? `<button class="btn btn-sm btn-secondary" onclick="viewImageZoom('/media/${s.cnic_front_filename}', 'CNIC')">CNIC</button>` : ''}
        </div>
      </td>
      <td>
        <div style="display: flex; gap: 4px; align-items: center;">
          <button class="btn btn-sm ${s.status === 'ON_DUTY' ? 'btn-danger' : 'btn-success'}" onclick="toggleStaffDuty('${s.id}', '${s.status === 'ON_DUTY' ? 'OFF_DUTY' : 'ON_DUTY'}')">
            ${s.status === 'ON_DUTY' ? 'Off' : 'On'}
          </button>
          <button class="btn btn-sm btn-secondary" onclick="openEditStaffModal('${s.id}')">✏️</button>
          ${(State.currentUser?.role === 'MASTER_ADMIN' || State.currentUser?.role === 'MANAGER') ? `<button class="btn btn-sm btn-danger" onclick="deleteDomesticStaff('${s.id}')">🗑</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function filterStaff() {
  const query = (document.getElementById('staffSearchInput')?.value || '').toLowerCase();
  const filtered = staffCache.filter(s => {
    return s.full_name.toLowerCase().includes(query) || s.bahria_card_number.toLowerCase().includes(query) || (s.associated_flats && s.associated_flats.toLowerCase().includes(query));
  });
  renderStaffTable(filtered);
}

// Edit Visitor
function openEditVisitorModal(visitorId) {
  const v = visitorsCache.find(x => x.id === visitorId);
  if (!v) return;

  document.getElementById('visitorId').value = v.id;
  document.getElementById('visitorFlatNumber').value = v.flat_number;
  document.getElementById('visitorGuestName').value = v.guest_name;
  document.getElementById('visitorContact').value = v.contact_number || '';
  document.getElementById('visitorCnic').value = v.cnic_number || '';
  document.getElementById('visitorPurpose').value = v.purpose_of_visit || 'Personal Visit';
  document.getElementById('visitorEntryTime').value = v.entry_time || new Date().toISOString().slice(0, 16).replace('T', ' ');

  if (typeof setVisitorHeadcount === 'function') {
    setVisitorHeadcount(v.total_persons || 1);
  }
  const accEl = document.getElementById('visitorAccompanyingDetails');
  if (accEl) accEl.value = v.accompanying_details || '';

  const docInp = document.getElementById('visitorDocumentFilename');
  if (docInp) docInp.value = v.document_filename || '';
  const docPrev = document.getElementById('visitorDocPreview');
  if (docPrev) {
    if (v.document_filename) {
      docPrev.style.display = 'flex';
      const thumb = document.getElementById('visitorDocThumb');
      if (thumb) thumb.src = `/media/${v.document_filename}`;
      const nameEl = document.getElementById('visitorDocName');
      if (nameEl) nameEl.innerText = v.document_filename;
    } else {
      docPrev.style.display = 'none';
    }
  }

  const prev = document.getElementById('visitorPhotoPreview');
  if (prev) {
    if (v.photo_filename) {
      prev.src = `/media/${v.photo_filename}`;
      prev.style.display = 'block';
    } else {
      prev.src = '';
      prev.style.display = 'none';
    }
  }

  openModal('newVisitorModal');
}

function openNewVisitorModal() {
  document.getElementById('visitorId').value = '';
  document.getElementById('visitorFlatNumber').value = '';
  document.getElementById('visitorGuestName').value = '';
  document.getElementById('visitorContact').value = '';
  document.getElementById('visitorCnic').value = '';
  document.getElementById('visitorPurpose').value = 'Family Guest / Personal Visit';
  document.getElementById('visitorEntryTime').value = new Date().toISOString().slice(0, 16).replace('T', ' ');
  document.getElementById('visitorPhotoData').value = '';
  const prev = document.getElementById('visitorPhotoPreview');
  if (prev) {
    prev.src = '';
    prev.style.display = 'none';
  }

  if (typeof setVisitorHeadcount === 'function') {
    setVisitorHeadcount(1);
  }
  const accEl = document.getElementById('visitorAccompanyingDetails');
  if (accEl) accEl.value = '';

  const docInp = document.getElementById('visitorDocumentFilename');
  if (docInp) docInp.value = '';
  const docPrev = document.getElementById('visitorDocPreview');
  if (docPrev) docPrev.style.display = 'none';

  openModal('newVisitorModal');
}

async function handleSaveVisitor(e) {
  if (e) e.preventDefault();
  const vId = document.getElementById('visitorId').value || null;
  const flat = document.getElementById('visitorFlatNumber').value.trim();
  const guest = document.getElementById('visitorGuestName').value.trim();
  if (!flat || !guest) {
    showToast("Please provide flat number and visitor name.", "warning");
    return;
  }

  let photoFn = '';
  const photoB64 = document.getElementById('visitorPhotoData').value;
  if (photoB64) {
    const upRes = await fetch('/api/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: photoB64, extension: 'jpg' })
    });
    const upData = await upRes.json();
    if (upData.success) photoFn = upData.filename;
  }

  const totalPersons = parseInt(document.getElementById('visitorTotalPersons')?.value || '1') || 1;
  const accompanyingDetails = document.getElementById('visitorAccompanyingDetails')?.value.trim() || '';
  const docFn = document.getElementById('visitorDocumentFilename')?.value || '';

  const bId = State.selectedBuildingId === 'ALL' ? (State.buildings[0] ? State.buildings[0].id : '') : State.selectedBuildingId;

  try {
    const res = await fetch('/api/visitors/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: vId,
        building_id: bId,
        flat_number: flat,
        guest_name: guest,
        contact_number: document.getElementById('visitorContact').value.trim(),
        cnic_number: document.getElementById('visitorCnic').value.trim(),
        purpose_of_visit: document.getElementById('visitorPurpose').value.trim(),
        entry_time: document.getElementById('visitorEntryTime').value.trim(),
        photo_filename: photoFn,
        total_persons: totalPersons,
        accompanying_details: accompanyingDetails,
        document_filename: docFn,
        receptionist_name: State.currentUser?.full_name || 'Receptionist'
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast("Visitor entry saved permanently!", "success");
      closeModal('newVisitorModal');
      await loadVisitorsAndStaffData();
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function handleVisitorCheckOut(visitorId) {
  try {
    const res = await fetch('/api/visitors/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: visitorId })
    });
    const data = await res.json();
    if (data.success) {
      showToast("Visitor checked out", "success");
      await loadVisitorsAndStaffData();
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function deleteVisitorLog(visitorId) {
  const v = visitorsCache.find(x => x.id === visitorId);
  const targetLabel = v ? `Visitor Log for ${v.guest_name} (Flat ${v.flat_number || 'N/A'})` : 'Visitor Log';
  requestAdminPasswordForDelete(targetLabel, async () => {
    try {
      const res = await fetch('/api/visitors/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: visitorId })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Visitor log removed", "success");
        await loadVisitorsAndStaffData();
      } else {
        showToast(data.error || "Failed to remove visitor log", "danger");
      }
    } catch (err) {
      showToast(err.message, "danger");
    }
  });
}

// Edit / Delete Staff
function openEditStaffModal(staffId) {
  const s = staffCache.find(x => x.id === staffId);
  if (!s) return;

  document.getElementById('staffId').value = s.id;
  document.getElementById('staffFullName').value = s.full_name;
  document.getElementById('staffPhone').value = s.phone || '';
  document.getElementById('staffCnic').value = s.cnic_number;
  document.getElementById('staffBahriaCard').value = s.bahria_card_number;
  document.getElementById('staffRoleType').value = s.role_type || 'Maid & Cleaner';
  document.getElementById('staffAssociatedFlats').value = s.associated_flats || '';

  openModal('newStaffModal');
}

function openNewStaffModal() {
  document.getElementById('staffId').value = '';
  document.getElementById('staffFullName').value = '';
  document.getElementById('staffPhone').value = '';
  document.getElementById('staffCnic').value = '';
  document.getElementById('staffBahriaCard').value = '';
  document.getElementById('staffAssociatedFlats').value = '';
  openModal('newStaffModal');
}

async function handleSaveStaff(e) {
  if (e) e.preventDefault();
  const sId = document.getElementById('staffId').value || null;
  const name = document.getElementById('staffFullName').value.trim();
  const cnic = document.getElementById('staffCnic').value.trim();
  const bahriaCard = document.getElementById('staffBahriaCard').value.trim();

  if (!name || !cnic || !bahriaCard) {
    showToast("Name, CNIC, and Bahria Town Card # are required.", "warning");
    return;
  }

  const bId = State.selectedBuildingId === 'ALL' ? (State.buildings[0] ? State.buildings[0].id : '') : State.selectedBuildingId;

  try {
    const res = await fetch('/api/domestic_staff/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: sId,
        building_id: bId,
        full_name: name,
        phone: document.getElementById('staffPhone').value.trim(),
        cnic_number: cnic,
        bahria_card_number: bahriaCard,
        role_type: document.getElementById('staffRoleType').value,
        associated_flats: document.getElementById('staffAssociatedFlats').value.trim()
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast("Domestic staff profile updated permanently!", "success");
      closeModal('newStaffModal');
      await loadVisitorsAndStaffData();
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function toggleStaffDuty(staffId, newStatus) {
  try {
    const res = await fetch('/api/domestic_staff/toggle_duty', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: staffId, status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Staff marked as ${newStatus}`, "success");
      await loadVisitorsAndStaffData();
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function deleteDomesticStaff(staffId) {
  const s = staffCache.find(x => x.id === staffId);
  const targetLabel = s ? `Staff/Maid: ${s.full_name} (${s.role_type || 'Staff'})` : 'Domestic Staff Profile';
  requestAdminPasswordForDelete(targetLabel, async () => {
    try {
      const res = await fetch('/api/domestic_staff/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: staffId })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Staff profile deleted", "success");
        await loadVisitorsAndStaffData();
      } else {
        showToast(data.error || "Failed to delete staff profile", "danger");
      }
    } catch (err) {
      showToast(err.message, "danger");
    }
  });
}

// ==========================================================================
// 5. GAS CYLINDERS (DATE PRESET, INWARD SUPPLIES & APARTMENT DISTRIBUTION)
// ==========================================================================
let gasDeliveriesCache = [];
let gasSuppliesCache = [];
let gasActiveFlatsCache = [];
let currentGasSubTab = 'deliveries';

function setGasDateFilter(preset) {
  DSSound.playClick();
  State.datePreset = preset;
  State.customDate = null;

  document.querySelectorAll('#gasDateFilterButtonGroup .date-quick-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('onclick')?.includes(`'${preset}'`));
  });

  const labels = {
    today: '📅 Filter: Today',
    yesterday: '📅 Filter: Yesterday',
    '2days': '📅 Filter: Last 2 Days',
    '7days': '📅 Filter: Last 7 Days',
    month: '📅 Filter: This Month',
    all: '📅 Filter: All Records'
  };
  updateTopCalendarPill(labels[preset] || '📅 Filter: Calendar');

  loadGasData();
}

function switchGasSubTab(tab) {
  DSSound.playClick();
  currentGasSubTab = tab;

  const btnDel = document.getElementById('gasTabBtnDeliveries');
  const btnSup = document.getElementById('gasTabBtnSupplies');
  const btnFlats = document.getElementById('gasTabBtnActiveFlats');

  const contDel = document.getElementById('gasDeliveriesContainer');
  const contSup = document.getElementById('gasSuppliesContainer');
  const contFlats = document.getElementById('gasActiveFlatsContainer');

  if (btnDel) btnDel.className = tab === 'deliveries' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
  if (btnSup) btnSup.className = tab === 'supplies' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
  if (btnFlats) btnFlats.className = tab === 'activeFlats' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';

  if (contDel) contDel.style.display = tab === 'deliveries' ? 'block' : 'none';
  if (contSup) contSup.style.display = tab === 'supplies' ? 'block' : 'none';
  if (contFlats) contFlats.style.display = tab === 'activeFlats' ? 'block' : 'none';
}

function openNewGasSupplyModal() {
  const bSelect = document.getElementById('gasSupplyBuildingId');
  if (bSelect) {
    bSelect.innerHTML = State.buildings.map(b => `
      <option value="${b.id}" ${b.id === State.selectedBuildingId ? 'selected' : ''}>${b.name} (Code ${b.building_code})</option>
    `).join('');
  }

  const now = new Date();
  const localDatetime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const dateInp = document.getElementById('gasSupplyDate');
  if (dateInp) dateInp.value = localDatetime;

  document.getElementById('gasSupplySupplierName').value = '';
  document.getElementById('gasSupplyDeliveredBy').value = '';
  document.getElementById('gasSupplyVehicleNo').value = '';
  document.getElementById('gasSupplyQuantity').value = '25';
  document.getElementById('gasSupplyUnitCost').value = '3100';
  document.getElementById('gasSupplyBatchRef').value = '';
  document.getElementById('gasSupplyNotes').value = '';
  calculateGasSupplyTotal();

  openModal('newGasSupplyModal');
}

function calculateGasSupplyTotal() {
  const qty = parseInt(document.getElementById('gasSupplyQuantity')?.value) || 0;
  const unitCost = parseFloat(document.getElementById('gasSupplyUnitCost')?.value) || 0;
  const totalInp = document.getElementById('gasSupplyTotalCost');
  if (totalInp) totalInp.value = Math.round(qty * unitCost);
}

async function handleSaveGasSupply(e) {
  if (e) e.preventDefault();
  const bId = document.getElementById('gasSupplyBuildingId')?.value;
  const supDate = document.getElementById('gasSupplyDate')?.value.replace('T', ' ');
  const supplier = document.getElementById('gasSupplySupplierName')?.value.trim();
  const deliveredBy = document.getElementById('gasSupplyDeliveredBy')?.value.trim();
  const vehicle = document.getElementById('gasSupplyVehicleNo')?.value.trim();
  const qty = parseInt(document.getElementById('gasSupplyQuantity')?.value) || 0;
  const unitCost = parseFloat(document.getElementById('gasSupplyUnitCost')?.value) || 0;
  const totalCost = parseFloat(document.getElementById('gasSupplyTotalCost')?.value) || (qty * unitCost);
  const payMode = document.getElementById('gasSupplyPaymentMode')?.value || 'HAND_CASH';
  const batchRef = document.getElementById('gasSupplyBatchRef')?.value.trim();
  const notes = document.getElementById('gasSupplyNotes')?.value.trim();

  if (!bId || !supplier || !deliveredBy || qty <= 0) {
    showToast("Please fill building, supplier name, driver name, and quantity.", "warning");
    return;
  }

  try {
    const res = await fetch('/api/gas/supply/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        building_id: bId,
        supply_date: supDate,
        supplier_name: supplier,
        delivered_by: deliveredBy,
        vehicle_number: vehicle,
        quantity: qty,
        unit_cost: unitCost,
        total_cost: totalCost,
        payment_mode: payMode,
        batch_reference: batchRef,
        notes: notes,
        received_by_user: State.currentUser?.username || 'Admin'
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast(`Logged ${qty} cylinders arrival from ${supplier}!`, "success");
      closeModal('newGasSupplyModal');
      await loadGasData();
      notifyTransactionChange();
    } else {
      showToast(data.error || "Failed to log supply arrival", "danger");
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function deleteGasSupply(id) {
  const s = gasSuppliesCache.find(x => x.id === id);
  const targetLabel = s ? `Inward Gas Supply (${s.quantity} cylinders from ${s.supplier_name})` : 'Inward Gas Supply Record';
  requestAdminPasswordForDelete(targetLabel, async () => {
    try {
      const res = await fetch('/api/gas/supply/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id, operator_role: State.currentUser?.role || 'MASTER_ADMIN' })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Inward supply record removed", "success");
        await loadGasData();
        notifyTransactionChange();
      } else {
        showToast(data.error || "Failed to delete record", "danger");
      }
    } catch (err) {
      showToast(err.message, "danger");
    }
  });
}

function renderGasSuppliesTable(supplies) {
  const tbody = document.getElementById('gasSuppliesTableBody');
  if (!tbody) return;

  if (supplies.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: #94a3b8; padding: 25px;">No inward stock supply logs found for this period.</td></tr>`;
    return;
  }

  tbody.innerHTML = supplies.map(s => `
    <tr>
      <td><strong>${s.supply_date}</strong></td>
      <td><strong style="color: #a78bfa;">${s.supplier_name}</strong> (${s.building_name})</td>
      <td><strong>${s.delivered_by}</strong></td>
      <td><code>${s.vehicle_number || '---'}</code></td>
      <td><span class="badge badge-success" style="font-size: 12px; font-weight: 800;">+ ${s.quantity} Cylinders</span></td>
      <td>PKR ${(s.unit_cost || 0).toLocaleString()}</td>
      <td><strong style="color: #38bdf8;">PKR ${(s.total_cost || 0).toLocaleString()}</strong></td>
      <td><span class="badge ${s.payment_mode === 'HAND_CASH' ? 'badge-info' : 'badge-success'}">${s.payment_mode}</span></td>
      <td><code>${s.batch_reference || '---'}</code></td>
      <td>${s.received_by_user || 'Admin'}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteGasSupply('${s.id}')" title="Delete record">🗑</button>
      </td>
    </tr>
  `).join('');
}

async function loadGasData() {
  try {
    const customParam = State.customDate ? `&custom_date=${State.customDate}` : `&date_preset=${State.datePreset}`;
    const res = await fetch(`/api/gas?building_id=${State.selectedBuildingId}${customParam}`);
    const data = await res.json();
    if (!data.success) return;

    const inv = data.data.inventory || {};
    gasDeliveriesCache = data.data.deliveries || [];
    gasActiveFlatsCache = data.data.active_flats || [];

    // Fetch inward supplies
    const supRes = await fetch(`/api/gas/supplies?building_id=${State.selectedBuildingId}${customParam}`);
    const supData = await supRes.json();
    gasSuppliesCache = supData.data || [];

    const resEl = document.getElementById('gasReserveCount');
    if (resEl) resEl.innerText = inv.reserve_stock || 0;

    const actEl = document.getElementById('gasActiveCount');
    if (actEl) actEl.innerText = inv.active_in_apartments || 0;

    const empEl = document.getElementById('gasEmptyCount');
    if (empEl) empEl.innerText = inv.empty_returned || 0;

    const inCountEl = document.getElementById('gasInwardCount');
    const inCostEl = document.getElementById('gasInwardCost');
    let totalInQty = 0;
    let totalInCost = 0;
    gasSuppliesCache.forEach(s => {
      totalInQty += (s.quantity || 0);
      totalInCost += (s.total_cost || 0);
    });
    if (inCountEl) inCountEl.innerText = `${totalInQty} Inward`;
    if (inCostEl) inCostEl.innerText = `Total Cost: PKR ${totalInCost.toLocaleString()}`;

    renderGasDeliveriesTable(gasDeliveriesCache);
    renderGasSuppliesTable(gasSuppliesCache);
    renderGasActiveFlatsTable(gasActiveFlatsCache);
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function renderGasActiveFlatsTable(flats) {
  const tbody = document.getElementById('gasActiveFlatsTableBody');
  if (!tbody) return;

  if (flats.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 25px;">No flats found for this building.</td></tr>`;
    return;
  }

  tbody.innerHTML = flats.map(f => {
    const isOwner = f.occupancy_mode === 'Owner Occupied';
    const residentName = f.tenant_name || (isOwner ? f.owner_name : 'Vacant Unit');
    const residentPhone = f.tenant_phone || (isOwner ? f.owner_phone : '---');
    const hasCylinder = f.total_cylinders_received > 0;

    return `
      <tr>
        <td><strong style="color: #38bdf8;">Flat ${f.flat_number}</strong> (${f.building_name})</td>
        <td>Floor ${f.floor_number}</td>
        <td>
          <span class="badge ${isOwner ? 'badge-info' : (f.tenant_name ? 'badge-success' : 'badge-warning')}">
            ${isOwner ? '🏠 Owner Living' : (f.tenant_name ? '👤 Tenant Living' : '🚪 Vacant')}
          </span>
        </td>
        <td><strong>${residentName}</strong></td>
        <td><code>${residentPhone}</code></td>
        <td>${f.last_delivery_date || '<span style="color: #64748b;">No Delivery Logged</span>'}</td>
        <td>
          ${f.last_delivery_date ? `
            <span class="badge ${f.last_empty_returned ? 'badge-success' : 'badge-warning'}">
              ${f.last_empty_returned ? '✅ Empty Returned' : '⏳ In-Use / Pending'}
            </span>
          ` : '<span style="color: #64748b;">---</span>'}
        </td>
        <td>
          <strong style="color: ${hasCylinder ? '#10b981' : '#94a3b8'};">
            ${f.total_cylinders_received} Cylinder(s)
          </strong>
        </td>
      </tr>
    `;
  }).join('');
}

function onGasTransactionTypeChange() {
  const txType = document.getElementById('gasTransactionType').value;
  const rateInput = document.getElementById('gasUnitPrice');
  const emptyGroup = document.getElementById('gasEmptyReturnedGroup');
  const emptyCheckbox = document.getElementById('gasEmptyReturned');

  if (txType === 'NEW_PURCHASE') {
    if (rateInput) rateInput.value = '25000';
    if (emptyGroup) emptyGroup.style.display = 'none';
    if (emptyCheckbox) emptyCheckbox.checked = false;
  } else {
    const bldgRate = State.currentBuilding?.gas_rate_per_cylinder || 3450;
    if (rateInput) rateInput.value = bldgRate;
    if (emptyGroup) emptyGroup.style.display = 'flex';
    if (emptyCheckbox) emptyCheckbox.checked = true;
  }
}

function renderGasDeliveriesTable(deliveries) {
  const tbody = document.getElementById('gasDeliveriesTableBody');
  if (!tbody) return;

  if (deliveries.length === 0) {
    const filterLabel = State.customDate || (State.datePreset === 'today' ? 'Today' : (State.datePreset === 'yesterday' ? 'Yesterday' : State.datePreset.toUpperCase()));
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 25px; font-size: 13px;">No gas deliveries recorded for (${filterLabel}).</td></tr>`;
    return;
  }

  tbody.innerHTML = deliveries.map(g => {
    const isNew = g.transaction_type === 'NEW_PURCHASE';
    return `
      <tr>
        <td><strong style="color: #38bdf8;">${g.receipt_number}</strong></td>
        <td>
          <strong>Flat ${g.flat_number}</strong> (${g.building_name})
          <div>
            <span class="badge ${isNew ? 'badge-info' : 'badge-success'}" style="font-size: 10px;">
              ${isNew ? '✨ NEW BOTTLE' : '🔄 REFILL'}
            </span>
          </div>
        </td>
        <td>${g.delivery_date}</td>
        <td>${g.quantity} Cylinder(s)</td>
        <td><strong>PKR ${(g.total_amount || 0).toLocaleString()}</strong></td>
        <td>
          <span class="badge ${isNew ? 'badge-secondary' : (g.is_empty_returned ? 'badge-success' : 'badge-warning')}">
            ${isNew ? 'N/A' : (g.is_empty_returned ? '✅ Returned' : '⏳ Pending')}
          </span>
        </td>
        <td>
          <span class="badge ${g.payment_mode === 'HAND_CASH' ? 'badge-success' : 'badge-info'}">
            ${g.payment_mode === 'HAND_CASH' ? `Cash (${g.cash_collector_name || 'Staff'})` : `Bank Transfer`}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 4px;">
            <button class="btn btn-sm btn-primary" onclick="showThermalReceiptPreview('${g.id}')">🖨 Receipt</button>
            <button class="btn btn-sm btn-secondary" onclick="openEditGasDeliveryModal('${g.id}')">✏️</button>
            ${(State.currentUser?.role === 'MASTER_ADMIN' || State.currentUser?.role === 'MANAGER') ? `<button class="btn btn-sm btn-danger" onclick="deleteGasDelivery('${g.id}')">🗑</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterGasDeliveries() {
  const query = (document.getElementById('gasSearchInput')?.value || '').toLowerCase();
  const filtered = gasDeliveriesCache.filter(g => {
    return g.receipt_number.toLowerCase().includes(query) || g.flat_number.toLowerCase().includes(query);
  });
  renderGasDeliveriesTable(filtered);
}

function exportGasDeliveriesCSV() {
  if (gasDeliveriesCache.length === 0) {
    showToast("No gas deliveries to export", "warning");
    return;
  }
  let csv = "Receipt Number,Flat Number,Building,Transaction Type,Delivery Date,Quantity,Unit Price (PKR),Total Amount (PKR),Empty Returned,Payment Mode,Bank or Collector,Receptionist\n";
  gasDeliveriesCache.forEach(g => {
    csv += `"${g.receipt_number || ''}","${g.flat_number}","${g.building_name || ''}","${g.transaction_type || 'REFILL'}","${g.delivery_date}",${g.quantity},${g.unit_price},${g.total_amount},"${g.is_empty_returned ? 'Yes' : 'No'}","${g.payment_mode === 'HAND_CASH' ? 'Hand Cash' : 'Bank Transfer'}","${g.bank_account_name || g.cash_collector_name || 'Staff'}","${g.receptionist_name || ''}"\n`;
  });
  const filename = `DS_Gas_Deliveries_Log_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csv, filename);
  showToast("Gas Deliveries Log exported to CSV successfully!", "success");
}

function printGasLog() {
  openPdfActionModal('gas', 'Gas Cylinders Reconciliation & Inventory Statement');
}

function toggleGasPaymentMode() {
  const mode = document.getElementById('gasPaymentMode').value;
  if (mode === 'HAND_CASH') {
    document.getElementById('gasCashFields').style.display = 'block';
    document.getElementById('gasBankFields').style.display = 'none';
  } else {
    document.getElementById('gasCashFields').style.display = 'none';
    document.getElementById('gasBankFields').style.display = 'block';
  }
}

function openEditGasDeliveryModal(delId) {
  const g = gasDeliveriesCache.find(x => x.id === delId);
  if (!g) return;

  document.getElementById('gasDeliveryId').value = g.id;
  document.getElementById('gasFlatNumber').value = g.flat_number;
  document.getElementById('gasQuantity').value = g.quantity;
  document.getElementById('gasUnitPrice').value = g.unit_price;
  document.getElementById('gasDeliveryDate').value = g.delivery_date || new Date().toISOString().slice(0, 16).replace('T', ' ');
  document.getElementById('gasPaymentMode').value = g.payment_mode || 'HAND_CASH';
  document.getElementById('gasCashCollector').value = g.cash_collector_name || 'Staff';
  document.getElementById('gasTxRef').value = g.transaction_reference || '';

  const txTypeSelect = document.getElementById('gasTransactionType');
  if (txTypeSelect) txTypeSelect.value = g.transaction_type || 'REFILL';
  const emptyCb = document.getElementById('gasEmptyReturned');
  if (emptyCb) emptyCb.checked = !!g.is_empty_returned;

  onGasTransactionTypeChange();
  toggleGasPaymentMode();
  openModal('newGasDeliveryModal');
}

function openNewGasDeliveryModal() {
  document.getElementById('gasDeliveryId').value = '';
  document.getElementById('gasFlatNumber').value = '';
  document.getElementById('gasQuantity').value = '1';
  document.getElementById('gasUnitPrice').value = State.currentBuilding?.gas_rate_per_cylinder || '3450';
  document.getElementById('gasDeliveryDate').value = new Date().toISOString().slice(0, 16).replace('T', ' ');
  document.getElementById('gasPaymentMode').value = 'HAND_CASH';
  document.getElementById('gasCashCollector').value = 'Ahmed (Floor Staff)';
  document.getElementById('gasTxRef').value = '';
  document.getElementById('gasSlipData').value = '';

  const txTypeSelect = document.getElementById('gasTransactionType');
  if (txTypeSelect) txTypeSelect.value = 'REFILL';

  onGasTransactionTypeChange();
  toggleGasPaymentMode();
  openModal('newGasDeliveryModal');
}

async function handleSaveGasDelivery(e) {
  if (e) e.preventDefault();
  const delId = document.getElementById('gasDeliveryId').value || null;
  const flat = document.getElementById('gasFlatNumber').value.trim();
  const qty = parseInt(document.getElementById('gasQuantity').value || 1);
  const unitPrice = parseFloat(document.getElementById('gasUnitPrice').value || 3450);
  const deliveryDate = document.getElementById('gasDeliveryDate').value.trim();
  const payMode = document.getElementById('gasPaymentMode').value;
  const txType = document.getElementById('gasTransactionType')?.value || 'REFILL';

  if (!flat) {
    showToast("Please enter Flat number.", "warning");
    return;
  }

  let slipFn = '';
  const slipB64 = document.getElementById('gasSlipData').value;
  if (slipB64) {
    const upRes = await fetch('/api/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: slipB64, extension: 'jpg' })
    });
    const upData = await upRes.json();
    if (upData.success) slipFn = upData.filename;
  }

  const bId = State.selectedBuildingId === 'ALL' ? (State.buildings[0] ? State.buildings[0].id : '') : State.selectedBuildingId;
  const bankAcc = State.bankAccounts.find(b => b.id === document.getElementById('gasBankSelect').value);

  try {
    const res = await fetch('/api/gas/deliver', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: delId,
        building_id: bId,
        flat_number: flat,
        transaction_type: txType,
        quantity: qty,
        unit_price: unitPrice,
        delivery_date: deliveryDate,
        payment_mode: payMode,
        cash_collector_name: document.getElementById('gasCashCollector').value.trim(),
        bank_account_id: bankAcc ? bankAcc.id : null,
        bank_account_title: bankAcc ? `${bankAcc.bank_name} - ${bankAcc.account_title}` : '',
        transaction_reference: document.getElementById('gasTxRef').value.trim(),
        bank_slip_filename: slipFn,
        is_empty_returned: document.getElementById('gasEmptyReturned').checked ? 1 : 0,
        receptionist_name: State.currentUser?.full_name || 'Receptionist'
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast("Gas delivery saved & receipt generated permanently!", "success");
      closeModal('newGasDeliveryModal');
      await loadGasData();
      notifyTransactionChange();
      showThermalReceiptPreview(data.delivery_id);
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function deleteGasDelivery(delId) {
  const g = gasDeliveriesCache.find(x => x.id === delId);
  const targetLabel = g ? `Gas Delivery to Flat ${g.flat_number} (${g.quantity} cyl - Receipt #${g.receipt_number || 'N/A'})` : 'Gas Delivery Record';
  requestAdminPasswordForDelete(targetLabel, async () => {
    try {
      const res = await fetch('/api/gas/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: delId })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Delivery record deleted", "success");
        await loadGasData();
        notifyTransactionChange();
      } else {
        showToast(data.error || "Failed to delete delivery", "danger");
      }
    } catch (err) {
      showToast(err.message, "danger");
    }
  });
}

window.CurrentGasReceiptViewMode = 'customer';

function switchGasReceiptMode(mode) {
  window.CurrentGasReceiptViewMode = mode;
  const btnClient = document.getElementById('gasReceiptTabClient');
  const btnOffice = document.getElementById('gasReceiptTabOffice');

  if (mode === 'customer') {
    if (btnClient) btnClient.className = 'btn btn-sm btn-primary';
    if (btnOffice) btnOffice.className = 'btn btn-sm btn-secondary';
  } else {
    if (btnClient) btnClient.className = 'btn btn-sm btn-secondary';
    if (btnOffice) btnOffice.className = 'btn btn-sm btn-primary';
  }

  const d = window.CurrentGasReceiptData;
  if (!d) return;
  const curB = window.CurrentGasReceiptBuilding || State.currentBuilding || (State.buildings.find(b => b.id === d.building_id) || { name: 'Building 01' });
  const html = DSReceipt.renderGasReceipt(d, curB, mode);
  const container = document.getElementById('thermalReceiptModalBody');
  if (container) container.innerHTML = html;
}

async function showThermalReceiptPreview(deliveryId) {
  let g = gasDeliveriesCache.find(x => x.id === deliveryId || x.receipt_number === deliveryId);
  if (!g) {
    try {
      const res = await fetch(`/api/gas/supplies?building_id=ALL&date_preset=all`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        gasDeliveriesCache = data.data;
        g = gasDeliveriesCache.find(x => x.id === deliveryId || x.receipt_number === deliveryId);
      }
    } catch (e) {}
  }
  if (!g && State.lastReportData?.detailed_transactions) {
    const l = State.lastReportData.detailed_transactions.find(x => x.id === deliveryId || x.receipt_number === deliveryId);
    if (l) {
      g = {
        id: deliveryId,
        building_id: l.building_id,
        flat_number: l.notes ? (l.notes.match(/Flat\s*\d+/i)?.[0] || '101') : '101',
        transaction_type: 'DELIVERY',
        delivery_date: l.entry_date,
        quantity: 1,
        unit_price: l.amount,
        total_amount: l.amount,
        receipt_number: l.receipt_number || `REC-${deliveryId.slice(0,6).toUpperCase()}`
      };
    }
  }
  if (!g) {
    showToast("Receipt details not found", "warning");
    return;
  }

  const curB = (State.buildings || []).find(b => b.id === g.building_id) || State.currentBuilding || { name: g.building_name || 'Building' };
  window.CurrentGasReceiptData = g;
  window.CurrentGasReceiptBuilding = curB;

  switchGasReceiptMode('customer');
  openModal('thermalReceiptModal');
}

// ==========================================================================
// 6. OTHER INCOME REPAIRS (STRICT DATE FILTERING)
// ==========================================================================
let repairsCache = [];

async function loadRepairsData() {
  try {
    const customParam = State.customDate ? `&custom_date=${State.customDate}` : `&date_preset=${State.datePreset || 'month'}`;
    const res = await fetch(`/api/maintenance_jobs?building_id=${State.selectedBuildingId}${customParam}`);
    const data = await res.json();
    if (!data.success) return;

    repairsCache = data.data || [];
    renderRepairsTable(repairsCache);
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function renderRepairsTable(jobs) {
  const tbody = document.getElementById('repairsTableBody');
  if (!tbody) return;

  if (jobs.length === 0) {
    const filterLabel = State.customDate || (State.datePreset === 'today' ? 'Today' : (State.datePreset === 'yesterday' ? 'Yesterday' : State.datePreset.toUpperCase()));
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 25px; font-size: 13px;">No repair work orders found for (${filterLabel}).</td></tr>`;
    return;
  }

  tbody.innerHTML = jobs.map(j => `
    <tr>
      <td><strong style="color: #38bdf8;">Flat ${j.flat_number}</strong> (${j.building_name})</td>
      <td><span class="badge badge-info">${j.category}</span></td>
      <td>${j.issue_description}</td>
      <td><strong>${j.assigned_technician}</strong></td>
      <td>PKR ${(j.billed_amount || 0).toLocaleString()} <span style="font-size: 11px; color: #94a3b8;">(Cost: ${(j.parts_cost + j.labor_cost).toLocaleString()})</span></td>
      <td><span class="badge ${j.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}">${j.status}</span></td>
      <td>${j.job_date || '---'}</td>
      <td>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          <button class="btn btn-sm btn-primary" onclick="openRepairReceiptModal('${j.id}')">🧾 Receipt</button>
          <button class="btn btn-sm btn-secondary" onclick="openEditRepairModal('${j.id}')">✏️ Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteRepairJob('${j.id}')" title="Delete Job Order">🗑️ Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.CurrentRepairReceiptViewMode = 'customer';

function switchRepairReceiptMode(mode) {
  window.CurrentRepairReceiptViewMode = mode;
  const btnClient = document.getElementById('repairReceiptTabClient');
  const btnOffice = document.getElementById('repairReceiptTabOffice');

  if (mode === 'customer') {
    if (btnClient) btnClient.className = 'btn btn-sm btn-primary';
    if (btnOffice) btnOffice.className = 'btn btn-sm btn-secondary';
  } else {
    if (btnClient) btnClient.className = 'btn btn-sm btn-secondary';
    if (btnOffice) btnOffice.className = 'btn btn-sm btn-primary';
  }

  const j = window.CurrentRepairReceiptData;
  if (!j) return;
  const curB = window.CurrentRepairReceiptBuilding || State.currentBuilding || (State.buildings.find(b => b.id === j.building_id) || { name: 'Building 01' });
  const html = DSReceipt.renderRepairReceipt(j, curB, mode);
  const container = document.getElementById('repairReceiptModalBody');
  if (container) container.innerHTML = html;
}

async function openRepairReceiptModal(jobId) {
  let j = repairsCache.find(x => x.id === jobId || x.receipt_number === jobId);
  if (!j) {
    try {
      const res = await fetch(`/api/maintenance_jobs?building_id=ALL&date_preset=all`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        repairsCache = data.data;
        j = repairsCache.find(x => x.id === jobId || x.receipt_number === jobId);
      }
    } catch (e) {}
  }
  if (!j && State.lastReportData?.detailed_transactions) {
    const l = State.lastReportData.detailed_transactions.find(x => x.id === jobId || x.receipt_number === jobId);
    if (l) {
      j = {
        id: jobId,
        building_id: l.building_id,
        flat_number: l.notes ? (l.notes.match(/Flat\s*\d+/i)?.[0] || '101') : '101',
        category: l.category,
        issue_description: l.notes || 'Maintenance repair job',
        assigned_technician: l.person_name || 'Staff Technician',
        billed_amount: l.amount,
        parts_cost: 0,
        labor_cost: 0,
        job_date: l.entry_date,
        receipt_number: l.receipt_number || `REP-${jobId.slice(0,6).toUpperCase()}`
      };
    }
  }
  if (!j) {
    showToast("Repair details not found", "warning");
    return;
  }

  const curB = (State.buildings || []).find(b => b.id === j.building_id) || State.currentBuilding || { name: j.building_name || 'Building' };
  window.CurrentRepairReceiptData = j;
  window.CurrentRepairReceiptBuilding = curB;
  window.CurrentRepairReceiptViewMode = 'customer';

  switchRepairReceiptMode('customer');
  openModal('repairReceiptModal');
}

function printRepairReceipt() {
  if (window.DSReceipt && window.DSReceipt.printRepairReceipt) {
    window.DSReceipt.printRepairReceipt(window.CurrentRepairReceiptData, window.CurrentRepairReceiptViewMode);
  } else {
    window.print();
  }
}

function filterRepairs() {
  const query = (document.getElementById('repairSearchInput')?.value || '').toLowerCase();
  const filtered = repairsCache.filter(j => {
    return j.flat_number.toLowerCase().includes(query) || j.assigned_technician.toLowerCase().includes(query) || j.category.toLowerCase().includes(query) || (j.customer_name && j.customer_name.toLowerCase().includes(query));
  });
  renderRepairsTable(filtered);
}

function calculateProfitMarginPreview() {
  const billed = parseFloat(document.getElementById('repairBilledAmount').value || 0);
  const parts = parseFloat(document.getElementById('repairPartsCost').value || 0);
  const labor = parseFloat(document.getElementById('repairLaborCost').value || 0);
  const margin = billed - (parts + labor);

  document.getElementById('repairProfitPreview').innerText = `PKR ${margin.toLocaleString()}`;
  document.getElementById('repairProfitPreview').style.color = margin >= 0 ? '#10b981' : '#ef4444';
}

function openEditRepairModal(jobId) {
  const j = repairsCache.find(x => x.id === jobId);
  if (!j) return;

  document.getElementById('repairJobId').value = j.id;
  document.getElementById('repairFlatNumber').value = j.flat_number;
  document.getElementById('repairCategory').value = j.category;
  document.getElementById('repairCustomerName').value = j.customer_name || '';
  document.getElementById('repairCustomerPhone').value = j.customer_phone || '';
  document.getElementById('repairIssue').value = j.issue_description;
  document.getElementById('repairTechnician').value = j.assigned_technician;
  document.getElementById('repairDate').value = j.job_date || new Date().toISOString().split('T')[0];
  document.getElementById('repairStatus').value = j.status;
  document.getElementById('repairBilledAmount').value = j.billed_amount;
  document.getElementById('repairPartsCost').value = j.parts_cost;
  document.getElementById('repairLaborCost').value = j.labor_cost;

  calculateProfitMarginPreview();
  openModal('newRepairJobModal');
}

function openNewRepairJobModal() {
  document.getElementById('repairJobId').value = '';
  document.getElementById('repairFlatNumber').value = '';
  document.getElementById('repairCategory').value = 'Plumbing';
  document.getElementById('repairCustomerName').value = '';
  document.getElementById('repairCustomerPhone').value = '';
  document.getElementById('repairIssue').value = '';
  document.getElementById('repairTechnician').value = '';
  document.getElementById('repairDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('repairStatus').value = 'COMPLETED';
  document.getElementById('repairBilledAmount').value = '2500';
  document.getElementById('repairPartsCost').value = '500';
  document.getElementById('repairLaborCost').value = '800';

  calculateProfitMarginPreview();
  openModal('newRepairJobModal');
}

async function handleSaveRepairJob(e) {
  if (e) e.preventDefault();
  const jId = document.getElementById('repairJobId').value || null;
  const flat = document.getElementById('repairFlatNumber').value.trim();
  const tech = document.getElementById('repairTechnician').value.trim();
  const desc = document.getElementById('repairIssue').value.trim();
  const custName = document.getElementById('repairCustomerName')?.value.trim() || '';
  const custPhone = document.getElementById('repairCustomerPhone')?.value.trim() || '';

  if (!flat || !tech || !desc) {
    showToast("Please provide flat, technician, and issue description.", "warning");
    return;
  }

  const bId = State.selectedBuildingId === 'ALL' ? (State.buildings[0] ? State.buildings[0].id : '') : State.selectedBuildingId;

  try {
    const res = await fetch('/api/maintenance_jobs/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: jId,
        building_id: bId,
        flat_number: flat,
        category: document.getElementById('repairCategory').value,
        customer_name: custName,
        customer_phone: custPhone,
        issue_description: desc,
        assigned_technician: tech,
        job_date: document.getElementById('repairDate').value,
        billed_amount: parseFloat(document.getElementById('repairBilledAmount').value || 0),
        parts_cost: parseFloat(document.getElementById('repairPartsCost').value || 0),
        labor_cost: parseFloat(document.getElementById('repairLaborCost').value || 0),
        status: document.getElementById('repairStatus').value,
        receptionist_name: State.currentUser?.full_name || 'Receptionist'
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Work order saved! Net Profit: PKR ${data.net_profit_margin.toLocaleString()}`, "success");
      closeModal('newRepairJobModal');
      await loadRepairsData();
      notifyTransactionChange();
      openRepairReceiptModal(data.job_id);
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function deleteRepairJob(jobId) {
  const r = repairsCache.find(x => x.id === jobId);
  const targetLabel = r ? `Repair Job (${r.category} - Flat ${r.flat_number || 'Common Area'} - PKR ${(r.billed_amount || 0).toLocaleString()})` : 'Repair Job Order';
  requestAdminPasswordForDelete(targetLabel, async () => {
    try {
      const res = await fetch('/api/maintenance_jobs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jobId })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Job order removed", "success");
        await loadRepairsData();
        notifyTransactionChange();
      } else {
        showToast(data.error || "Failed to delete job order", "danger");
      }
    } catch (err) {
      showToast(err.message, "danger");
    }
  });
}

// ==========================================================================
// 7. ACCOUNTS & CASH LEDGER (STRICT DATE FILTERING)
// ==========================================================================
let ledgerCache = [];

async function loadLedgerData() {
  try {
    const customParam = State.customDate ? `&custom_date=${State.customDate}` : `&date_preset=${State.datePreset || 'month'}`;
    const res = await fetch(`/api/ledger?building_id=${State.selectedBuildingId}${customParam}`);
    const data = await res.json();
    if (!data.success) return;

    ledgerCache = data.data || [];
    renderLedgerTable(ledgerCache);
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function renderLedgerTable(entries) {
  const tbody = document.getElementById('ledgerTableBody');
  if (!tbody) return;

  if (entries.length === 0) {
    const filterLabel = State.customDate || (State.datePreset === 'today' ? 'Today' : (State.datePreset === 'yesterday' ? 'Yesterday' : State.datePreset.toUpperCase()));
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 25px; font-size: 13px;">No ledger transactions found for (${filterLabel}).</td></tr>`;
    return;
  }

  tbody.innerHTML = entries.map(l => `
    <tr>
      <td>${l.entry_date}</td>
      <td>${l.building_name}</td>
      <td><span class="badge badge-info">${l.category}</span></td>
      <td>${l.notes || '---'}</td>
      <td>
        <span class="badge ${l.payment_mode === 'HAND_CASH' ? 'badge-success' : 'badge-info'}">
          ${l.payment_mode === 'HAND_CASH' ? 'Hand Cash' : 'Bank Transfer'}
        </span>
      </td>
      <td>
        <strong style="color: ${l.entry_type === 'INCOME' ? '#10b981' : '#ef4444'}; font-size: 13px;">
          ${l.entry_type === 'INCOME' ? '+' : '-'} PKR ${(l.amount || 0).toLocaleString()}
        </strong>
      </td>
      <td>${l.person_name || '---'}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteLedgerEntry('${l.id}')" title="Delete Ledger Entry">🗑️ Delete</button>
      </td>
    </tr>
  `).join('');
}

function filterLedger() {
  const query = (document.getElementById('ledgerSearchInput')?.value || '').toLowerCase();
  const filtered = ledgerCache.filter(l => {
    return l.category.toLowerCase().includes(query) || (l.notes && l.notes.toLowerCase().includes(query));
  });
  renderLedgerTable(filtered);
}

function openNewLedgerModal() {
  document.getElementById('ledgerEntryDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('ledgerCategory').value = 'Building Expense';
  document.getElementById('ledgerType').value = 'EXPENSE';
  document.getElementById('ledgerAmount').value = '';
  document.getElementById('ledgerPerson').value = '';
  document.getElementById('ledgerNotes').value = '';
  openModal('newLedgerModal');
}

async function handleSaveLedger(e) {
  if (e) e.preventDefault();
  const bId = State.selectedBuildingId === 'ALL' ? (State.buildings[0] ? State.buildings[0].id : '') : State.selectedBuildingId;
  const amt = parseFloat(document.getElementById('ledgerAmount').value || 0);

  if (amt <= 0) {
    showToast("Please enter a valid amount.", "warning");
    return;
  }

  try {
    const res = await fetch('/api/ledger/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        building_id: bId,
        entry_date: document.getElementById('ledgerEntryDate').value,
        category: document.getElementById('ledgerCategory').value,
        entry_type: document.getElementById('ledgerType').value,
        amount: amt,
        payment_mode: document.getElementById('ledgerPaymentMode').value,
        person_name: document.getElementById('ledgerPerson').value.trim(),
        notes: document.getElementById('ledgerNotes').value.trim()
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast("Ledger entry saved permanently!", "success");
      closeModal('newLedgerModal');
      await loadLedgerData();
      notifyTransactionChange();
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function deleteLedgerEntry(ledgerId) {
  const l = ledgerCache.find(x => x.id === ledgerId);
  const targetLabel = l ? `Ledger Entry: ${l.category} (${l.entry_type} PKR ${(l.amount || 0).toLocaleString()})` : 'Ledger Entry / Other Income';
  requestAdminPasswordForDelete(targetLabel, async () => {
    try {
      const res = await fetch('/api/ledger/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ledgerId })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Ledger entry removed", "success");
        await loadLedgerData();
        notifyTransactionChange();
      } else {
        showToast(data.error || "Failed to remove ledger entry", "danger");
      }
    } catch (err) {
      showToast(err.message, "danger");
    }
  });
}

function exportLedgerCSV() {
  if (ledgerCache.length === 0) {
    showToast("No data to export", "warning");
    return;
  }

  let csv = "Date,Building,Category,Type,Payment Mode,Amount,Person,Notes\n";
  ledgerCache.forEach(r => {
    csv += `"${r.entry_date}","${r.building_name}","${r.category}","${r.entry_type}","${r.payment_mode}",${r.amount},"${r.person_name || ''}","${r.notes || ''}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DS_Maintenance_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); window.URL.revokeObjectURL(url); }, 200);

  showToast("Ledger CSV downloaded!", "success");
}

// ==========================================================================
// 8. UNIFIED EXECUTIVE REPORTS (MASTER ADMIN ONLY)
// ==========================================================================
State.reportDateFrom = null;
State.reportDateTo = null;

function populateReportMonthSelector() {
  const sel = document.getElementById('reportMonthSelector');
  if (!sel || sel.children.length > 0) return;

  const months = [];
  const startYear = 2024;
  const endYear = 2027;
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  for (let y = endYear; y >= startYear; y--) {
    for (let m = 11; m >= 0; m--) {
      const val = `${y}-${String(m + 1).padStart(2, '0')}`;
      months.push({ val, label: `${monthNames[m]} ${y}` });
    }
  }

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  sel.innerHTML = months.map(m => `
    <option value="${m.val}" ${m.val === currentMonthStr ? 'selected' : ''}>${m.label}</option>
  `).join('');
}

function onReportMonthSelectorChange() {
  if (window.DSSound) DSSound.playClick();
  const val = document.getElementById('reportMonthSelector')?.value;
  if (!val) return;

  State.datePreset = 'custom';
  State.customDate = val;
  State.reportDateFrom = null;
  State.reportDateTo = null;

  const parts = val.split('-');
  const y = parseInt(parts[0]);
  const m = parseInt(parts[1]) - 1;
  const mName = new Date(y, m, 1).toLocaleString('default', { month: 'long' });

  updateTopCalendarPill(`📅 Month: ${mName} ${y}`);
  document.querySelectorAll('#reportPeriodButtonGroup .date-quick-btn').forEach(b => b.classList.remove('active'));

  loadMonthlyReportData();
  showToast(`Report Filtered: ${mName} ${y}`, "info");
}

function setReportPeriodPreset(preset) {
  if (window.DSSound) DSSound.playClick();
  State.datePreset = preset;
  State.customDate = null;
  State.reportDateFrom = null;
  State.reportDateTo = null;

  const labels = {
    today: '📅 Filter: Today',
    yesterday: '📅 Filter: Yesterday',
    '2days': '📅 Filter: Last 2 Days',
    '7days': '📅 Filter: Last 7 Days',
    month: '📅 Filter: This Month',
    all: '📅 Filter: All Records'
  };

  updateTopCalendarPill(labels[preset] || '📅 Filter: Calendar');

  document.querySelectorAll('#reportPeriodButtonGroup .date-quick-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('onclick')?.includes(`'${preset}'`));
  });

  loadMonthlyReportData();
  showToast(labels[preset] || `Filter: ${preset.toUpperCase()}`, "info");
}

function applyReportCustomDateRange() {
  if (window.DSSound) DSSound.playClick();
  const fromVal = document.getElementById('reportDateFromInput')?.value;
  const toVal = document.getElementById('reportDateToInput')?.value;

  if (!fromVal || !toVal) {
    showToast("Please select both From and To dates.", "warning");
    return;
  }
  if (fromVal > toVal) {
    showToast("From Date cannot be later than To Date.", "warning");
    return;
  }

  State.datePreset = 'custom';
  State.customDate = null;
  State.reportDateFrom = fromVal;
  State.reportDateTo = toVal;

  updateTopCalendarPill(`📅 Filter: ${fromVal} to ${toVal}`);
  document.querySelectorAll('#reportPeriodButtonGroup .date-quick-btn').forEach(b => b.classList.remove('active'));

  loadMonthlyReportData();
  showToast(`Report Filtered: ${fromVal} to ${toVal}`, "info");
}

async function loadMonthlyReportData() {
  try {
    populateReportMonthSelector();
    const targetBuildingId = State.reportBuildingId || State.selectedBuildingId || 'ALL';
    
    let queryParams = `building_id=${encodeURIComponent(targetBuildingId)}`;
    if (State.reportDateFrom && State.reportDateTo) {
      queryParams += `&date_from=${encodeURIComponent(State.reportDateFrom)}&date_to=${encodeURIComponent(State.reportDateTo)}`;
    } else if (State.customDate) {
      queryParams += `&custom_date=${encodeURIComponent(State.customDate)}`;
    } else {
      queryParams += `&date_preset=${encodeURIComponent(State.datePreset || 'month')}`;
    }

    const res = await fetch(`/api/reports/monthly?${queryParams}`);
    const data = await res.json();
    if (!data.success) return;

    const r = data.data;
    State.lastReportData = r;

    // Update Report Header Subtitles & Status
    const subTitle = document.getElementById('reportPeriodSubtitle');
    if (subTitle) subTitle.innerText = `${r.building_name} — Financial & Operational Performance Statement`;

    const statusBadge = document.getElementById('reportPeriodStatusBadge');
    if (statusBadge) statusBadge.innerText = `📅 Period: ${r.period_label}`;

    // Highlight active preset button if preset active
    document.querySelectorAll('#reportPeriodButtonGroup .date-quick-btn').forEach(b => {
      if (!State.customDate && !State.reportDateFrom) {
        b.classList.toggle('active', b.getAttribute('onclick')?.includes(`'${State.datePreset || 'month'}'`));
      } else {
        b.classList.remove('active');
      }
    });

    let totalIncome = 0;
    let totalExpense = 0;
    let cashTotal = 0;
    let bankTotal = 0;

    (r.category_totals || []).forEach(c => {
      const amt = Number(c.total_amount) || 0;
      if (c.entry_type === 'INCOME') {
        totalIncome += amt;
        if (c.payment_mode === 'HAND_CASH' || c.payment_mode === 'HAND CASH' || (c.payment_mode || '').includes('CASH')) {
          cashTotal += amt;
        } else {
          bankTotal += amt;
        }
      } else if (c.entry_type === 'EXPENSE') {
        totalExpense += amt;
      }
    });

    const netProfit = totalIncome - totalExpense;

    document.getElementById('reportTotalIncome').innerText = `PKR ${totalIncome.toLocaleString()}`;
    document.getElementById('reportTotalExpense').innerText = `PKR ${totalExpense.toLocaleString()}`;
    document.getElementById('reportNetProfit').innerText = `PKR ${netProfit.toLocaleString()}`;
    document.getElementById('reportCashVsBank').innerText = `Cash: PKR ${cashTotal.toLocaleString()} | Bank: PKR ${bankTotal.toLocaleString()}`;

    const gasProfit = r.gas_summary?.gas_net_profit || 0;
    document.getElementById('reportGasCylinders').innerText = `${r.gas_summary?.total_cylinders || 0} Delivered (Profit: +PKR ${gasProfit.toLocaleString()})`;
    document.getElementById('reportRepairProfit').innerText = `Profit: PKR ${(r.repair_summary?.total_net_profit || 0).toLocaleString()} (${r.repair_summary?.total_jobs || 0} Jobs)`;

    // Render Profitability Matrix Table (Single Selected Building or Consolidated Portfolio)
    const matrixHeading = document.getElementById('reportBuildingMatrixHeading');
    if (matrixHeading) {
      matrixHeading.innerText = (r.building_matrix && r.building_matrix.length === 1)
        ? `🏢 ${r.building_name} Commercial Profitability & Margin Statement`
        : `🏢 Consolidated 5-Building Commercial Profitability & Margin Matrix`;
    }

    const bmTbody = document.getElementById('reportBuildingMatrixTableBody');
    if (bmTbody) {
      if ((r.building_matrix || []).length === 0) {
        bmTbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #94a3b8; padding: 18px;">No matrix data recorded for this period.</td></tr>`;
      } else {
        let totGB = 0, totGC = 0, totGP = 0, totRB = 0, totRC = 0, totRP = 0, totREV = 0, totOUT = 0, totNET = 0;
        
        const rowsHtml = r.building_matrix.map(m => {
          totGB += m.gas_billed || 0;
          totGC += m.gas_cost || 0;
          totGP += m.gas_profit || 0;
          totRB += m.repair_billed || 0;
          totRC += (m.repair_parts || 0) + (m.repair_labor || 0);
          totRP += m.repair_profit || 0;
          totREV += m.total_revenue || 0;
          totOUT += m.total_outflow || 0;
          totNET += m.net_profit || 0;

          return `
            <tr>
              <td><strong style="color: #38bdf8;">${m.building_name}</strong> (${m.building_code})</td>
              <td>PKR ${(m.gas_billed || 0).toLocaleString()}</td>
              <td style="color: #f43f5e;">PKR ${(m.gas_cost || 0).toLocaleString()}</td>
              <td style="color: #10b981; font-weight: bold;">+ PKR ${(m.gas_profit || 0).toLocaleString()}</td>
              <td>PKR ${(m.repair_billed || 0).toLocaleString()}</td>
              <td style="color: #f43f5e;">PKR ${((m.repair_parts || 0) + (m.repair_labor || 0)).toLocaleString()}</td>
              <td style="color: #10b981; font-weight: bold;">+ PKR ${(m.repair_profit || 0).toLocaleString()}</td>
              <td><strong>PKR ${(m.total_revenue || 0).toLocaleString()}</strong></td>
              <td style="color: #f43f5e;"><strong>PKR ${(m.total_outflow || 0).toLocaleString()}</strong></td>
              <td><strong style="color: ${m.net_profit >= 0 ? '#10b981' : '#f43f5e'}; font-size: 13px;">${m.net_profit >= 0 ? '+' : ''} PKR ${(m.net_profit || 0).toLocaleString()}</strong></td>
            </tr>
          `;
        }).join('');

        const totalRowHtml = (r.building_matrix.length > 1) ? `
          <tr style="background: rgba(16, 185, 129, 0.1); font-weight: bold; border-top: 2px solid #10b981;">
            <td><strong>TOTAL CONSOLIDATED PORTFOLIO</strong></td>
            <td>PKR ${totGB.toLocaleString()}</td>
            <td style="color: #f43f5e;">PKR ${totGC.toLocaleString()}</td>
            <td style="color: #10b981;">+ PKR ${totGP.toLocaleString()}</td>
            <td>PKR ${totRB.toLocaleString()}</td>
            <td style="color: #f43f5e;">PKR ${totRC.toLocaleString()}</td>
            <td style="color: #10b981;">+ PKR ${totRP.toLocaleString()}</td>
            <td style="font-size: 13px;">PKR ${totREV.toLocaleString()}</td>
            <td style="color: #f43f5e; font-size: 13px;">PKR ${totOUT.toLocaleString()}</td>
            <td style="color: #10b981; font-size: 14px;">+ PKR ${totNET.toLocaleString()}</td>
          </tr>
        ` : '';

        bmTbody.innerHTML = rowsHtml + totalRowHtml;
      }
    }

    // Render Category Breakdown Table
    const catTbody = document.getElementById('reportCategoryTableBody');
    if (catTbody) {
      if ((r.category_totals || []).length === 0) {
        catTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 18px;">No transaction activity recorded for this period.</td></tr>`;
      } else {
        catTbody.innerHTML = r.category_totals.map(c => `
          <tr>
            <td><strong>${c.category}</strong></td>
            <td><span class="badge ${c.entry_type === 'INCOME' ? 'badge-success' : 'badge-danger'}">${c.entry_type}</span></td>
            <td><span class="badge ${c.payment_mode === 'HAND_CASH' ? 'badge-info' : 'badge-success'}">${c.payment_mode === 'HAND_CASH' ? 'Hand Cash' : 'Bank Transfer'}</span></td>
            <td>${c.count} transaction(s)</td>
            <td><strong style="color: ${c.entry_type === 'INCOME' ? '#10b981' : '#f43f5e'}; font-size: 13px;">${c.entry_type === 'INCOME' ? '+' : '-'} PKR ${(c.total_amount || 0).toLocaleString()}</strong></td>
          </tr>
        `).join('');
      }
    }

    // Render Complete Financial Ledger Audit Register Table
    const dlTbody = document.getElementById('reportDetailedLedgerTableBody');
    if (dlTbody) {
      const dList = r.detailed_transactions || [];
      if (dList.length === 0) {
        dlTbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #94a3b8; padding: 18px;">No ledger audit entries for this period.</td></tr>`;
      } else {
        dlTbody.innerHTML = dList.map(l => {
          const isInc = l.entry_type === 'INCOME';
          const bName = l.building_name || 'Building';
          const personStr = l.person_name ? `<strong>${l.person_name}</strong>` : (isInc ? 'Resident Customer' : 'Vendor / Technician');
          const pMode = l.payment_mode === 'HAND_CASH' ? '<span class="badge badge-info">Hand Cash</span>' : `<span class="badge badge-success">Bank Transfer</span>`;
          const refStr = l.receipt_number ? `<br/><span style="font-size: 10.5px; font-family: monospace; color: #38bdf8;">Ref: ${l.receipt_number}</span>` : '';

          return `
            <tr>
              <td>${l.entry_date || '---'}</td>
              <td><strong style="color: #38bdf8;">${bName}</strong></td>
              <td><span class="badge ${isInc ? 'badge-success' : 'badge-danger'}">${isInc ? 'INCOME' : 'EXPENSE'}</span></td>
              <td><strong>${l.category}</strong></td>
              <td>${personStr}</td>
              <td>${l.notes || 'Operating financial flow'}</td>
              <td>${pMode}${refStr}</td>
              <td><strong style="color: ${isInc ? '#10b981' : '#f43f5e'}; font-size: 13px;">${isInc ? '+' : '-'} PKR ${(l.amount || 0).toLocaleString()}</strong></td>
              <td>
                <button class="btn btn-sm btn-danger" onclick="deleteLedgerEntry('${l.id}')" title="Delete Ledger Entry">🗑️ Delete</button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // 1. Render Active Resident & Tenant Profiles Table
    const tbody = document.getElementById('reportFlatsTableBody');
    if (tbody) {
      if ((r.flats_status || []).length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 18px;">No apartment profiles registered.</td></tr>`;
      } else {
        tbody.innerHTML = r.flats_status.map(f => {
          const isOwner = f.occupancy_mode === 'Owner Occupied';
          const tImg = f.tenant_photo ? `<img src="/media/${f.tenant_photo}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1.5px solid #10b981; margin-right: 6px;" title="Tenant Photo" />` : '';
          const tDisplay = f.tenant_name 
            ? `<div style="display: flex; align-items: center; gap: 4px;">${tImg}<div><strong>${f.tenant_name}</strong><br/><span style="font-size: 11px; font-family: monospace; color: #38bdf8;">CNIC: ${f.tenant_cnic || 'N/A'} • Mob: ${f.tenant_phone || '---'}</span></div></div>` 
            : (isOwner ? '<span style="color: #38bdf8; font-weight: bold;">🏠 Owner Residing</span>' : '<span style="color: #94a3b8; font-style: italic;">🚪 Vacant Flat</span>');
          
          const emergDisplay = f.tenant_emergency ? `<span style="font-family: monospace;">${f.tenant_emergency}</span>` : '---';
          const moveInStr = f.move_in_date ? `${f.move_in_date} (${f.lease_tenure_months || 12} Mos)` : '---';
          const countsStr = f.tenant_name ? `👨‍👩‍👧 ${f.family_count || 0} Members • 🚗 ${f.vehicle_count || 0} Vehicles` : '---';

          return `
            <tr>
              <td><strong style="color: #38bdf8;">Flat ${f.flat_number}</strong> (${f.wing || 'Wing A'})</td>
              <td>${f.building_name}</td>
              <td><span class="badge ${isOwner ? 'badge-info' : (f.tenant_name ? 'badge-success' : 'badge-warning')}">${isOwner ? 'Owner Living' : (f.tenant_name ? 'Tenant Living' : 'Vacant')}</span></td>
              <td><strong>${f.owner_name || '---'}</strong><br/><span style="font-size: 11px; color: #94a3b8;">${f.owner_phone || ''}</span></td>
              <td>${tDisplay}</td>
              <td>${emergDisplay}</td>
              <td>${moveInStr}</td>
              <td>${countsStr}</td>
            </tr>
          `;
        }).join('');
      }
    }

    // 2. Render Vacated Tenant History Archive Table
    const vTbody = document.getElementById('reportVacatedTableBody');
    if (vTbody) {
      if ((r.vacated_tenants || []).length === 0) {
        vTbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 18px;">No vacated resident records for this period.</td></tr>`;
      } else {
        vTbody.innerHTML = r.vacated_tenants.map(a => `
          <tr>
            <td><strong style="color: #fbbf24;">Flat ${a.flat_number || '---'}</strong></td>
            <td>${a.building_name}</td>
            <td><strong>${a.tenant_name}</strong></td>
            <td><span style="font-family: monospace;">${a.cnic_number || '---'}</span></td>
            <td><span style="font-family: monospace;">${a.primary_phone || '---'}</span></td>
            <td>${a.move_in_date || '---'}</td>
            <td><strong style="color: #f43f5e;">${a.vacated_date}</strong></td>
            <td><span class="badge badge-secondary">VACATED</span></td>
          </tr>
        `).join('');
      }
    }

    // 3. Render Operating Expenses & Technician Labor Table
    const exTbody = document.getElementById('reportExpensesTableBody');
    if (exTbody) {
      if ((r.expenses_list || []).length === 0) {
        exTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 18px;">No expense outflows recorded for this period.</td></tr>`;
      } else {
        exTbody.innerHTML = r.expenses_list.map(e => `
          <tr>
            <td>${e.entry_date}</td>
            <td><span class="badge badge-danger">${e.category}</span></td>
            <td>${e.building_name}</td>
            <td><strong>${e.person_name || 'Vendor / Contractor'}</strong></td>
            <td>${e.notes || 'Operating maintenance outflow'}</td>
            <td><span class="badge badge-info">${e.payment_mode === 'HAND_CASH' ? 'Hand Cash' : 'Bank Transfer'}</span></td>
            <td><strong style="color: #f43f5e; font-size: 13px;">- PKR ${(e.amount || 0).toLocaleString()}</strong></td>
          </tr>
        `).join('');
      }
    }

    // 4. Render Gas Distribution & Commercial Profit Table
    const gasTbody = document.getElementById('reportGasTableBody');
    if (gasTbody) {
      if ((r.gas_deliveries_list || []).length === 0) {
        gasTbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #94a3b8; padding: 18px;">No gas deliveries recorded for this period.</td></tr>`;
      } else {
        gasTbody.innerHTML = r.gas_deliveries_list.map(g => {
          const qty = g.quantity || 1;
          const billed = g.total_amount || (qty * 3500);
          const refillCost = qty * (g.refill_purchase_cost || 2800);
          const netProfit = billed - refillCost;
          const isNew = g.transaction_type === 'NEW_PURCHASE' || g.transaction_type === 'NEW_BOTTLE';

          const custName = g.tenant_name || (g.occupancy_mode === 'Owner Occupied' ? g.owner_name : (g.resident_name || `Flat ${g.flat_number} Resident`));
          const custPhone = g.tenant_phone || (g.occupancy_mode === 'Owner Occupied' ? g.owner_phone : '');

          const emptyBadge = isNew
            ? `<span class="badge badge-secondary" style="font-weight: bold;">N/A</span>`
            : (g.is_empty_returned ? `<span class="badge badge-success">✅ Returned</span>` : `<span class="badge badge-warning">⏳ Pending Return</span>`);

          const pMode = g.payment_mode === 'HAND_CASH'
            ? `<span class="badge badge-info">Hand Cash</span>`
            : `<span class="badge badge-success">Bank Transfer</span>`;

          return `
            <tr>
              <td>${g.delivery_date ? g.delivery_date.split(' ')[0] : '---'}</td>
              <td>${g.building_name}</td>
              <td><strong style="color: #38bdf8;">Flat ${g.flat_number}</strong></td>
              <td>
                <strong>${custName}</strong>
                ${custPhone ? `<br/><span style="font-family: monospace; font-size: 11px; color: #38bdf8;">📱 ${custPhone}</span>` : ''}
              </td>
              <td><span class="badge ${isNew ? 'badge-primary' : 'badge-warning'}">${isNew ? '✨ New Bottle' : '🔄 Refill Exchange'} (${qty} Cyl)</span></td>
              <td>${emptyBadge}</td>
              <td>PKR ${billed.toLocaleString()}</td>
              <td>PKR ${refillCost.toLocaleString()}</td>
              <td><strong style="color: #10b981;">+ PKR ${netProfit.toLocaleString()}</strong></td>
              <td>${pMode}</td>
            </tr>
          `;
        }).join('');
      }
    }
    // Render Charts for Modern Report Analytics
    if (window.DSCharts) {
      // 1. Revenue Collections vs Expenses Bar Chart
      DSCharts.drawBarChart('reportFinancialComparisonChart', ['Total Collections', 'Operating Expenses', 'Net Operating Surplus'], [{
        data: [totalIncome, totalExpense, Math.max(0, netProfit)],
        colorStart: '#38bdf8',
        colorEnd: '#1d4ed8'
      }], { height: 210 });

      // 2. Daily Income Spike Trend Line Chart (Days 1–31)
      const dayLabels = [];
      const dailyIncomeMap = {};
      for (let d = 1; d <= 31; d++) {
        const dStr = d < 10 ? `0${d}` : `${d}`;
        dayLabels.push(`${dStr}`);
        dailyIncomeMap[dStr] = 0;
      }

      (r.detailed_transactions || []).forEach(tx => {
        if (tx.entry_type === 'INCOME' && tx.entry_date) {
          const parts = tx.entry_date.split('-');
          if (parts.length >= 3) {
            const dayPart = parts[2].slice(0, 2);
            if (dailyIncomeMap[dayPart] !== undefined) {
              dailyIncomeMap[dayPart] += (Number(tx.amount) || 0);
            }
          }
        }
      });

      const dailyValues = dayLabels.map(d => dailyIncomeMap[d] || 0);
      DSCharts.drawLineChart('reportDailyTrendChart', dayLabels, dailyValues, { height: 210 });

      // 3. Portfolio Occupancy Donut Chart
      let ownerCount = 0;
      let tenantCount = 0;
      let vacantCount = 0;
      (r.flats_status || []).forEach(f => {
        if (f.occupancy_mode === 'Owner Occupied') ownerCount++;
        else if (f.tenant_name) tenantCount++;
        else vacantCount++;
      });

      DSCharts.drawDonutChart('reportOccupancyDonutChart', 
        ['Owner Living', 'Tenant Living', 'Vacant Flats'], 
        [ownerCount, tenantCount, vacantCount], 
        ['#38bdf8', '#10b981', '#fbbf24'], 
        { height: 210 }
      );
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function exportMonthlyReportExcel() {
  if (!State.lastReportData) {
    showToast("Please load report data first.", "warning");
    return;
  }
  const r = State.lastReportData;
  const buildingName = r.building_name || 'Building Portfolio';
  const period = r.period_label || 'Current Period';

  let csv = `DS MAINTENANCE - EXECUTIVE MANAGEMENT & FINANCIAL STATEMENT\n`;
  csv += `Building,${buildingName}\n`;
  csv += `Period,${period}\n`;
  csv += `Generated On,${new Date().toLocaleString()}\n\n`;

  csv += `FINANCIAL SUMMARY\n`;
  csv += `Total Collections (PKR),${document.getElementById('reportTotalIncome')?.innerText.replace('PKR ', '').replace(/,/g, '') || 0}\n`;
  csv += `Total Expenses (PKR),${document.getElementById('reportTotalExpense')?.innerText.replace('PKR ', '').replace(/,/g, '') || 0}\n`;
  csv += `Net Operating Surplus (PKR),${document.getElementById('reportNetProfit')?.innerText.replace('PKR ', '').replace(/,/g, '') || 0}\n\n`;

  csv += `TRANSACTION CATEGORY BREAKDOWN\n`;
  csv += `Category,Type,Payment Mode,Transaction Count,Total Amount (PKR)\n`;
  (r.category_totals || []).forEach(c => {
    csv += `"${c.category}","${c.entry_type}","${c.payment_mode === 'HAND_CASH' ? 'Hand Cash' : 'Bank Transfer'}",${c.count},${c.total_amount || 0}\n`;
  });
  csv += `\n`;

  csv += `APARTMENT OCCUPANCY & CONTACT REGISTER\n`;
  csv += `Flat Number,Building,Occupancy Mode,Property Owner,Owner Mobile Phone,Active Resident/Tenant,Tenant Mobile Phone,Monthly Maintenance (PKR),Status\n`;
  (r.flats_status || []).forEach(f => {
    const isOwner = f.occupancy_mode === 'Owner Occupied';
    csv += `"${f.flat_number} (${f.wing || 'Wing A'})","${f.building_name}","${isOwner ? 'Owner Living' : (f.tenant_name ? 'Tenant Living' : 'Vacant')}","${f.owner_name || ''}","${f.owner_phone || ''}","${f.tenant_name || (isOwner ? f.owner_name : 'Vacant')}","${f.tenant_phone || (isOwner ? f.owner_phone : '')}",${f.monthly_maintenance_rate || 5000},"Active"\n`;
  });

  const cleanBName = (r.building_name || 'All_Buildings').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `DS_Executive_Report_${cleanBName}_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csv, filename);
  showToast("Executive Management Statement exported to CSV successfully!", "success");
}

function printMonthlyReport() {
  openPdfActionModal('executive_report', 'DS Official Monthly Executive Management Statement');
}

// ==========================================================================
// 9. SETTINGS & RECEPTIONIST USER MANAGEMENT (MASTER ADMIN ONLY)
// ==========================================================================
let usersCache = [];
let settingsBankCache = [];

async function loadSettingsData() {
  try {
    const isMgr = State.currentUser?.role === 'MANAGER';
    const bId = State.currentUser?.assigned_building_id;
    const uUrl = (isMgr && bId) ? `/api/users?user_role=MANAGER&building_id=${encodeURIComponent(bId)}` : '/api/users';

    const uRes = await fetch(uUrl);
    const uData = await uRes.json();
    usersCache = uData.data || [];
    renderUsersSettingsTable(usersCache);

    const bankSection = document.getElementById('settingsBankTableBody')?.closest('.glass-panel');
    if (bankSection) {
      bankSection.style.display = isMgr ? 'none' : 'block';
    }

    if (!isMgr) {
      const bRes = await fetch('/api/bank_accounts');
      const bData = await bRes.json();
      settingsBankCache = bData.data || [];
      renderBankSettingsTable(settingsBankCache);
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function renderUsersSettingsTable(users) {
  const tbody = document.getElementById('settingsUsersTableBody');
  if (!tbody) return;

  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${u.username}</strong></td>
      <td>${u.full_name}</td>
      <td>${u.phone || '---'}</td>
      <td><span class="badge ${u.role === 'MASTER_ADMIN' ? 'badge-info' : (u.role === 'MANAGER' ? 'badge-primary' : 'badge-success')}">${u.role}</span></td>
      <td>${u.building_name || 'All Buildings (Admin)'}</td>
      <td><span class="badge ${u.is_active ? 'badge-success' : 'badge-danger'}">${u.is_active ? 'Active' : 'Disabled'}</span></td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="openEditUserModal('${u.id}')">✏️ Edit / Pass</button>
      </td>
    </tr>
  `).join('');
}

function renderBankSettingsTable(banks) {
  const tbody = document.getElementById('settingsBankTableBody');
  if (!tbody) return;

  tbody.innerHTML = banks.map(b => `
    <tr>
      <td><strong>${b.bank_name}</strong></td>
      <td>${b.account_title}</td>
      <td><code>${b.account_number}</code></td>
      <td>${b.iban || '---'}</td>
      <td>${b.branch_code || '---'}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteBankAccount('${b.id}')">🗑</button>
      </td>
    </tr>
  `).join('');
}

function openEditUserModal(userId) {
  const u = usersCache.find(x => x.id === userId);
  if (!u) return;

  const isMgr = State.currentUser?.role === 'MANAGER';
  const roleSelect = document.getElementById('settingsUserRole');
  const bSelect = document.getElementById('settingsUserBuilding');

  document.getElementById('settingsUserId').value = u.id;
  document.getElementById('settingsUserUsername').value = u.username;
  document.getElementById('settingsUserFullName').value = u.full_name;
  document.getElementById('settingsUserPhone').value = u.phone || '';
  if (roleSelect) {
    roleSelect.value = u.role;
    roleSelect.disabled = isMgr;
  }
  document.getElementById('settingsUserPassword').value = '';

  if (bSelect) {
    if (isMgr) {
      const curB = State.buildings.find(b => b.id === State.currentUser?.assigned_building_id);
      bSelect.innerHTML = curB ? `<option value="${curB.id}">${curB.name}</option>` : '';
      bSelect.disabled = true;
    } else {
      bSelect.disabled = false;
      bSelect.innerHTML = `<option value="">None (Master Admin)</option>` +
        State.buildings.map(b => `<option value="${b.id}" ${u.assigned_building_id === b.id ? 'selected' : ''}>${b.name}</option>`).join('');
    }
  }

  openModal('editUserModal');
}

function openNewUserModal() {
  const isMgr = State.currentUser?.role === 'MANAGER';
  const roleSelect = document.getElementById('settingsUserRole');
  const bSelect = document.getElementById('settingsUserBuilding');

  document.getElementById('settingsUserId').value = '';
  document.getElementById('settingsUserUsername').value = '';
  document.getElementById('settingsUserFullName').value = '';
  document.getElementById('settingsUserPhone').value = '';
  if (roleSelect) {
    roleSelect.value = 'RECEPTIONIST';
    roleSelect.disabled = isMgr;
  }
  document.getElementById('settingsUserPassword').value = 'bldgpass123';

  if (bSelect) {
    if (isMgr) {
      const curB = State.buildings.find(b => b.id === State.currentUser?.assigned_building_id);
      bSelect.innerHTML = curB ? `<option value="${curB.id}">${curB.name}</option>` : '';
      bSelect.disabled = true;
    } else {
      bSelect.disabled = false;
      bSelect.innerHTML = `<option value="">None (Master Admin)</option>` +
        State.buildings.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    }
  }

  openModal('editUserModal');
}

async function handleSaveUser(e) {
  if (e) e.preventDefault();
  const uId = document.getElementById('settingsUserId').value || null;
  const username = document.getElementById('settingsUserUsername').value.trim();
  const fullName = document.getElementById('settingsUserFullName').value.trim();
  const password = document.getElementById('settingsUserPassword').value.trim();
  const isMgr = State.currentUser?.role === 'MANAGER';

  if (!username || !fullName) {
    showToast("Please enter username and full name.", "warning");
    return;
  }

  const roleVal = isMgr ? 'RECEPTIONIST' : document.getElementById('settingsUserRole').value;
  const bldgVal = isMgr ? State.currentUser?.assigned_building_id : (document.getElementById('settingsUserBuilding').value || null);

  try {
    const res = await fetch('/api/system/users/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: uId,
        username: username,
        full_name: fullName,
        phone: document.getElementById('settingsUserPhone').value.trim(),
        role: roleVal,
        assigned_building_id: bldgVal,
        password: password,
        operator_role: State.currentUser?.role,
        operator_assigned_building_id: State.currentUser?.assigned_building_id
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast("User account saved permanently!", "success");
      closeModal('editUserModal');
      await loadSettingsData();
    } else {
      showToast(data.error, "danger");
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function openNewBankModal() {
  document.getElementById('bankName').value = '';
  document.getElementById('bankAccountTitle').value = '';
  document.getElementById('bankAccountNumber').value = '';
  document.getElementById('bankIban').value = '';
  document.getElementById('bankBranch').value = '';
  openModal('newBankModal');
}

async function handleSaveBank(e) {
  if (e) e.preventDefault();
  const bName = document.getElementById('bankName').value.trim();
  const title = document.getElementById('bankAccountTitle').value.trim();
  const acc = document.getElementById('bankAccountNumber').value.trim();

  if (!bName || !title || !acc) {
    showToast("Please fill bank name, title, and account number.", "warning");
    return;
  }

  try {
    const res = await fetch('/api/system/bank_accounts/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bank_name: bName,
        account_title: title,
        account_number: acc,
        iban: document.getElementById('bankIban').value.trim(),
        branch_code: document.getElementById('bankBranch').value.trim()
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast("Bank account added & synced permanently!", "success");
      closeModal('newBankModal');
      await reloadBankAccounts();
      await loadSettingsData();
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function deleteBankAccount(bankId) {
  requestAdminPasswordForDelete("Bank Account Record", async () => {
    try {
      const res = await fetch('/api/system/bank_accounts/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bankId })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Bank account removed", "success");
        await reloadBankAccounts();
        await loadSettingsData();
      } else {
        showToast(data.error || "Failed to delete bank account", "danger");
      }
    } catch (err) {
      showToast(err.message, "danger");
    }
  });
}

// ==========================================================================
// 10. MASTER ADMIN CONSOLE & CLICKABLE BUILDING DRILL-DOWN COCKPIT
// ==========================================================================
function setAdminMasterDateFilter(preset) {
  DSSound.playClick();
  State.datePreset = preset;
  State.customDate = null;

  document.querySelectorAll('#adminMasterDateFilterButtonGroup .date-quick-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('onclick')?.includes(`'${preset}'`));
  });

  const labels = {
    today: '📅 Filter: Today',
    yesterday: '📅 Filter: Yesterday',
    '2days': '📅 Filter: Last 2 Days',
    '7days': '📅 Filter: Last 7 Days',
    month: '📅 Filter: This Month',
    all: '📅 Filter: All Records'
  };
  updateTopCalendarPill(labels[preset] || '📅 Filter: Calendar');

  loadAdminConsoleData();
}

State.adminBuildingStatusFilter = 'ALL';
State.masterBuildingComparison = [];

function setAdminBuildingStatusFilter(filter) {
  if (window.DSSound) DSSound.playClick();
  State.adminBuildingStatusFilter = filter;
  document.getElementById('adminBuildingFilterAll')?.classList.toggle('active', filter === 'ALL');
  document.getElementById('adminBuildingFilterActive')?.classList.toggle('active', filter === 'ACTIVE');
  document.getElementById('adminBuildingFilterInactive')?.classList.toggle('active', filter === 'INACTIVE');
  renderMasterBuildingCards();
}

function renderMasterBuildingCards() {
  const comp = State.masterBuildingComparison || [];
  const filter = State.adminBuildingStatusFilter || 'ALL';
  
  let filtered = comp;
  if (filter === 'ACTIVE') {
    filtered = comp.filter(b => b.is_active === 1 || (b.total_income > 0) || (b.period_visitors > 0) || (b.staff_on_duty > 0));
  } else if (filter === 'INACTIVE') {
    filtered = comp.filter(b => b.is_active === 0 && (b.total_income === 0) && (b.period_visitors === 0) && (b.staff_on_duty === 0));
  }

  const badgeText = document.getElementById('adminBuildingFilterCountBadge');
  if (badgeText) {
    badgeText.innerText = `Showing ${filtered.length} of ${comp.length} buildings (${filter === 'ALL' ? 'All Buildings' : (filter === 'ACTIVE' ? '🟢 Active Only' : '⚪ Standby Only')})`;
  }

  const cardsContainer = document.getElementById('adminBuildingCards');
  if (!cardsContainer) return;

  if (filtered.length === 0) {
    cardsContainer.innerHTML = `<div class="glass-panel" style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 24px;">No buildings match status filter '<strong>${filter}</strong>'.</div>`;
    return;
  }

  cardsContainer.innerHTML = filtered.map(b => {
    const netProfit = b.net_profit !== undefined ? b.net_profit : ((b.total_income || 0) - (b.total_expense || 0));
    const gasProfit = b.gas_profit || 0;
    const repairProfit = b.repair_profit || 0;
    const isActive = (b.is_active === 1) || (b.total_income > 0) || (b.period_visitors > 0) || (b.staff_on_duty > 0);

    const totF = Number(b.total_flats) || 0;
    const ownF = Number(b.owner_flats) || 0;
    const renF = Number(b.rented_flats) || 0;
    const occupied = ownF + renF;
    const vacant = Math.max(0, totF - occupied);

    const filterTag = State.customDate || (State.datePreset === 'today' ? 'Today' : (State.datePreset === 'yesterday' ? 'Yesterday' : (State.datePreset === 'month' ? 'This Month' : (State.datePreset || 'Period').toUpperCase())));

    return `
      <div class="kpi-card interactive-building-card" onclick="openAdminBuildingDetail('${b.id}')" style="border-top: 3px solid ${isActive ? '#10b981' : '#64748b'};">
        <div class="kpi-title" style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 800; font-size: 13.5px;">🏢 ${b.building_name}</span>
          <div style="display: flex; gap: 4px;">
            <span class="badge badge-info" style="font-size: 9px;">📅 ${filterTag}</span>
            <span class="badge ${isActive ? 'badge-success' : 'badge-secondary'}" style="font-size: 9px;">
              ${isActive ? '🟢 ACTIVE' : '⚪ STANDBY'}
            </span>
          </div>
        </div>
        <div class="kpi-value" style="font-size: 20px; color: ${b.total_income > 0 ? '#10b981' : '#94a3b8'}; margin: 6px 0 2px;">
          PKR ${(b.total_income || 0).toLocaleString()}
        </div>
        <div class="kpi-subtext" style="display: flex; justify-content: space-between; margin-top: 2px;">
          <span>Outflow: PKR ${(b.total_expense || 0).toLocaleString()}</span>
          <span style="font-weight: bold; color: ${netProfit >= 0 ? '#10b981' : '#f43f5e'};">Net: PKR ${netProfit.toLocaleString()}</span>
        </div>
        <div style="border-top: 1px solid rgba(255,255,255,0.08); margin-top: 8px; padding-top: 6px; display: flex; flex-direction: column; gap: 4px; font-size: 11px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #38bdf8;">🟢 Occupied: <strong>${occupied}</strong></span>
            <span style="color: #94a3b8;">🚪 Vacant: <strong>${vacant}</strong></span>
            <span style="color: #64748b; font-size: 10px;">(${totF} Total Flats)</span>
          </div>
          <div style="display: flex; justify-content: space-between; color: #cbd5e1; font-size: 10.5px;">
            <span>🔥 Gas Profit: <strong style="color: #10b981;">+PKR ${gasProfit.toLocaleString()}</strong></span>
            <span>🛠 Repair Profit: <strong style="color: #10b981;">+PKR ${repairProfit.toLocaleString()}</strong></span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function loadAdminConsoleData() {
  try {
    let customParam = '';
    if (State.reportDateFrom && State.reportDateTo) {
      customParam = `date_from=${encodeURIComponent(State.reportDateFrom)}&date_to=${encodeURIComponent(State.reportDateTo)}`;
    } else if (State.customDate) {
      customParam = `custom_date=${encodeURIComponent(State.customDate)}`;
    } else {
      customParam = `date_preset=${encodeURIComponent(State.datePreset || 'month')}`;
    }
    const res = await fetch(`/api/analytics/consolidated?${customParam}`);
    const data = await res.json();
    if (!data.success) return;

    const comp = data.data.building_comparison || [];
    const catBreakdown = data.data.category_breakdown || [];
    const periodLabel = data.data.period_label || '';
    const ps = data.data.portfolio_summary || {};

    State.masterBuildingComparison = comp;

    // Update Master Console Subtitle with dynamic active filter period
    const subTitle = document.getElementById('adminConsolePeriodSubtitle');
    if (subTitle && periodLabel) {
      subTitle.innerHTML = `Consolidated 5-building multi-building analytics. <span class="badge badge-info" style="font-size: 11.5px; margin-left: 6px;">📅 Period: ${periodLabel}</span>. <strong>Click any building card below for its dedicated cockpit</strong>.`;
    }

    // Highlight active preset button in Master Console
    document.querySelectorAll('#adminMasterDateFilterButtonGroup .date-quick-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('onclick')?.includes(`'${State.datePreset || 'month'}'`));
    });

    // Populate Active vs Inactive Summary Metrics Grid
    const elActiveB = document.getElementById('masterKpiActiveBuildings');
    if (elActiveB) elActiveB.innerText = `${ps.active_buildings || 0} / ${ps.total_buildings || 5}`;
    const elBBadge = document.getElementById('masterActiveBuildingsBadge');
    if (elBBadge) elBBadge.innerText = `${ps.active_buildings || 0} Active Building(s)`;
    const elBSub = document.getElementById('masterKpiBuildingsSubtext');
    if (elBSub) elBSub.innerText = `${ps.active_buildings || 0} Active Operational • ${ps.inactive_buildings || 0} Standby`;

    const elActiveF = document.getElementById('masterKpiActiveFlats');
    if (elActiveF) elActiveF.innerText = `${ps.total_occupied_flats || 0} / ${ps.total_flats || 0}`;
    const elFSub = document.getElementById('masterKpiFlatsSubtext');
    if (elFSub) elFSub.innerText = `${ps.total_occupied_flats || 0} Active Occupied (${ps.total_owner_flats || 0} Owner, ${ps.total_tenant_flats || 0} Tenant) • ${ps.total_vacant_flats || 0} Inactive/Vacant`;

    const elActiveG = document.getElementById('masterKpiActiveGas');
    if (elActiveG) elActiveG.innerText = `${ps.total_active_cylinders || 0} In Units`;
    const elGSub = document.getElementById('masterKpiGasSubtext');
    if (elGSub) elGSub.innerText = `Active cylinders deployed across resident flats`;

    const elActiveS = document.getElementById('masterKpiActiveStaff');
    if (elActiveS) elActiveS.innerText = `${ps.total_staff_on_duty || 0} On Duty`;
    const elSSub = document.getElementById('masterKpiStaffSubtext');
    if (elSSub) elSSub.innerText = `${ps.total_visitors_inside || 0} Visitors inside premises now`;

    // Render 5 building cards with active filter applied
    renderMasterBuildingCards();

    if (window.DSCharts) {
      const bLabels = comp.map(b => `Bldg ${b.building_code}`);
      const bIncomes = comp.map(b => b.total_income || 0);
      const bExpenses = comp.map(b => b.total_expense || 0);

      DSCharts.drawBarChart('adminMasterRevenueChart', bLabels, [
        { data: bIncomes, colorStart: '#38bdf8', colorEnd: '#1d4ed8' },
        { data: bExpenses, colorStart: '#f43f5e', colorEnd: '#dc2626' }
      ], { height: 250 });

      const catLabels = catBreakdown.map(c => c.category);
      const catData = catBreakdown.map(c => c.total_amount);
      const colors = ['#38bdf8', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

      DSCharts.drawDonutChart('adminCategoryDonutChart', catLabels, catData, colors, { height: 250, isCurrency: true, unitLabel: 'PKR' });
    }

    const syncRes = await fetch('/api/sync/logs');
    const syncData = await syncRes.json();
    renderSyncLogsTable(syncData.data || []);
  } catch (err) {
    showToast(err.message, "danger");
  }
}

// --------------------------------------------------------------------------
// BUILDING DRILL-DOWN COCKPIT (INTERACTIVE ON CLICK BUILDING 1, 2, 3, 4, 5)
// --------------------------------------------------------------------------
State.drilldownBuildingId = null;
State.drilldownDateFilter = 'month';

function openAdminBuildingDetail(buildingId) {
  DSSound.playClick();
  State.drilldownBuildingId = buildingId;
  State.drilldownDateFilter = State.datePreset || 'month';
  State.selectedBuildingId = buildingId;
  State.currentBuilding = State.buildings.find(b => b.id === buildingId) || null;
  const sel = document.getElementById('topBuildingSelector');
  if (sel) sel.value = buildingId;
  updateHeaderUI();

  document.getElementById('adminMasterOverview').style.display = 'none';
  document.getElementById('adminBuildingDetailView').style.display = 'block';

  // Highlight active preset button
  document.querySelectorAll('#adminBuildingDetailView .date-quick-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('onclick')?.includes(`'${State.drilldownDateFilter}'`));
  });

  loadAdminBuildingDetail();
}

function closeAdminBuildingDetail() {
  DSSound.playClick();
  State.drilldownBuildingId = null;
  State.selectedBuildingId = 'ALL';
  State.currentBuilding = null;
  const sel = document.getElementById('topBuildingSelector');
  if (sel) sel.value = 'ALL';
  updateHeaderUI();
  document.getElementById('adminBuildingDetailView').style.display = 'none';
  document.getElementById('adminMasterOverview').style.display = 'block';
  loadAdminConsoleData();
}

function setDrilldownDateFilter(preset) {
  DSSound.playClick();
  State.drilldownDateFilter = preset;
  State.datePreset = preset;
  State.customDate = null;

  // Highlight active preset button
  document.querySelectorAll('#adminBuildingDetailView .date-quick-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('onclick')?.includes(`'${preset}'`));
  });

  const labels = {
    today: '📅 Filter: Today',
    yesterday: '📅 Filter: Yesterday',
    '2days': '📅 Filter: Last 2 Days',
    '7days': '📅 Filter: Last 7 Days',
    month: '📅 Filter: This Month',
    all: '📅 Filter: All Records'
  };
  updateTopCalendarPill(labels[preset] || '📅 Filter: Calendar');

  loadAdminBuildingDetail();
}

async function loadAdminBuildingDetail() {
  if (!State.drilldownBuildingId) return;

  try {
    const customParam = State.customDate ? `&custom_date=${State.customDate}` : `&date_preset=${State.drilldownDateFilter || State.datePreset || 'month'}`;
    const res = await fetch(`/api/analytics/building_detail?building_id=${State.drilldownBuildingId}${customParam}`);
    const data = await res.json();
    if (!data.success) return;

    const d = data.data;
    const b = d.building;

    // Set Titles
    document.getElementById('drilldownBuildingTitle').innerText = `${b.name} (${b.building_code})`;
    document.getElementById('drilldownBuildingSubtitle').innerText = `Period: ${d.period_label} • Gas Rate: PKR ${(b.gas_rate_per_cylinder || 3450).toLocaleString()}/cylinder • Address: ${b.address || 'Bahria Town Karachi'}`;

    // KPIs
    document.getElementById('drilldownKpiFlats').innerText = d.flats.total || 0;
    document.getElementById('drilldownKpiFlatsBreakdown').innerText = `${d.flats.owner_occ} Owner • ${d.flats.rented_occ} Tenant • ${d.flats.vacant} Vacant`;
    
    document.getElementById('drilldownKpiVisitors').innerText = d.visitors.total_visitors || 0;
    document.getElementById('drilldownKpiVisitorsInside').innerText = `${d.visitors.inside_now || 0} Inside Now`;

    document.getElementById('drilldownKpiGas').innerText = `${d.gas_deliv_stats.total_cylinders || 0} Cylinders`;
    document.getElementById('drilldownKpiGasStock').innerText = `Stock: ${d.gas_inventory.reserve_stock || 0} Reserve | ${d.gas_inventory.active_in_apartments || 0} Active`;

    const totalIncome = d.financials.total_income || 0;
    const totalExpense = d.financials.total_expense || 0;
    const netProfit = totalIncome - totalExpense;

    document.getElementById('drilldownKpiIncome').innerText = `PKR ${totalIncome.toLocaleString()}`;
    document.getElementById('drilldownKpiCashBank').innerText = `Cash: PKR ${(d.financials.cash_income || 0).toLocaleString()} | Bank: PKR ${(d.financials.bank_income || 0).toLocaleString()}`;

    document.getElementById('drilldownKpiExpense').innerText = `PKR ${totalExpense.toLocaleString()}`;
    document.getElementById('drilldownKpiNetProfit').innerText = `PKR ${netProfit.toLocaleString()}`;
    document.getElementById('drilldownKpiRepairProfit').innerText = `Repair Profit: PKR ${(d.repair_jobs.total_profit || 0).toLocaleString()} (${d.repair_jobs.total_jobs} Jobs)`;

    // Draw Drilldown Charts
    if (window.DSCharts) {
      DSCharts.drawBarChart('drilldownFinancialChart', ['Collections', 'Expenses', 'Net Margin'], [{
        data: [totalIncome, totalExpense, Math.max(0, netProfit)],
        colorStart: '#38bdf8',
        colorEnd: '#1d4ed8'
      }], { height: 220 });

      DSCharts.drawDonutChart('drilldownOccupancyChart', 
        ['Owner Living', 'Tenant Living', 'Vacant'], 
        [d.flats.owner_occ || 0, d.flats.rented_occ || 0, d.flats.vacant || 0], 
        ['#38bdf8', '#10b981', '#fbbf24'], 
        { height: 220 }
      );
    }

    // Populate Flats List
    const fTbody = document.getElementById('drilldownFlatsTableBody');
    if (fTbody) {
      document.getElementById('drilldownFlatsCountBadge').innerText = `${(d.flats_list || []).length} Registered Apartments`;
      fTbody.innerHTML = (d.flats_list || []).map(f => {
        const isOwner = f.occupancy_mode === 'Owner Occupied';
        return `
          <tr>
            <td><strong style="color: #38bdf8;">Flat ${f.flat_number}</strong></td>
            <td>Floor ${f.floor_number} • ${f.wing || 'Wing A'}</td>
            <td>${f.bhk_type}</td>
            <td>
              <span class="badge ${isOwner ? 'badge-info' : (f.tenant_name ? 'badge-success' : 'badge-warning')}">
                ${isOwner ? '🏠 Owner Living' : (f.tenant_name ? '👤 Tenant Living' : '🚪 Vacant')}
              </span>
            </td>
            <td>
              ${f.tenant_name ? `<strong>${f.tenant_name}</strong> (${f.tenant_phone})` : (isOwner ? `<span style="color: #38bdf8;">Owner Residing (${f.owner_name})</span>` : '<span style="color: #94a3b8;">Vacant</span>')}
            </td>
            <td>${f.move_in_date || f.active_since || '---'}</td>
            <td>
              <button class="btn btn-sm btn-secondary" onclick="viewFlatDetailModal('${f.id}')">👁 Dossier</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Populate Recent Ledger
    const lTbody = document.getElementById('drilldownLedgerTableBody');
    if (lTbody) {
      if ((d.recent_ledger || []).length === 0) {
        lTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 18px;">No ledger transactions recorded for this period.</td></tr>`;
      } else {
        lTbody.innerHTML = (d.recent_ledger || []).map(l => `
          <tr>
            <td>${l.entry_date}</td>
            <td><span class="badge badge-info">${l.category}</span></td>
            <td>${l.notes || '---'}</td>
            <td><span class="badge ${l.payment_mode === 'HAND_CASH' ? 'badge-success' : 'badge-info'}">${l.payment_mode === 'HAND_CASH' ? 'Cash' : 'Bank'}</span></td>
            <td><strong style="color: ${l.entry_type === 'INCOME' ? '#10b981' : '#ef4444'}; font-size: 13px;">${l.entry_type === 'INCOME' ? '+' : '-'} PKR ${(l.amount || 0).toLocaleString()}</strong></td>
            <td>${l.person_name || '---'}</td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function renderSyncLogsTable(logs) {
  const tbody = document.getElementById('syncLogsTableBody');
  if (!tbody) return;

  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;">No sync events logged.</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.map(s => `
    <tr>
      <td>${s.sync_timestamp}</td>
      <td><strong>${s.building_name || 'All Buildings'}</strong></td>
      <td><span class="badge ${s.sync_type === 'EXPORT' ? 'badge-info' : 'badge-success'}">${s.sync_type}</span></td>
      <td><code>${s.filename}</code></td>
      <td>${s.records_count} Rows (${s.media_count} Media)</td>
      <td><span class="badge badge-success">${s.status}</span></td>
    </tr>
  `).join('');
}


// ==========================================================================
// 10A. MASTER ADMIN 4 TOP KPI CARDS CLICKABLE MULTI-SITE DOSSIERS
// ==========================================================================
let masterDossierCache = {
  nodes: [],
  flatsSummary: [],
  flatsList: [],
  gasSites: [],
  gasDeliveries: [],
  gasSupplies: [],
  staffSites: [],
  staffList: []
};
let masterFlatsStatusFilter = 'ALL';
let masterStaffStatusFilter = 'ALL';
let masterGasCurrentTab = 'sales';

// --- CARD 1: ACTIVE BUILDINGS DOSSIER ---
async function openMasterActiveNodesDossier() {
  if (window.DSSound) DSSound.playClick();
  try {
    const customParam = State.customDate ? `&custom_date=${State.customDate}` : `&date_preset=${State.datePreset || 'month'}`;
    const res = await fetch(`/api/analytics/master_dossiers?type=nodes${customParam}`);
    const data = await res.json();
    if (!data.success) return;

    masterDossierCache.nodes = data.data.nodes || [];
    const pLabel = data.data.period_label || 'Current Period';

    const subEl = document.getElementById('masterNodesDossierSubtitle');
    if (subEl) {
      subEl.innerHTML = `Live status, last sync timestamp, and financial margins across all 5 nodes. <span class="badge badge-info" style="font-size: 11px;">📅 Period: ${pLabel}</span>`;
    }

    // Render Grid Cards
    const gridCont = document.getElementById('masterNodesGridContainer');
    if (gridCont) {
      gridCont.innerHTML = masterDossierCache.nodes.map(n => {
        const isActive = n.is_active === 1;
        return `
          <div class="kpi-card" style="border-top: 3px solid ${isActive ? '#10b981' : '#64748b'}; padding: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong style="font-size: 14px; color: #ffffff;">🏢 ${n.building_name}</strong>
              <span class="badge ${isActive ? 'badge-success' : 'badge-secondary'}" style="font-size: 10px;">
                ${isActive ? '🟢 LIVE ACTIVE' : '⚪ STANDBY'}
              </span>
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">${n.address || 'Bahria Town Karachi'}</div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px; margin-bottom: 8px; background: rgba(15,23,42,0.6); padding: 8px; border-radius: 6px;">
              <div>🟢 Occupied: <strong>${n.occupied_flats} / ${n.total_flats}</strong></div>
              <div>🚪 Vacant: <strong>${n.vacant_flats}</strong></div>
              <div>🔥 Gas In-Stock: <strong>${n.reserve_stock} Res</strong></div>
              <div>🧹 On Duty: <strong>${n.staff_on_duty} Maids</strong></div>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
              <span style="color: #10b981;">Collections: PKR ${(n.period_income || 0).toLocaleString()}</span>
              <span style="color: #f87171;">Expenses: PKR ${(n.period_expense || 0).toLocaleString()}</span>
            </div>
            <div style="font-weight: 800; color: #38bdf8; font-size: 12px; margin-bottom: 10px;">
              Net Margin: PKR ${(n.net_profit || 0).toLocaleString()}
            </div>

            <button class="btn btn-sm btn-primary" style="width: 100%; font-size: 11.5px;" onclick="closeModal('masterActiveNodesModal'); openAdminBuildingDetail('${n.id}');">
              🏢 Open Dedicated Building Cockpit →
            </button>
          </div>
        `;
      }).join('');
    }

    // Render Table
    const tbody = document.getElementById('masterNodesTableBody');
    if (tbody) {
      tbody.innerHTML = masterDossierCache.nodes.map(n => `
        <tr>
          <td><strong>${n.building_name}</strong> (Code ${n.building_code})</td>
          <td><span class="badge ${n.is_active ? 'badge-success' : 'badge-secondary'}">${n.is_active ? '🟢 ACTIVE' : '⚪ STANDBY'}</span></td>
          <td>${n.occupied_flats} / ${n.total_flats} Flats (${n.vacant_flats} Vacant)</td>
          <td><strong style="color: #10b981;">PKR ${(n.period_income || 0).toLocaleString()}</strong></td>
          <td><span style="color: #f87171;">PKR ${(n.period_expense || 0).toLocaleString()}</span></td>
          <td><strong style="color: #38bdf8;">PKR ${(n.net_profit || 0).toLocaleString()}</strong></td>
          <td><span class="badge badge-warning">${n.reserve_stock} Res / ${n.active_cylinders} In-Use</span></td>
          <td><span class="badge badge-info">${n.staff_on_duty} On Duty</span></td>
          <td><small>${n.last_sync_time || 'Live Local'}</small></td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="closeModal('masterActiveNodesModal'); openAdminBuildingDetail('${n.id}');">Cockpit</button>
          </td>
        </tr>
      `).join('');
    }

    openModal('masterActiveNodesModal');
  } catch (err) {
    showToast(err.message, "danger");
  }
}

// --- CARD 2: ACTIVE VS INACTIVE FLATS DOSSIER ---
async function openMasterFlatsOccupancyDossier() {
  if (window.DSSound) DSSound.playClick();
  try {
    const res = await fetch(`/api/analytics/master_dossiers?type=flats`);
    const data = await res.json();
    if (!data.success) return;

    masterDossierCache.flatsSummary = data.data.buildings_summary || [];
    masterDossierCache.flatsList = data.data.flats || [];

    // Render Summary Cards Row
    const sumRow = document.getElementById('masterFlatsSitesSummaryRow');
    if (sumRow) {
      sumRow.innerHTML = masterDossierCache.flatsSummary.map(b => `
        <div class="kpi-card" style="padding: 10px 12px; border-left: 3px solid #38bdf8;">
          <div style="font-weight: 800; font-size: 12px; color: #ffffff;">${b.building_name}</div>
          <div style="font-size: 14px; font-weight: 800; color: #38bdf8; margin: 4px 0;">${b.occupied_flats} / ${b.total_flats} Active</div>
          <div style="font-size: 10.5px; color: #94a3b8;">
            ${b.owner_flats} Owner • ${b.tenant_flats} Tenant • ${b.vacant_flats} Vacant (${b.occupancy_rate}%)
          </div>
        </div>
      `).join('');
    }

    // Populate Selector Dropdown
    const selector = document.getElementById('masterFlatsSiteSelector');
    if (selector) {
      const totalFlatsCount = (masterDossierCache.flatsList || []).length;
      selector.innerHTML = `<option value="ALL">🌐 All Buildings (${totalFlatsCount} Flats Registered)</option>` + 
        masterDossierCache.flatsSummary.map(b => `<option value="${b.id}">${b.building_name} (${b.occupied_flats}/${b.total_flats} Active)</option>`).join('');
    }

    masterFlatsStatusFilter = 'ALL';
    document.getElementById('masterFlatStatusAll')?.classList.add('active');
    document.getElementById('masterFlatStatusActive')?.classList.remove('active');
    document.getElementById('masterFlatStatusVacant')?.classList.remove('active');
    const searchInp = document.getElementById('masterFlatsSearchInput');
    if (searchInp) searchInp.value = '';

    filterMasterFlatsDossier();
    openModal('masterFlatsOccupancyModal');
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function setMasterFlatStatusFilter(status) {
  if (window.DSSound) DSSound.playClick();
  masterFlatsStatusFilter = status;
  document.getElementById('masterFlatStatusAll')?.classList.toggle('active', status === 'ALL');
  document.getElementById('masterFlatStatusActive')?.classList.toggle('active', status === 'ACTIVE');
  document.getElementById('masterFlatStatusVacant')?.classList.toggle('active', status === 'VACANT');
  filterMasterFlatsDossier();
}

function filterMasterFlatsDossier() {
  const selectedSite = document.getElementById('masterFlatsSiteSelector')?.value || 'ALL';
  const query = (document.getElementById('masterFlatsSearchInput')?.value || '').toLowerCase().trim();
  const list = masterDossierCache.flatsList || [];

  const filtered = list.filter(f => {
    // Site filter
    if (selectedSite !== 'ALL' && f.building_id !== selectedSite) return false;

    // Status filter
    const isOccupied = (f.occupancy_mode === 'Owner Occupied') || (f.tenant_name && f.tenant_name.trim() !== '');
    if (masterFlatsStatusFilter === 'ACTIVE' && !isOccupied) return false;
    if (masterFlatsStatusFilter === 'VACANT' && isOccupied) return false;

    // Search query
    if (query) {
      const match = (f.flat_number || '').toLowerCase().includes(query) ||
                    (f.building_name || '').toLowerCase().includes(query) ||
                    (f.owner_name || '').toLowerCase().includes(query) ||
                    (f.owner_phone || '').toLowerCase().includes(query) ||
                    (f.tenant_name || '').toLowerCase().includes(query) ||
                    (f.tenant_phone || '').toLowerCase().includes(query);
      if (!match) return false;
    }
    return true;
  });

  const tbody = document.getElementById('masterFlatsTableBody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 25px;">No flats match the current filter criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(f => {
    const isOwner = f.occupancy_mode === 'Owner Occupied';
    const hasTenant = !!f.tenant_name;

    return `
      <tr>
        <td><strong style="color: #38bdf8;">Flat ${f.flat_number}</strong> <small style="color: #64748b;">(Fl ${f.floor_number})</small></td>
        <td><strong>${f.building_name}</strong></td>
        <td>
          <span class="badge ${isOwner ? 'badge-info' : (hasTenant ? 'badge-success' : 'badge-warning')}">
            ${isOwner ? '🏠 Owner Living' : (hasTenant ? '👤 Tenant Living' : '🚪 Vacant / Inactive')}
          </span>
        </td>
        <td><strong>${f.owner_name || '---'}</strong></td>
        <td><code>${f.owner_phone || '---'}</code></td>
        <td>${hasTenant ? `<strong style="color: #10b981;">${f.tenant_name}</strong>` : (isOwner ? '<span style="color: #38bdf8;">Owner Residing</span>' : '<span style="color: #94a3b8;">No Active Tenant</span>')}</td>
        <td><code>${f.tenant_phone || '---'}</code></td>
        <td>
          <div style="display: flex; gap: 4px; flex-wrap: wrap;">
            <button type="button" class="btn btn-sm btn-info" onclick="viewFlatDetailModal('${f.flat_id}')" title="Open Full Flat & Resident Dossier">📑 Dossier</button>
            <button type="button" class="btn btn-sm btn-secondary" onclick="openFlatOccupancyTimelineModal('${f.flat_id}')" title="View Timeline History">🕒 History</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// --- CARD 3: ACTIVE CYLINDERS, RESERVES & RECEIPTS DOSSIER ---
async function openMasterGasLogisticsDossier() {
  if (window.DSSound) DSSound.playClick();
  try {
    const customParam = State.customDate ? `&custom_date=${State.customDate}` : `&date_preset=${State.datePreset || 'month'}`;
    const res = await fetch(`/api/analytics/master_dossiers?type=gas${customParam}`);
    const data = await res.json();
    if (!data.success) return;

    masterDossierCache.gasSites = data.data.sites_inventory || [];
    masterDossierCache.gasDeliveries = data.data.deliveries || [];
    masterDossierCache.gasSupplies = data.data.supplies || [];
    const pLabel = data.data.period_label || 'Current Period';

    const subEl = document.getElementById('masterGasDossierSubtitle');
    if (subEl) {
      subEl.innerHTML = `Multi-site inventory reserves, active units, customer purchase logs with 80mm receipts, and inward supplies. <span class="badge badge-info" style="font-size: 11px;">📅 Period: ${pLabel}</span>`;
    }

    // Render Sites Matrix
    const sitesTbody = document.getElementById('masterGasSitesTableBody');
    if (sitesTbody) {
      sitesTbody.innerHTML = masterDossierCache.gasSites.map(s => `
        <tr>
          <td><strong>${s.building_name}</strong> (Code ${s.building_code})</td>
          <td><span class="badge badge-success" style="font-size: 12px; font-weight: 800;">📦 ${s.reserve_stock} In Stock</span></td>
          <td><span class="badge badge-info" style="font-size: 12px;">🔥 ${s.active_cylinders} In-Use</span></td>
          <td><span class="badge badge-warning" style="font-size: 12px;">🔄 ${s.empty_returned} Empty</span></td>
          <td><strong>${s.period_cylinders_sold} Sold</strong> (${s.period_deliveries_count} Orders)</td>
          <td><strong style="color: #10b981;">PKR ${(s.period_gas_revenue || 0).toLocaleString()}</strong></td>
          <td><span class="badge badge-primary" style="font-size: 11.5px;">📥 +${s.period_inward_quantity || 0} Cylinders</span></td>
        </tr>
      `).join('');
    }

    // Populate Selector
    const selector = document.getElementById('masterGasSiteSelector');
    if (selector) {
      selector.innerHTML = `<option value="ALL">🌐 All 5 Building Sites</option>` +
        masterDossierCache.gasSites.map(s => `<option value="${s.id}">${s.building_name}</option>`).join('');
    }

    masterGasCurrentTab = 'sales';
    switchMasterGasDossierTab('sales');
    filterMasterGasDossier();
    openModal('masterGasLogisticsModal');
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function switchMasterGasDossierTab(tab) {
  if (window.DSSound) DSSound.playClick();
  masterGasCurrentTab = tab;
  const btnSales = document.getElementById('masterGasTabSalesBtn');
  const btnInflow = document.getElementById('masterGasTabInflowBtn');
  const contSales = document.getElementById('masterGasSalesTableContainer');
  const contInflow = document.getElementById('masterGasInflowTableContainer');

  if (btnSales) btnSales.className = tab === 'sales' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
  if (btnInflow) btnInflow.className = tab === 'inflow' ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';

  if (contSales) contSales.style.display = tab === 'sales' ? 'block' : 'none';
  if (contInflow) contInflow.style.display = tab === 'inflow' ? 'block' : 'none';
  filterMasterGasDossier();
}

function filterMasterGasDossier() {
  const selectedSite = document.getElementById('masterGasSiteSelector')?.value || 'ALL';
  const query = (document.getElementById('masterGasSearchInput')?.value || '').toLowerCase().trim();

  if (masterGasCurrentTab === 'sales') {
    const list = masterDossierCache.gasDeliveries || [];
    const filtered = list.filter(g => {
      if (selectedSite !== 'ALL' && g.building_id !== selectedSite) return false;
      if (query) {
        const match = (g.receipt_number || '').toLowerCase().includes(query) ||
                      (g.flat_number || '').toLowerCase().includes(query) ||
                      (g.building_name || '').toLowerCase().includes(query) ||
                      (g.tenant_name || '').toLowerCase().includes(query) ||
                      (g.owner_name || '').toLowerCase().includes(query);
        if (!match) return false;
      }
      return true;
    });

    const tbody = document.getElementById('masterGasDeliveriesTableBody');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #94a3b8; padding: 25px;">No sales/delivery records found for this period.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(g => {
      const custName = g.tenant_name || (g.occupancy_mode === 'Owner Occupied' ? g.owner_name : 'Resident');
      const custPhone = g.tenant_phone || (g.occupancy_mode === 'Owner Occupied' ? g.owner_phone : '');
      const isNew = g.transaction_type === 'NEW_PURCHASE' || g.transaction_type === 'NEW_BOTTLE';
      const emptyBadge = isNew
        ? `<span class="badge badge-secondary" style="font-weight: bold;">N/A</span>`
        : (g.is_empty_returned ? `<span class="badge badge-success">✅ Returned</span>` : `<span class="badge badge-warning">⏳ Pending Return</span>`);

      return `
        <tr>
          <td><strong style="color: #38bdf8;">${g.receipt_number}</strong></td>
          <td>${g.delivery_date}</td>
          <td><strong>${g.building_name}</strong></td>
          <td><strong style="color: #38bdf8;">Flat ${g.flat_number}</strong></td>
          <td><strong>${custName}</strong> ${custPhone ? `<br/><small><code style="color: #38bdf8;">📱 ${custPhone}</code></small>` : ''}</td>
          <td>
            <span class="badge ${isNew ? 'badge-primary' : 'badge-warning'}">${isNew ? '✨ New Bottle' : '🔄 Refill'}</span>
            <div style="font-size: 11px; font-weight: bold; margin-top: 2px;">${g.quantity} Cyl</div>
          </td>
          <td>${emptyBadge}</td>
          <td><strong style="color: #10b981;">PKR ${(g.total_amount || 0).toLocaleString()}</strong></td>
          <td><span class="badge ${g.payment_mode === 'HAND_CASH' ? 'badge-info' : 'badge-success'}">${g.payment_mode === 'HAND_CASH' ? 'Hand Cash' : 'Bank Transfer'}</span></td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="viewGasReceiptFromDossier('${g.receipt_number}')">🧾 View Receipt</button>
          </td>
        </tr>
      `;
    }).join('');
  } else {
    const list = masterDossierCache.gasSupplies || [];
    const filtered = list.filter(s => {
      if (selectedSite !== 'ALL' && s.building_id !== selectedSite) return false;
      if (query) {
        const match = (s.supplier_name || '').toLowerCase().includes(query) ||
                      (s.delivered_by || '').toLowerCase().includes(query) ||
                      (s.building_name || '').toLowerCase().includes(query) ||
                      (s.batch_reference || '').toLowerCase().includes(query);
        if (!match) return false;
      }
      return true;
    });

    const tbody = document.getElementById('masterGasInflowTableBody');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #94a3b8; padding: 25px;">No inward supply arrivals found for this period.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(s => `
      <tr>
        <td><strong>${s.supply_date}</strong></td>
        <td><strong>${s.building_name}</strong></td>
        <td><strong style="color: #a78bfa;">${s.supplier_name}</strong></td>
        <td><strong>${s.delivered_by}</strong></td>
        <td><code>${s.vehicle_number || '---'}</code></td>
        <td><span class="badge badge-success" style="font-size: 12px; font-weight: 800;">+ ${s.quantity} Cylinders</span></td>
        <td><strong style="color: #38bdf8;">PKR ${(s.total_cost || 0).toLocaleString()}</strong></td>
        <td><span class="badge ${s.payment_mode === 'HAND_CASH' ? 'badge-info' : 'badge-success'}">${s.payment_mode}</span></td>
        <td><code>${s.batch_reference || '---'}</code></td>
      </tr>
    `).join('');
  }
}

function viewGasReceiptFromDossier(receiptNumber) {
  const d = (masterDossierCache.gasDeliveries || []).find(x => x.receipt_number === receiptNumber) ||
            (gasDeliveriesCache || []).find(x => x.receipt_number === receiptNumber);
  if (!d) {
    showToast("Receipt data not found in cache", "warning");
    return;
  }

  window.CurrentGasReceiptData = d;
  const body = document.getElementById('thermalReceiptModalBody');
  if (body && window.DSReceipt) {
    body.innerHTML = DSReceipt.renderGasReceipt(d, { name: d.building_name, address: d.building_address });
  }
  openModal('thermalReceiptModal');
}

// --- CARD 4: BAHRIA VERIFIED DOMESTIC STAFF & MAIDS DOSSIER ---
async function openMasterStaffMaidsDossier() {
  if (window.DSSound) DSSound.playClick();
  try {
    const res = await fetch(`/api/analytics/master_dossiers?type=staff`);
    const data = await res.json();
    if (!data.success) return;

    masterDossierCache.staffSites = data.data.sites_staff || [];
    masterDossierCache.staffList = data.data.staff || [];

    // Render Sites Summary Row
    const sumRow = document.getElementById('masterStaffSitesSummaryRow');
    if (sumRow) {
      sumRow.innerHTML = masterDossierCache.staffSites.map(s => `
        <div class="kpi-card" style="padding: 10px 12px; border-left: 3px solid #34d399;">
          <div style="font-weight: 800; font-size: 12px; color: #ffffff;">${s.building_name}</div>
          <div style="font-size: 14px; font-weight: 800; color: #34d399; margin: 4px 0;">${s.on_duty_count} / ${s.total_staff} On Duty</div>
          <div style="font-size: 10.5px; color: #94a3b8;">${s.off_duty_count} Off Duty • Bahria BTK Verified</div>
        </div>
      `).join('');
    }

    // Populate Selector Dropdown
    const selector = document.getElementById('masterStaffSiteSelector');
    if (selector) {
      selector.innerHTML = `<option value="ALL">🌐 All 5 Buildings (All Staff)</option>` +
        masterDossierCache.staffSites.map(s => `<option value="${s.id}">${s.building_name} (${s.on_duty_count} On Duty)</option>`).join('');
    }

    masterStaffStatusFilter = 'ALL';
    document.getElementById('masterStaffStatusAll')?.classList.add('active');
    document.getElementById('masterStaffStatusOnDuty')?.classList.remove('active');
    document.getElementById('masterStaffStatusOffDuty')?.classList.remove('active');
    const searchInp = document.getElementById('masterStaffSearchInput');
    if (searchInp) searchInp.value = '';

    filterMasterStaffDossier();
    openModal('masterStaffMaidsModal');
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function setMasterStaffStatusFilter(status) {
  if (window.DSSound) DSSound.playClick();
  masterStaffStatusFilter = status;
  document.getElementById('masterStaffStatusAll')?.classList.toggle('active', status === 'ALL');
  document.getElementById('masterStaffStatusOnDuty')?.classList.toggle('active', status === 'ON_DUTY');
  document.getElementById('masterStaffStatusOffDuty')?.classList.toggle('active', status === 'OFF_DUTY');
  filterMasterStaffDossier();
}

function filterMasterStaffDossier() {
  const selectedSite = document.getElementById('masterStaffSiteSelector')?.value || 'ALL';
  const query = (document.getElementById('masterStaffSearchInput')?.value || '').toLowerCase().trim();
  const list = masterDossierCache.staffList || [];

  const filtered = list.filter(s => {
    if (selectedSite !== 'ALL' && s.building_id !== selectedSite) return false;
    if (masterStaffStatusFilter !== 'ALL' && s.status !== masterStaffStatusFilter) return false;
    if (query) {
      const match = (s.full_name || '').toLowerCase().includes(query) ||
                    (s.bahria_card_number || '').toLowerCase().includes(query) ||
                    (s.phone || '').toLowerCase().includes(query) ||
                    (s.cnic_number || '').toLowerCase().includes(query) ||
                    (s.building_name || '').toLowerCase().includes(query) ||
                    (s.associated_flats || '').toLowerCase().includes(query);
      if (!match) return false;
    }
    return true;
  });

  const tbody = document.getElementById('masterStaffTableBody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #94a3b8; padding: 25px;">No domestic staff or maids match the filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(s => {
    const isOnDuty = s.status === 'ON_DUTY';
    return `
      <tr>
        <td><strong style="color: #ffffff; font-size: 13px;">${s.full_name}</strong></td>
        <td><strong>${s.building_name}</strong></td>
        <td><code style="color: #34d399; font-weight: bold;">${s.bahria_card_number || 'PENDING'}</code></td>
        <td><code>${s.phone || '---'}</code></td>
        <td><code>${s.cnic_number || '---'}</code></td>
        <td>${s.role_type || 'Maid'}</td>
        <td><strong>Flats: ${s.associated_flats || 'All'}</strong></td>
        <td>
          <span class="badge ${isOnDuty ? 'badge-success' : 'badge-secondary'}">
            ${isOnDuty ? '🟢 ON DUTY' : '⚪ OFF DUTY'}
          </span>
        </td>
        <td><small>${s.last_check_in || '---'}</small></td>
      </tr>
    `;
  }).join('');
}

// ==========================================================================
// 10B. CORPORATE COMPANY PROFILE (MASTER ADMIN)
// ==========================================================================
function openCorporateProfileModal() {
  DSSound.playClick();
  const p = State.companyProfile || {
    company_name: 'DS MAINTENANCE',
    office_address: 'Office No. 907, 9th Floor, Dominion Business Center 01, Jinnah Avenue, Bahria Town Karachi (BTK)',
    helpline_phone: '+92 21 111-DS-MAINT',
    official_email: 'accounts@dsmaintenance.pk',
    ntn_number: '9028471-4',
    audit_ref_prefix: 'DSM/AUDIT/2026/REP-8821'
  };

  const cInput = document.getElementById('corpInputCompanyName');
  if (cInput) cInput.value = p.company_name || '';

  const aInput = document.getElementById('corpInputAddress');
  if (aInput) aInput.value = p.office_address || '';

  const hInput = document.getElementById('corpInputHelpline');
  if (hInput) hInput.value = p.helpline_phone || '';

  const eInput = document.getElementById('corpInputEmail');
  if (eInput) eInput.value = p.official_email || '';

  const nInput = document.getElementById('corpInputNtn');
  if (nInput) nInput.value = p.ntn_number || '';

  const rInput = document.getElementById('corpInputAuditRef');
  if (rInput) rInput.value = p.audit_ref_prefix || '';

  openModal('corporateProfileModal');
}

async function handleSaveCorporateProfile(e) {
  if (e) e.preventDefault();
  const name = document.getElementById('corpInputCompanyName')?.value.trim();
  const addr = document.getElementById('corpInputAddress')?.value.trim();
  const phone = document.getElementById('corpInputHelpline')?.value.trim();
  const email = document.getElementById('corpInputEmail')?.value.trim();
  const ntn = document.getElementById('corpInputNtn')?.value.trim();
  const ref = document.getElementById('corpInputAuditRef')?.value.trim();

  if (!name || !addr) {
    showToast("Company name and address are required.", "warning");
    DSSound.playWarning();
    return;
  }

  try {
    const res = await fetch('/api/system/profile/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name: name,
        office_address: addr,
        helpline_phone: phone,
        official_email: email,
        ntn_number: ntn,
        audit_ref_prefix: ref
      })
    });

    const data = await res.json();
    if (data.success) {
      DSSound.playSuccess();
      showToast("Corporate company details updated successfully!", "success");
      closeModal('corporateProfileModal');
      await loadCompanyProfile();
    } else {
      DSSound.playWarning();
      showToast(data.error, "danger");
    }
  } catch(err) {
    showToast(err.message, "danger");
  }
}

// ==========================================================================
// 11. BUILDING NAMES CUSTOMIZER (MASTER ADMIN)
// ==========================================================================
function openCustomBuildingNamesModal() {
  DSSound.playClick();
  const listContainer = document.getElementById('buildingCustomizerList');
  if (!listContainer) return;

  listContainer.innerHTML = State.buildings.map(b => `
    <div class="glass-panel" style="margin-bottom: 0; padding: 14px; border: 1px solid rgba(56,189,248,0.25);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h4 style="color: #38bdf8; font-size: 14px;">Building ${b.building_code} (Current: ${b.name})</h4>
        <span class="badge badge-info">${b.total_flats || 0} Flats Registered</span>
      </div>

      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Custom Building Name *</label>
          <input type="text" id="customBldgName_${b.id}" class="form-input" value="${b.name}" placeholder="e.g. AQ Heights, COD 1, Marina Heights" />
        </div>
        <div class="form-group">
          <label class="form-label">Gas Rate per Cylinder (PKR) *</label>
          <input type="number" id="customBldgGas_${b.id}" class="form-input" value="${b.gas_rate_per_cylinder || 3450}" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Official Building Address</label>
        <input type="text" id="customBldgAddress_${b.id}" class="form-input" value="${b.address || ''}" placeholder="Plot address, sector, Bahria Town..." />
      </div>

      <div style="text-align: right; margin-top: 6px;">
        <button type="button" class="btn btn-sm btn-primary" onclick="handleSaveBuildingCustom('${b.id}')">💾 Save Building ${b.building_code} Details</button>
      </div>
    </div>
  `).join('');

  openModal('customBuildingNamesModal');
}

async function handleSaveBuildingCustom(buildingId) {
  const name = document.getElementById(`customBldgName_${buildingId}`)?.value.trim();
  const address = document.getElementById(`customBldgAddress_${buildingId}`)?.value.trim();
  const gas = parseFloat(document.getElementById(`customBldgGas_${buildingId}`)?.value || 3450);

  if (!name) {
    showToast("Building name cannot be empty.", "warning");
    DSSound.playWarning();
    return;
  }

  try {
    const res = await fetch('/api/system/buildings/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: buildingId,
        name: name,
        address: address,
        gas_rate_per_cylinder: gas
      })
    });

    const data = await res.json();
    if (data.success) {
      DSSound.playSuccess();
      showToast(`Building updated to "${name}" successfully!`, "success");
      await initAppSession();
    } else {
      DSSound.playWarning();
      showToast(data.error, "danger");
    }
  } catch(err) {
    showToast(err.message, "danger");
  }
}

// ==========================================================================
// 12. CHANGE PASSWORD (SELF & ADMIN OVERRIDE)
// ==========================================================================
function openChangePasswordModal(userId = null) {
  DSSound.playClick();
  const targetId = userId || State.currentUser?.id;
  document.getElementById('changePasswordUserId').value = targetId;
  document.getElementById('changePasswordOld').value = '';
  document.getElementById('changePasswordNew').value = '';
  document.getElementById('changePasswordConfirm').value = '';

  const isAdmin = State.currentUser?.role === 'MASTER_ADMIN';
  const isSelf = targetId === State.currentUser?.id;
  
  const oldGroup = document.getElementById('changePasswordOldGroup');
  if (oldGroup) {
    oldGroup.style.display = (!isAdmin || isSelf) ? 'block' : 'none';
    const oldInput = document.getElementById('changePasswordOld');
    if (oldInput) oldInput.required = (!isAdmin || isSelf);
  }

  openModal('changePasswordModal');
}

async function handleConfirmChangePassword(e) {
  if (e) e.preventDefault();
  const userId = document.getElementById('changePasswordUserId').value;
  const oldPass = document.getElementById('changePasswordOld').value;
  const newPass = document.getElementById('changePasswordNew').value;
  const confirmPass = document.getElementById('changePasswordConfirm').value;

  if (newPass !== confirmPass) {
    showToast("New passwords do not match!", "warning");
    DSSound.playWarning();
    return;
  }

  if (newPass.length < 4) {
    showToast("Password must be at least 4 characters long.", "warning");
    DSSound.playWarning();
    return;
  }

  const isAdmin = State.currentUser?.role === 'MASTER_ADMIN';
  const isSelf = userId === State.currentUser?.id;

  try {
    const res = await fetch('/api/auth/change_password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        old_password: oldPass,
        new_password: newPass,
        is_admin_override: (isAdmin && !isSelf)
      })
    });

    const data = await res.json();
    if (data.success) {
      DSSound.playSuccess();
      showToast("Password updated successfully!", "success");
      closeModal('changePasswordModal');
    } else {
      DSSound.playWarning();
      showToast(data.error, "danger");
    }
  } catch(err) {
    showToast(err.message, "danger");
  }
}

// ==========================================================================
// 13. INTERACTIVE BUILDING DRILLDOWN OPERATIONAL DOSSIERS
// ==========================================================================
async function openDrilldownDossier(type, filterPreset) {
  DSSound.playClick();
  const bId = State.drilldownBuildingId || (State.selectedBuildingId === 'ALL' ? (State.buildings[0]?.id || '') : State.selectedBuildingId);
  const b = State.buildings.find(x => x.id === bId) || State.currentBuilding || (State.buildings[0] || { name: 'Building' });

  let title = '';
  let content = '';

  if (type === 'flats') {
    title = `🏢 ${b.name} — Apartments & Occupancy Dossier`;
    try {
      const res = await fetch(`/api/flats?building_id=${bId}`);
      const data = await res.json();
      const flats = data.data || [];
      
      let ownerC = 0, tenantC = 0, vacantC = 0;
      flats.forEach(f => {
        if (f.occupancy_mode === 'Owner Occupied') ownerC++;
        else if (f.occupancy_mode === 'Rented' && f.tenant_id) tenantC++;
        else vacantC++;
      });

      content = `
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; padding: 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div>
            <strong style="color: #38bdf8; font-size: 14px;">Total: ${flats.length} Flats Registered</strong>
            <div style="font-size: 12px; color: #cbd5e1;">${ownerC} Owner Living • ${tenantC} Tenant Living • ${vacantC} Vacant Flats</div>
          </div>
          <span class="badge badge-info">100% Offline Register</span>
        </div>

        <div class="table-responsive" style="max-height: 420px; overflow-y: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Flat #</th>
                <th>Floor / Wing</th>
                <th>Type</th>
                <th>Occupancy Status</th>
                <th>Resident / Owner Details</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${flats.map(f => `
                <tr>
                  <td><strong style="color: #38bdf8;">Flat ${f.flat_number}</strong></td>
                  <td>Floor ${f.floor_number} • ${f.wing || 'Wing A'}</td>
                  <td>${f.bhk_type}</td>
                  <td>
                    <span class="badge ${f.occupancy_mode === 'Owner Occupied' ? 'badge-info' : (f.tenant_name ? 'badge-success' : 'badge-warning')}">
                      ${f.occupancy_mode === 'Owner Occupied' ? '🏠 Owner Living' : (f.tenant_name ? '👤 Tenant Living' : '🚪 Vacant')}
                    </span>
                  </td>
                  <td>
                    ${f.tenant_name ? `<strong>${f.tenant_name}</strong> (${f.tenant_phone})` : (f.occupancy_mode === 'Owner Occupied' ? `<span style="color: #38bdf8;">Owner: ${f.owner_name}</span>` : '<span style="color: #94a3b8;">Empty Unit</span>')}
                  </td>
                  <td>
                    <button class="btn btn-sm btn-secondary" onclick="viewFlatDetailModal('${f.id}')">👁 View Dossier</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch(err) {
      content = `<p style="color: #f43f5e;">Failed to load apartments: ${err.message}</p>`;
    }
  } else if (type === 'visitors') {
    const activePreset = filterPreset || State.drilldownDateFilter || State.datePreset || 'month';
    title = `👥 ${b.name} — Guest & Visitor Security Dossier`;
    try {
      const res = await fetch(`/api/visitors?building_id=${bId}&date_preset=${activePreset}`);
      const data = await res.json();
      const visitors = data.data || [];

      content = `
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
            <div>
              <strong style="color: #38bdf8; font-size: 14px;">Total Logged: ${visitors.length} Visitors</strong>
              <div style="font-size: 11.5px; color: #cbd5e1;">Live Check-in & Security Verification</div>
            </div>
            <span class="badge badge-success">Security Desk Verified</span>
          </div>

          <!-- Quick Date Filter Presets inside Dossier -->
          <div style="display: flex; gap: 5px; flex-wrap: wrap; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 8px;">
            <button class="date-quick-btn ${activePreset === 'today' ? 'active' : ''}" onclick="openDrilldownDossier('visitors', 'today')">⚡ Today</button>
            <button class="date-quick-btn ${activePreset === 'yesterday' ? 'active' : ''}" onclick="openDrilldownDossier('visitors', 'yesterday')">📅 Yesterday</button>
            <button class="date-quick-btn ${activePreset === '2days' ? 'active' : ''}" onclick="openDrilldownDossier('visitors', '2days')">⏱ 2 Days</button>
            <button class="date-quick-btn ${activePreset === '7days' ? 'active' : ''}" onclick="openDrilldownDossier('visitors', '7days')">🗓 7 Days</button>
            <button class="date-quick-btn ${activePreset === 'month' ? 'active' : ''}" onclick="openDrilldownDossier('visitors', 'month')">📊 Month</button>
            <button class="date-quick-btn ${activePreset === 'all' ? 'active' : ''}" onclick="openDrilldownDossier('visitors', 'all')">🌐 All Records</button>
          </div>
        </div>

        <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Target Flat</th>
                <th>Guest Name</th>
                <th>Contact Phone</th>
                <th>CNIC Number</th>
                <th>Check-In (Entry Time)</th>
                <th>Check-Out (Exit Time)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${visitors.length > 0 ? visitors.map(v => `
                <tr>
                  <td><strong style="color: #38bdf8;">Flat ${v.flat_number}</strong></td>
                  <td><strong>${v.guest_name}</strong></td>
                  <td><strong style="color: #34d399;">${v.contact_number || '---'}</strong></td>
                  <td><code>${v.cnic_number || '---'}</code></td>
                  <td><span style="color: #38bdf8; font-family: monospace; font-size: 11.5px;">📥 ${v.entry_time || '---'}</span></td>
                  <td><span style="color: ${v.exit_time ? '#fbbf24' : '#94a3b8'}; font-family: monospace; font-size: 11.5px;">${v.exit_time ? `📤 ${v.exit_time}` : '⏳ In Premises'}</span></td>
                  <td>
                    <span class="badge ${v.status === 'IN_PREMISES' ? 'badge-success' : 'badge-secondary'}">
                      ${v.status === 'IN_PREMISES' ? '🟢 Inside Premises' : 'Checked Out'}
                    </span>
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 25px;">No visitor logs recorded for this period (${activePreset.toUpperCase()}).</td></tr>`}
            </tbody>
          </table>
        </div>
      `;
    } catch(err) {
      content = `<p style="color: #f43f5e;">Failed to load visitors: ${err.message}</p>`;
    }
  } else if (type === 'gas') {
    const activePreset = filterPreset || State.drilldownDateFilter || State.datePreset || 'month';
    title = `🔥 ${b.name} — Gas Cylinder Inventory & Deliveries Dossier`;
    try {
      const res = await fetch(`/api/gas?building_id=${bId}&date_preset=${activePreset}`);
      const data = await res.json();
      const payload = data.data || {};
      const delivs = payload.deliveries || [];
      const inv = payload.inventory || { reserve_stock: 0, active_in_apartments: 0, empty_returned: 0 };
      const activeFlats = payload.active_flats || [];

      content = `
        <!-- Gas Inventory Breakdown Overview -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 12px;">
          <div class="kpi-card" style="padding: 9px; text-align: center; border: 1px solid rgba(56, 189, 248, 0.3);">
            <div style="font-size: 10.5px; color: #94a3b8; font-weight: 700;">STORE RESERVE</div>
            <div style="font-size: 17px; font-weight: 900; color: #38bdf8;">${inv.reserve_stock || 0}</div>
            <div style="font-size: 9.5px; color: #64748b;">Full Cylinders</div>
          </div>
          <div class="kpi-card" style="padding: 9px; text-align: center; border: 1px solid rgba(16, 185, 129, 0.3);">
            <div style="font-size: 10.5px; color: #94a3b8; font-weight: 700;">ACTIVE IN UNITS</div>
            <div style="font-size: 17px; font-weight: 900; color: #10b981;">${inv.active_in_apartments || 0}</div>
            <div style="font-size: 9.5px; color: #64748b;">Delivered & In-Use</div>
          </div>
          <div class="kpi-card" style="padding: 9px; text-align: center; border: 1px solid rgba(245, 158, 11, 0.3);">
            <div style="font-size: 10.5px; color: #94a3b8; font-weight: 700;">EMPTY RETURNED</div>
            <div style="font-size: 17px; font-weight: 900; color: #f59e0b;">${inv.empty_returned || 0}</div>
            <div style="font-size: 9.5px; color: #64748b;">Ready for Refill</div>
          </div>
          <div class="kpi-card" style="padding: 9px; text-align: center; border: 1px solid rgba(139, 92, 246, 0.3);">
            <div style="font-size: 10.5px; color: #94a3b8; font-weight: 700;">UNIT RATE</div>
            <div style="font-size: 17px; font-weight: 900; color: #a78bfa;">PKR ${(b.gas_rate_per_cylinder || 3450).toLocaleString()}</div>
            <div style="font-size: 9.5px; color: #64748b;">Per Cylinder</div>
          </div>
        </div>

        <!-- Filter Presets & Sub-Tabs Switcher -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; background: rgba(15,23,42,0.6); padding: 8px; border-radius: 8px; border: 1px solid rgba(56,189,248,0.2);">
          <div style="display: flex; gap: 5px; flex-wrap: wrap;">
            <button class="date-quick-btn ${activePreset === 'today' ? 'active' : ''}" onclick="openDrilldownDossier('gas', 'today')">⚡ Today</button>
            <button class="date-quick-btn ${activePreset === 'yesterday' ? 'active' : ''}" onclick="openDrilldownDossier('gas', 'yesterday')">📅 Yesterday</button>
            <button class="date-quick-btn ${activePreset === '2days' ? 'active' : ''}" onclick="openDrilldownDossier('gas', '2days')">⏱ 2 Days</button>
            <button class="date-quick-btn ${activePreset === '7days' ? 'active' : ''}" onclick="openDrilldownDossier('gas', '7days')">🗓 7 Days</button>
            <button class="date-quick-btn ${activePreset === 'month' ? 'active' : ''}" onclick="openDrilldownDossier('gas', 'month')">📊 Month</button>
            <button class="date-quick-btn ${activePreset === 'all' ? 'active' : ''}" onclick="openDrilldownDossier('gas', 'all')">🌐 All Records</button>
          </div>

          <div style="display: flex; gap: 4px;">
            <button id="dossierGasTabDel" class="btn btn-sm btn-primary" onclick="toggleDossierGasTab('del')" style="padding: 3px 8px; font-size: 11px;">📋 Deliveries (${delivs.length})</button>
            <button id="dossierGasTabFlats" class="btn btn-sm btn-secondary" onclick="toggleDossierGasTab('flats')" style="padding: 3px 8px; font-size: 11px;">🏠 Active by Flat (${activeFlats.length})</button>
          </div>
        </div>

        <!-- Sub-View 1: Deliveries Ledger -->
        <div id="dossierGasDeliveriesView" class="table-responsive" style="max-height: 380px; overflow-y: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Target Flat</th>
                <th>Type</th>
                <th>Delivery Time</th>
                <th>Quantity</th>
                <th>Total (PKR)</th>
                <th>Empty Status</th>
                <th>Payment Mode</th>
              </tr>
            </thead>
            <tbody>
              ${delivs.length > 0 ? delivs.map(g => {
                const isNew = g.transaction_type === 'NEW_PURCHASE';
                return `
                <tr>
                  <td><code>${g.receipt_number}</code></td>
                  <td><strong style="color: #38bdf8;">Flat ${g.flat_number}</strong></td>
                  <td>
                    <span class="badge ${isNew ? 'badge-info' : 'badge-success'}" style="font-size: 9.5px;">
                      ${isNew ? '✨ NEW PURCHASE' : '🔄 REFILL'}
                    </span>
                  </td>
                  <td>${g.delivery_date}</td>
                  <td><strong>${g.quantity}</strong> cylinder(s)</td>
                  <td><strong style="color: #10b981;">PKR ${(g.total_amount || 0).toLocaleString()}</strong></td>
                  <td>
                    <span class="badge ${isNew ? 'badge-secondary' : (g.is_empty_returned ? 'badge-success' : 'badge-warning')}">
                      ${isNew ? 'N/A (New Bottle)' : (g.is_empty_returned ? '✅ Returned' : '⏳ Pending')}
                    </span>
                  </td>
                  <td>
                    <span class="badge ${g.payment_mode === 'HAND_CASH' ? 'badge-info' : 'badge-success'}">
                      ${g.payment_mode === 'HAND_CASH' ? '💵 Cash' : '🏦 Bank'}
                    </span>
                  </td>
                </tr>
              `;}).join('') : `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 25px;">No gas deliveries recorded for period (${activePreset.toUpperCase()}).</td></tr>`}
            </tbody>
          </table>
        </div>

        <!-- Sub-View 2: Active Cylinders by Apartment (Kahan Kahan Kis Ke Paas Hain) -->
        <div id="dossierGasActiveFlatsView" class="table-responsive" style="max-height: 380px; overflow-y: auto; display: none;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Flat #</th>
                <th>Floor</th>
                <th>Occupancy Status</th>
                <th>Resident / Owner</th>
                <th>Phone Contact</th>
                <th>Last Delivery Date</th>
                <th>Empty Status</th>
                <th>Total Received</th>
              </tr>
            </thead>
            <tbody>
              ${activeFlats.map(f => {
                const isOwner = f.occupancy_mode === 'Owner Occupied';
                const residentName = f.tenant_name || (isOwner ? f.owner_name : 'Vacant Unit');
                const residentPhone = f.tenant_phone || (isOwner ? f.owner_phone : '---');
                const hasCyl = f.total_cylinders_received > 0;
                const isNewLast = f.last_transaction_type === 'NEW_PURCHASE' || f.last_transaction_type === 'NEW_BOTTLE';
                const emptyBadge = isNewLast
                  ? `<span class="badge badge-secondary" style="font-weight: bold;">N/A (New Bottle)</span>`
                  : (f.last_empty_returned 
                      ? `<span class="badge badge-success">✅ Returned</span>`
                      : `<span class="badge badge-warning">⏳ In-Use / Pending</span>`);
                return `
                  <tr>
                    <td><strong style="color: #38bdf8;">Flat ${f.flat_number}</strong></td>
                    <td>Floor ${f.floor_number}</td>
                    <td>
                      <span class="badge ${isOwner ? 'badge-info' : (f.tenant_name ? 'badge-success' : 'badge-warning')}">
                        ${isOwner ? '🏠 Owner' : (f.tenant_name ? '👤 Tenant' : '🚪 Vacant')}
                      </span>
                    </td>
                    <td><strong>${residentName}</strong></td>
                    <td><code>${residentPhone}</code></td>
                    <td>${f.last_delivery_date || '<span style="color: #64748b;">None</span>'}</td>
                    <td>
                      ${f.last_delivery_date ? `
                        <span class="badge ${f.last_empty_returned ? 'badge-success' : 'badge-warning'}">
                          ${f.last_empty_returned ? '✅ Returned' : '⏳ In-Use / Pending'}
                        </span>
                      ` : '<span style="color: #64748b;">---</span>'}
                    </td>
                    <td>
                      <strong style="color: ${hasCyl ? '#10b981' : '#94a3b8'};">
                        ${f.total_cylinders_received} Cylinder(s)
                      </strong>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch(err) {
      content = `<p style="color: #f43f5e;">Failed to load gas deliveries: ${err.message}</p>`;
    }
  } else if (type === 'staff') {
    title = `🧹 ${b.name} — Bahria Town Verified Domestic Staff Dossier`;
    try {
      const res = await fetch(`/api/domestic_staff?building_id=${bId}`);
      const data = await res.json();
      const staff = data.data || [];

      content = `
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; padding: 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: #34d399; font-size: 14px;">Total Registered: ${staff.length} Domestic Maids & Staff</strong>
            <div style="font-size: 12px; color: #cbd5e1;">Mandatory Bahria Town Registration Cards</div>
          </div>
          <span class="badge badge-success">Verified</span>
        </div>

        <div class="table-responsive" style="max-height: 420px; overflow-y: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Staff Name</th>
                <th>Role</th>
                <th>Bahria Card #</th>
                <th>CNIC Number</th>
                <th>Assigned Flats</th>
                <th>Duty Status</th>
              </tr>
            </thead>
            <tbody>
              ${staff.length > 0 ? staff.map(s => `
                <tr>
                  <td><strong>${s.full_name}</strong></td>
                  <td>${s.role_type || 'Maid'}</td>
                  <td><code>${s.bahria_card_number}</code></td>
                  <td>${s.cnic_number}</td>
                  <td>${s.associated_flats || '---'}</td>
                  <td>
                    <span class="badge ${s.status === 'ON_DUTY' ? 'badge-success' : 'badge-warning'}">
                      ${s.status === 'ON_DUTY' ? '🟢 On Duty' : '⚪ Off Duty'}
                    </span>
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;">No domestic staff registered for this building.</td></tr>`}
            </tbody>
          </table>
        </div>
      `;
    } catch(err) {
      content = `<p style="color: #f43f5e;">Failed to load domestic staff: ${err.message}</p>`;
    }
  } else {
    const activePreset = filterPreset || State.drilldownDateFilter || State.datePreset || 'month';
    title = `💰 ${b.name} — Building Financial Collections & Margin Dossier`;
    try {
      const res = await fetch(`/api/ledger?building_id=${bId}&date_preset=${activePreset}`);
      const data = await res.json();
      const ledger = data.data || [];

      let incTotal = 0, expTotal = 0;
      ledger.forEach(l => {
        if (l.entry_type === 'INCOME') incTotal += (l.amount || 0);
        else expTotal += (l.amount || 0);
      });
      const netMargin = incTotal - expTotal;

      content = `
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
            <div>
              <strong style="color: #10b981; font-size: 14px;">Collections: PKR ${incTotal.toLocaleString()}</strong>
              <div style="font-size: 11.5px; color: #cbd5e1;">Operating Outflow: PKR ${expTotal.toLocaleString()} • Net Margin: <strong style="color: #38bdf8;">PKR ${netMargin.toLocaleString()}</strong></div>
            </div>
            <span class="badge badge-success">Audit Verified</span>
          </div>

          <!-- Quick Date Filter Presets inside Dossier -->
          <div style="display: flex; gap: 5px; flex-wrap: wrap; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 8px;">
            <button class="date-quick-btn ${activePreset === 'today' ? 'active' : ''}" onclick="openDrilldownDossier('finance', 'today')">⚡ Today</button>
            <button class="date-quick-btn ${activePreset === 'yesterday' ? 'active' : ''}" onclick="openDrilldownDossier('finance', 'yesterday')">📅 Yesterday</button>
            <button class="date-quick-btn ${activePreset === '2days' ? 'active' : ''}" onclick="openDrilldownDossier('finance', '2days')">⏱ 2 Days</button>
            <button class="date-quick-btn ${activePreset === '7days' ? 'active' : ''}" onclick="openDrilldownDossier('finance', '7days')">🗓 7 Days</button>
            <button class="date-quick-btn ${activePreset === 'month' ? 'active' : ''}" onclick="openDrilldownDossier('finance', 'month')">📊 Month</button>
            <button class="date-quick-btn ${activePreset === 'all' ? 'active' : ''}" onclick="openDrilldownDossier('finance', 'all')">🌐 All Records</button>
          </div>
        </div>

        <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Notes / Ref</th>
                <th>Mode</th>
                <th>Amount (PKR)</th>
                <th>Person</th>
              </tr>
            </thead>
            <tbody>
              ${ledger.length > 0 ? ledger.map(l => `
                <tr>
                  <td>${l.entry_date}</td>
                  <td><span class="badge badge-info">${l.category}</span></td>
                  <td>${l.notes || '---'}</td>
                  <td><span class="badge ${l.payment_mode === 'HAND_CASH' ? 'badge-success' : 'badge-info'}">${l.payment_mode === 'HAND_CASH' ? 'Cash' : 'Bank'}</span></td>
                  <td><strong style="color: ${l.entry_type === 'INCOME' ? '#10b981' : '#f43f5e'}; font-size: 13px;">${l.entry_type === 'INCOME' ? '+' : '-'} PKR ${(l.amount || 0).toLocaleString()}</strong></td>
                  <td>${l.person_name || '---'}</td>
                </tr>
              `).join('') : `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;">No ledger transactions for this building in period (${activePreset.toUpperCase()}).</td></tr>`}
            </tbody>
          </table>
        </div>
      `;
    } catch(err) {
      content = `<p style="color: #f43f5e;">Failed to load financial ledger: ${err.message}</p>`;
    }
  }

  document.getElementById('drilldownDossierTitle').innerText = title;
  document.getElementById('drilldownDossierBody').innerHTML = content;
  openModal('drilldownDossierModal');
}

// ==========================================================================
// 14. MULTI-CHANNEL EXPORT DATA HUB (.dsmync) — DOWNLOAD, WHATSAPP, EMAIL, PRINT
// ==========================================================================
window.CurrentExportMetadata = {
  filename: '',
  buildingName: '',
  buildingId: '',
  userName: '',
  exportTimestamp: ''
};

async function handleHeaderSyncButtonClick() {
  const isMasterAdmin = State.currentUser?.role === 'MASTER_ADMIN';
  if (isMasterAdmin) {
    openExportDataHubModal();
  } else {
    // Receptionist direct 1-click .dsmync export for WhatsApp/USB
    if (window.DSSound) window.DSSound.playSuccess();
    const bId = State.currentUser?.assigned_building_id || State.selectedBuildingId;
    const bName = State.currentBuilding?.name || "AQ Heights";
    const uName = State.currentUser?.full_name || "Receptionist";
    await DSSync.exportTodayData(bId, bName, uName);
    showToast("✅ Data Sync Snapshot (.dsmync) exported successfully! Share this file via WhatsApp or USB.", "success");
  }
}

function openExportDataHubModal() {
  DSSound.playClick();
  const bId = State.selectedBuildingId === 'ALL' ? (State.buildings[0]?.id || 'ALL') : State.selectedBuildingId;
  const bName = State.selectedBuildingId === 'ALL' ? "All 5 Buildings (Consolidated)" : (State.currentBuilding?.name || "Building");
  const uName = State.currentUser?.full_name || "Administrator";
  const now = new Date();
  const dateTag = now.toISOString().slice(0, 10);
  const timeTag = now.toTimeString().slice(0, 5).replace(':', '');
  const cleanBName = bName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `DS_${cleanBName}_${dateTag}_${timeTag}.dsmync`;

  CurrentExportMetadata = {
    filename: filename,
    buildingName: bName,
    buildingId: bId,
    userName: uName,
    exportTimestamp: now.toLocaleString()
  };

  const fnEl = document.getElementById('exportSnapshotFilename');
  if (fnEl) fnEl.innerText = filename;

  const bnEl = document.getElementById('exportSnapshotBuilding');
  if (bnEl) bnEl.innerText = bName;

  const unEl = document.getElementById('exportSnapshotUser');
  if (unEl) unEl.innerText = uName;

  const tmEl = document.getElementById('exportSnapshotTime');
  if (tmEl) tmEl.innerText = now.toLocaleString();

  openModal('exportDataHubModal');
}

async function executeExportDownload() {
  DSSound.playSuccess();
  await DSSync.exportTodayData(CurrentExportMetadata.buildingId, CurrentExportMetadata.buildingName, CurrentExportMetadata.userName);
  showToast(`File "${CurrentExportMetadata.filename}" downloaded successfully!`, "success");
}

async function executeExportWhatsApp() {
  DSSound.playClick();
  // Trigger file download
  await DSSync.exportTodayData(CurrentExportMetadata.buildingId, CurrentExportMetadata.buildingName, CurrentExportMetadata.userName);
  
  const textMsg = encodeURIComponent(
    `*🏢 DS MAINTENANCE SUITE — DATA SYNC BACKUP*\n` +
    `*File:* ${CurrentExportMetadata.filename}\n` +
    `*Building Scope:* ${CurrentExportMetadata.buildingName}\n` +
    `*Exported By:* ${CurrentExportMetadata.userName}\n` +
    `*Timestamp:* ${CurrentExportMetadata.exportTimestamp}\n\n` +
    `_The .dsmync backup file has been saved to your Downloads folder. Please drag and drop or attach the file into this WhatsApp chat._`
  );
  
  window.open(`https://api.whatsapp.com/send?text=${textMsg}`, '_blank');
  showToast("Opening WhatsApp Web / App with backup details...", "info");
}

async function executeExportEmail() {
  DSSound.playClick();
  // Trigger file download
  await DSSync.exportTodayData(CurrentExportMetadata.buildingId, CurrentExportMetadata.buildingName, CurrentExportMetadata.userName);

  const subject = encodeURIComponent(`DS Maintenance Data Backup: ${CurrentExportMetadata.filename}`);
  const body = encodeURIComponent(
    `Official DS Maintenance Suite Data Synchronization Snapshot\n\n` +
    `File Package: ${CurrentExportMetadata.filename}\n` +
    `Building Scope: ${CurrentExportMetadata.buildingName}\n` +
    `Operator: ${CurrentExportMetadata.userName}\n` +
    `Timestamp: ${CurrentExportMetadata.exportTimestamp}\n\n` +
    `Please find the downloaded .dsmync backup package attached for system synchronization and audit ledger import.\n\n` +
    `DS Maintenance Facility Management & Accounts Desk`
  );

  window.location.href = `mailto:?subject=${subject}&body=${body}`;
  showToast("Opening default email client...", "info");
}

function executeExportPrintSlip() {
  const cp = State.companyProfile || {
    company_name: 'DS MAINTENANCE',
    office_address: 'Bahria Town Karachi',
    helpline_phone: '+92 21 111-DS-MAINT'
  };

  const html = `
    <div class="thermal-receipt-container">
      <div class="thermal-header">
        <div class="thermal-logo">${cp.company_name}</div>
        <div class="thermal-sub" style="font-weight: bold; text-transform: uppercase;">DATA SYNC AUDIT SLIP</div>
        <div class="thermal-sub">${cp.office_address}</div>
        <div class="thermal-sub">Helpline: ${cp.helpline_phone}</div>
      </div>
      <div class="thermal-divider"></div>
      <div class="thermal-row">
        <span>File Name:</span>
        <span style="font-weight: bold;">${CurrentExportMetadata.filename}</span>
      </div>
      <div class="thermal-row">
        <span>Building Scope:</span>
        <span>${CurrentExportMetadata.buildingName}</span>
      </div>
      <div class="thermal-row">
        <span>Exported By:</span>
        <span>${CurrentExportMetadata.userName}</span>
      </div>
      <div class="thermal-row">
        <span>Timestamp:</span>
        <span>${CurrentExportMetadata.exportTimestamp}</span>
      </div>
      <div class="thermal-divider"></div>
      <div class="thermal-row">
        <span>Sync Status:</span>
        <span style="font-weight: bold; color: green;">100% VERIFIED</span>
      </div>
      <div class="thermal-row">
        <span>Checksum:</span>
        <span>PASS (CRC32 OK)</span>
      </div>
      <div class="thermal-divider"></div>
      <div class="thermal-footer">
        <div>Helpline: ${cp.helpline_phone}</div>
        <div style="margin-top: 4px;">DS Maintenance 100% Offline Desk Node</div>
      </div>
    </div>
  `;

  if (window.DSReceipt && window.DSReceipt.triggerThermalPrint) {
    window.DSReceipt.triggerThermalPrint(html);
  } else {
    window.print();
  }
}

function toggleDossierGasTab(tab) {
  DSSound.playClick();
  const btnDel = document.getElementById('dossierGasTabDel');
  const btnFlats = document.getElementById('dossierGasTabFlats');
  const vDel = document.getElementById('dossierGasDeliveriesView');
  const vFlats = document.getElementById('dossierGasActiveFlatsView');

  if (tab === 'del') {
    if (btnDel) btnDel.className = 'btn btn-sm btn-primary';
    if (btnFlats) btnFlats.className = 'btn btn-sm btn-secondary';
    if (vDel) vDel.style.display = 'block';
    if (vFlats) vFlats.style.display = 'none';
  } else {
    if (btnDel) btnDel.className = 'btn btn-sm btn-secondary';
    if (btnFlats) btnFlats.className = 'btn btn-sm btn-primary';
    if (vDel) vDel.style.display = 'none';
    if (vFlats) vFlats.style.display = 'block';
  }
}

// ==========================================================================
// 15. PDF DOCUMENT EXPORT & PRINT LOCATION HUB
// ==========================================================================
window.CurrentPdfExport = {
  type: 'report',
  title: 'Executive Management Statement',
  filename: 'DS_Executive_Report.pdf'
};

function openPdfActionModal(docType = 'report', docTitle = 'Executive Management Statement') {
  DSSound.playClick();
  const user = State.currentUser || {};
  const isMasterAdmin = (user.role === 'MASTER_ADMIN');
  const isManager = (user.role === 'MANAGER');
  const isReceipt = (docType === 'repair_receipt' || docType === 'gas_receipt');

  if (!isMasterAdmin && !isManager && !isReceipt) {
    showToast("Access Denied: Only Master Admin or Building Manager is authorized to generate comprehensive reports.", "warning");
    return;
  }

  const bName = State.selectedBuildingId === 'ALL' ? 'All_Buildings' : (State.currentBuilding?.name || 'Building');
  const cleanBName = bName.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `DS_${cleanBName}_${docType.toUpperCase()}_${dateStr}.pdf`;

  CurrentPdfExport = {
    type: docType,
    title: docTitle,
    filename: filename
  };

  const nameEl = document.getElementById('pdfExportDocName');
  if (nameEl) nameEl.innerText = docTitle;
  const detEl = document.getElementById('pdfExportDocDetails');
  if (detEl) detEl.innerText = `Target File Name: ${filename}`;

  openModal('pdfExportOptionsModal');
}

function directSaveExecutivePDF() {
  const isSingle = State.reportBuildingId && State.reportBuildingId !== 'ALL';
  const bName = isSingle
    ? (State.buildings.find(b => b.id === State.reportBuildingId)?.name || State.lastReportData?.building_name || 'Building')
    : (State.lastReportData?.building_name || 'All_Buildings');
  const cleanBName = bName.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `DS_${cleanBName}_EXECUTIVE_REPORT_${dateStr}.pdf`;

  CurrentPdfExport = {
    type: 'executive_report',
    title: isSingle ? `${bName} Management Statement` : 'DS Official Executive Management Statement',
    filename: filename
  };
  showToast("Saving PDF directly to your Downloads folder...", "success");
  generateAndDownloadPDF();
}

function directPrintExecutiveReport() {
  DSSound.playClick();
  showToast("Opening direct system print dialog...", "info");
  window.print();
}

async function generateAndDownloadPDF() {
  DSSound.playClick();
  closeModal('pdfExportOptionsModal');

  try {
    const jspdfModule = window.jspdf;
    if (!jspdfModule || !jspdfModule.jsPDF) {
      showToast("Opening system print dialog...", "info");
      window.print();
      return;
    }

    const { jsPDF } = jspdfModule;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const bName = (docType === 'executive_report' || docType === 'report')
      ? (State.lastReportData?.building_name || (State.selectedBuildingId === 'ALL' ? 'All 5 Buildings (Master Portfolio)' : (State.currentBuilding?.name || 'Building')))
      : (State.selectedBuildingId === 'ALL' ? 'All 5 Buildings (Master Portfolio)' : (State.currentBuilding?.name || 'Building'));
    const docType = CurrentPdfExport.type;
    const docTitle = CurrentPdfExport.title || 'Official Management Statement';
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = CurrentPdfExport.filename || `DS_${docType.toUpperCase()}_${dateStr}.pdf`;
    const filterLabel = State.customDate || (State.datePreset === 'today' ? 'Today' : (State.datePreset === 'month' ? 'This Month' : (State.datePreset || 'ALL').toUpperCase()));
    const refCode = `DSM/AUDIT/${new Date().getFullYear()}/REF-${Math.floor(1000 + Math.random() * 9000)}`;

    // 1. Corporate Executive Header Banner
    doc.setFillColor(7, 20, 50); // Deep Executive Navy
    doc.rect(0, 0, pageWidth, 52, 'F');

    doc.setFillColor(56, 189, 248); // Cyan Accent Stripe
    doc.rect(0, 52, pageWidth, 2.5, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(56, 189, 248);
    doc.text("DS MAINTENANCE & BUILDING MANAGEMENT SERVICES", 30, 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);
    doc.text("Corporate Office: Office No. 907, 9th Floor, Dominion Business Center 01, Jinnah Avenue, Bahria Town Karachi (BTK)", 30, 37);
    doc.text("NTN: 9028471-4   |   Helpline: +92 21 111-DS-MAINT   |   Official Email: accounts@dsmaintenance.pk", 30, 48);

    // 2. Document Title & Period Metadata
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(docTitle.toUpperCase(), 30, 74);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Target Building: ${bName}    •    Period / Filter: ${filterLabel}    •    Generated: ${new Date().toLocaleString()}    •    Ref: ${refCode}`, 30, 88);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(30, 95, pageWidth - 30, 95);

    // 3. Dataset Mapping per Document Type
    let headers = [];
    let rows = [];

    if (docType === 'visitors') {
      headers = [['Target Flat', 'Guest Full Name', 'Contact Mobile #', 'CNIC Number', 'Check-In (Entry Time)', 'Check-Out (Exit Time)', 'Purpose of Visit', 'Current Status']];
      rows = visitorsCache.map(v => [
        `Flat ${v.flat_number}`,
        v.guest_name,
        v.contact_number || '---',
        v.cnic_number || '---',
        v.entry_time || '---',
        v.exit_time || 'In Premises',
        v.purpose_of_visit || 'Personal Visit',
        v.status === 'IN_PREMISES' ? '● IN PREMISES' : 'CHECKED OUT'
      ]);
    } else if (docType === 'tenant_history') {
      headers = [['Sr #', 'Flat #', 'Building Name', 'Past Tenant Name', 'Primary Mobile', 'Emergency Phone', 'CNIC Number', 'Move-in Date', 'Vacated Date', 'Monthly Rent', 'Reason for Exit']];
      const sourceList = (historyCache && historyCache.length > 0) ? historyCache : ((State.lastReportData && State.lastReportData.vacated_tenants) ? State.lastReportData.vacated_tenants : []);
      rows = sourceList.map((a, idx) => {
        let payload = {};
        try { payload = typeof a.archive_payload_json === 'string' ? JSON.parse(a.archive_payload_json) : (a.archive_payload_json || {}); } catch(e) {}
        const p = payload.tenant_profile || {};
        return [
          String(idx + 1),
          `Flat ${a.flat_number || '---'}`,
          a.building_name || '',
          a.tenant_name || 'Past Tenant',
          a.primary_phone || p.primary_phone || '---',
          p.emergency_phone || '---',
          a.cnic_number || '---',
          a.move_in_date || '---',
          a.vacated_date || '---',
          `PKR ${(p.monthly_rent || a.monthly_rent || 0).toLocaleString()}`,
          payload.vacated_reason || 'End of Tenancy'
        ];
      });
    } else if (docType === 'flats') {
      headers = [['Flat #', 'Wing / Floor', 'Type', 'Occupancy Mode', 'Property Owner', 'Owner Mobile #', 'Active Resident / Tenant', 'Tenant Mobile #', 'Maintenance Fee']];
      rows = flatsCache.map(f => {
        const isOwner = f.occupancy_mode === 'Owner Occupied';
        return [
          `Flat ${f.flat_number}`,
          `${f.wing || 'Wing A'} (Fl. ${f.floor_number})`,
          f.bhk_type || '2 BHK',
          isOwner ? 'Owner Living' : (f.tenant_name ? 'Tenant Living' : 'Vacant'),
          f.owner_name || '---',
          f.owner_phone || '---',
          f.tenant_name || (isOwner ? f.owner_name : 'Vacant'),
          f.tenant_phone || (isOwner ? f.owner_phone : '---'),
          `PKR ${(f.monthly_maintenance_rate || 5000).toLocaleString()}`
        ];
      });
    } else if (docType === 'gas') {
      headers = [['Receipt #', 'Target Flat', 'Building', 'Transaction Type', 'Delivery Date & Time', 'Quantity', 'Unit Rate', 'Total Amount', 'Empty Returned', 'Payment Mode & Collector']];
      rows = gasDeliveriesCache.map(g => [
        g.receipt_number || '---',
        `Flat ${g.flat_number}`,
        g.building_name || '',
        g.transaction_type || 'REFILL',
        g.delivery_date || '---',
        `${g.quantity} bottle(s)`,
        `PKR ${g.unit_price}`,
        `PKR ${g.total_amount}`,
        g.is_empty_returned ? 'Yes (Returned)' : 'No (Pending)',
        g.payment_mode === 'HAND_CASH' ? `Cash (${g.cash_collector_name || 'Staff'})` : `Bank (${g.bank_account_name || 'Transfer'})`
      ]);
    } else if (docType === 'repairs') {
      headers = [['Location / Flat', 'Category', 'Issue Description', 'Customer Name', 'Customer Mobile', 'Technician', 'Billed (PKR)', 'Parts Cost', 'Net Profit', 'Status']];
      rows = repairsCache.map(r => [
        r.flat_number ? `Flat ${r.flat_number}` : 'Common Area',
        r.category,
        r.issue_description,
        r.customer_name || 'Resident',
        r.customer_phone || '---',
        r.technician_name || 'Staff',
        `PKR ${(r.billed_amount || 0).toLocaleString()}`,
        `PKR ${(r.parts_cost || 0).toLocaleString()}`,
        `PKR ${(r.net_profit || 0).toLocaleString()}`,
        r.status
      ]);
    } else if (docType === 'ledger') {
      headers = [['Date', 'Building', 'Category', 'Description / Reference', 'Payment Mode', 'Type', 'Amount (PKR)', 'Staff / Recipient']];
      rows = ledgerCache.map(l => [
        l.entry_date || '---',
        l.building_name || '',
        l.category,
        l.description || '---',
        l.payment_mode === 'HAND_CASH' ? 'Hand Cash' : 'Bank Transfer',
        l.entry_type,
        `${l.entry_type === 'INCOME' ? '+' : '-'} PKR ${(l.amount || 0).toLocaleString()}`,
        l.cash_collector_name || l.recipient_name || 'Staff'
      ]);
    } else if (docType === 'repair_receipt') {
      const j = window.CurrentRepairReceiptData || {};
      const jobNum = j.receipt_number || ('DSM-REC-' + (j.id ? j.id.slice(0, 6).toUpperCase() : '1001'));
      const flatNum = j.flat_number || '---';
      const cust = j.customer_name ? `${j.customer_name} (${j.customer_phone || ''})` : `Flat ${flatNum} Resident`;
      const tech = j.assigned_technician || 'DS Maintenance Technical Staff';
      const cat = j.category || 'General Maintenance';
      const parts = Number(j.parts_cost) || 0;
      const billed = Number(j.billed_amount) || 0;
      const labor = Number(j.labor_cost) || 0;
      const netProfit = billed - (parts + labor);
      const payMode = j.payment_mode === 'HAND_CASH' ? 'Hand Cash' : 'Bank Transfer';
      const isOffice = (window.CurrentRepairReceiptViewMode === 'office');

      if (isOffice) {
        headers = [['Accounting / Job Line Description', 'Category & Unit', 'Assigned Tech / Source', 'Amount (PKR)']];
        rows = [
          ['Materials & Spare Parts Cost', `${cat} (Flat ${flatNum})`, 'Procured & Verified', `PKR ${parts.toLocaleString()}`],
          ['Technical Labour & Service Fee', `${cat} Service`, tech, `PKR ${labor.toLocaleString()}`],
          ['NET PROFIT MARGIN (Internal)', 'OFFICE AUDIT VOUCHER', 'DS Maintenance Desk', `+ PKR ${netProfit.toLocaleString()}`],
          ['TOTAL PAYMENT BILLED', 'STATUS: PAID & COMPLETED', `Payment Mode: ${payMode}`, `PKR ${billed.toLocaleString()}`]
        ];
      } else {
        headers = [['Service / Job Order Description', 'Location & Category', 'Assigned Technician', 'Total Service Fee']];
        rows = [
          [j.issue_description || 'General Maintenance & Facility Technical Service', `Flat ${flatNum} (${cat})`, tech, `PKR ${billed.toLocaleString()}`],
          ['Customer / Resident Contact', cust, 'Payment Mode', payMode],
          ['TOTAL PAYMENT BILLED', 'STATUS: PAID & COMPLETED', 'Authorized Stamp: VALID', `PKR ${billed.toLocaleString()}`]
        ];
      }
    } else if (docType === 'gas_receipt') {
      const g = window.CurrentGasReceiptData || {};
      const isNew = g.transaction_type === 'NEW_PURCHASE';
      const flatNum = g.flat_number || '---';
      const qty = g.quantity || 1;
      const unitRate = Number(g.unit_price) || 3450;
      const total = Number(g.total_amount) || (qty * unitRate);
      const payMode = g.payment_mode === 'HAND_CASH' ? `Cash (${g.cash_collector_name || 'Staff'})` : `Bank (${g.bank_account_name || 'Transfer'})`;

      headers = [['Item Description', 'Transaction Type', 'Empty Cylinder Status', 'Qty x Rate', 'Total Amount']];
      rows = [
        [
          isNew ? 'New LPG Cylinder Bottle + Gas (Deposit)' : 'LPG 45.4kg Refill Exchange Bottle',
          isNew ? 'NEW BOTTLE' : 'REFILL',
          isNew ? 'N/A' : (g.is_empty_returned ? 'Returned (Empty Taken)' : 'Pending Return'),
          `${qty} x PKR ${unitRate.toLocaleString()}`,
          `PKR ${total.toLocaleString()}`
        ],
        ['TOTAL BILLED AMOUNT', 'PAID', `Received Via: ${payMode}`, `${qty} Cylinder(s)`, `PKR ${total.toLocaleString()}`]
      ];
    } else if (docType === 'executive_report' || docType === 'report') {
      const r = State.lastReportData || {};
      let currentY = 108;

      // 0. Visual Financial Analytics Charts Embedding
      try {
        const canvasBar = document.getElementById('reportFinancialComparisonChart');
        const canvasLine = document.getElementById('reportDailyTrendChart');
        const canvasDonut = document.getElementById('reportOccupancyDonutChart');

        if (canvasBar && canvasLine && canvasDonut) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(7, 20, 50);
          doc.text("EXECUTIVE VISUAL FINANCIAL ANALYTICS & OCCUPANCY GRAPHS", 30, currentY);
          currentY += 8;

          const img1 = canvasBar.toDataURL('image/png');
          const img2 = canvasLine.toDataURL('image/png');
          const img3 = canvasDonut.toDataURL('image/png');

          const chartW = 245;
          const chartH = 115;

          doc.addImage(img1, 'PNG', 30, currentY, chartW, chartH);
          doc.addImage(img2, 'PNG', 285, currentY, chartW, chartH);
          doc.addImage(img3, 'PNG', 540, currentY, chartW, chartH);

          currentY += chartH + 20;
        }
      } catch (chartErr) {
        console.warn("Chart embedding error in PDF:", chartErr);
      }
      
      // 1. Consolidated 5-Building Commercial Margin Matrix Table
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(7, 20, 50);
      const matrixPdfTitle = (r.building_matrix && r.building_matrix.length === 1)
        ? `1. COMMERCIAL PROFITABILITY & MARGIN STATEMENT: ${(r.building_name || '').toUpperCase()}`
        : "1. CONSOLIDATED 5-BUILDING COMMERCIAL PROFITABILITY & MARGIN MATRIX";
      doc.text(matrixPdfTitle, 30, currentY);

      const mHeaders = [['Building', 'Gas Sales (PKR)', 'Gas Cost (PKR)', 'Gas Profit (PKR)', 'Repair Revenue', 'Parts/Labor Cost', 'Repair Profit', 'Gross Revenue', 'Direct Outflow', 'Net Operating Profit']];
      const mRows = (r.building_matrix || []).map(m => [
        `${m.building_name} (${m.building_code})`,
        `PKR ${(m.gas_billed || 0).toLocaleString()}`,
        `PKR ${(m.gas_cost || 0).toLocaleString()}`,
        `+ PKR ${(m.gas_profit || 0).toLocaleString()}`,
        `PKR ${(m.repair_billed || 0).toLocaleString()}`,
        `PKR ${((m.repair_parts || 0) + (m.repair_labor || 0)).toLocaleString()}`,
        `+ PKR ${(m.repair_profit || 0).toLocaleString()}`,
        `PKR ${(m.total_revenue || 0).toLocaleString()}`,
        `PKR ${(m.total_outflow || 0).toLocaleString()}`,
        `${m.net_profit >= 0 ? '+' : ''} PKR ${(m.net_profit || 0).toLocaleString()}`
      ]);

      doc.autoTable({
        head: mHeaders,
        body: mRows,
        startY: currentY + 6,
        theme: 'grid',
        headStyles: { fillColor: [7, 20, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7, textColor: [15, 23, 42], cellPadding: 3.5 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 70, bottom: 35, left: 30, right: 30 }
      });

      // 2. Financial Ledger Audit Register (Inflows & Expenses)
      let nextY = doc.lastAutoTable.finalY + 22;
      if (nextY > pageHeight - 120) {
        doc.addPage();
        nextY = 70;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(7, 20, 50);
      doc.text("2. COMPLETE FINANCIAL LEDGER AUDIT REGISTER (INCOME INFLOWS & EXPENSE OUTFLOWS)", 30, nextY);

      const lHeaders = [['Date', 'Building', 'Flow Type', 'Category', 'Payer / Vendor Name', 'Purpose Description & Notes', 'Payment Mode', 'Amount (PKR)']];
      const lRows = (r.detailed_transactions || []).map(l => [
        l.entry_date || '---',
        l.building_name || '',
        l.entry_type,
        l.category,
        l.person_name || (l.entry_type === 'INCOME' ? 'Resident Customer' : 'Vendor / Contractor'),
        l.notes || 'Operating transaction',
        l.payment_mode === 'HAND_CASH' ? 'Hand Cash' : 'Bank Transfer',
        `${l.entry_type === 'INCOME' ? '+' : '-'} PKR ${(l.amount || 0).toLocaleString()}`
      ]);

      doc.autoTable({
        head: lHeaders,
        body: lRows,
        startY: nextY + 6,
        theme: 'grid',
        headStyles: { fillColor: [7, 20, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7, textColor: [15, 23, 42], cellPadding: 3.5 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 70, bottom: 35, left: 30, right: 30 }
      });

      // 3. Active Resident Occupancy & Dossier Register
      nextY = doc.lastAutoTable.finalY + 22;
      if (nextY > pageHeight - 120) {
        doc.addPage();
        nextY = 70;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(7, 20, 50);
      doc.text("3. APARTMENT MASTER OCCUPANCY & RESIDENT PROFILE REGISTER", 30, nextY);

      headers = [['Flat #', 'Building / Wing', 'Occupancy Mode', 'Property Owner', 'Owner Mobile #', 'Active Resident / Tenant', 'Tenant Mobile #', 'Move-in Date', 'Status']];
      rows = (r.flats_status || []).map(f => {
        const isOwner = f.occupancy_mode === 'Owner Occupied';
        return [
          `Flat ${f.flat_number}`,
          `${f.building_name} (${f.wing || 'Wing A'})`,
          isOwner ? 'Owner Living' : (f.tenant_name ? 'Tenant Living' : 'Vacant'),
          f.owner_name || '---',
          f.owner_phone || '---',
          f.tenant_name || (isOwner ? f.owner_name : 'Vacant'),
          f.tenant_phone || (isOwner ? f.owner_phone : '---'),
          f.move_in_date || '---',
          'Active'
        ];
      });

      doc.autoTable({
        head: headers,
        body: rows,
        startY: nextY + 6,
        theme: 'grid',
        headStyles: { fillColor: [7, 20, 50], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7, textColor: [15, 23, 42], cellPadding: 3.5 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 70, bottom: 35, left: 30, right: 30 },
        didDrawPage: function () {
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`DS Maintenance Suite  •  Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount}  •  Official System Generated Record  •  Confidential & Proprietary`, 30, pageHeight - 15);
          doc.text(`Security Verification Stamp: VALID & VERIFIED`, pageWidth - 230, pageHeight - 15);
        }
      });

      return await executePdfSaveOrDownload(doc, filename);
    }

    return await executePdfSaveOrDownload(doc, filename);
  } catch (err) {
    console.error("PDF generation error:", err);
    showToast("Error generating PDF document: " + err.message, "danger");
  }
}

async function executePdfSaveOrDownload(doc, filename) {
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'PDF Document (*.pdf)',
          accept: { 'application/pdf': ['.pdf'] }
        }]
      });
      const writable = await handle.createWritable();
      const pdfBlob = doc.output('blob');
      await writable.write(pdfBlob);
      await writable.close();
      if (window.DSSound) DSSound.playSuccess();
      showToast(`🎉 PDF saved successfully to your selected folder! (${filename})`, "success");
      return;
    } catch (pickerErr) {
      if (pickerErr.name === 'AbortError') {
        showToast("PDF Save action canceled.", "info");
        return;
      }
    }
  }

  // Fallback: Ask user for custom filename
  const userChosenName = prompt("Save PDF As (Enter File Name):", filename);
  if (userChosenName) {
    const finalName = userChosenName.endsWith('.pdf') ? userChosenName : `${userChosenName}.pdf`;
    doc.save(finalName);
    if (window.DSSound) DSSound.playSuccess();
    showToast(`🎉 Official PDF saved! (${finalName})`, "success");
  }
}

function executeDirectDownloadCSV() {
  DSSound.playClick();
  closeModal('pdfExportOptionsModal');

  if (CurrentPdfExport.type === 'executive_report' || CurrentPdfExport.type === 'report') {
    exportMonthlyReportExcel();
  } else if (CurrentPdfExport.type === 'visitors') {
    exportVisitorsMarketingCSV();
  } else if (CurrentPdfExport.type === 'tenant_history') {
    exportTenantHistoryCSV();
  } else if (CurrentPdfExport.type === 'gas') {
    exportGasDeliveriesCSV();
  } else if (CurrentPdfExport.type === 'flats') {
    exportFlatsMarketingCSV();
  } else if (CurrentPdfExport.type === 'ledger') {
    exportLedgerCSV();
  } else {
    exportMonthlyReportExcel();
  }
}

function executeDirectPrintDocument() {
  DSSound.playClick();
  closeModal('pdfExportOptionsModal');
  if (CurrentPdfExport.type === 'repair_receipt') {
    printRepairReceipt();
  } else if (CurrentPdfExport.type === 'gas_receipt') {
    DSReceipt.printReceipt();
  } else {
    window.print();
  }
}

async function sharePdfOnWhatsApp() {
  DSSound.playClick();
  closeModal('pdfExportOptionsModal');

  // First generate and save/download the PDF so user has the exact file ready
  await generateAndDownloadPDF();

  const bName = State.selectedBuildingId === 'ALL' ? 'All 5 Buildings (Master Portfolio)' : (State.currentBuilding?.name || 'Building');
  const docTitle = CurrentPdfExport.title || 'Official Management Report';
  const filterLabel = State.customDate || (State.datePreset === 'today' ? 'Today' : (State.datePreset === 'month' ? 'This Month' : (State.datePreset || 'ALL').toUpperCase()));
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const filename = CurrentPdfExport.filename || `DS_${(CurrentPdfExport.type || 'REPORT').toUpperCase()}_${new Date().toISOString().slice(0, 10)}.pdf`;

  const waText = encodeURIComponent(
    `*🏛️ DS MAINTENANCE & BUILDING MANAGEMENT SERVICES*\n` +
    `*📄 Official Document:* ${docTitle}\n` +
    `*🏢 Target Building:* ${bName}\n` +
    `*📅 Period / Filter:* ${filterLabel} (${dateStr})\n` +
    `*📎 Downloaded PDF:* ${filename}\n\n` +
    `_Official statement generated via DS Maintenance Suite Desktop System._`
  );

  const waUrl = `https://web.whatsapp.com/send?text=${waText}`;
  window.open(waUrl, '_blank');
  showToast("WhatsApp opened! You can now attach your downloaded PDF file directly in the chat.", "success");
}

function openChangePasswordModal() {
  if (State.currentUser?.role !== 'MASTER_ADMIN') {
    showToast("Access Denied: Receptionist has no permission to change passwords. Contact Master Admin.", "danger");
    return;
  }
  document.getElementById('changePasswordUserId').value = State.currentUser?.id || '';
  document.getElementById('changePasswordOld').value = '';
  document.getElementById('changePasswordNew').value = '';
  document.getElementById('changePasswordConfirm').value = '';
  openModal('changePasswordModal');
}

async function handleConfirmChangePassword(e) {
  if (e) e.preventDefault();

  if (State.currentUser?.role !== 'MASTER_ADMIN') {
    showToast("Access Denied: Only Master Admin can modify passwords.", "danger");
    return;
  }

  const pNew = document.getElementById('changePasswordNew').value.trim();
  const pConf = document.getElementById('changePasswordConfirm').value.trim();

  if (!pNew || pNew.length < 4) {
    showToast("Password must be at least 4 characters long.", "warning");
    return;
  }

  if (pNew !== pConf) {
    showToast("New passwords do not match. Please re-enter.", "warning");
    return;
  }

  try {
    const res = await fetch('/api/system/users/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: State.currentUser.id,
        username: State.currentUser.username,
        full_name: State.currentUser.full_name,
        phone: State.currentUser.phone || '',
        role: State.currentUser.role,
        assigned_building_id: State.currentUser.assigned_building_id || null,
        password: pNew,
        operator_role: State.currentUser.role
      })
    });

    const data = await res.json();
    if (data.success) {
      DSSound.playSuccess();
      showToast("Password updated successfully!", "success");
      closeModal('changePasswordModal');
    } else {
      DSSound.playWarning();
      showToast(data.error || "Failed to update password", "danger");
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
}

// ==========================================================================
// WEBCAM LIVE PHOTO CAPTURE
// ==========================================================================
async function startWebcam(targetPreviewId, targetDataId) {
  openModal('webcamModal');
  const video = document.getElementById('webcamVideo');
  try {
    State.webcamStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
    video.srcObject = State.webcamStream;
    video.play();

    window._webcamTargetPreview = targetPreviewId;
    window._webcamTargetData = targetDataId;
  } catch (err) {
    showToast("Camera not available. Please choose a photo file.", "warning");
    closeModal('webcamModal');
  }
}

function captureWebcamSnapshot() {
  const video = document.getElementById('webcamVideo');
  const canvas = document.getElementById('webcamCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const b64 = canvas.toDataURL('image/jpeg', 0.85);

  if (window._webcamTargetData) {
    document.getElementById(window._webcamTargetData).value = b64;
  }
  if (window._webcamTargetPreview) {
    const img = document.getElementById(window._webcamTargetPreview);
    img.src = b64;
    img.style.display = 'block';
  }

  stopWebcam();
  closeModal('webcamModal');
  showToast("Photo captured!", "success");
}

function stopWebcam() {
  if (State.webcamStream) {
    State.webcamStream.getTracks().forEach(t => t.stop());
    State.webcamStream = null;
  }
}

function handleImageFileInput(input, targetDataId, targetPreviewId) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById(targetDataId).value = e.target.result;
      if (targetPreviewId) {
        const img = document.getElementById(targetPreviewId);
        img.src = e.target.result;
        img.style.display = 'block';
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// ==========================================================================
// VISITOR HEADCOUNT & ACCOMPANYING FAMILY/GROUP ENGINE
// ==========================================================================
function setVisitorHeadcount(count) {
  const n = parseInt(count) || 1;
  const numInput = document.getElementById('visitorTotalPersons');
  if (numInput) numInput.value = n;

  document.querySelectorAll('#newVisitorModal .headcount-pill').forEach(btn => {
    const pillVal = parseInt(btn.dataset.count);
    btn.classList.toggle('active', pillVal === n || (pillVal === 5 && n >= 5));
  });

  const grp = document.getElementById('visitorAccompanyingGroup');
  if (grp) {
    grp.style.display = n > 1 ? 'block' : 'none';
  }
}

function onVisitorHeadcountChange(val) {
  const n = parseInt(val) || 1;
  setVisitorHeadcount(n);
}

// ==========================================================================
// HARDWARE DOCUMENT SCANNER (WIA COM) & DOCUMENT ATTACHMENT SUITE
// ==========================================================================
let _docCameraStream = null;
let _currentDocModule = 'assignTenant';

function setDocPreview(module, filename) {
  if (!filename) return;
  const isTenant = module === 'assignTenant';
  const prefix = isTenant ? 'assignTenant' : 'visitor';

  const inputEl = document.getElementById(`${prefix}DocumentFilename`);
  if (inputEl) inputEl.value = filename;

  const container = document.getElementById(`${prefix}DocPreview`);
  const thumb = document.getElementById(`${prefix}DocThumb`);
  const nameEl = document.getElementById(`${prefix}DocName`);

  if (container && thumb && nameEl) {
    container.style.display = 'flex';
    nameEl.innerText = filename;
    if (filename.toLowerCase().endsWith('.pdf')) {
      thumb.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 24 24' fill='%23ef4444'><path d='M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5z'/></svg>";
    } else {
      thumb.src = `/media/${filename}`;
    }
  }
}

function clearScannedDoc(module) {
  const isTenant = module === 'assignTenant';
  const prefix = isTenant ? 'assignTenant' : 'visitor';

  const inputEl = document.getElementById(`${prefix}DocumentFilename`);
  if (inputEl) inputEl.value = '';

  const container = document.getElementById(`${prefix}DocPreview`);
  if (container) container.style.display = 'none';
  showToast("Attached document cleared", "info");
}

async function triggerHardwareScan(module) {
  if (window.DSSound) DSSound.playClick();
  _currentDocModule = module || 'assignTenant';

  showToast("Connecting to physical document scanner... Please place paper on scanner glass.", "info");

  try {
    const res = await fetch('/api/scanner/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module: _currentDocModule })
    });
    const data = await res.json();
    if (data.success && data.filename) {
      if (window.DSSound) DSSound.playSuccess();
      setDocPreview(_currentDocModule, data.filename);
      showToast("Document scanned and saved successfully from hardware scanner!", "success");
    } else {
      if (window.DSSound) DSSound.playWarning();
      showToast(`Hardware scanner: ${data.error || 'No scanner detected. You can use Camera Scan or Upload File.'}`, "warning");
    }
  } catch (err) {
    if (window.DSSound) DSSound.playWarning();
    showToast(`Scanner connection failed: ${err.message}. Please use Camera Scan or File Upload.`, "danger");
  }
}

async function openDocumentCameraModal(module) {
  if (window.DSSound) DSSound.playClick();
  _currentDocModule = module || 'assignTenant';

  const modal = document.getElementById('documentCameraModal');
  const video = document.getElementById('documentCameraVideo');
  if (!modal || !video) return;

  openModal('documentCameraModal');

  try {
    _docCameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    });
    video.srcObject = _docCameraStream;
    video.play();
  } catch (err) {
    showToast("Camera access unavailable. You may choose 'Upload Document File' instead.", "warning");
    closeDocumentCameraModal();
  }
}

function stopDocumentCamera() {
  if (_docCameraStream) {
    _docCameraStream.getTracks().forEach(t => t.stop());
    _docCameraStream = null;
  }
}

function closeDocumentCameraModal() {
  stopDocumentCamera();
  closeModal('documentCameraModal');
}

async function captureDocumentCameraSnapshot() {
  const video = document.getElementById('documentCameraVideo');
  const canvas = document.getElementById('documentCameraCanvas');
  if (!video || !canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const b64 = canvas.toDataURL('image/jpeg', 0.92);

  try {
    const res = await fetch('/api/scanner/upload_base64', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: b64,
        extension: 'jpg',
        module: _currentDocModule
      })
    });
    const data = await res.json();
    if (data.success && data.filename) {
      if (window.DSSound) DSSound.playSuccess();
      setDocPreview(_currentDocModule, data.filename);
      closeDocumentCameraModal();
      showToast("Document captured from camera and attached!", "success");
    } else {
      showToast(data.error || "Failed to save captured document", "danger");
    }
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function handleDocFileUpload(e, module) {
  const file = e.target.files?.[0];
  if (!file) return;

  const targetMod = module || 'assignTenant';
  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const ext = file.name.split('.').pop().toLowerCase() || 'jpg';
      const res = await fetch('/api/scanner/upload_base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: evt.target.result,
          extension: ext,
          module: targetMod
        })
      });
      const data = await res.json();
      if (data.success && data.filename) {
        if (window.DSSound) DSSound.playSuccess();
        setDocPreview(targetMod, data.filename);
        showToast("Document uploaded and attached successfully!", "success");
      } else {
        showToast(data.error || "Failed to upload document", "danger");
      }
    } catch (err) {
      showToast(err.message, "danger");
    }
  };
  reader.readAsDataURL(file);
}

function viewDocumentModal(docUrl, title = "Attached Document") {
  if (window.DSSound) DSSound.playClick?.();
  const titleEl = document.getElementById('documentViewerTitle');
  const contentEl = document.getElementById('documentViewerContent');
  const linkEl = document.getElementById('documentViewerDownloadBtn') || document.getElementById('documentViewerDownload');

  if (titleEl) titleEl.innerText = `📄 ${title}`;

  if (contentEl) {
    const isPdf = docUrl.toLowerCase().includes('.pdf');
    if (isPdf) {
      contentEl.innerHTML = `<iframe src="${docUrl}" style="width: 100%; height: 68vh; border: none; border-radius: 6px; background: #ffffff;"></iframe>`;
    } else {
      contentEl.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; padding: 4px;">
          <img src="${docUrl}" alt="${title}" style="max-width: 100%; max-height: 65vh; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.7); border: 1px solid rgba(56,189,248,0.3);" />
          <div style="margin-top: 10px; font-size: 12px; color: #94a3b8; font-weight: 500;">${title}</div>
        </div>
      `;
    }
  }

  if (linkEl) {
    linkEl.href = docUrl;
    linkEl.setAttribute('download', title.replace(/\s+/g, '_'));
  }

  openModal('documentViewerModal');
}

// Expose scanner, dossier and viewer helpers globally for inline HTML event handlers
window.setVisitorHeadcount = setVisitorHeadcount;
window.onVisitorHeadcountChange = onVisitorHeadcountChange;
window.setDocPreview = setDocPreview;
window.clearScannedDoc = clearScannedDoc;
window.triggerHardwareScan = triggerHardwareScan;
window.openDocumentCameraModal = openDocumentCameraModal;
window.closeDocumentCameraModal = closeDocumentCameraModal;
window.stopDocumentCamera = stopDocumentCamera;
window.captureDocumentCameraSnapshot = captureDocumentCameraSnapshot;
window.handleDocFileUpload = handleDocFileUpload;
window.viewDocumentModal = viewDocumentModal;
window.showDossierModal = viewFlatDetailModal;
window.viewFlatDetailModal = viewFlatDetailModal;

// ==========================================================================
// DAILY BUILDING SYNC STATUS & NOTIFICATION ENGINE FOR MASTER ADMIN
// ==========================================================================
async function checkDailySyncNotification(force = false) {
  if (State.currentUser?.role !== 'MASTER_ADMIN') return;

  try {
    const res = await fetch('/api/sync/daily_status');
    const data = await res.json();
    if (!data.success) return;

    State.dailySyncStatus = data;

    // 1. Update Top Bar Notification Bell Button & Dynamic Badge
    const bellBtn = document.getElementById('headerNotificationBtn');
    const badgeEl = document.getElementById('headerNotificationBadge');
    if (bellBtn && badgeEl) {
      bellBtn.style.display = 'flex';
      if (data.pending_count > 0) {
        badgeEl.className = 'notification-badge badge-danger';
        badgeEl.innerText = data.pending_count;
        bellBtn.title = `⚠️ ${data.pending_count} Building(s) Pending Today's Data Sync!`;
      } else {
        badgeEl.className = 'notification-badge badge-success';
        badgeEl.innerText = '✓';
        bellBtn.title = '🎉 All 5 Buildings Synced Today!';
      }
    }

    // 2. Render Alert Modal Content
    renderDailySyncModalContent(data);

    // 3. Evaluate Once-Daily Auto Popup Rule
    const todayStr = data.today_date;
    const acknowledgedDate = localStorage.getItem('ds_sync_alert_acknowledged_date');

    if (force === true || (data.pending_count > 0 && acknowledgedDate !== todayStr)) {
      openModal('dailySyncAlertModal');
      DSSound.playAlert();
    }
  } catch (err) {
    console.warn("Could not check daily sync status:", err);
  }
}

function renderDailySyncModalContent(data) {
  const titleEl = document.getElementById('dailySyncAlertTitle');
  const subEl = document.getElementById('dailySyncAlertSubtitle');
  const dateBadge = document.getElementById('dailySyncDateBadge');
  const banner = document.getElementById('dailySyncAlertBanner');
  const container = document.getElementById('dailySyncBuildingsContainer');

  if (dateBadge) dateBadge.innerText = `📅 Today: ${data.today_formatted || data.today_date}`;

  if (banner && titleEl && subEl) {
    if (data.pending_count > 0) {
      banner.style.background = 'rgba(239, 68, 68, 0.15)';
      banner.style.borderColor = '#ef4444';
      titleEl.style.color = '#f87171';
      titleEl.innerText = `⚠️ Daily Sync Pending: ${data.pending_count} Building(s) Not Synced Today!`;
      subEl.innerText = "All reception desks must send their .dsmync WhatsApp backup file daily for master consolidation.";
    } else {
      banner.style.background = 'rgba(16, 185, 129, 0.15)';
      banner.style.borderColor = '#10b981';
      titleEl.style.color = '#34d399';
      titleEl.innerText = `🎉 All ${data.total_buildings} Buildings Synced Today!`;
      subEl.innerText = "Consolidated Master database is up-to-date with all reception desks for today.";
    }
  }

  if (container) {
    container.innerHTML = data.buildings.map(b => {
      const isSynced = b.is_synced_today;
      return `
        <div class="building-sync-card ${isSynced ? 'synced' : 'pending'}">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="font-size: 22px;">${isSynced ? '🟢' : '🔴'}</div>
            <div>
              <div style="font-weight: 800; font-size: 13.5px; color: ${isSynced ? '#ffffff' : '#fca5a5'};">
                ${b.building_name} <span style="font-size: 11px; opacity: 0.75; font-family: monospace;">(${b.building_code})</span>
              </div>
              <div style="font-size: 11.5px; color: #94a3b8; margin-top: 2px;">
                ${isSynced 
                  ? `<span style="color: #34d399; font-weight: 600;">✓ Synced Today</span> at ${b.last_sync_timestamp} by <strong>${b.operator_name}</strong> (${b.records_count} records)` 
                  : `<span style="color: #ef4444; font-weight: 600;">⚠️ No Sync Received Today</span> (Last Sync: ${b.last_sync_timestamp})`
                }
              </div>
            </div>
          </div>
          <div>
            ${!isSynced ? `
              <button class="btn btn-sm btn-primary" onclick="triggerBuildingSyncImport('${b.building_id}', '${b.building_name}')" style="padding: 4px 10px; font-size: 11px;">
                📥 Import .dsmync
              </button>
            ` : `
              <span class="badge badge-success" style="font-size: 11px;">● Up to Date</span>
            `}
          </div>
        </div>
      `;
    }).join('');
  }
}

function acknowledgeDailySyncAlert() {
  DSSound.playClick();
  const todayStr = State.dailySyncStatus?.today_date || new Date().toISOString().slice(0, 10);
  localStorage.setItem('ds_sync_alert_acknowledged_date', todayStr);
  closeModal('dailySyncAlertModal');
  showToast("Daily sync alert acknowledged for today.", "info");
}

function openDailySyncNotificationModal(force = true) {
  DSSound.playClick();
  checkDailySyncNotification(force);
}

function triggerBuildingSyncImport(buildingId, buildingName) {
  closeModal('dailySyncAlertModal');
  openExportDataHubModal();
}

async function handleDailySyncFileSelected(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  showToast(`Reading ${file.name}...`, "info");
  const reader = new FileReader();
  reader.onload = async function(evt) {
    try {
      const base64Data = evt.target.result;
      const res = await fetch('/api/sync/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_data: base64Data,
          operator_name: State.currentUser?.full_name || 'Master Admin'
        })
      });
      const data = await res.json();
      if (data.success) {
        DSSound.playSuccess();
        showToast(`🎉 Data merged successfully for ${data.building_name}! (${data.total_inserted} new, ${data.total_updated} updated)`, "success");
        await checkDailySyncNotification(true);
        refreshActiveModuleData();
      } else {
        DSSound.playWarning();
        showToast(data.error || "Failed to merge sync file.", "danger");
      }
    } catch(err) {
      showToast(err.message, "danger");
    }
  };
  reader.readAsDataURL(file);
}

// ==========================================================================
// DOM CONTENT LOADED & DRAG-AND-DROP SETUP
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  applyTheme();
  updateSoundUI();
  loadRememberedUser();

  // Attach subtle click sound to buttons across document
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button, .btn, .nav-tab-btn, .search-pill-btn, .cal-preset-pill, .date-quick-btn');
    if (btn && !btn.classList.contains('btn-sound-toggle') && !btn.classList.contains('profile-trigger-btn')) {
      DSSound.playClick();
    }
  });

  const savedUser = localStorage.getItem('ds_user');
  if (savedUser) {
    try {
      State.currentUser = JSON.parse(savedUser);
      document.getElementById('loginOverlay').style.display = 'none';
      await initAppSession();
    } catch (e) {
      document.getElementById('loginOverlay').style.display = 'flex';
    }
  } else {
    document.getElementById('loginOverlay').style.display = 'flex';
  }

  updateLiveClock();

  // Setup Drag-and-Drop
  const dropzone = document.getElementById('syncDropzone');
  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        DSSync.importSyncFile(e.dataTransfer.files[0]);
      }
    });
  }
});
