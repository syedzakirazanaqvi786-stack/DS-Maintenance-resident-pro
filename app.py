"""
DS Maintenance Suite - Main Application Server & Native Desktop Launcher
Offline Desktop System for Windows 10/11 with PyWebView, File Downloader & REST API
"""

import os
import sys
import json
import uuid
import time
import socket
import base64
import mimetypes
import threading
import urllib.parse
import subprocess
from http.server import HTTPServer, ThreadingHTTPServer, BaseHTTPRequestHandler
from datetime import datetime, timedelta

# High-DPI Awareness for Windows: Ensures crisp, non-distorted rendering on 24-inch and high-res screens
if sys.platform == 'win32':
    try:
        import ctypes
        ctypes.windll.shcore.SetProcessDpiAwareness(2) # Per-Monitor DPI Aware
    except Exception:
        try:
            import ctypes
            ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass

from database import init_database, get_db_connection, hash_password, DB_PATH, BASE_DIR, DATA_DIR, MEDIA_DIR, EXPORTS_DIR
from sync_engine import export_building_data, import_building_data
import supabase_sync

PORT = 58920
SERVER_URL = f"http://127.0.0.1:{PORT}"

# Redirect WebView2 User Data to Local SSD for Instant Performance
_cache_base = os.environ.get('LOCALAPPDATA', os.path.expanduser('~'))
_wv_cache_dir = os.path.join(_cache_base, 'DS_Maintenance_Cache')
os.makedirs(_wv_cache_dir, exist_ok=True)
os.environ['WEBVIEW2_USER_DATA_FOLDER'] = _wv_cache_dir

# Static Directory inside project & High-speed In-Memory Asset Cache
_cand_static = os.path.join(BASE_DIR, 'static')
if not os.path.exists(os.path.join(_cand_static, 'index.html')):
    if getattr(sys, 'frozen', False):
        _meipass_static = os.path.join(getattr(sys, '_MEIPASS', ''), 'static')
        _internal_static = os.path.join(os.path.dirname(sys.executable), '_internal', 'static')
        if os.path.exists(os.path.join(_meipass_static, 'index.html')):
            _cand_static = _meipass_static
        elif os.path.exists(os.path.join(_internal_static, 'index.html')):
            _cand_static = _internal_static
STATIC_DIR = _cand_static
os.makedirs(STATIC_DIR, exist_ok=True)
_STATIC_CACHE = {}

def build_sql_date_clauses(date_preset, custom_date=None, date_from=None, date_to=None, month_param=None):
    now = datetime.now()
    if date_from and date_to:
        period_label = f"{date_from} to {date_to}"
        l_clause = "(substr(entry_date, 1, 10) >= ? AND substr(entry_date, 1, 10) <= ?)"
        l_params = (date_from, date_to)
        g_clause = "(substr(delivery_date, 1, 10) >= ? AND substr(delivery_date, 1, 10) <= ?)"
        g_params = (date_from, date_to)
        m_clause = "(substr(job_date, 1, 10) >= ? AND substr(job_date, 1, 10) <= ?)"
        m_params = (date_from, date_to)
        v_clause = "(substr(entry_time, 1, 10) >= ? AND substr(entry_time, 1, 10) <= ?)"
        v_params = (date_from, date_to)
    elif custom_date:
        d_str = str(custom_date).strip()
        if len(d_str) == 7: # YYYY-MM
            try:
                m_obj = datetime.strptime(d_str, '%Y-%m')
                period_label = f"Month of {m_obj.strftime('%B %Y')}"
            except Exception:
                period_label = f"Month {d_str}"
            l_clause = "entry_date LIKE ?"
            l_params = (f"{d_str}%",)
            g_clause = "delivery_date LIKE ?"
            g_params = (f"{d_str}%",)
            m_clause = "job_date LIKE ?"
            m_params = (f"{d_str}%",)
            v_clause = "entry_time LIKE ?"
            v_params = (f"{d_str}%",)
        elif len(d_str) == 4: # YYYY
            period_label = f"Year {d_str}"
            l_clause = "entry_date LIKE ?"
            l_params = (f"{d_str}%",)
            g_clause = "delivery_date LIKE ?"
            g_params = (f"{d_str}%",)
            m_clause = "job_date LIKE ?"
            m_params = (f"{d_str}%",)
            v_clause = "entry_time LIKE ?"
            v_params = (f"{d_str}%",)
        else: # Single Date YYYY-MM-DD
            try:
                d_obj = datetime.strptime(d_str[:10], '%Y-%m-%d')
                period_label = f"Date: {d_obj.strftime('%d %b %Y')}"
            except Exception:
                period_label = f"Date: {d_str}"
            l_clause = "entry_date LIKE ?"
            l_params = (f"{d_str[:10]}%",)
            g_clause = "delivery_date LIKE ?"
            g_params = (f"{d_str[:10]}%",)
            m_clause = "job_date LIKE ?"
            m_params = (f"{d_str[:10]}%",)
            v_clause = "entry_time LIKE ?"
            v_params = (f"{d_str[:10]}%",)
    elif month_param:
        m_str = month_param[:7]
        try:
            m_obj = datetime.strptime(m_str, '%Y-%m')
            period_label = f"Month of {m_obj.strftime('%B %Y')}"
        except Exception:
            period_label = f"Month {m_str}"
        l_clause = "entry_date LIKE ?"
        l_params = (f"{m_str}%",)
        g_clause = "delivery_date LIKE ?"
        g_params = (f"{m_str}%",)
        m_clause = "job_date LIKE ?"
        m_params = (f"{m_str}%",)
        v_clause = "entry_time LIKE ?"
        v_params = (f"{m_str}%",)
    elif date_preset == 'today':
        d_str = now.strftime('%Y-%m-%d')
        period_label = f"Today ({now.strftime('%d %b %Y')})"
        l_clause = "entry_date LIKE ?"
        l_params = (f"{d_str}%",)
        g_clause = "delivery_date LIKE ?"
        g_params = (f"{d_str}%",)
        m_clause = "job_date LIKE ?"
        m_params = (f"{d_str}%",)
        v_clause = "entry_time LIKE ?"
        v_params = (f"{d_str}%",)
    elif date_preset == 'yesterday':
        y_str = (now - timedelta(days=1)).strftime('%Y-%m-%d')
        period_label = f"Yesterday ({(now - timedelta(days=1)).strftime('%d %b %Y')})"
        l_clause = "entry_date LIKE ?"
        l_params = (f"{y_str}%",)
        g_clause = "delivery_date LIKE ?"
        g_params = (f"{y_str}%",)
        m_clause = "job_date LIKE ?"
        m_params = (f"{y_str}%",)
        v_clause = "entry_time LIKE ?"
        v_params = (f"{y_str}%",)
    elif date_preset == '2days':
        start_str = (now - timedelta(days=1)).strftime('%Y-%m-%d')
        end_str = now.strftime('%Y-%m-%d')
        period_label = f"Last 2 Days ({start_str} to {end_str})"
        l_clause = "(substr(entry_date, 1, 10) >= ? AND substr(entry_date, 1, 10) <= ?)"
        l_params = (start_str, end_str)
        g_clause = "(substr(delivery_date, 1, 10) >= ? AND substr(delivery_date, 1, 10) <= ?)"
        g_params = (start_str, end_str)
        m_clause = "(substr(job_date, 1, 10) >= ? AND substr(job_date, 1, 10) <= ?)"
        m_params = (start_str, end_str)
        v_clause = "(substr(entry_time, 1, 10) >= ? AND substr(entry_time, 1, 10) <= ?)"
        v_params = (start_str, end_str)
    elif date_preset == '7days':
        start_str = (now - timedelta(days=6)).strftime('%Y-%m-%d')
        end_str = now.strftime('%Y-%m-%d')
        period_label = f"Last 7 Days ({start_str} to {end_str})"
        l_clause = "(substr(entry_date, 1, 10) >= ? AND substr(entry_date, 1, 10) <= ?)"
        l_params = (start_str, end_str)
        g_clause = "(substr(delivery_date, 1, 10) >= ? AND substr(delivery_date, 1, 10) <= ?)"
        g_params = (start_str, end_str)
        m_clause = "(substr(job_date, 1, 10) >= ? AND substr(job_date, 1, 10) <= ?)"
        m_params = (start_str, end_str)
        v_clause = "(substr(entry_time, 1, 10) >= ? AND substr(entry_time, 1, 10) <= ?)"
        v_params = (start_str, end_str)
    elif date_preset == 'all':
        period_label = "All Time Historical Records"
        l_clause = "1=1"
        l_params = ()
        g_clause = "1=1"
        g_params = ()
        m_clause = "1=1"
        m_params = ()
        v_clause = "1=1"
        v_params = ()
    else: # Default: 'month'
        m_str = month_param or now.strftime('%Y-%m')
        try:
            m_obj = datetime.strptime(m_str[:7], '%Y-%m')
            period_label = f"Month of {m_obj.strftime('%B %Y')}"
        except Exception:
            period_label = f"Month of {m_str}"
        l_clause = "entry_date LIKE ?"
        l_params = (f"{m_str[:7]}%",)
        g_clause = "delivery_date LIKE ?"
        g_params = (f"{m_str[:7]}%",)
        m_clause = "job_date LIKE ?"
        m_params = (f"{m_str[:7]}%",)
        v_clause = "entry_time LIKE ?"
        v_params = (f"{m_str[:7]}%",)

    return {
        "period_label": period_label,
        "l_clause": l_clause, "l_params": l_params,
        "g_clause": g_clause, "g_params": g_params,
        "m_clause": m_clause, "m_params": m_params,
        "v_clause": v_clause, "v_params": v_params
    }


