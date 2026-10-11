"""
DS Maintenance Suite - Supabase Cloud Synchronization Engine
Offline-First Auto-Sync (Bidirectional Push & Pull) using standard Python library.
Zero-dependency: uses urllib.request with SSL, supports PostgREST Upsert & RLS.
"""

import os
import json
import ssl
import time
import uuid
import logging
import sqlite3
import threading
from datetime import datetime
from urllib import request as url_request, error as url_error
from database import get_db_connection, DB_PATH, BASE_DIR, DATA_DIR

logger = logging.getLogger("SupabaseSync")

# All SQLite tables mapped to Supabase Postgres tables
SYNC_TABLES = [
    "buildings",
    "users",
    "flats",
    "tenants",
    "family_members",
    "vehicles",
    "tenant_history_archive",
    "flat_occupancy_history",
    "visitor_logs",
    "domestic_staff",
    "staff_attendance",
    "gas_inventory_summary",
    "gas_deliveries",
    "gas_inward_supply",
    "maintenance_jobs",
    "accounts_ledger",
    "bank_accounts",
    "system_profile"
]

CONFIG_FILE = os.path.join(DATA_DIR, "supabase_config.json")

def _create_ssl_context():
    """Create SSL context that works on Windows even with custom cert bundles."""
    try:
        ctx = ssl.create_default_context()
        return ctx
    except Exception:
        return None

def get_sync_config():
    """Fetch Supabase URL, Key and settings from DB or config file."""
    config = {
        "supabase_url": "",
        "supabase_key": "",
        "is_auto_sync": 1,
        "sync_interval_seconds": 60,
        "last_sync_timestamp": None,
        "last_sync_status": "IDLE",
        "last_sync_message": "Ready"
    }
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM cloud_sync_settings WHERE id = 'default'")
        row = cursor.fetchone()
        if row:
            for k in config.keys():
                if k in row.keys() and row[k] is not None:
                    config[k] = row[k]
        conn.close()
    except Exception as e:
        logger.error(f"Error reading sync settings from DB: {e}")

    # Fallback / merge with file if file exists
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                f_data = json.load(f)
                if not config["supabase_url"] and f_data.get("supabase_url"):
                    config["supabase_url"] = f_data["supabase_url"]
                if not config["supabase_key"] and f_data.get("supabase_key"):
                    config["supabase_key"] = f_data["supabase_key"]
        except Exception:
            pass

    return config

