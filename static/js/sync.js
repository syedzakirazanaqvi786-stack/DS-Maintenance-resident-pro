/**
 * DS Maintenance Suite - Sync Engine Frontend Controller (.dsmync)
 * Zero-conflict WhatsApp / USB Flash Drive synchronization pipeline with guaranteed downloads.
 */

window.DSSync = {
  // 1. Export Today's Building Data Snapshot with Instant Download & Explorer Launch
  exportTodayData: async function(buildingId, buildingName, operatorName) {
    try {
      showToast("Packaging encrypted snapshot (.dsmync)...", "info");
      const res = await fetch('/api/sync/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          building_id: buildingId,
          operator_name: operatorName || 'Receptionist'
        })
      });

      const data = await res.json();
      if (!data.success) {
        showToast(`Export failed: ${data.error}`, "danger");
        return;
      }

      // 1. Trigger Direct Download to browser/webview Downloads folder
      const downloadUrl = `/api/sync/download?filename=${encodeURIComponent(data.filename)}`;
      const dlLink = document.createElement('a');
      dlLink.href = downloadUrl;
      dlLink.download = data.filename;
      document.body.appendChild(dlLink);
      dlLink.click();
      setTimeout(() => dlLink.remove(), 200);

      // 2. Open Success Modal with Explorer Opener
      const modalContent = `
        <div style="text-align: center; padding: 6px 0;">
          <div style="font-size: 42px; color: #10b981; margin-bottom: 8px;">✅</div>
          <h3 style="color: #fff; font-size: 17px; margin-bottom: 6px;">Daily Data Exported Successfully!</h3>
          <p style="color: #94a3b8; font-size: 12.5px; margin-bottom: 16px;">
            File: <strong style="color: #38bdf8;">${data.filename}</strong><br>
            Contains: <strong>${data.records_count}</strong> records & <strong>${data.media_count}</strong> media files.
          </p>

          <div style="background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; padding: 12px; text-align: left; margin-bottom: 16px;">
            <div style="font-size: 12px; font-weight: bold; color: #38bdf8; margin-bottom: 4px;">📱 READY FOR WHATSAPP / USB SHARING:</div>
            <p style="font-size: 12px; color: #cbd5e1; line-height: 1.5;">
              The file is automatically saved in your <code>data\\exports\\</code> directory and downloaded to your browser.
            </p>
          </div>

          <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
            <a href="${downloadUrl}" class="btn btn-primary" download="${data.filename}">📥 Re-Download File</a>
            <button class="btn btn-secondary" onclick="DSSync.openExportsFolder()">📂 Open Exports Folder in Explorer</button>
            <button class="btn btn-secondary" onclick="closeModal('genericModal')">Done</button>
          </div>
        </div>
      `;

      showGenericModal("Export Today's Data (.dsmync)", modalContent);
      showToast("Data snapshot exported & downloaded!", "success");

    } catch (err) {
      showToast(`Export error: ${err.message}`, "danger");
    }
  },

  // 2. Open Exports folder in Windows Explorer
  openExportsFolder: async function() {
    try {
      const res = await fetch('/api/system/open_exports_folder');
      const data = await res.json();
      if (data.success) {
        showToast("Opening exports folder in Windows Explorer...", "info");
      } else {
        showToast("Folder location: project 1 ds\\data\\exports\\", "info");
      }
    } catch (e) {
      showToast("Folder location: project 1 ds\\data\\exports\\", "info");
    }
  },

  // 3. Import .dsmync File (Master Admin)
  importSyncFile: async function(file) {
    if (!file) return;
    if (!file.name.endsWith('.dsmync')) {
      showToast("Please select a valid .dsmync snapshot file.", "warning");
      return;
    }

    try {
      showToast("Decrypting and merging snapshot...", "info");
      
      const reader = new FileReader();
      reader.onload = async function(e) {
        const base64Data = e.target.result;

        const res = await fetch('/api/sync/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_data: base64Data,
            operator_name: State.currentUser?.full_name || 'Master Admin'
          })
        });

        const result = await res.json();
        if (!result.success) {
          showToast(`Import failed: ${result.error}`, "danger");
          return;
        }

        const summaryHtml = `
          <div style="text-align: center; padding: 6px 0;">
            <div style="font-size: 42px; color: #38bdf8; margin-bottom: 8px;">⚡</div>
            <h3 style="color: #fff; font-size: 17px; margin-bottom: 6px;">Sync Package Merged Successfully!</h3>
            <p style="color: #94a3b8; font-size: 12.5px; margin-bottom: 14px;">
              Building: <strong style="color: #38bdf8;">${result.building_name}</strong>
            </p>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 16px;">
              <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 8px; padding: 8px;">
                <div style="font-size: 18px; font-weight: bold; color: #34d399;">${result.total_inserted}</div>
                <div style="font-size: 11px; color: #cbd5e1;">New Records</div>
              </div>
              <div style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 8px; padding: 8px;">
                <div style="font-size: 18px; font-weight: bold; color: #38bdf8;">${result.total_updated}</div>
                <div style="font-size: 11px; color: #cbd5e1;">Updated Records</div>
              </div>
              <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 8px; padding: 8px;">
                <div style="font-size: 18px; font-weight: bold; color: #fbbf24;">${result.media_extracted}</div>
                <div style="font-size: 11px; color: #cbd5e1;">Media Files</div>
              </div>
            </div>

            <button class="btn btn-primary" onclick="window.location.reload()">Refresh System Data</button>
          </div>
        `;

        showGenericModal("Zero-Conflict Merge Complete", summaryHtml);
        showToast("Building data synchronized successfully!", "success");
      };

      reader.readAsDataURL(file);

    } catch (err) {
      showToast(`Import error: ${err.message}`, "danger");
    }
  },

  // 4. Supabase Cloud Sync Controllers
  openSupabaseSyncModal: async function() {
    openModal('supabaseSyncModal');
    await DSSync.loadSupabaseConfig();
  },

  loadSupabaseConfig: async function() {
    try {
      const res = await fetch('/api/sync/supabase/status');
      const data = await res.json();
      if (!data.success) return;
      const cfg = data.config || {};

      const urlInp = document.getElementById('supabaseUrlInput');
      const keyInp = document.getElementById('supabaseKeyInput');
      const intSel = document.getElementById('supabaseSyncInterval');
      const autoCb = document.getElementById('supabaseAutoSyncCheckbox');
      const badge = document.getElementById('supabaseLastSyncBadge');
      const dot = document.getElementById('supabaseStatusIndicator');
      const headerDot = document.getElementById('supabaseHeaderDot');
      const title = document.getElementById('supabaseStatusTitle');
      const sub = document.getElementById('supabaseStatusSubtitle');

      if (urlInp && cfg.supabase_url) urlInp.value = cfg.supabase_url;
      if (keyInp && cfg.supabase_key) keyInp.value = cfg.supabase_key;
      if (intSel && cfg.sync_interval_seconds) intSel.value = String(cfg.sync_interval_seconds);
      if (autoCb) autoCb.checked = Boolean(cfg.is_auto_sync);

      if (cfg.supabase_url && cfg.supabase_key) {
        if (cfg.last_sync_status === 'SUCCESS') {
          if (dot) dot.style.background = '#10b981';
          if (headerDot) headerDot.style.background = '#10b981';
          if (badge) { badge.className = 'badge badge-success'; badge.innerText = 'Connected & Synced'; }
          if (title) title.innerText = 'Supabase Cloud: Live & Synced';
        } else if (cfg.last_sync_status === 'ERROR') {
          if (dot) dot.style.background = '#ef4444';
          if (headerDot) headerDot.style.background = '#ef4444';
          if (badge) { badge.className = 'badge badge-danger'; badge.innerText = 'Sync Alert'; }
          if (title) title.innerText = 'Connection Issue (Operating in Offline Mode)';
        } else {
          if (dot) dot.style.background = '#3ecf8e';
          if (headerDot) headerDot.style.background = '#3ecf8e';
          if (badge) { badge.className = 'badge badge-info'; badge.innerText = 'Configured'; }
          if (title) title.innerText = 'Supabase Cloud Ready';
        }
        if (sub && cfg.last_sync_timestamp) {
          sub.innerText = `Last Sync: ${new Date(cfg.last_sync_timestamp).toLocaleTimeString()} • ${cfg.last_sync_message || 'OK'}`;
        }
      } else {
        if (dot) dot.style.background = '#94a3b8';
        if (headerDot) headerDot.style.background = '#94a3b8';
        if (badge) { badge.className = 'badge badge-secondary'; badge.innerText = 'Not Configured'; }
        if (title) title.innerText = 'Supabase Cloud Not Connected';
        if (sub) sub.innerText = 'Enter your Supabase Project URL and Key to activate cloud live synchronization.';
      }
    } catch (e) {
      console.warn("Could not load Supabase config:", e);
    }
  },

  saveSupabaseConfig: async function(e) {
    if (e) e.preventDefault();
    const url = document.getElementById('supabaseUrlInput')?.value?.trim();
    const key = document.getElementById('supabaseKeyInput')?.value?.trim();
    const interval = parseInt(document.getElementById('supabaseSyncInterval')?.value || '60');
    const isAuto = document.getElementById('supabaseAutoSyncCheckbox')?.checked ? 1 : 0;

    if (!url || !key) {
      showToast("Please enter Supabase URL and API Key", "warning");
      return;
    }

    try {
      showToast("Saving Supabase settings...", "info");
      const res = await fetch('/api/sync/supabase/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supabase_url: url,
          supabase_key: key,
          sync_interval_seconds: interval,
          is_auto_sync: isAuto
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Supabase configuration saved!", "success");
        await DSSync.loadSupabaseConfig();
        // Automatically test
        DSSync.testSupabaseConnection();
      } else {
        showToast(data.error || "Failed to save configuration", "danger");
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, "danger");
    }
  },

  testSupabaseConnection: async function() {
    const url = document.getElementById('supabaseUrlInput')?.value?.trim();
    const key = document.getElementById('supabaseKeyInput')?.value?.trim();
    const logBox = document.getElementById('supabaseSyncLogBox');

    if (logBox) {
      logBox.style.display = 'block';
      logBox.innerText = 'Testing connection to Supabase endpoint...';
    }

    try {
      const res = await fetch('/api/sync/supabase/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabase_url: url, supabase_key: key })
      });
      const data = await res.json();
      if (data.success) {
        if (data.schema_needed) {
          showToast("Connected to Supabase! Run SQL Schema to create tables.", "warning");
          if (logBox) logBox.innerText = `[SUCCESS] Connected to Supabase Project!\n[NOTICE] Database tables not found yet.\nClick 'Copy SQL Schema' and execute it in Supabase SQL Editor.`;
        } else {
          showToast("Connected to Supabase successfully!", "success");
          if (logBox) logBox.innerText = `[SUCCESS] Verified connection to Supabase Cloud Database!\nPostgREST endpoint is healthy and ready for live sync.`;
        }
        await DSSync.loadSupabaseConfig();
      } else {
        showToast(`Connection failed: ${data.error}`, "danger");
        if (logBox) logBox.innerText = `[FAILED] Could not connect to Supabase:\n${data.error}`;
      }
    } catch (err) {
      showToast(`Connection test error: ${err.message}`, "danger");
      if (logBox) logBox.innerText = `[ERROR] ${err.message}`;
    }
  },

  triggerManualSupabaseSync: async function() {
    const logBox = document.getElementById('supabaseSyncLogBox');
    if (logBox) {
      logBox.style.display = 'block';
      logBox.innerText = 'Starting Live Cloud Sync (Pushing local updates & Pulling cloud changes)...';
    }
    showToast("Syncing with Supabase Cloud...", "info");

    try {
      const bId = State.selectedBuildingId || 'ALL';
      const res = await fetch('/api/sync/supabase/sync_now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ building_id: bId })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Cloud Sync Complete! ${data.pushed} pushed, ${data.pulled} pulled.`, "success");
        if (logBox) {
          logBox.innerText = `[SUCCESS] Cloud Sync Completed at ${new Date(data.timestamp).toLocaleTimeString()}:\n• Local Records Pushed to Cloud: ${data.pushed}\n• Cloud Records Pulled to Local: ${data.pulled}\n• Status: ${data.status}`;
        }
        await DSSync.loadSupabaseConfig();
        // Refresh local view
        if (typeof refreshActiveModuleData === 'function') refreshActiveModuleData();
      } else {
        showToast(`Sync warning: ${data.error}`, "danger");
        if (logBox) logBox.innerText = `[ERROR] Sync failed: ${data.error}`;
      }
    } catch (err) {
      showToast(`Sync error: ${err.message}`, "danger");
      if (logBox) logBox.innerText = `[ERROR] ${err.message}`;
    }
  },

  copySupabaseSchemaSql: async function() {
    try {
      const res = await fetch('/api/sync/supabase/schema');
      const data = await res.json();
      if (data.success && data.schema) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(data.schema);
          showToast("PostgreSQL Schema copied to clipboard! Paste it into Supabase SQL Editor.", "success");
        } else {
          // Fallback textarea
          const ta = document.createElement('textarea');
          ta.value = data.schema;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
          showToast("Schema copied to clipboard!", "success");
        }
      }
    } catch (e) {
      showToast("Schema file available at E:\\DS MAINTENANCE\\supabase_schema.sql", "info");
    }
  }
};

// Global helper bindings for HTML onclick
window.openSupabaseSyncModal = () => DSSync.openSupabaseSyncModal();
window.handleSaveSupabaseConfig = (e) => DSSync.saveSupabaseConfig(e);
window.testSupabaseConnection = () => DSSync.testSupabaseConnection();
window.triggerManualSupabaseSync = () => DSSync.triggerManualSupabaseSync();
window.copySupabaseSchemaSql = () => DSSync.copySupabaseSchemaSql();