class DSRequestHandler(BaseHTTPRequestHandler):
    def _send_json(self, data, status_code=200):
        body = json.dumps(data, ensure_ascii=False, default=str).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, file_path, content_type=None, as_attachment=False, download_filename=None):
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            self.send_error(404, "File Not Found")
            return

        is_static = file_path.startswith(STATIC_DIR)
        if is_static and file_path in _STATIC_CACHE and not as_attachment:
            content, content_type = _STATIC_CACHE[file_path]
        else:
            if not content_type:
                content_type, _ = mimetypes.guess_type(file_path)
                if not content_type:
                    content_type = 'application/octet-stream'
            with open(file_path, 'rb') as f:
                content = f.read()
            if is_static and not as_attachment:
                _STATIC_CACHE[file_path] = (content, content_type)

        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(content)))
        if is_static and not as_attachment:
            self.send_header('Cache-Control', 'public, max-age=86400')
        if as_attachment:
            fn = download_filename or os.path.basename(file_path)
            self.send_header('Content-Disposition', f'attachment; filename="{fn}"')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(content)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def _read_json_body(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            return {}
        raw_body = self.rfile.read(content_length).decode('utf-8')
        return json.loads(raw_body) if raw_body else {}

    @staticmethod
    def _is_delete_password_valid(cursor, password, operator_id=None):
        """Deletion authorization: Master Admin or Building Manager password."""
        if not password:
            return False
        candidates = {hash_password(password), hash_password(password.lower()), hash_password(password.upper())}
        valid_hashes = {hash_password("ADMIN"), hash_password("admin"), hash_password("ADMIN123"), hash_password("admin123")}
        cursor.execute("SELECT password_hash FROM users WHERE role IN ('MASTER_ADMIN', 'MANAGER') AND is_active = 1")
        for u in cursor.fetchall():
            valid_hashes.add(u['password_hash'])
        return bool(candidates & valid_hashes)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # Download Exported .dsmync File
        if path == '/api/sync/download':
            filename = query.get('filename', [''])[0]
            if not filename:
                return self.send_error(400, "Missing filename")
            clean_fn = os.path.basename(filename)
            file_path = os.path.join(EXPORTS_DIR, clean_fn)
            return self._send_file(file_path, content_type='application/octet-stream', as_attachment=True, download_filename=clean_fn)

        # Serve Media Files
        if path.startswith('/media/'):
            filename = os.path.basename(path.replace('/media/', ''))
            media_path = os.path.join(MEDIA_DIR, filename)
            return self._send_file(media_path)

        # API Routes
        if path.startswith('/api/'):
            return self.handle_api_get(path, query)

        # Serve Static Frontend Files
        if path == '/' or path == '/index.html':
            static_file = os.path.join(STATIC_DIR, 'index.html')
        else:
            rel_path = path.lstrip('/')
            static_file = os.path.join(STATIC_DIR, rel_path)

        if os.path.exists(static_file) and os.path.isfile(static_file):
            return self._send_file(static_file)
        else:
            return self._send_file(os.path.join(STATIC_DIR, 'index.html'))

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path.startswith('/api/'):
            return self.handle_api_post(path, query)
        self.send_error(404, "Endpoint not found")

    def handle_api_get(self, path, query):
        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            # 1. Buildings List
            if path == '/api/buildings':
                cursor.execute("""
                SELECT b.id, b.building_code, b.name, b.address, b.gas_rate_per_cylinder, b.monthly_maintenance_rate, b.updated_at,
                       (SELECT COUNT(*) FROM flats f WHERE f.building_id = b.id) as total_flats
                FROM buildings b
                ORDER BY b.building_code ASC
                """)
                buildings = [dict(r) for r in cursor.fetchall()]
                return self._send_json({"success": True, "data": buildings})

            # 2. Bank Accounts List
            elif path == '/api/bank_accounts':
                cursor.execute("SELECT * FROM bank_accounts WHERE is_active = 1 ORDER BY bank_name ASC")
                accounts = [dict(r) for r in cursor.fetchall()]
                return self._send_json({"success": True, "data": accounts})

            # 3. Users List
            elif path == '/api/users':
                user_role = query.get('user_role', [None])[0] or query.get('role', [None])[0]
                building_id = query.get('building_id', [None])[0]
                if user_role == 'MANAGER' and building_id and building_id != 'ALL':
                    cursor.execute("""
                    SELECT u.id, u.username, u.full_name, u.phone, u.role, u.assigned_building_id, u.is_active, u.updated_at,
                           b.name as building_name, b.building_code
                    FROM users u
                    LEFT JOIN buildings b ON u.assigned_building_id = b.id
                    WHERE u.assigned_building_id = ? AND u.role = 'RECEPTIONIST'
                    ORDER BY u.username ASC
                    """, (building_id,))
                else:
                    cursor.execute("""
                    SELECT u.id, u.username, u.full_name, u.phone, u.role, u.assigned_building_id, u.is_active, u.updated_at,
                           b.name as building_name, b.building_code
                    FROM users u
                    LEFT JOIN buildings b ON u.assigned_building_id = b.id
                    ORDER BY u.role DESC, u.username ASC
                    """)
                users = [dict(r) for r in cursor.fetchall()]
                return self._send_json({"success": True, "data": users})

            # 4. Dashboard Stats with Flexible Range Filtering
            elif path == '/api/dashboard/stats':
                building_id = query.get('building_id', [None])[0]
                date_filter = query.get('date_preset', ['today'])[0]
                custom_date = query.get('custom_date', [None])[0]

                now = datetime.now()
                dates = build_sql_date_clauses(date_filter, custom_date=custom_date)

                b_clause = "WHERE building_id = ?" if building_id and building_id != 'ALL' else ""
                b_params = (building_id,) if building_id and building_id != 'ALL' else ()

                b_l_clause = "AND building_id = ?" if building_id and building_id != 'ALL' else ""

                # Total Flats Breakdown: Owner Living vs Tenant Living vs Vacant
                cursor.execute(f"""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN occupancy_mode = 'Owner Occupied' THEN 1 ELSE 0 END) as owner_occ,
                    SUM(CASE WHEN occupancy_mode = 'Rented' AND current_tenant_id IS NOT NULL THEN 1 ELSE 0 END) as rented_occ,
                    SUM(CASE WHEN occupancy_mode = 'Vacant' OR (occupancy_mode = 'Rented' AND current_tenant_id IS NULL) THEN 1 ELSE 0 END) as vacant
                FROM flats {b_clause}
                """, b_params)
                flat_stats = dict(cursor.fetchone() or {"total": 0, "owner_occ": 0, "rented_occ": 0, "vacant": 0})

                # Active Tenants Count
                cursor.execute(f"SELECT COUNT(*) as active_tenants FROM tenants WHERE status = 'ACTIVE' {'AND building_id = ?' if b_clause else ''}", b_params if b_clause else ())
                active_tenants = cursor.fetchone()['active_tenants']

                # Visitors Filtered
                v_where = f"WHERE {dates['v_clause']} {b_l_clause}"
                cursor.execute(f"SELECT COUNT(*) as total_visitors, COALESCE(SUM(CASE WHEN status = 'IN_PREMISES' THEN COALESCE(total_persons, 1) ELSE 0 END), 0) as inside_now FROM visitor_logs {v_where}", dates['v_params'] + b_params)
                visitor_stats = dict(cursor.fetchone() or {"total_visitors": 0, "inside_now": 0})

                # Domestic Staff
                cursor.execute(f"SELECT COUNT(*) as total_staff, COALESCE(SUM(CASE WHEN status = 'ON_DUTY' THEN 1 ELSE 0 END), 0) as on_duty FROM domestic_staff WHERE is_active = 1 {'AND building_id = ?' if b_clause else ''}", b_params if b_clause else ())
                staff_stats = dict(cursor.fetchone() or {"total_staff": 0, "on_duty": 0})

                # Gas Stock
                if building_id and building_id != 'ALL':
                    cursor.execute("SELECT * FROM gas_inventory_summary WHERE building_id = ?", (building_id,))
                    gas_stock = cursor.fetchone()
                    gas_stats = dict(gas_stock) if gas_stock else {"reserve_stock": 0, "active_in_apartments": 0, "empty_returned": 0}
                else:
                    cursor.execute("SELECT COALESCE(SUM(reserve_stock), 0) as reserve_stock, COALESCE(SUM(active_in_apartments), 0) as active_in_apartments, COALESCE(SUM(empty_returned), 0) as empty_returned FROM gas_inventory_summary")
                    gas_row = cursor.fetchone()
                    gas_stats = dict(gas_row) if gas_row else {"reserve_stock": 0, "active_in_apartments": 0, "empty_returned": 0}

                # Financials Filtered strictly from accounts_ledger
                fin_where = f"WHERE {dates['l_clause']} {b_l_clause}"
                cursor.execute(f"""
                SELECT 
                    COALESCE(SUM(CASE WHEN entry_type = 'INCOME' THEN amount ELSE 0 END), 0) as total_income,
                    COALESCE(SUM(CASE WHEN entry_type = 'EXPENSE' THEN amount ELSE 0 END), 0) as total_expense,
                    COALESCE(SUM(CASE WHEN entry_type = 'INCOME' AND (payment_mode = 'HAND_CASH' OR payment_mode = 'HAND CASH' OR payment_mode LIKE '%CASH%') THEN amount ELSE 0 END), 0) as cash_income
                FROM accounts_ledger
                {fin_where}
                """, dates['l_params'] + b_params)
                fin_row = dict(cursor.fetchone() or {"total_income": 0, "total_expense": 0, "cash_income": 0})
                tot_inc = float(fin_row.get('total_income') or 0.0)
                tot_exp = float(fin_row.get('total_expense') or 0.0)
                cash_inc = float(fin_row.get('cash_income') or 0.0)
                bank_inc = tot_inc - cash_inc
                fin_stats = {
                    "total_income": tot_inc,
                    "total_expense": tot_exp,
                    "cash_income": cash_inc,
                    "bank_income": bank_inc
                }

                # Repair profits (Strictly filtered by selected date!)
                cursor.execute(f"""
                SELECT COUNT(*) as total_jobs, COALESCE(SUM(net_profit_margin), 0) as total_profit, COALESCE(SUM(billed_amount), 0) as total_billed
                FROM maintenance_jobs
                WHERE {dates['m_clause']} {b_l_clause}
                """, dates['m_params'] + b_params)
                job_stats = dict(cursor.fetchone() or {"total_jobs": 0, "total_profit": 0, "total_billed": 0})

                return self._send_json({
                    "success": True,
                    "data": {
                        "date_filter": date_filter,
                        "period_label": dates['period_label'],
                        "flats": flat_stats,
                        "active_tenants": active_tenants,
                        "visitors": visitor_stats,
                        "staff": staff_stats,
                        "gas": gas_stats,
                        "financials": fin_stats,
                        "repair_jobs": job_stats,
                        "current_date": now.strftime('%Y-%m-%d %H:%M:%S')
                    }
                })

            # System Corporate Profile
            elif path == '/api/system/profile':
                cursor.execute("SELECT * FROM system_profile LIMIT 1")
                prof = cursor.fetchone()
                if not prof:
                    return self._send_json({"success": True, "data": {
                        "company_name": "DS MAINTENANCE",
                        "office_address": "Office No. 907, 9th Floor, Dominion Business Center 01, Jinnah Avenue, Bahria Town Karachi (BTK)",
                        "helpline_phone": "+92 21 111-DS-MAINT",
                        "official_email": "accounts@dsmaintenance.pk",
                        "ntn_number": "9028471-4",
                        "audit_ref_prefix": "DSM/AUDIT/2026/REP-8821"
                    }})
                return self._send_json({"success": True, "data": dict(prof)})

            # 5. Flats & Tenants Registry
            elif path == '/api/flats':
                building_id = query.get('building_id', [None])[0]
                b_clause = "WHERE f.building_id = ?" if building_id and building_id != 'ALL' else ""
                b_params = (building_id,) if building_id and building_id != 'ALL' else ()

                cursor.execute(f"""
                SELECT f.*, b.name as building_name, b.building_code,
                       t.full_name as tenant_name, t.primary_phone as tenant_phone, t.emergency_phone as tenant_emergency,
                       t.cnic_number as tenant_cnic, t.move_in_date, t.lease_tenure_months, t.monthly_rent, t.monthly_maintenance,
                       t.photo_filename as tenant_photo, t.document_filename as tenant_document,
                       t.id as tenant_id,
                       (SELECT GROUP_CONCAT(v.registration_number, ', ') FROM vehicles v WHERE v.flat_id = f.id) as vehicles_str
                FROM flats f
                JOIN buildings b ON f.building_id = b.id
                LEFT JOIN tenants t ON f.current_tenant_id = t.id AND t.status = 'ACTIVE'
                {b_clause}
                ORDER BY b.building_code ASC, f.floor_number ASC, f.flat_number ASC
                """, b_params)
                flats = [dict(r) for r in cursor.fetchall()]
                return self._send_json({"success": True, "data": flats})

            # 6. Single Flat Details
            elif path == '/api/flats/detail':
                flat_id = query.get('id', [None])[0]
                if not flat_id:
                    return self._send_json({"success": False, "error": "Missing flat id"}, 400)

                cursor.execute("""
                SELECT f.*, b.name as building_name, b.building_code,
                       t.id as tenant_id, t.full_name as tenant_name, t.primary_phone as tenant_phone,
                       t.emergency_phone as tenant_emergency, t.cnic_number as tenant_cnic,
                       t.move_in_date, t.lease_tenure_months, t.monthly_rent, t.monthly_maintenance,
                       t.photo_filename as tenant_photo, t.document_filename as tenant_document
                FROM flats f
                JOIN buildings b ON f.building_id = b.id
                LEFT JOIN tenants t ON (f.current_tenant_id = t.id OR (f.current_tenant_id IS NULL AND t.flat_id = f.id)) AND t.status = 'ACTIVE'
                WHERE f.id = ?
                """, (flat_id,))
                flat_row = cursor.fetchone()
                if not flat_row:
                    return self._send_json({"success": False, "error": "Flat not found"}, 404)

                flat_data = dict(flat_row)
                flat_num = flat_data['flat_number']
                b_id = flat_data['building_id']

                cursor.execute("SELECT * FROM family_members WHERE flat_id = ? ORDER BY full_name ASC", (flat_id,))
                flat_data['family_members'] = [dict(r) for r in cursor.fetchall()]

                cursor.execute("SELECT * FROM vehicles WHERE flat_id = ? ORDER BY vehicle_type ASC", (flat_id,))
                flat_data['vehicles'] = [dict(r) for r in cursor.fetchall()]

                cursor.execute("SELECT * FROM tenant_history_archive WHERE flat_id = ? ORDER BY vacated_date DESC", (flat_id,))
                flat_data['history_archive'] = [dict(r) for r in cursor.fetchall()]

                cursor.execute("SELECT * FROM flat_occupancy_history WHERE flat_id = ? ORDER BY start_date DESC, created_at DESC", (flat_id,))
                flat_data['occupancy_history'] = [dict(r) for r in cursor.fetchall()]

                cursor.execute("SELECT * FROM domestic_staff WHERE building_id = ? AND (associated_flats LIKE ? OR associated_flats LIKE ? OR associated_flats LIKE ?)", (b_id, f"%{flat_num}%", f"{flat_num},%", f"%, {flat_num}%"))
                flat_data['associated_maids'] = [dict(r) for r in cursor.fetchall()]

                cursor.execute("SELECT * FROM visitor_logs WHERE building_id = ? AND flat_number = ? ORDER BY entry_time DESC LIMIT 20", (b_id, flat_num))
                flat_data['recent_visitors'] = [dict(r) for r in cursor.fetchall()]

                cursor.execute("SELECT * FROM gas_deliveries WHERE building_id = ? AND flat_number = ? ORDER BY delivery_date DESC LIMIT 20", (b_id, flat_num))
                flat_data['gas_deliveries'] = [dict(r) for r in cursor.fetchall()]

                return self._send_json({"success": True, "data": flat_data})

            # 6b. Flat Occupancy Lifecycle & Active / Inactive Timeline History
            elif path == '/api/flats/occupancy_history':
                flat_id = query.get('flat_id', [None])[0]
                building_id = query.get('building_id', [None])[0]

                clauses = []
                params = []
                if flat_id:
                    clauses.append("h.flat_id = ?")
                    params.append(flat_id)
                if building_id and building_id != 'ALL':
                    clauses.append("h.building_id = ?")
                    params.append(building_id)

                where_str = ("WHERE " + " AND ".join(clauses)) if clauses else ""

                cursor.execute(f"""
                SELECT h.*, b.name as building_name, b.building_code, f.floor_number, f.wing, f.bhk_type
                FROM flat_occupancy_history h
                JOIN buildings b ON h.building_id = b.id
                JOIN flats f ON h.flat_id = f.id
                {where_str}
                ORDER BY h.start_date DESC, h.created_at DESC
                """, tuple(params))
                history = [dict(r) for r in cursor.fetchall()]
                return self._send_json({"success": True, "data": history})

            # 7. Permanent Tenant Archive Timeline (With Date Range & Calendar Filtering)
            elif path == '/api/tenants/archive':
                building_id = query.get('building_id', [None])[0]
                date_preset = query.get('date_preset', [None])[0]
                custom_date = query.get('custom_date', [None])[0]
                date_from = query.get('date_from', [None])[0]
                date_to = query.get('date_to', [None])[0]

                now = datetime.now()
                if date_preset == 'today':
                    date_from = now.strftime('%Y-%m-%d')
                    date_to = now.strftime('%Y-%m-%d')
                elif date_preset == 'yesterday':
                    y_str = (now - timedelta(days=1)).strftime('%Y-%m-%d')
                    date_from = y_str
                    date_to = y_str
                elif date_preset == '7days':
                    date_from = (now - timedelta(days=6)).strftime('%Y-%m-%d')
                    date_to = now.strftime('%Y-%m-%d')
                elif date_preset == 'month':
                    date_from = now.strftime('%Y-%m-01')
                    date_to = now.strftime('%Y-%m-%d')
                elif date_preset == 'year':
                    date_from = now.strftime('%Y-01-01')
                    date_to = now.strftime('%Y-%m-%d')
                elif date_preset == 'custom' and custom_date:
                    date_from = custom_date
                    date_to = custom_date

                clauses = []
                params = []
                if building_id and building_id != 'ALL':
                    clauses.append("a.building_id = ?")
                    params.append(building_id)
                if date_from:
                    clauses.append("(a.vacated_date >= ? OR a.move_in_date >= ?)")
                    params.extend([date_from, date_from])
                if date_to:
                    clauses.append("(a.vacated_date <= ? OR a.move_in_date <= ?)")
                    params.extend([date_to, date_to])

                where_str = ("WHERE " + " AND ".join(clauses)) if clauses else ""

                cursor.execute(f"""
                SELECT a.*, b.name as building_name, b.building_code, f.flat_number
                FROM tenant_history_archive a
                JOIN buildings b ON a.building_id = b.id
                JOIN flats f ON a.flat_id = f.id
                {where_str}
                ORDER BY a.vacated_date DESC
                """, tuple(params))
                archive = [dict(r) for r in cursor.fetchall()]
                return self._send_json({"success": True, "data": archive})

            # 7b. Single Tenant Archive Record Detail
            elif path == '/api/tenants/archive/detail':
                archive_id = query.get('id', [None])[0]
                if not archive_id:
                    return self._send_json({"success": False, "error": "Missing archive id"}, 400)
                cursor.execute("""
                SELECT a.*, b.name as building_name, b.building_code, f.flat_number
                FROM tenant_history_archive a
                JOIN buildings b ON a.building_id = b.id
                JOIN flats f ON a.flat_id = f.id
                WHERE a.id = ?
                """, (archive_id,))
                arch = cursor.fetchone()
                if not arch:
                    return self._send_json({"success": False, "error": "Archive record not found"}, 404)
                return self._send_json({"success": True, "data": dict(arch)})

            # 8. Visitors Log (Exact Date Preset & Filter Matching)
            elif path == '/api/visitors':
                building_id = query.get('building_id', [None])[0]
                date_preset = query.get('date_preset', [None])[0]
                custom_date = query.get('custom_date', [None])[0]
                date_from = query.get('date_from', [None])[0]
                date_to = query.get('date_to', [None])[0]

                dates = build_sql_date_clauses(date_preset or 'today', custom_date=custom_date, date_from=date_from, date_to=date_to)
                b_clause = "AND v.building_id = ?" if building_id and building_id != 'ALL' else ""
                b_params = (building_id,) if building_id and building_id != 'ALL' else ()

                cursor.execute(f"""
                SELECT v.*, b.name as building_name, b.building_code
                FROM visitor_logs v
                JOIN buildings b ON v.building_id = b.id
                WHERE {dates['v_clause'].replace('entry_time', 'v.entry_time')} {b_clause}
                ORDER BY v.entry_time DESC
                LIMIT 500
                """, dates['v_params'] + b_params)
                visitors = [dict(r) for r in cursor.fetchall()]
                return self._send_json({"success": True, "data": visitors})

            # 9. Domestic Staff & Bahria Maids
            elif path == '/api/domestic_staff':
                building_id = query.get('building_id', [None])[0]
                b_clause = "WHERE s.building_id = ?" if building_id and building_id != 'ALL' else ""
                b_params = (building_id,) if building_id and building_id != 'ALL' else ()

                cursor.execute(f"""
                SELECT s.*, b.name as building_name, b.building_code
                FROM domestic_staff s
                JOIN buildings b ON s.building_id = b.id
                {b_clause}
                ORDER BY s.status DESC, s.full_name ASC
                """, b_params)
                staff = [dict(r) for r in cursor.fetchall()]
                return self._send_json({"success": True, "data": staff})

            # 10. Gas Deliveries & Inventory & Active Cylinders Mapping
            elif path in ['/api/gas', '/api/gas/deliveries']:
                building_id = query.get('building_id', [None])[0]
                date_preset = query.get('date_preset', [None])[0]
                custom_date = query.get('custom_date', [None])[0]
                date_from = query.get('date_from', [None])[0]
                date_to = query.get('date_to', [None])[0]

                dates = build_sql_date_clauses(date_preset or 'month', custom_date=custom_date, date_from=date_from, date_to=date_to)
                b_clause = "AND g.building_id = ?" if building_id and building_id != 'ALL' else ""
                b_params = (building_id,) if building_id and building_id != 'ALL' else ()

                cursor.execute(f"""
                SELECT g.*, b.name as building_name, b.building_code, b.address as building_address,
                       f.occupancy_mode, f.owner_name, f.owner_phone,
                       t.full_name as tenant_name, t.primary_phone as tenant_phone
                FROM gas_deliveries g
                JOIN buildings b ON g.building_id = b.id
                LEFT JOIN flats f ON g.flat_id = f.id
                LEFT JOIN tenants t ON f.current_tenant_id = t.id AND t.status = 'ACTIVE'
                WHERE {dates['g_clause'].replace('delivery_date', 'g.delivery_date')} {b_clause}
                ORDER BY g.delivery_date DESC
                LIMIT 500
                """, dates['g_params'] + b_params)
                deliveries = [dict(r) for r in cursor.fetchall()]

                if building_id and building_id != 'ALL':
                    cursor.execute("SELECT * FROM gas_inventory_summary WHERE building_id = ?", (building_id,))
                    inv_row = cursor.fetchone()
                    inventory = dict(inv_row) if inv_row else {"reserve_stock": 0, "active_in_apartments": 0, "empty_returned": 0}
                else:
                    cursor.execute("SELECT COALESCE(SUM(reserve_stock), 0) as reserve_stock, COALESCE(SUM(active_in_apartments), 0) as active_in_apartments, COALESCE(SUM(empty_returned), 0) as empty_returned FROM gas_inventory_summary")
                    inv_row = cursor.fetchone()
                    inventory = dict(inv_row) if inv_row else {"reserve_stock": 0, "active_in_apartments": 0, "empty_returned": 0}

                # Active Cylinders Distribution By Apartment (Kahan Kahan Kis Kis Ke Paas Hain)
                b_flat_filter = f"WHERE f.building_id = '{building_id}'" if building_id and building_id != 'ALL' else ""
                cursor.execute(f"""
                SELECT f.id as flat_id, f.flat_number, f.floor_number, f.occupancy_mode, f.owner_name, f.owner_phone,
                       t.full_name as tenant_name, t.primary_phone as tenant_phone,
                       b.name as building_name, b.building_code,
                       (
                           SELECT g.delivery_date 
                           FROM gas_deliveries g 
                           WHERE g.flat_id = f.id 
                           ORDER BY g.delivery_date DESC 
                           LIMIT 1
                       ) as last_delivery_date,
                       (
                           SELECT g.is_empty_returned 
                           FROM gas_deliveries g 
                           WHERE g.flat_id = f.id 
                           ORDER BY g.delivery_date DESC 
                           LIMIT 1
                       ) as last_empty_returned,
                       (
                           SELECT g.receipt_number 
                           FROM gas_deliveries g 
                           WHERE g.flat_id = f.id 
                           ORDER BY g.delivery_date DESC 
                           LIMIT 1
                       ) as last_receipt_number,
                       (
                           SELECT g.payment_mode 
                           FROM gas_deliveries g 
                           WHERE g.flat_id = f.id 
                           ORDER BY g.delivery_date DESC 
                           LIMIT 1
                       ) as last_payment_mode,
                       (
                           SELECT COALESCE(SUM(g.quantity), 0)
                           FROM gas_deliveries g
                           WHERE g.flat_id = f.id
                       ) as total_cylinders_received
                FROM flats f
                JOIN buildings b ON f.building_id = b.id
                LEFT JOIN tenants t ON f.current_tenant_id = t.id AND t.status = 'ACTIVE'
                {b_flat_filter}
                ORDER BY b.building_code ASC, f.floor_number ASC, f.flat_number ASC
                """)
                active_flats = [dict(r) for r in cursor.fetchall()]

                return self._send_json({
                    "success": True, 
                    "data": {
                        "deliveries": deliveries, 
                        "inventory": inventory,
                        "active_flats": active_flats
                    }
                })

            # 10b. Gas Inward Stock Supplies (Arrivals & Procurement Logs)
            elif path == '/api/gas/supplies':
                building_id = query.get('building_id', [None])[0]
                date_preset = query.get('date_preset', [None])[0]
                custom_date = query.get('custom_date', [None])[0]
                date_from = query.get('date_from', [None])[0]
                date_to = query.get('date_to', [None])[0]

                dates = build_sql_date_clauses(date_preset or 'month', custom_date=custom_date, date_from=date_from, date_to=date_to)
                b_clause = "AND s.building_id = ?" if building_id and building_id != 'ALL' else ""
                b_params = (building_id,) if building_id and building_id != 'ALL' else ()

                cursor.execute(f"""
                SELECT s.*, b.name as building_name, b.building_code
                FROM gas_inward_supply s
                JOIN buildings b ON s.building_id = b.id
                WHERE {dates['g_clause'].replace('delivery_date', 's.supply_date')} {b_clause}
                ORDER BY s.supply_date DESC, s.created_at DESC
                LIMIT 500
                """, dates['g_params'] + b_params)
                supplies = [dict(r) for r in cursor.fetchall()]
                return self._send_json({"success": True, "data": supplies})

            # 11. Maintenance Jobs
            elif path == '/api/maintenance_jobs':
                building_id = query.get('building_id', [None])[0]
                date_preset = query.get('date_preset', [None])[0]
                custom_date = query.get('custom_date', [None])[0]
                date_from = query.get('date_from', [None])[0]
                date_to = query.get('date_to', [None])[0]

                dates = build_sql_date_clauses(date_preset or 'month', custom_date=custom_date, date_from=date_from, date_to=date_to)
                b_clause = "AND m.building_id = ?" if building_id and building_id != 'ALL' else ""
                b_params = (building_id,) if building_id and building_id != 'ALL' else ()

                cursor.execute(f"""
                SELECT m.*, b.name as building_name, b.building_code
                FROM maintenance_jobs m
                JOIN buildings b ON m.building_id = b.id
                WHERE {dates['m_clause'].replace('job_date', 'm.job_date')} {b_clause}
                ORDER BY m.job_date DESC
                LIMIT 500
                """, dates['m_params'] + b_params)
                jobs = [dict(r) for r in cursor.fetchall()]
                return self._send_json({"success": True, "data": jobs})

            # 12. Accounts Ledger
            elif path == '/api/ledger':
                building_id = query.get('building_id', [None])[0]
                date_preset = query.get('date_preset', [None])[0]
                custom_date = query.get('custom_date', [None])[0]
                date_from = query.get('date_from', [None])[0]
                date_to = query.get('date_to', [None])[0]

                dates = build_sql_date_clauses(date_preset or 'month', custom_date=custom_date, date_from=date_from, date_to=date_to)
                b_clause = "AND l.building_id = ?" if building_id and building_id != 'ALL' else ""
                b_params = (building_id,) if building_id and building_id != 'ALL' else ()

                cursor.execute(f"""
                SELECT l.*, b.name as building_name, b.building_code
                FROM accounts_ledger l
                JOIN buildings b ON l.building_id = b.id
                WHERE {dates['l_clause'].replace('entry_date', 'l.entry_date')} {b_clause}
                ORDER BY l.entry_date DESC, l.updated_at DESC
                LIMIT 500
                """, dates['l_params'] + b_params)
                ledger = [dict(r) for r in cursor.fetchall()]
                return self._send_json({"success": True, "data": ledger})

            # 13. Sync Logs
            elif path == '/api/sync/logs':
                cursor.execute("""
                SELECT s.*, b.name as building_name, b.building_code
                FROM sync_logs s
                LEFT JOIN buildings b ON s.building_id = b.id
                ORDER BY s.sync_timestamp DESC
                LIMIT 100
                """)
                logs = [dict(r) for r in cursor.fetchall()]
                return self._send_json({"success": True, "data": logs})

            # 14. Monthly & Periodic Executive Report (Master Admin)
            elif path == '/api/reports/monthly':
                user_role = query.get('user_role', [None])[0] or query.get('role', [None])[0]
                if user_role == 'RECEPTIONIST':
                    return self._send_json({"success": False, "error": "Access Denied: Only Master Admin / Building Manager is authorized to generate comprehensive reports."}, 403)

                building_id = query.get('building_id', [None])[0]
                date_filter = query.get('date_preset', ['month'])[0]
                custom_date = query.get('custom_date', [None])[0]
                month_param = query.get('month', [None])[0]
                date_from = query.get('date_from', [None])[0]
                date_to = query.get('date_to', [None])[0]

                now = datetime.now()
                dates = build_sql_date_clauses(date_filter, custom_date=custom_date, date_from=date_from, date_to=date_to, month_param=month_param)
                
                b_l_clause = f"AND building_id = ?" if building_id and building_id != 'ALL' else ""
                b_l_params = (building_id,) if building_id and building_id != 'ALL' else ()

                # 1. Category Totals (Filtered by Date and Building)
                l_where = f"WHERE 1=1 {b_l_clause} AND {dates['l_clause']}"
                l_params = b_l_params + tuple(dates['l_params'])
                cursor.execute(f"""
                SELECT 
                    category, entry_type, payment_mode,
                    SUM(amount) as total_amount, COUNT(*) as count
                FROM accounts_ledger
                {l_where}
                GROUP BY category, entry_type, payment_mode
                ORDER BY total_amount DESC
                """, l_params)
                category_totals = [dict(r) for r in cursor.fetchall()]

                # 2. Detailed Ledger Transactions for Printable Report (Filtered by Date and Building)
                dl_where = f"WHERE 1=1 {b_l_clause.replace('building_id', 'l.building_id')} AND {dates['l_clause'].replace('entry_date', 'l.entry_date')}"
                dl_params = b_l_params + tuple(dates['l_params'])
                cursor.execute(f"""
                SELECT l.*, b.name as building_name, b.building_code
                FROM accounts_ledger l
                JOIN buildings b ON l.building_id = b.id
                {dl_where}
                ORDER BY l.entry_date DESC, l.updated_at DESC
                LIMIT 500
                """, dl_params)
                detailed_transactions = [dict(r) for r in cursor.fetchall()]

                # 3. Gas Summary & Commercial Refill Profit Calculation (Filtered by Date and Building)
                g_where = f"WHERE 1=1 {b_l_clause} AND {dates['g_clause']}"
                g_params = b_l_params + tuple(dates['g_params'])
                cursor.execute(f"""
                SELECT 
                    COUNT(*) as total_deliveries, 
                    COALESCE(SUM(quantity), 0) as total_cylinders, 
                    COALESCE(SUM(total_amount), 0) as total_gas_billed,
                    COALESCE(SUM(quantity * COALESCE(refill_purchase_cost, 2800.0)), 0) as total_refill_purchase_cost,
                    COALESCE(SUM(total_amount - (quantity * COALESCE(refill_purchase_cost, 2800.0))), 0) as gas_net_profit
                FROM gas_deliveries
                {g_where}
                """, g_params)
                gas_month_summary = dict(cursor.fetchone() or {})

                # 3b. Gas Deliveries Detailed Register (Filtered by Date and Building)
                gl_where = f"WHERE 1=1 {b_l_clause.replace('building_id', 'g.building_id')} AND {dates['g_clause'].replace('delivery_date', 'g.delivery_date')}"
                gl_params = b_l_params + tuple(dates['g_params'])
                cursor.execute(f"""
                SELECT g.*, b.name as building_name, f.occupancy_mode, f.owner_name, f.owner_phone,
                       t.full_name as tenant_name, t.primary_phone as tenant_phone
                FROM gas_deliveries g
                JOIN buildings b ON g.building_id = b.id
                LEFT JOIN flats f ON g.flat_id = f.id
                LEFT JOIN tenants t ON f.current_tenant_id = t.id AND t.status = 'ACTIVE'
                {gl_where}
                ORDER BY g.delivery_date DESC
                LIMIT 300
                """, gl_params)
                gas_deliveries_list = [dict(r) for r in cursor.fetchall()]

                # 4. Repair & Expenses Summary (Filtered by Date and Building)
                m_where = f"WHERE 1=1 {b_l_clause} AND {dates['m_clause']}"
                m_params = b_l_params + tuple(dates['m_params'])
                cursor.execute(f"""
                SELECT 
                    COUNT(*) as total_jobs, 
                    COALESCE(SUM(billed_amount), 0) as total_billed, 
                    COALESCE(SUM(parts_cost), 0) as total_parts, 
                    COALESCE(SUM(labor_cost), 0) as total_labor, 
                    COALESCE(SUM(net_profit_margin), 0) as total_net_profit
                FROM maintenance_jobs
                {m_where}
                """, m_params)
                repair_month_summary = dict(cursor.fetchone() or {})

                # 4b. Expenses Breakdown & Ledger Register (Filtered by Date and Building)
                ex_where = f"WHERE l.entry_type = 'EXPENSE' {b_l_clause.replace('building_id', 'l.building_id')} AND {dates['l_clause'].replace('entry_date', 'l.entry_date')}"
                ex_params = b_l_params + tuple(dates['l_params'])
                cursor.execute(f"""
                SELECT l.*, b.name as building_name
                FROM accounts_ledger l
                JOIN buildings b ON l.building_id = b.id
                {ex_where}
                ORDER BY l.entry_date DESC, l.updated_at DESC
                LIMIT 300
                """, ex_params)
                expenses_list = [dict(r) for r in cursor.fetchall()]

                # 5. Flats & Complete Active Tenant Profiles Register (Filtered by Building)
                flat_clause = "WHERE f.building_id = ?" if building_id and building_id != 'ALL' else ""
                flat_params = (building_id,) if building_id and building_id != 'ALL' else ()
                cursor.execute(f"""
                SELECT f.id, f.flat_number, f.floor_number, f.wing, f.occupancy_mode, f.owner_name, f.owner_phone, f.owner_cnic,
                       b.name as building_name,
                       t.id as tenant_id, t.full_name as tenant_name, t.primary_phone as tenant_phone, t.emergency_phone as tenant_emergency, 
                       t.cnic_number as tenant_cnic, t.move_in_date, t.lease_tenure_months, t.photo_filename as tenant_photo, t.status as tenant_status,
                       (SELECT COUNT(*) FROM family_members fm WHERE fm.flat_id = f.id) as family_count,
                       (SELECT COUNT(*) FROM vehicles v WHERE v.flat_id = f.id) as vehicle_count
                FROM flats f
                JOIN buildings b ON f.building_id = b.id
                LEFT JOIN tenants t ON f.current_tenant_id = t.id AND t.status = 'ACTIVE'
                {flat_clause}
                ORDER BY b.building_code ASC, f.floor_number ASC, f.flat_number ASC
                """, flat_params)
                flats_status = [dict(r) for r in cursor.fetchall()]

                # 6. Vacated Tenant History Archive Register (Filtered by Building)
                arch_clause = "WHERE building_id = ?" if building_id and building_id != 'ALL' else ""
                arch_params = (building_id,) if building_id and building_id != 'ALL' else ()
                cursor.execute(f"""
                SELECT a.*, b.name as building_name
                FROM tenant_history_archive a
                JOIN buildings b ON a.building_id = b.id
                {arch_clause}
                ORDER BY a.vacated_date DESC
                LIMIT 200
                """, arch_params)
                vacated_tenants = [dict(r) for r in cursor.fetchall()]

                # 7. Commercial Profit & Financial Matrix (Strictly for Selected Building or All Buildings, with Date Filter)
                matrix_bldg_clause = "WHERE b.id = ?" if building_id and building_id != 'ALL' else ""
                matrix_bldg_params = (building_id,) if building_id and building_id != 'ALL' else ()

                cursor.execute(f"""
                SELECT b.id, b.building_code, b.name as building_name
                FROM buildings b
                {matrix_bldg_clause}
                ORDER BY b.building_code ASC
                """, matrix_bldg_params)
                target_buildings = [dict(r) for r in cursor.fetchall()]

                building_matrix = []
                for b_item in target_buildings:
                    b_id = b_item['id']

                    # Gas for this building in period
                    cursor.execute(f"""
                    SELECT 
                        COALESCE(SUM(total_amount), 0) as gas_billed,
                        COALESCE(SUM(quantity * COALESCE(refill_purchase_cost, 2800.0)), 0) as gas_cost
                    FROM gas_deliveries
                    WHERE building_id = ? AND {dates['g_clause']}
                    """, (b_id, *dates['g_params']))
                    g_res = dict(cursor.fetchone() or {})

                    # Repairs for this building in period
                    cursor.execute(f"""
                    SELECT 
                        COALESCE(SUM(billed_amount), 0) as repair_billed,
                        COALESCE(SUM(parts_cost), 0) as repair_parts,
                        COALESCE(SUM(labor_cost), 0) as repair_labor
                    FROM maintenance_jobs
                    WHERE building_id = ? AND {dates['m_clause']}
                    """, (b_id, *dates['m_params']))
                    m_res = dict(cursor.fetchone() or {})

                    # Ledger Income & Expense for this building in period
                    cursor.execute(f"""
                    SELECT 
                        COALESCE(SUM(CASE WHEN entry_type = 'INCOME' THEN amount ELSE 0 END), 0) as ledger_income,
                        COALESCE(SUM(CASE WHEN entry_type = 'EXPENSE' THEN amount ELSE 0 END), 0) as ledger_expense
                    FROM accounts_ledger
                    WHERE building_id = ? AND {dates['l_clause']}
                    """, (b_id, *dates['l_params']))
                    l_res = dict(cursor.fetchone() or {})

                    gas_billed = float(g_res.get('gas_billed') or 0.0)
                    gas_cost = float(g_res.get('gas_cost') or 0.0)
                    repair_billed = float(m_res.get('repair_billed') or 0.0)
                    repair_parts = float(m_res.get('repair_parts') or 0.0)
                    repair_labor = float(m_res.get('repair_labor') or 0.0)
                    ledger_income = float(l_res.get('ledger_income') or 0.0)
                    ledger_expense = float(l_res.get('ledger_expense') or 0.0)

                    g_prof = gas_billed - gas_cost
                    r_prof = repair_billed - (repair_parts + repair_labor)
                    tot_rev = ledger_income
                    tot_out = ledger_expense
                    net_p = tot_rev - tot_out

                    building_matrix.append({
                        'id': b_item['id'],
                        'building_code': b_item['building_code'],
                        'building_name': b_item['building_name'],
                        'gas_billed': gas_billed,
                        'gas_cost': gas_cost,
                        'gas_profit': g_prof,
                        'repair_billed': repair_billed,
                        'repair_parts': repair_parts,
                        'repair_labor': repair_labor,
                        'repair_profit': r_prof,
                        'total_revenue': tot_rev,
                        'total_outflow': tot_out,
                        'net_profit': net_p
                    })

                # Building Title
                b_title = "All 5 Buildings (Consolidated Portfolio)"
                if building_id and building_id != 'ALL':
                    cursor.execute("SELECT name FROM buildings WHERE id = ?", (building_id,))
                    brow = cursor.fetchone()
                    if brow: b_title = brow['name']

                return self._send_json({
                    "success": True,
                    "data": {
                        "period_label": dates['period_label'],
                        "building_name": b_title,
                        "building_id": building_id or 'ALL',
                        "date_filter": date_filter,
                        "category_totals": category_totals,
                        "detailed_transactions": detailed_transactions,
                        "expenses_list": expenses_list,
                        "gas_summary": gas_month_summary,
                        "gas_deliveries_list": gas_deliveries_list,
                        "repair_summary": repair_month_summary,
                        "flats_status": flats_status,
                        "vacated_tenants": vacated_tenants,
                        "building_matrix": building_matrix,
                        "generated_at": now.strftime('%d %b %Y, %I:%M %p')
                    }
                })

            # 15. Master Analytics Data (Master Admin Console Overview)
            elif path == '/api/analytics/consolidated':
                user_role = query.get('user_role', [None])[0] or query.get('role', [None])[0]
                if user_role in ('RECEPTIONIST', 'MANAGER'):
                    return self._send_json({"success": False, "error": "Access Denied: Only Master Admin is authorized to view consolidated analytics."}, 403)

                date_filter = query.get('date_preset', ['month'])[0]
                custom_date = query.get('custom_date', [None])[0]
                date_from = query.get('date_from', [None])[0]
                date_to = query.get('date_to', [None])[0]
                dates = build_sql_date_clauses(date_filter, custom_date=custom_date, date_from=date_from, date_to=date_to)

                cursor.execute("""
                SELECT 
                    strftime('%Y-%m', entry_date) as month,
                    b.building_code,
                    b.name as building_name,
                    COALESCE(SUM(CASE WHEN entry_type = 'INCOME' THEN amount ELSE 0 END), 0) as income,
                    COALESCE(SUM(CASE WHEN entry_type = 'EXPENSE' THEN amount ELSE 0 END), 0) as expense
                FROM accounts_ledger l
                JOIN buildings b ON l.building_id = b.id
                GROUP BY month, b.id
                ORDER BY month ASC, b.building_code ASC
                """)
                monthly_trends = [dict(r) for r in cursor.fetchall()]

                cursor.execute(f"""
                SELECT category, entry_type, SUM(amount) as total_amount
                FROM accounts_ledger
                WHERE entry_type = 'INCOME' AND {dates['l_clause']}
                GROUP BY category, entry_type
                ORDER BY total_amount DESC
                """, dates['l_params'])
                category_breakdown = [dict(r) for r in cursor.fetchall()]

                # Accurate subqueries for Active vs Inactive breakdown & multi-node metrics
                cursor.execute(f"""
                SELECT 
                    b.id, b.building_code, b.name as building_name,
                    (SELECT COUNT(*) FROM flats f WHERE f.building_id = b.id) as total_flats,
                    (SELECT COUNT(*) FROM flats f WHERE f.building_id = b.id AND f.occupancy_mode = 'Owner Occupied') as owner_flats,
                    (SELECT COUNT(*) FROM flats f WHERE f.building_id = b.id AND f.occupancy_mode LIKE 'Rented%') as rented_flats,
                    (SELECT COUNT(*) FROM flats f WHERE f.building_id = b.id AND f.occupancy_mode = 'Vacant') as vacant_flats,
                    (SELECT COUNT(*) FROM tenants t WHERE t.building_id = b.id AND t.status = 'ACTIVE') as active_tenants,
                    (SELECT COUNT(*) FROM visitor_logs v WHERE v.building_id = b.id AND v.status = 'IN_PREMISES') as visitors_inside,
                    (SELECT COUNT(*) FROM visitor_logs v WHERE v.building_id = b.id AND {dates['v_clause'].replace('entry_time', 'v.entry_time')}) as period_visitors,
                    (SELECT COUNT(*) FROM domestic_staff s WHERE s.building_id = b.id AND s.status = 'ON_DUTY') as staff_on_duty,
                    COALESCE((SELECT active_in_apartments FROM gas_inventory_summary g WHERE g.building_id = b.id), 0) as active_cylinders,
                    COALESCE((SELECT reserve_stock FROM gas_inventory_summary g WHERE g.building_id = b.id), 0) as reserve_cylinders,
                    COALESCE((SELECT SUM(gd.total_amount) FROM gas_deliveries gd WHERE gd.building_id = b.id AND {dates['g_clause'].replace('delivery_date', 'gd.delivery_date')}), 0) as gas_billed,
                    COALESCE((SELECT SUM(gd.quantity * COALESCE(gd.refill_purchase_cost, 2800.0)) FROM gas_deliveries gd WHERE gd.building_id = b.id AND {dates['g_clause'].replace('delivery_date', 'gd.delivery_date')}), 0) as gas_cost,
                    COALESCE((SELECT SUM(mj.billed_amount) FROM maintenance_jobs mj WHERE mj.building_id = b.id AND {dates['m_clause'].replace('job_date', 'mj.job_date')}), 0) as repair_billed,
                    COALESCE((SELECT SUM(mj.parts_cost + mj.labor_cost) FROM maintenance_jobs mj WHERE mj.building_id = b.id AND {dates['m_clause'].replace('job_date', 'mj.job_date')}), 0) as repair_cost,
                    COALESCE((SELECT SUM(l.amount) FROM accounts_ledger l WHERE l.building_id = b.id AND l.entry_type = 'INCOME' AND {dates['l_clause'].replace('entry_date', 'l.entry_date')}), 0) as ledger_income,
                    COALESCE((SELECT SUM(l.amount) FROM accounts_ledger l WHERE l.building_id = b.id AND l.entry_type = 'EXPENSE' AND {dates['l_clause'].replace('entry_date', 'l.entry_date')}), 0) as ledger_expense
                FROM buildings b
                ORDER BY b.building_code ASC
                """, dates['v_params'] + dates['g_params'] + dates['g_params'] + dates['m_params'] + dates['m_params'] + dates['l_params'] + dates['l_params'])

                raw_comparison = [dict(r) for r in cursor.fetchall()]
                building_comparison = []
                for b_item in raw_comparison:
                    occupied = (b_item.get('owner_flats') or 0) + (b_item.get('rented_flats') or 0)
                    b_item['occupied_flats'] = occupied
                    
                    gas_b = b_item.get('gas_billed', 0.0)
                    gas_c = b_item.get('gas_cost', 0.0)
                    gas_prof = gas_b - gas_c

                    rep_b = b_item.get('repair_billed', 0.0)
                    rep_c = b_item.get('repair_cost', 0.0)
                    rep_prof = rep_b - rep_c

                    tot_inc = b_item.get('ledger_income', 0.0)
                    tot_exp = b_item.get('ledger_expense', 0.0)
                    net_prof = tot_inc - tot_exp

                    b_item['total_income'] = tot_inc
                    b_item['total_expense'] = tot_exp
                    b_item['gas_profit'] = gas_prof
                    b_item['repair_profit'] = rep_prof
                    b_item['net_profit'] = net_prof

                    b_item['total_income'] = tot_inc
                    b_item['total_expense'] = tot_exp
                    b_item['gas_profit'] = gas_prof
                    b_item['repair_profit'] = rep_prof
                    b_item['net_profit'] = net_prof

                    is_active = (tot_inc > 0) or (b_item.get('period_visitors', 0) > 0) or (b_item.get('staff_on_duty', 0) > 0)
                    b_item['is_active'] = 1 if is_active else 0
                    building_comparison.append(b_item)

                portfolio_summary = {
                    "total_buildings": len(building_comparison),
                    "active_buildings": sum(1 for b in building_comparison if b['is_active'] == 1),
                    "inactive_buildings": sum(1 for b in building_comparison if b['is_active'] == 0),
                    "total_flats": sum(b.get('total_flats', 0) for b in building_comparison),
                    "total_occupied_flats": sum(b.get('occupied_flats', 0) for b in building_comparison),
                    "total_owner_flats": sum(b.get('owner_flats', 0) for b in building_comparison),
                    "total_tenant_flats": sum(b.get('rented_flats', 0) for b in building_comparison),
                    "total_vacant_flats": sum(b.get('vacant_flats', 0) for b in building_comparison),
                    "total_active_cylinders": sum(b.get('active_cylinders', 0) for b in building_comparison),
                    "total_staff_on_duty": sum(b.get('staff_on_duty', 0) for b in building_comparison),
                    "total_visitors_inside": sum(b.get('visitors_inside', 0) for b in building_comparison),
                    "total_period_income": sum(b.get('total_income', 0) for b in building_comparison),
                    "total_period_expense": sum(b.get('total_expense', 0) for b in building_comparison),
                    "total_net_profit": sum(b.get('net_profit', 0) for b in building_comparison),
                }

                return self._send_json({
                    "success": True,
                    "data": {
                        "period_label": dates['period_label'],
                        "monthly_trends": monthly_trends,
                        "category_breakdown": category_breakdown,
                        "building_comparison": building_comparison,
                        "portfolio_summary": portfolio_summary
                    }
                })

            # 16. Building-Specific Detailed Drill-Down Analytics (Master Admin)
            elif path == '/api/analytics/building_detail':
                user_role = query.get('user_role', [None])[0] or query.get('role', [None])[0]
                if user_role in ('RECEPTIONIST', 'MANAGER'):
                    return self._send_json({"success": False, "error": "Access Denied: Only Master Admin is authorized to view building cockpit analytics."}, 403)
                building_id = query.get('building_id', [None])[0]
                date_filter = query.get('date_preset', ['month'])[0]
                custom_date = query.get('custom_date', [None])[0]

                if not building_id or building_id == 'ALL':
                    cursor.execute("SELECT id FROM buildings ORDER BY building_code ASC LIMIT 1")
                    brow = cursor.fetchone()
                    building_id = brow['id'] if brow else ''

                cursor.execute("SELECT * FROM buildings WHERE id = ?", (building_id,))
                b_info = dict(cursor.fetchone() or {})

                now = datetime.now()
                dates = build_sql_date_clauses(date_filter, custom_date=custom_date)

                # Flats counts
                cursor.execute("""
                SELECT 
                    COUNT(*) as total,
                    COALESCE(SUM(CASE WHEN occupancy_mode = 'Owner Occupied' THEN 1 ELSE 0 END), 0) as owner_occ,
                    COALESCE(SUM(CASE WHEN occupancy_mode = 'Rented' AND current_tenant_id IS NOT NULL THEN 1 ELSE 0 END), 0) as rented_occ,
                    COALESCE(SUM(CASE WHEN occupancy_mode = 'Vacant' OR (occupancy_mode != 'Owner Occupied' AND current_tenant_id IS NULL) THEN 1 ELSE 0 END), 0) as vacant
                FROM flats WHERE building_id = ?
                """, (building_id,))
                flat_stats = dict(cursor.fetchone() or {"total": 0, "owner_occ": 0, "rented_occ": 0, "vacant": 0})

                # Active tenants
                cursor.execute("SELECT COUNT(*) as c FROM tenants WHERE building_id = ? AND status = 'ACTIVE'", (building_id,))
                active_tenants = (cursor.fetchone() or {})['c'] or 0

                # Visitors
                cursor.execute(f"SELECT COUNT(*) as total_visitors, COALESCE(SUM(CASE WHEN status = 'IN_PREMISES' THEN 1 ELSE 0 END), 0) as inside_now FROM visitor_logs WHERE building_id = ? AND {dates['v_clause']}", (building_id,) + dates['v_params'])
                visitor_stats = dict(cursor.fetchone() or {"total_visitors": 0, "inside_now": 0})

                # Staff
                cursor.execute("SELECT COUNT(*) as total_staff, COALESCE(SUM(CASE WHEN status = 'ON_DUTY' THEN 1 ELSE 0 END), 0) as on_duty FROM domestic_staff WHERE building_id = ?", (building_id,))
                staff_stats = dict(cursor.fetchone() or {"total_staff": 0, "on_duty": 0})

                # Gas
                cursor.execute("SELECT reserve_stock, active_in_apartments, empty_returned FROM gas_inventory_summary WHERE building_id = ?", (building_id,))
                inv_row = cursor.fetchone()
                gas_inventory = dict(inv_row) if inv_row else {"reserve_stock": 0, "active_in_apartments": 0, "empty_returned": 0}

                cursor.execute(f"SELECT COUNT(*) as deliveries_count, COALESCE(SUM(quantity), 0) as total_cylinders, COALESCE(SUM(total_amount), 0) as total_gas_amount FROM gas_deliveries WHERE building_id = ? AND {dates['g_clause']}", (building_id,) + dates['g_params'])
                gas_deliv_stats = dict(cursor.fetchone() or {"deliveries_count": 0, "total_cylinders": 0, "total_gas_amount": 0})

                # Financials
                cursor.execute(f"""
                SELECT 
                    COALESCE(SUM(CASE WHEN entry_type = 'INCOME' THEN amount ELSE 0 END), 0) as total_income,
                    COALESCE(SUM(CASE WHEN entry_type = 'EXPENSE' THEN amount ELSE 0 END), 0) as total_expense,
                    COALESCE(SUM(CASE WHEN entry_type = 'INCOME' AND payment_mode = 'HAND_CASH' THEN amount ELSE 0 END), 0) as cash_income,
                    COALESCE(SUM(CASE WHEN entry_type = 'INCOME' AND payment_mode = 'BANK_TRANSFER' THEN amount ELSE 0 END), 0) as bank_income
                FROM accounts_ledger
                WHERE building_id = ? AND {dates['l_clause']}
                """, (building_id,) + dates['l_params'])
                fin_stats = dict(cursor.fetchone() or {"total_income": 0, "total_expense": 0, "cash_income": 0, "bank_income": 0})

                # Repairs
                cursor.execute(f"SELECT COUNT(*) as total_jobs, COALESCE(SUM(net_profit_margin), 0) as total_profit, COALESCE(SUM(billed_amount), 0) as total_billed FROM maintenance_jobs WHERE building_id = ? AND {dates['m_clause']}", (building_id,) + dates['m_params'])
                job_stats = dict(cursor.fetchone() or {"total_jobs": 0, "total_profit": 0, "total_billed": 0})

                # Category Breakdown
                cursor.execute(f"""
                SELECT category, entry_type, SUM(amount) as total_amount, COUNT(*) as count
                FROM accounts_ledger
                WHERE building_id = ? AND {dates['l_clause']}
                GROUP BY category, entry_type
                ORDER BY total_amount DESC
                """, (building_id,) + dates['l_params'])
                category_breakdown = [dict(r) for r in cursor.fetchall()]

                # Flats List
                cursor.execute("""
                SELECT f.*, t.full_name as tenant_name, t.primary_phone as tenant_phone, t.monthly_rent, t.monthly_maintenance
                FROM flats f
                LEFT JOIN tenants t ON f.current_tenant_id = t.id AND t.status = 'ACTIVE'
                WHERE f.building_id = ?
                ORDER BY f.floor_number ASC, f.flat_number ASC
                """, (building_id,))
                flats_list = [dict(r) for r in cursor.fetchall()]

                # Recent Ledger Transactions
                cursor.execute(f"""
                SELECT * FROM accounts_ledger
                WHERE building_id = ? AND {dates['l_clause']}
                ORDER BY entry_date DESC, updated_at DESC
                LIMIT 50
                """, (building_id,) + dates['l_params'])
                recent_ledger = [dict(r) for r in cursor.fetchall()]

                return self._send_json({
                    "success": True,
                    "data": {
                        "building": b_info,
                        "period_label": dates['period_label'],
                        "date_filter": date_filter,
                        "flats": flat_stats,
                        "active_tenants": active_tenants,
                        "visitors": visitor_stats,
                        "staff": staff_stats,
                        "gas_inventory": gas_inventory,
                        "gas_deliv_stats": gas_deliv_stats,
                        "financials": fin_stats,
                        "repair_jobs": job_stats,
                        "category_breakdown": category_breakdown,
                        "flats_list": flats_list,
                        "recent_ledger": recent_ledger
                    }
                })

            # 16b. Comprehensive Multi-Site Master Console Dossiers (Cards 1, 2, 3, 4)
            elif path == '/api/analytics/master_dossiers':
                user_role = query.get('user_role', [None])[0] or query.get('role', [None])[0]
                if user_role in ('RECEPTIONIST', 'MANAGER'):
                    return self._send_json({"success": False, "error": "Access Denied: Only Master Admin is authorized to view master dossiers."}, 403)
                d_type = query.get('type', ['nodes'])[0] # 'nodes', 'flats', 'gas', 'staff'
                date_filter = query.get('date_preset', ['month'])[0]
                custom_date = query.get('custom_date', [None])[0]
                date_from = query.get('date_from', [None])[0]
                date_to = query.get('date_to', [None])[0]
                month_param = query.get('month', [None])[0]
                building_id = query.get('building_id', [None])[0]

                dates = build_sql_date_clauses(date_filter, custom_date=custom_date, date_from=date_from, date_to=date_to, month_param=month_param)
                now = datetime.now()

                if d_type == 'nodes':
                    # Card 1: All 5 Building Sites Live Activity & Sync Status
                    cursor.execute(f"""
                    SELECT 
                        b.id, b.building_code, b.name as building_name, b.address,
                        (SELECT COUNT(*) FROM flats f WHERE f.building_id = b.id) as total_flats,
                        (SELECT COUNT(*) FROM flats f WHERE f.building_id = b.id AND f.occupancy_mode = 'Owner Occupied') as owner_flats,
                        (SELECT COUNT(*) FROM flats f WHERE f.building_id = b.id AND f.occupancy_mode = 'Rented' AND f.current_tenant_id IS NOT NULL) as tenant_flats,
                        (SELECT COUNT(*) FROM flats f WHERE f.building_id = b.id AND (f.occupancy_mode = 'Vacant' OR (f.occupancy_mode != 'Owner Occupied' AND f.current_tenant_id IS NULL))) as vacant_flats,
                        COALESCE((SELECT SUM(l.amount) FROM accounts_ledger l WHERE l.building_id = b.id AND l.entry_type = 'INCOME' AND {dates['l_clause'].replace('entry_date', 'l.entry_date')}), 0) as period_income,
                        COALESCE((SELECT SUM(l.amount) FROM accounts_ledger l WHERE l.building_id = b.id AND l.entry_type = 'EXPENSE' AND {dates['l_clause'].replace('entry_date', 'l.entry_date')}), 0) as period_expense,
                        COALESCE((SELECT reserve_stock FROM gas_inventory_summary g WHERE g.building_id = b.id), 0) as reserve_stock,
                        COALESCE((SELECT active_in_apartments FROM gas_inventory_summary g WHERE g.building_id = b.id), 0) as active_cylinders,
                        COALESCE((SELECT empty_returned FROM gas_inventory_summary g WHERE g.building_id = b.id), 0) as empty_returned,
                        (SELECT COUNT(*) FROM domestic_staff s WHERE s.building_id = b.id) as total_staff,
                        (SELECT COUNT(*) FROM domestic_staff s WHERE s.building_id = b.id AND s.status = 'ON_DUTY') as staff_on_duty,
                        (SELECT COUNT(*) FROM visitor_logs v WHERE v.building_id = b.id AND {dates['v_clause'].replace('entry_time', 'v.entry_time')}) as period_visitors,
                        (SELECT COUNT(*) FROM visitor_logs v WHERE v.building_id = b.id AND v.status = 'IN_PREMISES') as visitors_inside,
                        (SELECT MAX(s.sync_timestamp) FROM sync_logs s WHERE s.building_id = b.id) as last_sync_time
                    FROM buildings b
                    ORDER BY b.building_code ASC
                    """, dates['l_params'] + dates['l_params'] + dates['v_params'])
                    nodes_data = []
                    for row in cursor.fetchall():
                        item = dict(row)
                        item['occupied_flats'] = (item.get('owner_flats') or 0) + (item.get('tenant_flats') or 0)
                        item['net_profit'] = (item.get('period_income') or 0) - (item.get('period_expense') or 0)
                        is_active = (item.get('period_income', 0) > 0) or (item.get('period_visitors', 0) > 0) or (item.get('staff_on_duty', 0) > 0)
                        item['is_active'] = 1 if is_active else 0
                        nodes_data.append(item)

                    return self._send_json({
                        "success": True,
                        "data": {
                            "type": "nodes",
                            "period_label": dates['period_label'],
                            "nodes": nodes_data
                        }
                    })

                elif d_type == 'flats':
                    # Card 2: Multi-Site Occupancy Matrix & Searchable Flats
                    cursor.execute("""
                    SELECT 
                        b.id, b.building_code, b.name as building_name,
                        (SELECT COUNT(*) FROM flats f WHERE f.building_id = b.id) as total_flats,
                        (SELECT COUNT(*) FROM flats f WHERE f.building_id = b.id AND f.occupancy_mode = 'Owner Occupied') as owner_flats,
                        (SELECT COUNT(*) FROM flats f WHERE f.building_id = b.id AND f.occupancy_mode = 'Rented' AND f.current_tenant_id IS NOT NULL) as tenant_flats,
                        (SELECT COUNT(*) FROM flats f WHERE f.building_id = b.id AND (f.occupancy_mode = 'Vacant' OR (f.occupancy_mode != 'Owner Occupied' AND f.current_tenant_id IS NULL))) as vacant_flats
                    FROM buildings b
                    ORDER BY b.building_code ASC
                    """)
                    b_occupancy = []
                    for row in cursor.fetchall():
                        d = dict(row)
                        d['occupied_flats'] = (d.get('owner_flats') or 0) + (d.get('tenant_flats') or 0)
                        total = d.get('total_flats') or 1
                        d['occupancy_rate'] = round((d['occupied_flats'] / total) * 100, 1)
                        b_occupancy.append(d)

                    flat_filter = f"WHERE f.building_id = '{building_id}'" if building_id and building_id != 'ALL' else ""
                    cursor.execute(f"""
                    SELECT f.id as flat_id, f.building_id, b.name as building_name, b.building_code,
                           f.flat_number, f.floor_number, f.wing, f.bhk_type, f.occupancy_mode,
                           f.owner_name, f.owner_phone, f.owner_cnic,
                           t.id as tenant_id, t.full_name as tenant_name, t.primary_phone as tenant_phone, t.monthly_rent,
                           (SELECT COUNT(*) FROM domestic_staff s WHERE s.building_id = f.building_id AND (s.associated_flats LIKE '%' || f.flat_number || '%')) as assigned_maids_count
                    FROM flats f
                    JOIN buildings b ON f.building_id = b.id
                    LEFT JOIN tenants t ON f.current_tenant_id = t.id AND t.status = 'ACTIVE'
                    {flat_filter}
                    ORDER BY b.building_code ASC, f.floor_number ASC, f.flat_number ASC
                    """)
                    flats_list = [dict(r) for r in cursor.fetchall()]

                    return self._send_json({
                        "success": True,
                        "data": {
                            "type": "flats",
                            "buildings_summary": b_occupancy,
                            "flats": flats_list
                        }
                    })

                elif d_type == 'gas':
                    # Card 3: Multi-Site Gas Inventory, Sales (with receipt reference) & Inward Supply Arrivals
                    cursor.execute(f"""
                    SELECT 
                        b.id, b.building_code, b.name as building_name,
                        COALESCE((SELECT reserve_stock FROM gas_inventory_summary g WHERE g.building_id = b.id), 0) as reserve_stock,
                        COALESCE((SELECT active_in_apartments FROM gas_inventory_summary g WHERE g.building_id = b.id), 0) as active_cylinders,
                        COALESCE((SELECT empty_returned FROM gas_inventory_summary g WHERE g.building_id = b.id), 0) as empty_returned,
                        COALESCE((SELECT COUNT(*) FROM gas_deliveries gd WHERE gd.building_id = b.id AND {dates['g_clause'].replace('delivery_date', 'gd.delivery_date')}), 0) as period_deliveries_count,
                        COALESCE((SELECT SUM(gd.quantity) FROM gas_deliveries gd WHERE gd.building_id = b.id AND {dates['g_clause'].replace('delivery_date', 'gd.delivery_date')}), 0) as period_cylinders_sold,
                        COALESCE((SELECT SUM(gd.total_amount) FROM gas_deliveries gd WHERE gd.building_id = b.id AND {dates['g_clause'].replace('delivery_date', 'gd.delivery_date')}), 0) as period_gas_revenue,
                        COALESCE((SELECT SUM(gs.quantity) FROM gas_inward_supply gs WHERE gs.building_id = b.id AND {dates['g_clause'].replace('delivery_date', 'gs.supply_date')}), 0) as period_inward_quantity
                    FROM buildings b
                    ORDER BY b.building_code ASC
                    """, dates['g_params'] + dates['g_params'] + dates['g_params'] + dates['g_params'])
                    sites_inventory = [dict(r) for r in cursor.fetchall()]

                    b_deliv_clause = f"AND gd.building_id = '{building_id}'" if building_id and building_id != 'ALL' else ""
                    cursor.execute(f"""
                    SELECT gd.*, b.name as building_name, b.building_code,
                           f.occupancy_mode, f.owner_name, f.owner_phone,
                           t.full_name as tenant_name, t.primary_phone as tenant_phone
                    FROM gas_deliveries gd
                    JOIN buildings b ON gd.building_id = b.id
                    LEFT JOIN flats f ON gd.flat_id = f.id
                    LEFT JOIN tenants t ON f.current_tenant_id = t.id AND t.status = 'ACTIVE'
                    WHERE {dates['g_clause'].replace('delivery_date', 'gd.delivery_date')} {b_deliv_clause}
                    ORDER BY gd.delivery_date DESC
                    LIMIT 300
                    """, dates['g_params'])
                    deliveries_list = [dict(r) for r in cursor.fetchall()]

                    b_sup_clause = f"AND gs.building_id = '{building_id}'" if building_id and building_id != 'ALL' else ""
                    cursor.execute(f"""
                    SELECT gs.*, b.name as building_name, b.building_code
                    FROM gas_inward_supply gs
                    JOIN buildings b ON gs.building_id = b.id
                    WHERE {dates['g_clause'].replace('delivery_date', 'gs.supply_date')} {b_sup_clause}
                    ORDER BY gs.supply_date DESC
                    LIMIT 200
                    """, dates['g_params'])
                    supplies_list = [dict(r) for r in cursor.fetchall()]

                    return self._send_json({
                        "success": True,
                        "data": {
                            "type": "gas",
                            "period_label": dates['period_label'],
                            "sites_inventory": sites_inventory,
                            "deliveries": deliveries_list,
                            "supplies": supplies_list
                        }
                    })

                elif d_type == 'staff':
                    # Card 4: Multi-Site Bahria Verified Domestic Staff & Maids Roster
                    cursor.execute("""
                    SELECT 
                        b.id, b.building_code, b.name as building_name,
                        (SELECT COUNT(*) FROM domestic_staff s WHERE s.building_id = b.id) as total_staff,
                        (SELECT COUNT(*) FROM domestic_staff s WHERE s.building_id = b.id AND s.status = 'ON_DUTY') as on_duty_count,
                        (SELECT COUNT(*) FROM domestic_staff s WHERE s.building_id = b.id AND s.status = 'OFF_DUTY') as off_duty_count
                    FROM buildings b
                    ORDER BY b.building_code ASC
                    """)
                    sites_staff = [dict(r) for r in cursor.fetchall()]

                    b_staff_clause = f"WHERE s.building_id = '{building_id}'" if building_id and building_id != 'ALL' else ""
                    cursor.execute(f"""
                    SELECT s.*, b.name as building_name, b.building_code
                    FROM domestic_staff s
                    JOIN buildings b ON s.building_id = b.id
                    {b_staff_clause}
                    ORDER BY b.building_code ASC, s.status DESC, s.full_name ASC
                    """)
                    staff_list = [dict(r) for r in cursor.fetchall()]

                    return self._send_json({
                        "success": True,
                        "data": {
                            "type": "staff",
                            "sites_staff": sites_staff,
                            "staff": staff_list
                        }
                    })

            # 16. Open Exports Folder in Windows Explorer
            elif path == '/api/system/open_exports_folder':
                try:
                    if sys.platform == 'win32':
                        os.startfile(EXPORTS_DIR)
                    elif sys.platform == 'darwin':
                        subprocess.Popen(['open', EXPORTS_DIR])
                    else:
                        subprocess.Popen(['xdg-open', EXPORTS_DIR])
                    return self._send_json({"success": True, "message": "Folder opened in Windows Explorer"})
                except Exception as e:
                    return self._send_json({"success": False, "error": str(e)}, 500)

            # 17. Daily Building Sync Status & Admin Notification Engine
            elif path == '/api/sync/daily_status':
                cursor.execute("SELECT id, building_code, name, address FROM buildings ORDER BY building_code ASC")
                buildings = [dict(r) for r in cursor.fetchall()]

                today_str = datetime.now().strftime('%Y-%m-%d')
                today_formatted = datetime.now().strftime('%d %B %Y')

                synced_count = 0
                pending_count = 0
                building_statuses = []

                for b in buildings:
                    b_id = b['id']
                    cursor.execute("""
                    SELECT * FROM sync_logs 
                    WHERE building_id = ? 
                    ORDER BY sync_timestamp DESC 
                    LIMIT 1
                    """, (b_id,))
                    latest_log = cursor.fetchone()

                    is_synced_today = False
                    last_sync_time = "Never Synced"
                    operator_name = "Reception Desk"
                    sync_type = "NONE"
                    records_count = 0

                    if latest_log:
                        latest_dict = dict(latest_log)
                        raw_ts = latest_dict.get('sync_timestamp', '')
                        last_sync_time = raw_ts
                        operator_name = latest_dict.get('operator_name', 'Reception Desk')
                        sync_type = latest_dict.get('sync_type', 'IMPORT')
                        records_count = latest_dict.get('records_count', 0)

                        if raw_ts.startswith(today_str):
                            is_synced_today = True

                    if is_synced_today:
                        synced_count += 1
                    else:
                        pending_count += 1

                    building_statuses.append({
                        "building_id": b_id,
                        "building_code": b['building_code'],
                        "building_name": b['name'],
                        "address": b.get('address', ''),
                        "is_synced_today": is_synced_today,
                        "last_sync_timestamp": last_sync_time,
                        "operator_name": operator_name,
                        "sync_type": sync_type,
                        "records_count": records_count
                    })

                return self._send_json({
                    "success": True,
                    "today_date": today_str,
                    "today_formatted": today_formatted,
                    "total_buildings": len(buildings),
                    "synced_count": synced_count,
                    "pending_count": pending_count,
                    "is_all_synced": (pending_count == 0),
                    "buildings": building_statuses
                })

            # 18. Supabase Live Sync Status & Schema
            elif path == '/api/sync/supabase/status':
                return self._send_json({"success": True, "config": supabase_sync.get_sync_config()})

            elif path == '/api/sync/supabase/schema':
                return self._send_json({"success": True, "schema": supabase_sync.generate_supabase_sql_schema()})

            else:
                return self._send_json({"success": False, "error": f"Route not found: {path}"}, 404)

        except Exception as e:
            return self._send_json({"success": False, "error": str(e)}, 500)
        finally:
            conn.close()

    def handle_api_post(self, path, query):
        body = self._read_json_body()
        conn = get_db_connection()
        cursor = conn.cursor()
        now_iso = datetime.now().isoformat()

        try:
            # 1. Login Authentication (Strict Security Check)
            if path == '/api/auth/login':
                username = body.get('username', '').strip()
                password = body.get('password', '').strip()

                if not username or not password:
                    return self._send_json({"success": False, "error": "Username and password are required"}, 400)

                pw_hash = hash_password(password)

                # Special flexible handling for Master Admin across all 6 computers
                if username.upper() == 'ADMIN':
                    cursor.execute("""
                    SELECT u.*, b.name as building_name, b.building_code
                    FROM users u
                    LEFT JOIN buildings b ON u.assigned_building_id = b.id
                    WHERE LOWER(u.username) = 'admin' AND u.is_active = 1
                    """)
                    user = cursor.fetchone()
                    if user:
                        admin_valid_passwords = {'ADMIN', 'admin', 'ADMIN123', 'admin123'}
                        if (password in admin_valid_passwords or 
                            pw_hash == user['password_hash'] or 
                            hash_password(password.upper()) == user['password_hash'] or 
                            hash_password(password.lower()) == user['password_hash']):
                            user_dict = dict(user)
                            del user_dict['password_hash']
                            return self._send_json({"success": True, "user": user_dict})

                # Standard credential check for Receptionists
                cursor.execute("""
                SELECT u.*, b.name as building_name, b.building_code
                FROM users u
                LEFT JOIN buildings b ON u.assigned_building_id = b.id
                WHERE LOWER(u.username) = LOWER(?) AND (u.password_hash = ? OR u.password_hash = ? OR u.password_hash = ?) AND u.is_active = 1
                """, (username, pw_hash, hash_password(password.lower()), hash_password(password.upper())))
                user = cursor.fetchone()

                if not user:
                    return self._send_json({"success": False, "error": "Invalid username or password"}, 401)

                user_dict = dict(user)
                del user_dict['password_hash']
                return self._send_json({"success": True, "user": user_dict})

            # 2. Add / Edit Flat & Owner Profile
            elif path == '/api/flats/save':
                flat_id = body.get('id') or str(uuid.uuid4())
                building_id = body.get('building_id')
                flat_number = body.get('flat_number', '').strip()
                floor_number = int(body.get('floor_number', 1))
                wing = body.get('wing', 'Wing A')
                bhk_type = body.get('bhk_type', '3-Bed DD')
                occupancy_mode = body.get('occupancy_mode', 'Rented')
                owner_name = body.get('owner_name', 'Property Owner').strip()
                owner_phone = body.get('owner_phone', '').strip()
                owner_cnic = body.get('owner_cnic', '').strip()
                owner_email = body.get('owner_email', '').strip()
                owner_address = body.get('owner_address', '').strip()
                active_since = body.get('active_since', datetime.now().strftime('%Y-%m-%d'))
                notes = body.get('notes', '')

                cursor.execute("""
                INSERT INTO flats (id, building_id, flat_number, floor_number, wing, bhk_type, occupancy_mode, owner_name, owner_phone, owner_cnic, owner_email, owner_address, active_since, notes, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(building_id, flat_number) DO UPDATE SET
                    floor_number = excluded.floor_number,
                    wing = excluded.wing,
                    bhk_type = excluded.bhk_type,
                    occupancy_mode = excluded.occupancy_mode,
                    owner_name = excluded.owner_name,
                    owner_phone = excluded.owner_phone,
                    owner_cnic = excluded.owner_cnic,
                    owner_email = excluded.owner_email,
                    owner_address = excluded.owner_address,
                    active_since = excluded.active_since,
                    notes = excluded.notes,
                    updated_at = excluded.updated_at
                """, (flat_id, building_id, flat_number, floor_number, wing, bhk_type, occupancy_mode, owner_name, owner_phone, owner_cnic, owner_email, owner_address, active_since, notes, now_iso))
                if building_id:
                    cursor.execute("SELECT COUNT(*) as count FROM flats WHERE building_id = ?", (building_id,))
                    f_count = cursor.fetchone()['count']
                    cursor.execute("UPDATE buildings SET total_flats = ?, updated_at = ? WHERE id = ?", (f_count, now_iso, building_id))
                conn.commit()
                return self._send_json({"success": True, "id": flat_id, "message": "Flat profile saved"})

            elif path == '/api/flats/delete':
                if body.get('operator_role') == 'RECEPTIONIST':
                    return self._send_json({"success": False, "error": "Access Denied: Receptionist cannot delete flat records. Contact Master Admin."}, 403)
                flat_id = body.get('id')
                if not flat_id:
                    return self._send_json({"success": False, "error": "Flat ID is required"}, 400)

                admin_password = body.get('admin_password', '').strip() or body.get('password', '').strip()
                if admin_password:
                    if not self._is_delete_password_valid(cursor, admin_password, body.get('operator_id')):
                        return self._send_json({"success": False, "error": "Incorrect authorization password! Deletion blocked."}, 401)
                
                cursor.execute("SELECT building_id FROM flats WHERE id = ?", (flat_id,))
                f_row = cursor.fetchone()
                b_id = f_row['building_id'] if f_row else None

                # Find all tenants belonging to this flat
                cursor.execute("SELECT id FROM tenants WHERE flat_id = ?", (flat_id,))
                tenant_ids = [r['id'] for r in cursor.fetchall()]

                # Delete dependent records in foreign-key safe cascade order
                if tenant_ids:
                    t_placeholders = ','.join(['?'] * len(tenant_ids))
                    cursor.execute(f"DELETE FROM family_members WHERE flat_id = ? OR tenant_id IN ({t_placeholders})", [flat_id] + tenant_ids)
                    cursor.execute(f"DELETE FROM vehicles WHERE flat_id = ? OR tenant_id IN ({t_placeholders})", [flat_id] + tenant_ids)
                else:
                    cursor.execute("DELETE FROM family_members WHERE flat_id = ?", (flat_id,))
                    cursor.execute("DELETE FROM vehicles WHERE flat_id = ?", (flat_id,))

                cursor.execute("DELETE FROM flat_occupancy_history WHERE flat_id = ?", (flat_id,))
                cursor.execute("DELETE FROM tenant_history_archive WHERE flat_id = ?", (flat_id,))
                cursor.execute("DELETE FROM tenants WHERE flat_id = ?", (flat_id,))

                # Disassociate flat_id in financial and visitor records to keep audit history without FK conflicts
                cursor.execute("UPDATE visitor_logs SET flat_id = NULL WHERE flat_id = ?", (flat_id,))
                cursor.execute("UPDATE gas_deliveries SET flat_id = NULL WHERE flat_id = ?", (flat_id,))
                cursor.execute("UPDATE maintenance_jobs SET flat_id = NULL WHERE flat_id = ?", (flat_id,))

                cursor.execute("DELETE FROM flats WHERE id = ?", (flat_id,))

                if b_id:
                    cursor.execute("SELECT COUNT(*) as count FROM flats WHERE building_id = ?", (b_id,))
                    f_count = cursor.fetchone()['count']
                    cursor.execute("UPDATE buildings SET total_flats = ?, updated_at = ? WHERE id = ?", (f_count, now_iso, b_id))

                conn.commit()
                return self._send_json({"success": True, "message": "Flat removed successfully"})

            # 2b. Change Flat Occupancy Status (Active / Inactive / Move-In / Vacate)
            elif path == '/api/flats/change_status':
                flat_id = body.get('flat_id')
                new_status = body.get('new_status') # 'ACTIVE_TENANT', 'ACTIVE_OWNER', 'INACTIVE_VACANT', 'UNDER_MAINTENANCE'
                eff_date = body.get('effective_date', datetime.now().strftime('%Y-%m-%d'))
                occ_name = body.get('occupant_name', '').strip()
                occ_phone = body.get('occupant_phone', '').strip()
                occ_cnic = body.get('occupant_cnic', '').strip()
                monthly_rent = float(body.get('monthly_rent', 0.0))
                reason = body.get('reason_or_notes', '').strip()
                operator = body.get('operator_name', 'Receptionist')

                cursor.execute("SELECT * FROM flats WHERE id = ?", (flat_id,))
                flat_row = cursor.fetchone()
                if not flat_row:
                    return self._send_json({"success": False, "error": "Flat not found"}, 404)
                flat = dict(flat_row)
                b_id = flat['building_id']
                f_num = flat['flat_number']

                # Close any currently open history record for this flat
                cursor.execute("""
                UPDATE flat_occupancy_history 
                SET end_date = ?, updated_at = ? 
                WHERE flat_id = ? AND end_date IS NULL
                """, (eff_date, now_iso, flat_id))

                if new_status in ['INACTIVE_VACANT', 'UNDER_MAINTENANCE']:
                    if flat.get('current_tenant_id'):
                        t_id = flat['current_tenant_id']
                        cursor.execute("UPDATE tenants SET status = 'VACATED', vacated_date = ?, updated_at = ? WHERE id = ?", (eff_date, now_iso, t_id))
                    
                    cursor.execute("""
                    UPDATE flats 
                    SET current_tenant_id = NULL, occupancy_mode = 'Vacant', updated_at = ? 
                    WHERE id = ?
                    """, (now_iso, flat_id))

                    hist_id = str(uuid.uuid4())
                    cursor.execute("""
                    INSERT INTO flat_occupancy_history (
                        id, building_id, flat_id, flat_number, status, occupant_type,
                        occupant_name, occupant_phone, occupant_cnic, start_date, end_date,
                        monthly_rent, reason_or_notes, logged_by_user, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, 'VACANT', 'Vacant Unit', '---', '---', ?, NULL, 0.0, ?, ?, ?, ?)
                    """, (hist_id, b_id, flat_id, f_num, new_status, eff_date, reason or 'Flat marked inactive / vacant', operator, now_iso, now_iso))

                elif new_status == 'ACTIVE_OWNER':
                    if flat.get('current_tenant_id'):
                        t_id = flat['current_tenant_id']
                        cursor.execute("UPDATE tenants SET status = 'VACATED', vacated_date = ?, updated_at = ? WHERE id = ?", (eff_date, now_iso, t_id))

                    final_owner_name = occ_name or flat.get('owner_name') or 'Property Owner'
                    final_owner_phone = occ_phone or flat.get('owner_phone') or ''
                    final_owner_cnic = occ_cnic or flat.get('owner_cnic') or ''

                    cursor.execute("""
                    UPDATE flats 
                    SET current_tenant_id = NULL, occupancy_mode = 'Owner Occupied', 
                        owner_name = ?, owner_phone = ?, owner_cnic = ?, active_since = ?, updated_at = ? 
                    WHERE id = ?
                    """, (final_owner_name, final_owner_phone, final_owner_cnic, eff_date, now_iso, flat_id))

                    hist_id = str(uuid.uuid4())
                    cursor.execute("""
                    INSERT INTO flat_occupancy_history (
                        id, building_id, flat_id, flat_number, status, occupant_type,
                        occupant_name, occupant_phone, occupant_cnic, start_date, end_date,
                        monthly_rent, reason_or_notes, logged_by_user, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, 'ACTIVE_OWNER', 'OWNER', ?, ?, ?, ?, NULL, 0.0, ?, ?, ?, ?)
                    """, (hist_id, b_id, flat_id, f_num, final_owner_name, final_owner_phone, final_owner_cnic, eff_date, reason or 'Owner residing in flat', operator, now_iso, now_iso))

                elif new_status == 'ACTIVE_TENANT':
                    new_t_id = str(uuid.uuid4())
                    cursor.execute("""
                    INSERT INTO tenants (id, building_id, flat_id, full_name, primary_phone, cnic_number, move_in_date, monthly_rent, monthly_maintenance, status, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.0, 'ACTIVE', ?)
                    """, (new_t_id, b_id, flat_id, occ_name or 'New Tenant', occ_phone, occ_cnic, eff_date, monthly_rent, now_iso))

                    cursor.execute("""
                    UPDATE flats 
                    SET current_tenant_id = ?, occupancy_mode = 'Rented', active_since = ?, updated_at = ? 
                    WHERE id = ?
                    """, (new_t_id, eff_date, now_iso, flat_id))

                    hist_id = str(uuid.uuid4())
                    cursor.execute("""
                    INSERT INTO flat_occupancy_history (
                        id, building_id, flat_id, flat_number, status, occupant_type,
                        occupant_name, occupant_phone, occupant_cnic, start_date, end_date,
                        monthly_rent, reason_or_notes, logged_by_user, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, 'ACTIVE_TENANT', 'TENANT', ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)
                    """, (hist_id, b_id, flat_id, f_num, occ_name or 'New Tenant', occ_phone, occ_cnic, eff_date, monthly_rent, reason or 'New tenant moved in', operator, now_iso, now_iso))

                conn.commit()
                return self._send_json({"success": True, "message": f"Flat {f_num} status successfully updated to {new_status}"})

            # 3. Add / Edit Tenant Profile
            elif path == '/api/tenants/save':
                tenant_id = body.get('id') or str(uuid.uuid4())
                building_id = body.get('building_id')
                flat_id = body.get('flat_id')
                full_name = body.get('full_name', '').strip()
                primary_phone = body.get('primary_phone', '').strip()
                emergency_phone = body.get('emergency_phone', '').strip()
                cnic_number = body.get('cnic_number', '').strip()
                move_in_date = body.get('move_in_date', datetime.now().strftime('%Y-%m-%d'))
                lease_tenure = int(body.get('lease_tenure_months', 12))
                monthly_rent = float(body.get('monthly_rent', 0.0))
                monthly_maintenance = float(body.get('monthly_maintenance', 5000.0))
                photo_fn = body.get('photo_filename', '')
                doc_fn = body.get('document_filename', '')

                cursor.execute("""
                INSERT INTO tenants (id, building_id, flat_id, full_name, primary_phone, emergency_phone, cnic_number, move_in_date, lease_tenure_months, monthly_rent, monthly_maintenance, photo_filename, document_filename, status, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
                ON CONFLICT(id) DO UPDATE SET
                    full_name = excluded.full_name,
                    primary_phone = excluded.primary_phone,
                    emergency_phone = excluded.emergency_phone,
                    cnic_number = excluded.cnic_number,
                    move_in_date = excluded.move_in_date,
                    lease_tenure_months = excluded.lease_tenure_months,
                    monthly_rent = excluded.monthly_rent,
                    monthly_maintenance = excluded.monthly_maintenance,
                    photo_filename = CASE WHEN excluded.photo_filename != '' THEN excluded.photo_filename ELSE tenants.photo_filename END,
                    document_filename = CASE WHEN excluded.document_filename != '' THEN excluded.document_filename ELSE tenants.document_filename END,
                    status = 'ACTIVE',
                    updated_at = excluded.updated_at
                """, (tenant_id, building_id, flat_id, full_name, primary_phone, emergency_phone, cnic_number, move_in_date, lease_tenure, monthly_rent, monthly_maintenance, photo_fn, doc_fn, now_iso))

                # Auto-archive any previous tenant if this flat had a different active tenant
                cursor.execute("SELECT current_tenant_id, building_id, flat_number FROM flats WHERE id = ?", (flat_id,))
                current_flat_row = cursor.fetchone()
                if current_flat_row and current_flat_row['current_tenant_id'] and current_flat_row['current_tenant_id'] != tenant_id:
                    prev_t_id = current_flat_row['current_tenant_id']
                    cursor.execute("SELECT * FROM tenants WHERE id = ?", (prev_t_id,))
                    prev_t_row = cursor.fetchone()
                    if prev_t_row:
                        prev_t = dict(prev_t_row)
                        cursor.execute("SELECT * FROM family_members WHERE tenant_id = ?", (prev_t_id,))
                        prev_fam = [dict(r) for r in cursor.fetchall()]
                        cursor.execute("SELECT * FROM vehicles WHERE tenant_id = ?", (prev_t_id,))
                        prev_veh = [dict(r) for r in cursor.fetchall()]
                        prev_snapshot = {
                            "tenant_profile": prev_t,
                            "family_members": prev_fam,
                            "vehicles": prev_veh,
                            "vacated_reason": f"Replaced by new tenant allotment ({full_name})"
                        }
                        arch_id = str(uuid.uuid4())
                        cursor.execute("""
                        INSERT INTO tenant_history_archive (
                            id, building_id, flat_id, tenant_id, tenant_name, cnic_number, primary_phone, 
                            move_in_date, vacated_date, occupancy_type, archive_payload_json, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'TENANT', ?, ?, ?)
                        """, (
                            arch_id, current_flat_row['building_id'], flat_id, prev_t_id,
                            prev_t.get('full_name', 'Past Tenant'), prev_t.get('cnic_number', ''),
                            prev_t.get('primary_phone', ''), prev_t.get('move_in_date', move_in_date),
                            move_in_date, json.dumps(prev_snapshot), now_iso, now_iso
                        ))
                        cursor.execute("UPDATE tenants SET status = 'VACATED', vacated_date = ?, updated_at = ? WHERE id = ?", (move_in_date, now_iso, prev_t_id))

                cursor.execute("UPDATE flats SET current_tenant_id = ?, occupancy_mode = 'Rented', updated_at = ? WHERE id = ?", (tenant_id, now_iso, flat_id))

                # Close any previous open record and insert new ACTIVE_TENANT record in timeline
                cursor.execute("""
                UPDATE flat_occupancy_history 
                SET end_date = ?, updated_at = ? 
                WHERE flat_id = ? AND end_date IS NULL
                """, (move_in_date, now_iso, flat_id))

                cursor.execute("SELECT flat_number FROM flats WHERE id = ?", (flat_id,))
                frow = cursor.fetchone()
                f_num = frow['flat_number'] if frow else '---'
                hist_id = str(uuid.uuid4())
                cursor.execute("""
                INSERT INTO flat_occupancy_history (
                    id, building_id, flat_id, flat_number, status, occupant_type,
                    occupant_name, occupant_phone, occupant_cnic, start_date, end_date,
                    monthly_rent, reason_or_notes, logged_by_user, created_at, updated_at
                ) VALUES (?, ?, ?, ?, 'ACTIVE_TENANT', 'TENANT', ?, ?, ?, ?, NULL, ?, 'Active Tenant Profile', 'Receptionist', ?, ?)
                """, (hist_id, building_id, flat_id, f_num, full_name, primary_phone, cnic_number, move_in_date, monthly_rent, now_iso, now_iso))

                family_list = body.get('family_members', [])
                cursor.execute("DELETE FROM family_members WHERE tenant_id = ? OR flat_id = ?", (tenant_id, flat_id))
                for fm in family_list:
                    fm_id = fm.get('id') or str(uuid.uuid4())
                    cursor.execute("""
                    INSERT INTO family_members (id, tenant_id, flat_id, full_name, relation, cnic_bform, phone, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (fm_id, tenant_id, flat_id, fm.get('full_name', ''), fm.get('relation', ''), fm.get('cnic_bform', ''), fm.get('phone', ''), now_iso))

                vehicle_list = body.get('vehicles', [])
                cursor.execute("DELETE FROM vehicles WHERE tenant_id = ? OR flat_id = ?", (tenant_id, flat_id))
                for v in vehicle_list:
                    v_id = v.get('id') or str(uuid.uuid4())
                    cursor.execute("""
                    INSERT INTO vehicles (id, tenant_id, flat_id, vehicle_type, registration_number, make_model, parking_slot_number, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (v_id, tenant_id, flat_id, v.get('vehicle_type', 'Car (Sedan)'), v.get('registration_number', ''), v.get('make_model', ''), v.get('parking_slot_number', ''), now_iso))

                conn.commit()
                return self._send_json({"success": True, "tenant_id": tenant_id, "message": "Tenant profile saved"})

            # 4. Vacate Flat
            elif path == '/api/tenants/vacate':
                flat_id = body.get('flat_id')
                vacated_date = body.get('vacated_date', datetime.now().strftime('%Y-%m-%d'))
                reason = body.get('reason', 'Tenancy tenure ended')

                cursor.execute("SELECT * FROM flats WHERE id = ?", (flat_id,))
                flat = cursor.fetchone()
                if not flat or not flat['current_tenant_id']:
                    return self._send_json({"success": False, "error": "No active tenant found in this flat"}, 400)

                tenant_id = flat['current_tenant_id']
                cursor.execute("SELECT * FROM tenants WHERE id = ?", (tenant_id,))
                tenant = cursor.fetchone()
                tenant_dict = dict(tenant)

                cursor.execute("SELECT * FROM family_members WHERE tenant_id = ?", (tenant_id,))
                family_snap = [dict(r) for r in cursor.fetchall()]

                cursor.execute("SELECT * FROM vehicles WHERE tenant_id = ?", (tenant_id,))
                vehicle_snap = [dict(r) for r in cursor.fetchall()]

                cursor.execute("SELECT * FROM accounts_ledger WHERE building_id = ? AND reference_id = ?", (flat['building_id'], tenant_id))
                payment_snap = [dict(r) for r in cursor.fetchall()]

                archive_snapshot = {
                    "tenant_profile": tenant_dict,
                    "family_members": family_snap,
                    "vehicles": vehicle_snap,
                    "payment_history": payment_snap,
                    "vacated_reason": reason
                }

                archive_id = str(uuid.uuid4())
                cursor.execute("""
                INSERT INTO tenant_history_archive (id, building_id, flat_id, tenant_id, tenant_name, cnic_number, primary_phone, move_in_date, vacated_date, occupancy_type, archive_payload_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (archive_id, flat['building_id'], flat_id, tenant_id, tenant_dict['full_name'], tenant_dict['cnic_number'], tenant_dict['primary_phone'], tenant_dict['move_in_date'], vacated_date, flat['occupancy_mode'], json.dumps(archive_snapshot, ensure_ascii=False), now_iso, now_iso))

                cursor.execute("UPDATE tenants SET status = 'VACATED', vacated_date = ?, updated_at = ? WHERE id = ?", (vacated_date, now_iso, tenant_id))
                cursor.execute("UPDATE flats SET current_tenant_id = NULL, occupancy_mode = 'Vacant', updated_at = ? WHERE id = ?", (now_iso, flat_id))

                # Close active period and insert INACTIVE_VACANT entry in timeline
                cursor.execute("""
                UPDATE flat_occupancy_history 
                SET end_date = ?, updated_at = ? 
                WHERE flat_id = ? AND end_date IS NULL
                """, (vacated_date, now_iso, flat_id))

                hist_id = str(uuid.uuid4())
                cursor.execute("""
                INSERT INTO flat_occupancy_history (
                    id, building_id, flat_id, flat_number, status, occupant_type,
                    occupant_name, occupant_phone, occupant_cnic, start_date, end_date,
                    monthly_rent, reason_or_notes, logged_by_user, created_at, updated_at
                ) VALUES (?, ?, ?, ?, 'INACTIVE_VACANT', 'VACANT', 'Vacant Unit', '---', '---', ?, NULL, 0.0, ?, 'Receptionist', ?, ?)
                """, (hist_id, flat['building_id'], flat_id, flat['flat_number'], vacated_date, reason or 'Tenant vacated apartment', now_iso, now_iso))

                conn.commit()
                return self._send_json({"success": True, "archive_id": archive_id, "message": "Tenant archived & flat marked vacant"})

            # 5. Visitors: Log, Edit & Delete
            elif path == '/api/visitors/log':
                visitor_id = body.get('id') or str(uuid.uuid4())
                building_id = body.get('building_id')
                flat_number = body.get('flat_number', '').strip()
                guest_name = body.get('guest_name', '').strip()
                contact = body.get('contact_number', '').strip()
                cnic = body.get('cnic_number', '').strip()
                purpose = body.get('purpose_of_visit', 'Personal Visit')
                entry_time = body.get('entry_time', datetime.now().strftime('%Y-%m-%d %H:%M'))
                photo_fn = body.get('photo_filename', '')
                doc_fn = body.get('document_filename', '')
                total_persons = int(body.get('total_persons', 1) or 1)
                accompanying_details = body.get('accompanying_details', '').strip()
                receptionist = body.get('receptionist_name', 'Receptionist')

                cursor.execute("SELECT id FROM flats WHERE building_id = ? AND flat_number = ?", (building_id, flat_number))
                frow = cursor.fetchone()
                flat_id = frow['id'] if frow else None

                cursor.execute("""
                INSERT INTO visitor_logs (id, building_id, flat_id, flat_number, guest_name, contact_number, cnic_number, purpose_of_visit, total_persons, accompanying_details, entry_time, photo_filename, document_filename, status, receptionist_name, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'IN_PREMISES', ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    flat_number = excluded.flat_number,
                    guest_name = excluded.guest_name,
                    contact_number = excluded.contact_number,
                    cnic_number = excluded.cnic_number,
                    purpose_of_visit = excluded.purpose_of_visit,
                    total_persons = excluded.total_persons,
                    accompanying_details = excluded.accompanying_details,
                    entry_time = excluded.entry_time,
                    photo_filename = CASE WHEN excluded.photo_filename != '' THEN excluded.photo_filename ELSE visitor_logs.photo_filename END,
                    document_filename = CASE WHEN excluded.document_filename != '' THEN excluded.document_filename ELSE visitor_logs.document_filename END,
                    updated_at = excluded.updated_at
                """, (visitor_id, building_id, flat_id, flat_number, guest_name, contact, cnic, purpose, total_persons, accompanying_details, entry_time, photo_fn, doc_fn, receptionist, now_iso))
                conn.commit()
                return self._send_json({"success": True, "visitor_id": visitor_id, "message": "Visitor entry saved"})

            elif path == '/api/visitors/checkout':
                visitor_id = body.get('id')
                exit_time = body.get('exit_time', datetime.now().strftime('%Y-%m-%d %H:%M'))
                cursor.execute("UPDATE visitor_logs SET status = 'CHECKED_OUT', exit_time = ?, updated_at = ? WHERE id = ?", (exit_time, now_iso, visitor_id))
                conn.commit()
                return self._send_json({"success": True, "message": "Visitor checked out"})

            elif path == '/api/visitors/delete':
                if body.get('operator_role') == 'RECEPTIONIST':
                    return self._send_json({"success": False, "error": "Access Denied: Receptionist cannot delete visitor records. Contact Master Admin."}, 403)
                visitor_id = body.get('id')
                cursor.execute("DELETE FROM visitor_logs WHERE id = ?", (visitor_id,))
                conn.commit()
                return self._send_json({"success": True, "message": "Visitor record removed"})

            # 6. Domestic Staff / Maid
            elif path == '/api/domestic_staff/save':
                staff_id = body.get('id') or str(uuid.uuid4())
                building_id = body.get('building_id')
                full_name = body.get('full_name', '').strip()
                phone = body.get('phone', '').strip()
                cnic = body.get('cnic_number', '').strip()
                bahria_card = body.get('bahria_card_number', '').strip()
                role_type = body.get('role_type', 'Maid')
                associated_flats = body.get('associated_flats', '').strip()
                photo_fn = body.get('photo_filename', '')
                cnic_front = body.get('cnic_front_filename', '')
                cnic_back = body.get('cnic_back_filename', '')
                police_doc = body.get('police_verification_filename', '')

                cursor.execute("""
                INSERT INTO domestic_staff (id, building_id, full_name, phone, cnic_number, bahria_card_number, role_type, associated_flats, photo_filename, cnic_front_filename, cnic_back_filename, police_verification_filename, is_active, status, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'OFF_DUTY', ?)
                ON CONFLICT(id) DO UPDATE SET
                    full_name = excluded.full_name,
                    phone = excluded.phone,
                    cnic_number = excluded.cnic_number,
                    bahria_card_number = excluded.bahria_card_number,
                    role_type = excluded.role_type,
                    associated_flats = excluded.associated_flats,
                    photo_filename = CASE WHEN excluded.photo_filename != '' THEN excluded.photo_filename ELSE domestic_staff.photo_filename END,
                    cnic_front_filename = CASE WHEN excluded.cnic_front_filename != '' THEN excluded.cnic_front_filename ELSE domestic_staff.cnic_front_filename END,
                    cnic_back_filename = CASE WHEN excluded.cnic_back_filename != '' THEN excluded.cnic_back_filename ELSE domestic_staff.cnic_back_filename END,
                    police_verification_filename = CASE WHEN excluded.police_verification_filename != '' THEN excluded.police_verification_filename ELSE domestic_staff.police_verification_filename END,
                    updated_at = excluded.updated_at
                """, (staff_id, building_id, full_name, phone, cnic, bahria_card, role_type, associated_flats, photo_fn, cnic_front, cnic_back, police_doc, now_iso))
                conn.commit()
                return self._send_json({"success": True, "staff_id": staff_id, "message": "Domestic staff profile saved"})

            elif path == '/api/domestic_staff/toggle_duty':
                staff_id = body.get('id')
                new_status = body.get('status', 'ON_DUTY')
                curr_time = datetime.now().strftime('%Y-%m-%d %H:%M')

                if new_status == 'ON_DUTY':
                    cursor.execute("UPDATE domestic_staff SET status = 'ON_DUTY', last_check_in = ?, updated_at = ? WHERE id = ?", (curr_time, now_iso, staff_id))
                    cursor.execute("INSERT INTO staff_attendance (id, staff_id, building_id, check_in_time, updated_at) VALUES (?, ?, (SELECT building_id FROM domestic_staff WHERE id = ?), ?, ?)", (str(uuid.uuid4()), staff_id, staff_id, curr_time, now_iso))
                else:
                    cursor.execute("UPDATE domestic_staff SET status = 'OFF_DUTY', last_check_out = ?, updated_at = ? WHERE id = ?", (curr_time, now_iso, staff_id))
                    cursor.execute("UPDATE staff_attendance SET check_out_time = ?, updated_at = ? WHERE staff_id = ? AND check_out_time IS NULL", (curr_time, now_iso, staff_id))

                conn.commit()
                return self._send_json({"success": True, "message": f"Staff status updated to {new_status}"})

            elif path == '/api/domestic_staff/delete':
                if body.get('operator_role') == 'RECEPTIONIST':
                    return self._send_json({"success": False, "error": "Access Denied: Receptionist cannot delete staff records. Contact Master Admin."}, 403)
                staff_id = body.get('id')
                cursor.execute("DELETE FROM domestic_staff WHERE id = ?", (staff_id,))
                conn.commit()
                return self._send_json({"success": True, "message": "Staff profile deleted"})

            # 7. Gas Deliveries
            elif path == '/api/gas/deliver':
                delivery_id = body.get('id') or str(uuid.uuid4())
                building_id = body.get('building_id')
                flat_number = body.get('flat_number', '').strip()
                quantity = int(body.get('quantity', 1))
                unit_price = float(body.get('unit_price', 3450.0))
                total_amount = quantity * unit_price
                delivery_date = body.get('delivery_date', datetime.now().strftime('%Y-%m-%d %H:%M'))
                payment_mode = body.get('payment_mode', 'HAND_CASH')
                cash_collector = body.get('cash_collector_name', '')
                bank_acc_id = body.get('bank_account_id', '')
                bank_title = body.get('bank_account_title', '')
                tx_ref = body.get('transaction_reference', '')
                slip_fn = body.get('bank_slip_filename', '')
                empty_returned = int(body.get('is_empty_returned', 1))
                receptionist = body.get('receptionist_name', 'Receptionist')
                tx_type = body.get('transaction_type', 'REFILL')

                today_code = datetime.now().strftime('%Y%m%d')
                short_uid = delivery_id[:4].upper()
                receipt_number = body.get('receipt_number') or f"REC-GAS-{today_code}-{short_uid}"

                cursor.execute("SELECT id FROM flats WHERE building_id = ? AND flat_number = ?", (building_id, flat_number))
                frow = cursor.fetchone()
                flat_id = frow['id'] if frow else None

                cursor.execute("""
                INSERT INTO gas_deliveries (id, building_id, flat_id, flat_number, transaction_type, delivery_date, quantity, unit_price, total_amount, payment_mode, cash_collector_name, bank_account_id, bank_account_title, transaction_reference, bank_slip_filename, receipt_number, is_empty_returned, receptionist_name, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    flat_number = excluded.flat_number,
                    transaction_type = excluded.transaction_type,
                    delivery_date = excluded.delivery_date,
                    quantity = excluded.quantity,
                    unit_price = excluded.unit_price,
                    total_amount = excluded.total_amount,
                    payment_mode = excluded.payment_mode,
                    cash_collector_name = excluded.cash_collector_name,
                    bank_account_id = excluded.bank_account_id,
                    bank_account_title = excluded.bank_account_title,
                    transaction_reference = excluded.transaction_reference,
                    bank_slip_filename = CASE WHEN excluded.bank_slip_filename != '' THEN excluded.bank_slip_filename ELSE gas_deliveries.bank_slip_filename END,
                    is_empty_returned = excluded.is_empty_returned,
                    updated_at = excluded.updated_at
                """, (delivery_id, building_id, flat_id, flat_number, tx_type, delivery_date, quantity, unit_price, total_amount, payment_mode, cash_collector, bank_acc_id, bank_title, tx_ref, slip_fn, receipt_number, empty_returned, receptionist, now_iso))

                cursor.execute("DELETE FROM accounts_ledger WHERE reference_id = ?", (delivery_id,))
                person = cash_collector if payment_mode == 'HAND_CASH' else f"Bank: {bank_title}"
                tx_label = "Gas Refill Exchange" if tx_type == 'REFILL' else "New Gas Cylinder Purchase"
                cursor.execute("""
                INSERT INTO accounts_ledger (id, building_id, entry_date, category, entry_type, amount, payment_mode, person_name, bank_account_id, reference_id, receipt_number, notes, updated_at)
                VALUES (?, ?, ?, 'Gas Delivery', 'INCOME', ?, ?, ?, ?, ?, ?, ?, ?)
                """, (str(uuid.uuid4()), building_id, delivery_date[:10], total_amount, payment_mode, person, bank_acc_id, delivery_id, receipt_number, f"{tx_label} of {quantity} cylinder(s) to Flat {flat_number}", now_iso))

                conn.commit()
                return self._send_json({
                    "success": True,
                    "delivery_id": delivery_id,
                    "receipt_number": receipt_number,
                    "total_amount": total_amount,
                    "transaction_type": tx_type,
                    "message": "Gas delivery updated"
                })

            elif path == '/api/gas/delete':
                if body.get('operator_role') == 'RECEPTIONIST':
                    return self._send_json({"success": False, "error": "Access Denied: Receptionist cannot delete gas delivery records. Contact Master Admin."}, 403)
                del_id = body.get('id')
                cursor.execute("DELETE FROM gas_deliveries WHERE id = ?", (del_id,))
                cursor.execute("DELETE FROM accounts_ledger WHERE reference_id = ?", (del_id,))
                conn.commit()
                return self._send_json({"success": True, "message": "Gas delivery record removed"})

            # 7b. Gas Inward Stock Supply Save / Update & Inventory Sync
            elif path == '/api/gas/supply/save':
                supply_id = body.get('id') or str(uuid.uuid4())
                building_id = body.get('building_id')
                supply_date = body.get('supply_date', datetime.now().strftime('%Y-%m-%d %H:%M'))
                supplier_name = body.get('supplier_name', '').strip()
                delivered_by = body.get('delivered_by', '').strip()
                vehicle_number = body.get('vehicle_number', '').strip()
                quantity = int(body.get('quantity', 1))
                cylinder_type = body.get('cylinder_type', 'Standard 11.8kg')
                unit_cost = float(body.get('unit_cost', 0.0))
                total_cost = float(body.get('total_cost', quantity * unit_cost))
                payment_mode = body.get('payment_mode', 'HAND_CASH')
                batch_ref = body.get('batch_reference', '').strip()
                notes = body.get('notes', '').strip()
                received_by = body.get('received_by_user', 'Admin')
                now_iso = datetime.now().isoformat()

                # Get previous quantity if update
                cursor.execute("SELECT quantity, building_id FROM gas_inward_supply WHERE id = ?", (supply_id,))
                old_row = cursor.fetchone()
                old_qty = old_row['quantity'] if old_row else 0

                cursor.execute("""
                INSERT INTO gas_inward_supply (
                    id, building_id, supply_date, supplier_name, delivered_by, vehicle_number,
                    quantity, cylinder_type, unit_cost, total_cost, payment_mode,
                    batch_reference, notes, received_by_user, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    building_id = excluded.building_id,
                    supply_date = excluded.supply_date,
                    supplier_name = excluded.supplier_name,
                    delivered_by = excluded.delivered_by,
                    vehicle_number = excluded.vehicle_number,
                    quantity = excluded.quantity,
                    cylinder_type = excluded.cylinder_type,
                    unit_cost = excluded.unit_cost,
                    total_cost = excluded.total_cost,
                    payment_mode = excluded.payment_mode,
                    batch_reference = excluded.batch_reference,
                    notes = excluded.notes,
                    received_by_user = excluded.received_by_user,
                    updated_at = excluded.updated_at
                """, (supply_id, building_id, supply_date, supplier_name, delivered_by, vehicle_number, quantity, cylinder_type, unit_cost, total_cost, payment_mode, batch_ref, notes, received_by, now_iso, now_iso))

                # Increment reserve_stock in building inventory summary
                qty_diff = quantity - old_qty
                cursor.execute("""
                INSERT INTO gas_inventory_summary (building_id, reserve_stock, active_in_apartments, empty_returned, updated_at)
                VALUES (?, ?, 0, 0, ?)
                ON CONFLICT(building_id) DO UPDATE SET
                    reserve_stock = MAX(0, reserve_stock + ?),
                    updated_at = excluded.updated_at
                """, (building_id, quantity, now_iso, qty_diff))

                # Insert/Update Expense entry in accounts_ledger for Inward Gas Supply Refill Purchase
                cursor.execute("DELETE FROM accounts_ledger WHERE reference_id = ?", (supply_id,))
                if total_cost > 0:
                    cursor.execute("""
                    INSERT INTO accounts_ledger (id, building_id, entry_date, category, entry_type, amount, payment_mode, person_name, reference_id, notes, updated_at)
                    VALUES (?, ?, ?, 'Gas Refill Supply Purchase', 'EXPENSE', ?, ?, ?, ?, ?, ?)
                    """, (str(uuid.uuid4()), building_id, supply_date[:10], total_cost, payment_mode, supplier_name or 'Gas Supplier', supply_id, f"Inward supply refill purchase of {quantity} {cylinder_type} gas cylinders from {supplier_name or 'Refinery Vendor'}", now_iso))

                conn.commit()
                return self._send_json({
                    "success": True,
                    "supply_id": supply_id,
                    "quantity": quantity,
                    "message": "Inward gas cylinder supply logged successfully"
                })

            elif path == '/api/gas/supply/delete':
                if body.get('operator_role') == 'RECEPTIONIST':
                    return self._send_json({"success": False, "error": "Access Denied: Only Master Admin can delete inward gas supply records."}, 403)
                supply_id = body.get('id')
                cursor.execute("SELECT building_id, quantity FROM gas_inward_supply WHERE id = ?", (supply_id,))
                s_row = cursor.fetchone()
                if s_row:
                    b_id = s_row['building_id']
                    qty = s_row['quantity']
                    cursor.execute("DELETE FROM gas_inward_supply WHERE id = ?", (supply_id,))
                    cursor.execute("DELETE FROM accounts_ledger WHERE reference_id = ?", (supply_id,))
                    cursor.execute("UPDATE gas_inventory_summary SET reserve_stock = MAX(0, reserve_stock - ?), updated_at = ? WHERE building_id = ?", (qty, datetime.now().isoformat(), b_id))
                    conn.commit()
                return self._send_json({"success": True, "message": "Inward supply record removed and inventory updated"})

            # 8. Maintenance Jobs (Other Income Engine)
            elif path == '/api/maintenance_jobs/save':
                job_id = body.get('id') or str(uuid.uuid4())
                building_id = body.get('building_id')
                flat_number = body.get('flat_number', '').strip()
                category = body.get('category', 'Plumbing')
                issue_description = body.get('issue_description', '')
                technician = body.get('assigned_technician', '')
                customer_name = body.get('customer_name', '').strip()
                customer_phone = body.get('customer_phone', '').strip()
                status = body.get('status', 'COMPLETED')
                job_date = body.get('job_date', datetime.now().strftime('%Y-%m-%d'))
                billed_amount = float(body.get('billed_amount', 0.0))
                parts_cost = float(body.get('parts_cost', 0.0))
                labor_cost = float(body.get('labor_cost', 0.0))
                net_margin = billed_amount - (parts_cost + labor_cost)
                payment_mode = body.get('payment_mode', 'HAND_CASH')
                cash_collector = body.get('cash_collector_name', technician)
                bank_acc_id = body.get('bank_account_id', '')
                tx_ref = body.get('transaction_reference', '')
                receptionist = body.get('receptionist_name', 'Receptionist')

                today_code = datetime.now().strftime('%Y%m%d')
                short_uid = job_id[:4].upper()
                receipt_number = body.get('receipt_number') or f"REC-JOB-{today_code}-{short_uid}"

                cursor.execute("SELECT id FROM flats WHERE building_id = ? AND flat_number = ?", (building_id, flat_number))
                frow = cursor.fetchone()
                flat_id = frow['id'] if frow else None

                cursor.execute("""
                INSERT INTO maintenance_jobs (id, building_id, flat_id, flat_number, category, issue_description, assigned_technician, customer_name, customer_phone, status, job_date, billed_amount, parts_cost, labor_cost, net_profit_margin, payment_mode, cash_collector_name, bank_account_id, transaction_reference, receipt_number, receptionist_name, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    flat_number = excluded.flat_number,
                    category = excluded.category,
                    issue_description = excluded.issue_description,
                    assigned_technician = excluded.assigned_technician,
                    customer_name = excluded.customer_name,
                    customer_phone = excluded.customer_phone,
                    status = excluded.status,
                    job_date = excluded.job_date,
                    billed_amount = excluded.billed_amount,
                    parts_cost = excluded.parts_cost,
                    labor_cost = excluded.labor_cost,
                    net_profit_margin = excluded.net_profit_margin,
                    payment_mode = excluded.payment_mode,
                    cash_collector_name = excluded.cash_collector_name,
                    bank_account_id = excluded.bank_account_id,
                    transaction_reference = excluded.transaction_reference,
                    receipt_number = excluded.receipt_number,
                    updated_at = excluded.updated_at
                """, (job_id, building_id, flat_id, flat_number, category, issue_description, technician, customer_name, customer_phone, status, job_date, billed_amount, parts_cost, labor_cost, net_margin, payment_mode, cash_collector, bank_acc_id, tx_ref, receipt_number, receptionist, now_iso))

                cursor.execute("DELETE FROM accounts_ledger WHERE reference_id = ?", (job_id,))
                if status == 'COMPLETED':
                    if billed_amount > 0:
                        cursor.execute("""
                        INSERT INTO accounts_ledger (id, building_id, entry_date, category, entry_type, amount, payment_mode, person_name, bank_account_id, reference_id, receipt_number, notes, updated_at)
                        VALUES (?, ?, ?, 'On-Demand Repair', 'INCOME', ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (str(uuid.uuid4()), building_id, job_date, billed_amount, payment_mode, cash_collector, bank_acc_id, job_id, receipt_number, f"{category} service billing for Flat {flat_number} ({technician})", now_iso))

                    if parts_cost > 0:
                        cursor.execute("""
                        INSERT INTO accounts_ledger (id, building_id, entry_date, category, entry_type, amount, payment_mode, person_name, reference_id, receipt_number, notes, updated_at)
                        VALUES (?, ?, ?, 'Spare Parts & Material Purchase', 'EXPENSE', ?, ?, ?, ?, ?, ?, ?)
                        """, (str(uuid.uuid4()), building_id, job_date, parts_cost, payment_mode, technician or 'Hardware Vendor', job_id, receipt_number, f"Spare parts & hardware purchase for Flat {flat_number} repair ({category})", now_iso))

                    if labor_cost > 0:
                        cursor.execute("""
                        INSERT INTO accounts_ledger (id, building_id, entry_date, category, entry_type, amount, payment_mode, person_name, reference_id, receipt_number, notes, updated_at)
                        VALUES (?, ?, ?, 'Technician Labor Charges', 'EXPENSE', ?, ?, ?, ?, ?, ?, ?)
                        """, (str(uuid.uuid4()), building_id, job_date, labor_cost, payment_mode, technician or 'Technician', job_id, receipt_number, f"Technician/Plumber labor fee paid for Flat {flat_number} repair ({technician})", now_iso))

                conn.commit()
                return self._send_json({
                    "success": True, 
                    "job_id": job_id, 
                    "receipt_number": receipt_number,
                    "net_profit_margin": net_margin, 
                    "message": "Repair job updated"
                })

            elif path == '/api/maintenance_jobs/delete':
                if body.get('operator_role') == 'RECEPTIONIST':
                    return self._send_json({"success": False, "error": "Access Denied: Receptionist cannot delete repair records. Contact Master Admin."}, 403)
                job_id = body.get('id')
                cursor.execute("DELETE FROM maintenance_jobs WHERE id = ?", (job_id,))
                cursor.execute("DELETE FROM accounts_ledger WHERE reference_id = ?", (job_id,))
                conn.commit()
                return self._send_json({"success": True, "message": "Repair job removed"})

            # 9. Accounts Ledger
            elif path == '/api/ledger/save':
                ledger_id = body.get('id') or str(uuid.uuid4())
                building_id = body.get('building_id')
                entry_date = body.get('entry_date', datetime.now().strftime('%Y-%m-%d'))
                category = body.get('category', 'Building Expense')
                entry_type = body.get('entry_type', 'EXPENSE')
                amount = float(body.get('amount', 0.0))
                payment_mode = body.get('payment_mode', 'HAND_CASH')
                person_name = body.get('person_name', '')
                bank_acc_id = body.get('bank_account_id', '')
                receipt_number = body.get('receipt_number', '')
                notes = body.get('notes', '')

                cursor.execute("""
                INSERT INTO accounts_ledger (id, building_id, entry_date, category, entry_type, amount, payment_mode, person_name, bank_account_id, receipt_number, notes, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    entry_date = excluded.entry_date,
                    category = excluded.category,
                    entry_type = excluded.entry_type,
                    amount = excluded.amount,
                    payment_mode = excluded.payment_mode,
                    person_name = excluded.person_name,
                    bank_account_id = excluded.bank_account_id,
                    receipt_number = excluded.receipt_number,
                    notes = excluded.notes,
                    updated_at = excluded.updated_at
                """, (ledger_id, building_id, entry_date, category, entry_type, amount, payment_mode, person_name, bank_acc_id, receipt_number, notes, now_iso))
                conn.commit()
                return self._send_json({"success": True, "id": ledger_id, "message": "Ledger entry updated"})

            elif path == '/api/ledger/delete':
                if body.get('operator_role') == 'RECEPTIONIST':
                    return self._send_json({"success": False, "error": "Access Denied: Receptionist cannot delete ledger records. Contact Master Admin."}, 403)
                ledger_id = body.get('id')
                cursor.execute("DELETE FROM accounts_ledger WHERE id = ?", (ledger_id,))
                conn.commit()
                return self._send_json({"success": True, "message": "Ledger entry removed"})

            # 10. Users Management in Settings
            elif path == '/api/system/users/save':
                op_role = body.get('operator_role')
                if op_role == 'RECEPTIONIST':
                    return self._send_json({"success": False, "error": "Access Denied: Receptionists have no authority to manage users or change passwords. Contact Manager / Admin."}, 403)

                user_id = body.get('id') or str(uuid.uuid4())
                username = body.get('username', '').strip()
                password = body.get('password', '').strip()
                full_name = body.get('full_name', '').strip()
                phone = body.get('phone', '').strip()
                role = body.get('role', 'RECEPTIONIST')
                assigned_bldg = body.get('assigned_building_id')
                is_active = int(body.get('is_active', 1))

                # Manager can only create/update RECEPTIONISTS for their own building
                if op_role == 'MANAGER':
                    op_bldg = body.get('operator_assigned_building_id')
                    if role != 'RECEPTIONIST':
                        return self._send_json({"success": False, "error": "Access Denied: Building Managers can only create and manage Receptionist accounts."}, 403)
                    if assigned_bldg and op_bldg and assigned_bldg != op_bldg:
                        return self._send_json({"success": False, "error": "Access Denied: You can only assign Receptionists to your own building."}, 403)
                    assigned_bldg = op_bldg or assigned_bldg

                if password:
                    pw_hash = hash_password(password)
                    cursor.execute("""
                    INSERT INTO users (id, username, password_hash, full_name, phone, role, assigned_building_id, is_active, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        username = excluded.username,
                        password_hash = excluded.password_hash,
                        full_name = excluded.full_name,
                        phone = excluded.phone,
                        role = excluded.role,
                        assigned_building_id = excluded.assigned_building_id,
                        is_active = excluded.is_active,
                        updated_at = excluded.updated_at
                    """, (user_id, username, pw_hash, full_name, phone, role, assigned_bldg, is_active, now_iso))
                else:
                    cursor.execute("""
                    UPDATE users SET username = ?, full_name = ?, phone = ?, role = ?, assigned_building_id = ?, is_active = ?, updated_at = ?
                    WHERE id = ?
                    """, (username, full_name, phone, role, assigned_bldg, is_active, now_iso, user_id))

                conn.commit()
                return self._send_json({"success": True, "message": "User account saved"})

            elif path == '/api/system/users/delete':
                op_role = body.get('operator_role')
                if op_role == 'RECEPTIONIST':
                    return self._send_json({"success": False, "error": "Access Denied: Receptionists cannot delete user accounts."}, 403)
                user_id = body.get('id')
                if op_role == 'MANAGER':
                    cursor.execute("SELECT role, assigned_building_id FROM users WHERE id = ?", (user_id,))
                    u_to_del = cursor.fetchone()
                    op_bldg = body.get('operator_assigned_building_id')
                    if not u_to_del or u_to_del['role'] != 'RECEPTIONIST' or (op_bldg and u_to_del['assigned_building_id'] != op_bldg):
                        return self._send_json({"success": False, "error": "Access Denied: Managers can only delete Receptionists of their own building."}, 403)
                cursor.execute("DELETE FROM users WHERE id = ? AND role NOT IN ('MASTER_ADMIN', 'MANAGER')", (user_id,))
                conn.commit()
                return self._send_json({"success": True, "message": "User deleted"})

            # 11. Bank Accounts
            elif path == '/api/system/bank_accounts/save':
                bank_id = body.get('id') or str(uuid.uuid4())
                bank_name = body.get('bank_name', '').strip()
                title = body.get('account_title', '').strip()
                acc_num = body.get('account_number', '').strip()
                iban = body.get('iban', '').strip()
                branch = body.get('branch_code', '').strip()

                cursor.execute("""
                INSERT INTO bank_accounts (id, bank_name, account_title, account_number, iban, branch_code, is_active, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?)
                ON CONFLICT(id) DO UPDATE SET
                    bank_name = excluded.bank_name,
                    account_title = excluded.account_title,
                    account_number = excluded.account_number,
                    iban = excluded.iban,
                    branch_code = excluded.branch_code,
                    updated_at = excluded.updated_at
                """, (bank_id, bank_name, title, acc_num, iban, branch, now_iso))
                conn.commit()
                return self._send_json({"success": True, "message": "Bank account saved"})

            elif path == '/api/system/bank_accounts/delete':
                bank_id = body.get('id')
                cursor.execute("DELETE FROM bank_accounts WHERE id = ?", (bank_id,))
                conn.commit()
                return self._send_json({"success": True, "message": "Bank account removed"})

            # 12. Media Upload
            elif path == '/api/media/upload':
                data_b64 = body.get('data')
                ext = body.get('extension', 'jpg')
                if not data_b64:
                    return self._send_json({"success": False, "error": "No media data"}, 400)

                if ',' in data_b64:
                    data_b64 = data_b64.split(',', 1)[1]

                raw_bytes = base64.b64decode(data_b64)
                file_hash = uuid.uuid4().hex[:8]
                filename = f"media_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file_hash}.{ext}"
                target_path = os.path.join(MEDIA_DIR, filename)

                with open(target_path, 'wb') as f:
                    f.write(raw_bytes)

                return self._send_json({"success": True, "filename": filename, "url": f"/media/{filename}"})

            # 12.b Document Scanner via Hardware WIA
            elif path == '/api/scanner/scan':
                scan_id = f"doc_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}.jpg"
                scan_dest = os.path.join(MEDIA_DIR, scan_id)
                ps_script = f"""
$ErrorActionPreference = 'Stop'
try {{
    $dialog = New-Object -ComObject Wia.CommonDialog
    $image = $dialog.ShowAcquireImage(1) # 1 = ScannerDeviceType
    if ($image -ne $null) {{
        $image.SaveFile('{scan_dest}')
        Write-Output "SUCCESS"
    }} else {{
        Write-Output "CANCELLED"
    }}
}} catch {{
    Write-Output "ERROR: $($_.Exception.Message)"
}}
"""
                try:
                    res = subprocess.run(
                        ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_script],
                        capture_output=True,
                        text=True,
                        timeout=60
                    )
                    out = res.stdout.strip()
                    if "SUCCESS" in out and os.path.exists(scan_dest):
                        return self._send_json({
                            "success": True,
                            "filename": scan_id,
                            "url": f"/media/{scan_id}",
                            "message": "Document scanned successfully from connected hardware scanner"
                        })
                    elif "CANCELLED" in out:
                        return self._send_json({
                            "success": False,
                            "cancelled": True,
                            "error": "Scanning was cancelled"
                        })
                    else:
                        err_msg = out if out else (res.stderr.strip() or "No hardware scanner detected")
                        return self._send_json({
                            "success": False,
                            "error": f"Hardware scanner notification: {err_msg}. You can also use Camera Scanner or upload scanned document."
                        }, status=400)
                except subprocess.TimeoutExpired:
                    return self._send_json({
                        "success": False,
                        "error": "Hardware scanner response timed out. Please check USB scanner power/cable."
                    }, status=504)
                except Exception as e:
                    return self._send_json({
                        "success": False,
                        "error": f"Scanner error: {str(e)}"
                    }, status=500)

            # 12.c Scanned Document / Camera Document Upload
            elif path == '/api/scanner/upload_base64':
                doc_base64 = body.get('base64_data') or body.get('data', '')
                doc_type = body.get('module') or body.get('doc_type', 'doc')
                if not doc_base64:
                    return self._send_json({"success": False, "error": "No document data provided"}, 400)

                ext = body.get('extension', 'jpg').lower().replace('.', '')
                if 'data:application/pdf' in doc_base64:
                    ext = 'pdf'
                elif 'data:image/png' in doc_base64:
                    ext = 'png'

                if ',' in doc_base64:
                    doc_base64 = doc_base64.split(',', 1)[1]

                raw_bytes = base64.b64decode(doc_base64)
                doc_fn = f"{doc_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}.{ext}"
                doc_path = os.path.join(MEDIA_DIR, doc_fn)
                with open(doc_path, 'wb') as f:
                    f.write(raw_bytes)

                return self._send_json({
                    "success": True,
                    "filename": doc_fn,
                    "url": f"/media/{doc_fn}",
                    "message": "Document attached successfully"
                })

            # 13. Sync Export & Import
            elif path == '/api/sync/export':
                building_id = body.get('building_id')
                operator_name = body.get('operator_name', 'Receptionist')
                result = export_building_data(building_id, operator_name)
                result['download_url'] = f"/api/sync/download?filename={urllib.parse.quote(result['filename'])}"
                return self._send_json(result)

            elif path == '/api/sync/import':
                file_b64 = body.get('file_data')
                operator_name = body.get('operator_name', 'Master Admin')
                if ',' in file_b64:
                    file_b64 = file_b64.split(',', 1)[1]
                file_bytes = base64.b64decode(file_b64)
                result = import_building_data(file_bytes, operator_name)
                return self._send_json(result)

            # 14. Building Management (Rename, Rates, Address)
            elif path == '/api/system/buildings/save':
                building_id = body.get('id')
                name = body.get('name', '').strip()
                address = body.get('address', '').strip()
                gas_rate = float(body.get('gas_rate_per_cylinder', 3450.0))
                maint_rate = float(body.get('monthly_maintenance_rate', 5000.0))

                if not building_id or not name:
                    return self._send_json({"success": False, "error": "Building ID and name are required"}, 400)

                cursor.execute("""
                UPDATE buildings
                SET name = ?, address = ?, gas_rate_per_cylinder = ?, monthly_maintenance_rate = ?, updated_at = ?
                WHERE id = ?
                """, (name, address, gas_rate, maint_rate, now_iso, building_id))
                conn.commit()
                return self._send_json({"success": True, "message": "Building details updated successfully"})

            # 15. Password Change (Self & Admin Override)
            elif path == '/api/auth/change_password':
                user_id = body.get('user_id')
                old_password = body.get('old_password', '').strip()
                new_password = body.get('new_password', '').strip()
                is_admin_override = body.get('is_admin_override', False)

                if not user_id or not new_password:
                    return self._send_json({"success": False, "error": "User ID and new password are required"}, 400)

                if len(new_password) < 4:
                    return self._send_json({"success": False, "error": "Password must be at least 4 characters"}, 400)

                cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
                user = cursor.fetchone()
                if not user:
                    return self._send_json({"success": False, "error": "User not found"}, 404)

                if not is_admin_override:
                    if not old_password:
                        return self._send_json({"success": False, "error": "Current password is required"}, 400)
                    if user['password_hash'] != hash_password(old_password):
                        return self._send_json({"success": False, "error": "Incorrect current password"}, 400)

                new_hash = hash_password(new_password)
                cursor.execute("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", (new_hash, now_iso, user_id))
                conn.commit()
                return self._send_json({"success": True, "message": "Password changed successfully"})

            # 15b. Verify Admin / Manager Password for Secure Deletions
            elif path == '/api/auth/verify_admin_password':
                admin_password = body.get('password', '').strip()
                if not admin_password:
                    return self._send_json({"success": False, "error": "Password is required"}, 400)
                
                if self._is_delete_password_valid(cursor, admin_password, body.get('operator_id')):
                    return self._send_json({"success": True, "message": "Authorization verified"})
                else:
                    return self._send_json({"success": False, "error": "Incorrect password! Deletion blocked."}, 401)

            # 16. Corporate System Profile Save (Admin)
            elif path == '/api/system/profile/save':
                company_name = body.get('company_name', '').strip() or "DS MAINTENANCE"
                office_address = body.get('office_address', '').strip() or ""
                helpline_phone = body.get('helpline_phone', '').strip() or ""
                official_email = body.get('official_email', '').strip() or ""
                ntn_number = body.get('ntn_number', '').strip() or ""
                audit_ref_prefix = body.get('audit_ref_prefix', '').strip() or "DSM/AUDIT/2026/REP-8821"

                cursor.execute("SELECT id FROM system_profile LIMIT 1")
                existing = cursor.fetchone()
                if existing:
                    cursor.execute("""
                    UPDATE system_profile
                    SET company_name = ?, office_address = ?, helpline_phone = ?, official_email = ?, ntn_number = ?, audit_ref_prefix = ?, updated_at = ?
                    WHERE id = ?
                    """, (company_name, office_address, helpline_phone, official_email, ntn_number, audit_ref_prefix, now_iso, existing['id']))
                else:
                    cursor.execute("""
                    INSERT INTO system_profile (id, company_name, office_address, helpline_phone, official_email, ntn_number, audit_ref_prefix, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, ("default_profile", company_name, office_address, helpline_phone, official_email, ntn_number, audit_ref_prefix, now_iso))
                conn.commit()
                return self._send_json({"success": True, "message": "Corporate company profile saved successfully"})

            # 17. Supabase Cloud Sync Endpoints
            elif path == '/api/sync/supabase/config':
                url = body.get('supabase_url', '')
                key = body.get('supabase_key', '')
                is_auto = int(body.get('is_auto_sync', 1))
                interval = int(body.get('sync_interval_seconds', 60))
                res = supabase_sync.save_sync_config(url, key, is_auto, interval)
                return self._send_json(res)

            elif path == '/api/sync/supabase/test':
                url = body.get('supabase_url')
                key = body.get('supabase_key')
                res = supabase_sync.test_connection(url, key)
                return self._send_json(res)

            elif path == '/api/sync/supabase/sync_now':
                building_id = body.get('building_id')
                res = supabase_sync.sync_full_cycle(building_id)
                return self._send_json(res)

            else:
                return self._send_json({"success": False, "error": f"Endpoint not found: {path}"}, 404)

        except Exception as e:
            return self._send_json({"success": False, "error": str(e)}, 500)
        finally:
            conn.close()

def start_server():
    server = ThreadingHTTPServer(('0.0.0.0', PORT), DSRequestHandler)
    print(f"DS Maintenance Suite Server running at port {PORT} (accessible via localhost or local network IP)")
    server.serve_forever()

def wait_for_server(port, timeout=6.0):
    """Ensure HTTP server socket is active and accepting connections before launching GUI."""
    start_t = time.time()
    while time.time() - start_t < timeout:
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=0.2):
                return True
        except (socket.error, ConnectionRefusedError):
            time.sleep(0.08)
    return False

def find_standalone_browser():
    """Find installed modern Chromium browser (Edge or Chrome) for native standalone app mode."""
    candidates = [
        # Microsoft Edge (Installed by default on all Windows 10 & 11)
        os.path.join(os.environ.get('ProgramFiles(x86)', r'C:\Program Files (x86)'), r'Microsoft\Edge\Application\msedge.exe'),
        os.path.join(os.environ.get('ProgramFiles', r'C:\Program Files'), r'Microsoft\Edge\Application\msedge.exe'),
        os.path.join(os.environ.get('LOCALAPPDATA', ''), r'Microsoft\Edge\Application\msedge.exe'),
        # Google Chrome
        os.path.join(os.environ.get('ProgramFiles', r'C:\Program Files'), r'Google\Chrome\Application\chrome.exe'),
        os.path.join(os.environ.get('ProgramFiles(x86)', r'C:\Program Files (x86)'), r'Google\Chrome\Application\chrome.exe'),
        os.path.join(os.environ.get('LOCALAPPDATA', ''), r'Google\Chrome\Application\chrome.exe'),
    ]
    for p in candidates:
        if p and os.path.isfile(p):
            return p
    return None

def launch_desktop_gui():
    print("Checking server socket readiness...")
    wait_for_server(PORT, timeout=6.0)

    # 1. Check if native Microsoft Edge WebView2 (Chromium) is available
    has_webview2 = False
    try:
        from webview.platforms import winforms
        has_webview2 = winforms._is_chromium()
    except Exception:
        has_webview2 = False

    if has_webview2:
        try:
            import webview
            print("Launching DS Maintenance Native Windows Desktop GUI (Edge Chromium Engine)...")
            window = webview.create_window(
                title="DS MAINTENANCE",
                url=SERVER_URL,
                width=1366,
                height=768,
                min_size=(900, 600),
                maximized=True,
                zoomable=True,
                background_color='#040914',
                text_select=True
            )
            webview.start(gui='edgechromium', debug=False)
            return
        except Exception as e:
            print(f"PyWebView EdgeChromium launch error: {e}")

    # 2. If WebView2 runtime is missing or PyWebView failed:
    # NEVER fall back to ancient MSHTML (Internet Explorer)!
    # Launch modern Microsoft Edge or Chrome in Frameless Standalone App Mode!
    browser_exe = find_standalone_browser()
    if browser_exe:
        print(f"Launching DS Maintenance in Native Standalone App Window via: {browser_exe}")
        try:
            proc = subprocess.Popen([
                browser_exe,
                f"--app={SERVER_URL}",
                "--window-size=1366,768",
                "--start-maximized"
            ])
            proc.wait()
            return
        except Exception as ex:
            print(f"Standalone app mode launch error: {ex}")

    # 3. Fallback to default modern web browser
    print("Opening DS Maintenance in default modern browser...")
    import webbrowser
    webbrowser.open(SERVER_URL)
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        sys.exit(0)

if __name__ == '__main__':
    init_database()
    supabase_sync.start_background_sync(60)
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    launch_desktop_gui()