def save_sync_config(supabase_url: str, supabase_key: str, is_auto_sync: int = 1, sync_interval: int = 60):
    """Save Supabase credentials & sync settings into DB and JSON file."""
    supabase_url = supabase_url.strip().rstrip('/')
    supabase_key = supabase_key.strip()
    now_iso = datetime.now().isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO cloud_sync_settings (id, provider, supabase_url, supabase_key, is_auto_sync, sync_interval_seconds, updated_at)
    VALUES ('default', 'supabase', ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
        supabase_url = excluded.supabase_url,
        supabase_key = excluded.supabase_key,
        is_auto_sync = excluded.is_auto_sync,
        sync_interval_seconds = excluded.sync_interval_seconds,
        updated_at = excluded.updated_at
    """, (supabase_url, supabase_key, is_auto_sync, sync_interval, now_iso))
    conn.commit()
    conn.close()

    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump({
                "supabase_url": supabase_url,
                "supabase_key": supabase_key,
                "is_auto_sync": is_auto_sync,
                "sync_interval_seconds": sync_interval,
                "updated_at": now_iso
            }, f, indent=2)
    except Exception as e:
        logger.warning(f"Could not write {CONFIG_FILE}: {e}")

    return {"success": True, "message": "Supabase configuration saved."}

def _make_supabase_request(url: str, key: str, path: str, method: str = 'GET', data: any = None, headers_extra: dict = None, timeout: float = 12.0):
    """Low-level HTTPS request to Supabase PostgREST endpoint."""
    full_url = f"{url.rstrip('/')}/rest/v1/{path.lstrip('/')}"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    if headers_extra:
        headers.update(headers_extra)

    req_data = None
    if data is not None:
        req_data = json.dumps(data, ensure_ascii=False, default=str).encode('utf-8')

    req = url_request.Request(full_url, data=req_data, headers=headers, method=method)
    ctx = _create_ssl_context()

    try:
        with url_request.urlopen(req, context=ctx, timeout=timeout) as resp:
            resp_bytes = resp.read()
            if not resp_bytes:
                return {"status": resp.status, "data": None}
            try:
                return {"status": resp.status, "data": json.loads(resp_bytes.decode('utf-8'))}
            except Exception:
                return {"status": resp.status, "data": resp_bytes.decode('utf-8', errors='replace')}
    except url_error.HTTPError as e:
        err_msg = ""
        try:
            err_msg = e.read().decode('utf-8', errors='replace')
        except Exception:
            err_msg = str(e)
        return {"status": e.code, "error": err_msg or str(e)}
    except Exception as ex:
        return {"status": 0, "error": str(ex)}

def test_connection(supabase_url: str = None, supabase_key: str = None):
    """Test connection with Supabase project."""
    cfg = get_sync_config()
    url = (supabase_url or cfg.get("supabase_url") or "").strip().rstrip('/')
    key = (supabase_key or cfg.get("supabase_key") or "").strip()

    if not url or not key:
        return {"success": False, "error": "Supabase URL and API Key are required."}

    # Ping rest root or buildings table
    res = _make_supabase_request(url, key, "buildings?select=id&limit=1", method='GET', timeout=8.0)
    if "error" in res:
        err = res["error"]
        if "relation \"public.buildings\" does not exist" in err:
            return {
                "success": True,
                "connected": True,
                "schema_needed": True,
                "message": "Connected to Supabase! However, database tables have not been created yet in Supabase. Please run the provided SQL Schema in Supabase SQL Editor."
            }
        return {"success": False, "error": f"Supabase error ({res['status']}): {err}"}

    return {"success": True, "connected": True, "message": "Successfully connected to Supabase live database!"}

def sync_push(supabase_url: str = None, supabase_key: str = None, building_id: str = None):
    """Pushes local SQLite changes to Supabase using PostgREST upsert (resolution=merge-duplicates)."""
    cfg = get_sync_config()
    url = (supabase_url or cfg.get("supabase_url") or "").strip().rstrip('/')
    key = (supabase_key or cfg.get("supabase_key") or "").strip()

    if not url or not key:
        return {"success": False, "error": "Supabase credentials missing"}

    conn = get_db_connection()
    cursor = conn.cursor()
    total_pushed = 0
    tables_summary = {}

    headers_upsert = {
        "Prefer": "resolution=merge-duplicates,return=minimal"
    }

    try:
        for tbl in SYNC_TABLES:
            try:
                # Check if table exists locally
                cursor.execute(f"SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='{tbl}'")
                if cursor.fetchone()['count'] == 0:
                    continue

                # Query rows
                if building_id and building_id != 'ALL':
                    cursor.execute(f"PRAGMA table_info({tbl})")
                    cols = [c['name'] for c in cursor.fetchall()]
                    if 'building_id' in cols:
                        cursor.execute(f"SELECT * FROM {tbl} WHERE building_id = ?", (building_id,))
                    elif 'assigned_building_id' in cols:
                        cursor.execute(f"SELECT * FROM {tbl} WHERE assigned_building_id = ? OR assigned_building_id IS NULL", (building_id,))
                    else:
                        cursor.execute(f"SELECT * FROM {tbl}")
                else:
                    cursor.execute(f"SELECT * FROM {tbl}")

                rows = [dict(r) for r in cursor.fetchall()]
                if not rows:
                    continue

                # Push in chunks of 50 rows
                chunk_size = 50
                pushed_for_table = 0
                for i in range(0, len(rows), chunk_size):
                    chunk = rows[i:i + chunk_size]
                    res = _make_supabase_request(url, key, tbl, method='POST', data=chunk, headers_extra=headers_upsert)
                    if "error" in res:
                        logger.warning(f"Push error on {tbl}: {res['error']}")
                        # If table doesn't exist on remote, record error
                        if "does not exist" in res["error"]:
                            tables_summary[tbl] = "table_missing_on_supabase"
                            break
                    else:
                        pushed_for_table += len(chunk)

                tables_summary[tbl] = pushed_for_table
                total_pushed += pushed_for_table
            except Exception as e:
                logger.error(f"Error pushing table {tbl}: {e}")
                tables_summary[tbl] = f"error: {str(e)}"
    finally:
        conn.close()

    return {"success": True, "total_pushed": total_pushed, "summary": tables_summary}

def sync_pull(supabase_url: str = None, supabase_key: str = None, building_id: str = None):
    """Pulls newer rows from Supabase into local SQLite with timestamp conflict resolution."""
    cfg = get_sync_config()
    url = (supabase_url or cfg.get("supabase_url") or "").strip().rstrip('/')
    key = (supabase_key or cfg.get("supabase_key") or "").strip()

    if not url or not key:
        return {"success": False, "error": "Supabase credentials missing"}

    conn = get_db_connection()
    cursor = conn.cursor()
    total_pulled = 0
    tables_summary = {}

    try:
        for tbl in SYNC_TABLES:
            try:
                # Query remote Supabase
                path = f"{tbl}?select=*"
                if building_id and building_id != 'ALL':
                    # Check if table has building_id
                    cursor.execute(f"PRAGMA table_info({tbl})")
                    cols = [c['name'] for c in cursor.fetchall()]
                    if 'building_id' in cols:
                        path += f"&building_id=eq.{building_id}"

                res = _make_supabase_request(url, key, path, method='GET')
                if "error" in res or not isinstance(res.get("data"), list):
                    continue

                remote_rows = res["data"]
                if not remote_rows:
                    continue

                updated_or_inserted = 0
                cursor.execute(f"PRAGMA table_info({tbl})")
                local_cols = {c['name']: c for c in cursor.fetchall()}

                for r in remote_rows:
                    row_id = r.get("id") or r.get("building_id") # for gas_inventory_summary
                    if not row_id:
                        continue

                    # Filter keys to match local columns
                    row_clean = {k: v for k, v in r.items() if k in local_cols}
                    if not row_clean:
                        continue

                    # Compare updated_at
                    remote_updated = str(row_clean.get("updated_at") or "")
                    id_col = "id" if "id" in local_cols else "building_id"
                    cursor.execute(f"SELECT updated_at FROM {tbl} WHERE {id_col} = ?", (row_id,))
                    existing = cursor.fetchone()

                    if existing:
                        local_updated = str(existing['updated_at'] or "") if 'updated_at' in existing.keys() else ""
                        if remote_updated >= local_updated:
                            cols = [k for k in row_clean.keys() if k != id_col]
                            set_clause = ", ".join([f"{c} = ?" for c in cols])
                            vals = [row_clean[c] for c in cols] + [row_id]
                            cursor.execute(f"UPDATE {tbl} SET {set_clause} WHERE {id_col} = ?", vals)
                            updated_or_inserted += 1
                    else:
                        cols = list(row_clean.keys())
                        placeholders = ", ".join(["?"] * len(cols))
                        col_names = ", ".join(cols)
                        vals = [row_clean[c] for c in cols]
                        cursor.execute(f"INSERT INTO {tbl} ({col_names}) VALUES ({placeholders})", vals)
                        updated_or_inserted += 1

                conn.commit()
                tables_summary[tbl] = updated_or_inserted
                total_pulled += updated_or_inserted
            except Exception as e:
                logger.error(f"Error pulling table {tbl}: {e}")
                tables_summary[tbl] = f"error: {str(e)}"
    finally:
        conn.close()

    return {"success": True, "total_pulled": total_pulled, "summary": tables_summary}

def sync_full_cycle(building_id: str = None):
    """Executes a full bidirectional Push + Pull cycle."""
    cfg = get_sync_config()
    if not cfg["supabase_url"] or not cfg["supabase_key"]:
        return {"success": False, "error": "Supabase URL or Key not set"}

    now_iso = datetime.now().isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 1. Push
        push_res = sync_push(cfg["supabase_url"], cfg["supabase_key"], building_id)
        # 2. Pull
        pull_res = sync_pull(cfg["supabase_url"], cfg["supabase_key"], building_id)

        status = "SUCCESS" if push_res.get("success") and pull_res.get("success") else "WARNING"
        msg = f"Synced: {push_res.get('total_pushed', 0)} pushed, {pull_res.get('total_pulled', 0)} pulled."

        cursor.execute("""
        UPDATE cloud_sync_settings
        SET last_sync_timestamp = ?, last_sync_status = ?, last_sync_message = ?, updated_at = ?
        WHERE id = 'default'
        """, (now_iso, status, msg, now_iso))

        # Log to sync_logs
        cursor.execute("""
        INSERT INTO sync_logs (id, building_id, sync_type, filename, records_count, media_count, sync_timestamp, operator_name, status, details)
        VALUES (?, ?, 'SUPABASE_SYNC', 'cloud_supabase', ?, 0, ?, 'SupabaseEngine', ?, ?)
        """, (str(uuid.uuid4()), building_id or 'ALL', push_res.get('total_pushed', 0) + pull_res.get('total_pulled', 0), now_iso, status, msg))

        conn.commit()
        return {
            "success": True,
            "status": status,
            "message": msg,
            "pushed": push_res.get("total_pushed", 0),
            "pulled": pull_res.get("total_pulled", 0),
            "timestamp": now_iso
        }
    except Exception as e:
        err_msg = str(e)
        cursor.execute("""
        UPDATE cloud_sync_settings
        SET last_sync_timestamp = ?, last_sync_status = 'ERROR', last_sync_message = ?, updated_at = ?
        WHERE id = 'default'
        """, (now_iso, err_msg, now_iso))
        conn.commit()
        return {"success": False, "error": err_msg}
    finally:
        conn.close()

# Background Sync Thread
_sync_thread_running = False

def start_background_sync(interval_seconds: int = 60):
    """Starts background periodic auto-sync worker thread."""
    global _sync_thread_running
    if _sync_thread_running:
        return
    _sync_thread_running = True

    def _worker():
        while _sync_thread_running:
            try:
                cfg = get_sync_config()
                if cfg.get("is_auto_sync") and cfg.get("supabase_url") and cfg.get("supabase_key"):
                    sync_full_cycle()
                interval = max(30, int(cfg.get("sync_interval_seconds") or 60))
            except Exception as e:
                logger.error(f"Background sync exception: {e}")
                interval = 60
            time.sleep(interval)

    t = threading.Thread(target=_worker, daemon=True, name="SupabaseAutoSyncThread")
    t.start()
    logger.info("Supabase Auto-Sync background thread started.")

def generate_supabase_sql_schema():
    """Generates PostgreSQL SQL DDL schema for running in Supabase SQL editor."""
    return """-- ====================================================================
-- DS MAINTENANCE SUITE — SUPABASE POSTGRESQL CLOUD SCHEMA
-- Copy & Paste this entire script into your Supabase SQL Editor and click 'Run'
-- ====================================================================

-- 1. Buildings Table
CREATE TABLE IF NOT EXISTS public.buildings (
    id TEXT PRIMARY KEY,
    building_code INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    total_flats INTEGER DEFAULT 0,
    gas_rate_per_cylinder DOUBLE PRECISION DEFAULT 3450.0,
    monthly_maintenance_rate DOUBLE PRECISION DEFAULT 0.0,
    updated_at TEXT NOT NULL
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL, -- 'MASTER_ADMIN', 'MANAGER', 'RECEPTIONIST'
    assigned_building_id TEXT,
    is_active INTEGER DEFAULT 1,
    updated_at TEXT NOT NULL
);

-- 3. Bank Accounts
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id TEXT PRIMARY KEY,
    bank_name TEXT NOT NULL,
    account_title TEXT NOT NULL,
    account_number TEXT NOT NULL,
    iban TEXT,
    branch_code TEXT,
    is_active INTEGER DEFAULT 1,
    updated_at TEXT NOT NULL
);

-- 4. Flats Registry
CREATE TABLE IF NOT EXISTS public.flats (
    id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL,
    flat_number TEXT NOT NULL,
    floor_number INTEGER DEFAULT 1,
    wing TEXT,
    bhk_type TEXT DEFAULT '3-Bed DD',
    occupancy_mode TEXT DEFAULT 'Rented',
    owner_name TEXT DEFAULT 'Property Owner',
    owner_phone TEXT,
    owner_cnic TEXT,
    owner_email TEXT,
    owner_address TEXT,
    active_since TEXT,
    current_tenant_id TEXT,
    notes TEXT,
    updated_at TEXT NOT NULL,
    UNIQUE(building_id, flat_number)
);

-- 5. Tenants
CREATE TABLE IF NOT EXISTS public.tenants (
    id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL,
    flat_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    primary_phone TEXT NOT NULL,
    emergency_phone TEXT,
    cnic_number TEXT NOT NULL,
    move_in_date TEXT NOT NULL,
    lease_tenure_months INTEGER DEFAULT 12,
    monthly_rent DOUBLE PRECISION DEFAULT 0.0,
    monthly_maintenance DOUBLE PRECISION DEFAULT 0.0,
    photo_filename TEXT,
    document_filename TEXT,
    status TEXT DEFAULT 'ACTIVE',
    vacated_date TEXT,
    updated_at TEXT NOT NULL
);

-- 6. Family Members
CREATE TABLE IF NOT EXISTS public.family_members (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    flat_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    relation TEXT NOT NULL,
    cnic_bform TEXT,
    phone TEXT,
    updated_at TEXT NOT NULL
);

-- 7. Vehicles
CREATE TABLE IF NOT EXISTS public.vehicles (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    flat_id TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    registration_number TEXT NOT NULL,
    make_model TEXT,
    parking_slot_number TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 8. Tenant History Archive
CREATE TABLE IF NOT EXISTS public.tenant_history_archive (
    id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL,
    flat_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    tenant_name TEXT NOT NULL,
    cnic_number TEXT NOT NULL,
    primary_phone TEXT NOT NULL,
    move_in_date TEXT NOT NULL,
    vacated_date TEXT NOT NULL,
    occupancy_type TEXT NOT NULL,
    archive_payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 8b. Flat Occupancy History
CREATE TABLE IF NOT EXISTS public.flat_occupancy_history (
    id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL,
    flat_id TEXT NOT NULL,
    flat_number TEXT NOT NULL,
    status TEXT NOT NULL,
    occupant_type TEXT NOT NULL,
    occupant_name TEXT,
    occupant_phone TEXT,
    occupant_cnic TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT,
    monthly_rent DOUBLE PRECISION DEFAULT 0.0,
    reason_or_notes TEXT,
    logged_by_user TEXT DEFAULT 'Receptionist',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 9. Visitor Logs
CREATE TABLE IF NOT EXISTS public.visitor_logs (
    id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL,
    flat_id TEXT,
    flat_number TEXT NOT NULL,
    guest_name TEXT NOT NULL,
    contact_number TEXT,
    cnic_number TEXT,
    purpose_of_visit TEXT,
    total_persons INTEGER DEFAULT 1,
    accompanying_details TEXT,
    entry_time TEXT NOT NULL,
    exit_time TEXT,
    photo_filename TEXT,
    document_filename TEXT,
    status TEXT DEFAULT 'IN_PREMISES',
    receptionist_name TEXT,
    updated_at TEXT NOT NULL
);

-- 10. Domestic Staff
CREATE TABLE IF NOT EXISTS public.domestic_staff (
    id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    cnic_number TEXT NOT NULL,
    bahria_card_number TEXT NOT NULL,
    role_type TEXT DEFAULT 'Maid',
    associated_flats TEXT,
    photo_filename TEXT,
    cnic_front_filename TEXT,
    cnic_back_filename TEXT,
    police_verification_filename TEXT,
    document_filename TEXT,
    is_active INTEGER DEFAULT 1,
    last_check_in TEXT,
    last_check_out TEXT,
    status TEXT DEFAULT 'OFF_DUTY',
    updated_at TEXT NOT NULL
);

-- 11. Staff Attendance
CREATE TABLE IF NOT EXISTS public.staff_attendance (
    id TEXT PRIMARY KEY,
    staff_id TEXT NOT NULL,
    building_id TEXT NOT NULL,
    check_in_time TEXT NOT NULL,
    check_out_time TEXT,
    notes TEXT,
    updated_at TEXT NOT NULL
);

-- 12. Gas Inventory Summary
CREATE TABLE IF NOT EXISTS public.gas_inventory_summary (
    building_id TEXT PRIMARY KEY,
    reserve_stock INTEGER DEFAULT 50,
    active_in_apartments INTEGER DEFAULT 20,
    empty_returned INTEGER DEFAULT 10,
    updated_at TEXT NOT NULL
);

-- 12b. Gas Deliveries
CREATE TABLE IF NOT EXISTS public.gas_deliveries (
    id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL,
    flat_id TEXT,
    flat_number TEXT NOT NULL,
    transaction_type TEXT DEFAULT 'REFILL',
    delivery_date TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DOUBLE PRECISION NOT NULL,
    total_amount DOUBLE PRECISION NOT NULL,
    payment_mode TEXT NOT NULL,
    cash_collector_name TEXT,
    bank_account_id TEXT,
    bank_account_title TEXT,
    transaction_reference TEXT,
    bank_slip_filename TEXT,
    receipt_number TEXT UNIQUE NOT NULL,
    is_empty_returned INTEGER DEFAULT 1,
    receptionist_name TEXT,
    updated_at TEXT NOT NULL
);

-- 12c. Gas Inward Supply
CREATE TABLE IF NOT EXISTS public.gas_inward_supply (
    id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL,
    supply_date TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    delivered_by TEXT NOT NULL,
    vehicle_number TEXT,
    quantity INTEGER NOT NULL,
    cylinder_type TEXT DEFAULT 'Standard 11.8kg',
    unit_cost DOUBLE PRECISION DEFAULT 0.0,
    total_cost DOUBLE PRECISION DEFAULT 0.0,
    payment_mode TEXT DEFAULT 'HAND_CASH',
    batch_reference TEXT,
    notes TEXT,
    received_by_user TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 13. Maintenance Jobs
CREATE TABLE IF NOT EXISTS public.maintenance_jobs (
    id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL,
    flat_id TEXT,
    flat_number TEXT NOT NULL,
    category TEXT NOT NULL,
    issue_description TEXT NOT NULL,
    assigned_technician TEXT NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    status TEXT DEFAULT 'COMPLETED',
    job_date TEXT NOT NULL,
    billed_amount DOUBLE PRECISION NOT NULL,
    parts_cost DOUBLE PRECISION DEFAULT 0.0,
    labor_cost DOUBLE PRECISION DEFAULT 0.0,
    net_profit_margin DOUBLE PRECISION NOT NULL,
    payment_mode TEXT DEFAULT 'HAND_CASH',
    cash_collector_name TEXT,
    bank_account_id TEXT,
    transaction_reference TEXT,
    receipt_number TEXT,
    receptionist_name TEXT,
    updated_at TEXT NOT NULL
);

-- 14. Accounts Ledger
CREATE TABLE IF NOT EXISTS public.accounts_ledger (
    id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL,
    entry_date TEXT NOT NULL,
    category TEXT NOT NULL,
    entry_type TEXT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    payment_mode TEXT NOT NULL,
    person_name TEXT,
    bank_account_id TEXT,
    reference_id TEXT,
    receipt_number TEXT,
    notes TEXT,
    updated_at TEXT NOT NULL
);

-- 15. System Profile
CREATE TABLE IF NOT EXISTS public.system_profile (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    office_address TEXT NOT NULL,
    helpline_phone TEXT NOT NULL,
    official_email TEXT NOT NULL,
    ntn_number TEXT NOT NULL,
    audit_ref_prefix TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Enable RLS and grant full service role / anon access for desktop nodes
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_history_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flat_occupancy_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domestic_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gas_inventory_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gas_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gas_inward_supply ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_profile ENABLE ROW LEVEL SECURITY;

-- Allow anon & authenticated API keys full access
CREATE POLICY IF NOT EXISTS "Allow all for anon on buildings" ON public.buildings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for anon on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for anon on bank_accounts" ON public.bank_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for anon on flats" ON public.flats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for anon on tenants" ON public.tenants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for anon on family_members" ON public.family_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for anon on vehicles" ON public.vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for anon on tenant_history_archive" ON public.tenant_history_archive FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for anon on flat_occupancy_history" ON public.flat_occupancy_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for anon on visitor_logs" ON public.visitor_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for anon on domestic_staff" ON public.domestic_staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for anon on staff_attendance" ON public.staff_attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for anon on gas_inventory_summary" ON public.gas_inventory_summary FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for anon on gas_deliveries" ON public.gas_deliveries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for anon on gas_inward_supply" ON public.gas_inward_supply FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for anon on maintenance_jobs" ON public.maintenance_jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for anon on accounts_ledger" ON public.accounts_ledger FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all for anon on system_profile" ON public.system_profile FOR ALL USING (true) WITH CHECK (true);
"""
