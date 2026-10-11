"""
DS Maintenance Suite - Local Database Engine (SQLite3 with WAL Mode)
Zero-conflict UUIDv4 architecture with timestamps for offline synchronization.
Includes Owner profiles, Receptionist management, Monthly reports, and full CRUD support.
"""

import sqlite3
import os
import sys
import uuid
import hashlib
import json
from datetime import datetime

# Resolve Permanent Base Directory (Safe against PyInstaller dist rebuilds & portable folder copying)
def get_permanent_base_dir():
    if getattr(sys, 'frozen', False):
        exe_dir = os.path.dirname(sys.executable)
        # If running from dist/DS_MAINTENANCE, go up to project root if data exists there
        parent = os.path.abspath(os.path.join(exe_dir, '..', '..'))
        if os.path.exists(os.path.join(parent, 'Start_DS_Maintenance.bat')) or os.path.exists(os.path.join(parent, 'data')):
            return parent
        return exe_dir
    return os.path.dirname(os.path.abspath(__file__))

BASE_DIR = get_permanent_base_dir()
DATA_DIR = os.path.join(BASE_DIR, 'data')
MEDIA_DIR = os.path.join(DATA_DIR, 'media')
EXPORTS_DIR = os.path.join(DATA_DIR, 'exports')
DB_PATH = os.path.join(DATA_DIR, 'ds_maintenance.db')

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MEDIA_DIR, exist_ok=True)
os.makedirs(EXPORTS_DIR, exist_ok=True)

def hash_password(password: str) -> str:
    """Hash password using SHA-256."""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def get_db_connection():
    """Returns a SQLite connection with WAL mode enabled and dict row factory."""
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA cache_size=-64000;")
    conn.execute("PRAGMA temp_store=MEMORY;")
    conn.execute("PRAGMA mmap_size=268435456;")
    conn.execute("PRAGMA foreign_keys=ON;")
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    """Creates all required tables if they do not exist and applies schema updates."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Buildings Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS buildings (
        id TEXT PRIMARY KEY,
        building_code INTEGER UNIQUE NOT NULL,
        name TEXT NOT NULL,
        address TEXT,
        total_flats INTEGER DEFAULT 0,
        gas_rate_per_cylinder REAL DEFAULT 3450.0,
        monthly_maintenance_rate REAL DEFAULT 0.0,
        updated_at TEXT NOT NULL
    );
    """)

    # 2. Users Table (Admin + Receptionists)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT,
        role TEXT NOT NULL, -- 'MASTER_ADMIN', 'MANAGER' (one per building) or 'RECEPTIONIST'
        assigned_building_id TEXT,
        is_active INTEGER DEFAULT 1,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (assigned_building_id) REFERENCES buildings (id)
    );
    """)

    # Check and add phone column to users table if migrating older database
    cursor.execute("PRAGMA table_info(users)")
    u_columns = [col['name'] for col in cursor.fetchall()]
    if 'phone' not in u_columns:
        cursor.execute("ALTER TABLE users ADD COLUMN phone TEXT")

    # 3. Official Bank Accounts Config
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS bank_accounts (
        id TEXT PRIMARY KEY,
        bank_name TEXT NOT NULL,
        account_title TEXT NOT NULL,
        account_number TEXT NOT NULL,
        iban TEXT,
        branch_code TEXT,
        is_active INTEGER DEFAULT 1,
        updated_at TEXT NOT NULL
    );
    """)

    # 4. Flats / Apartments Registry (Includes Owner Details)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS flats (
        id TEXT PRIMARY KEY,
        building_id TEXT NOT NULL,
        flat_number TEXT NOT NULL,
        floor_number INTEGER DEFAULT 1,
        wing TEXT,
        bhk_type TEXT DEFAULT '3-Bed DD',
        occupancy_mode TEXT DEFAULT 'Rented', -- 'Owner Occupied', 'Rented', 'Vacant'
        owner_name TEXT DEFAULT 'Property Owner',
        owner_phone TEXT,
        owner_cnic TEXT,
        owner_email TEXT,
        owner_address TEXT,
        active_since TEXT,
        current_tenant_id TEXT,
        notes TEXT,
        updated_at TEXT NOT NULL,
        UNIQUE(building_id, flat_number),
        FOREIGN KEY (building_id) REFERENCES buildings (id)
    );
    """)

    # Check and add owner columns if migrating older database
    cursor.execute("PRAGMA table_info(flats)")
    columns = [col['name'] for col in cursor.fetchall()]
    if 'owner_name' not in columns:
        cursor.execute("ALTER TABLE flats ADD COLUMN owner_name TEXT DEFAULT 'Property Owner'")
    if 'owner_phone' not in columns:
        cursor.execute("ALTER TABLE flats ADD COLUMN owner_phone TEXT")
    if 'owner_cnic' not in columns:
        cursor.execute("ALTER TABLE flats ADD COLUMN owner_cnic TEXT")
    if 'owner_email' not in columns:
        cursor.execute("ALTER TABLE flats ADD COLUMN owner_email TEXT")
    if 'owner_address' not in columns:
        cursor.execute("ALTER TABLE flats ADD COLUMN owner_address TEXT")

    # 5. Current Tenants & Family Profiles
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        building_id TEXT NOT NULL,
        flat_id TEXT NOT NULL,
        full_name TEXT NOT NULL,
        primary_phone TEXT NOT NULL,
        emergency_phone TEXT,
        cnic_number TEXT NOT NULL,
        move_in_date TEXT NOT NULL,
        lease_tenure_months INTEGER DEFAULT 12,
        monthly_rent REAL DEFAULT 0.0,
        monthly_maintenance REAL DEFAULT 0.0,
        photo_filename TEXT,
        status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE' or 'VACATED'
        vacated_date TEXT,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (building_id) REFERENCES buildings (id),
        FOREIGN KEY (flat_id) REFERENCES flats (id)
    );
    """)

    # Migration check for photo_filename in tenants table
    cursor.execute("PRAGMA table_info(tenants)")
    t_columns = [col['name'] for col in cursor.fetchall()]
    if 'photo_filename' not in t_columns:
        cursor.execute("ALTER TABLE tenants ADD COLUMN photo_filename TEXT")

    # Migration check for refill_purchase_cost in gas_deliveries table
    cursor.execute("PRAGMA table_info(gas_deliveries)")
    g_columns = [col['name'] for col in cursor.fetchall()]
    if 'refill_purchase_cost' not in g_columns:
        cursor.execute("ALTER TABLE gas_deliveries ADD COLUMN refill_purchase_cost REAL DEFAULT 2800.0")

    # 6. Family Registry
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS family_members (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        flat_id TEXT NOT NULL,
        full_name TEXT NOT NULL,
        relation TEXT NOT NULL,
        cnic_bform TEXT,
        phone TEXT,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (tenant_id) REFERENCES tenants (id),
        FOREIGN KEY (flat_id) REFERENCES flats (id)
    );
    """)

    # 7. Vehicle Parking Database
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        flat_id TEXT NOT NULL,
        vehicle_type TEXT NOT NULL,
        registration_number TEXT NOT NULL,
        make_model TEXT,
        parking_slot_number TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (flat_id) REFERENCES flats (id)
    );
    """)

    # 8. Permanent Tenant Archive Timeline
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tenant_history_archive (
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
        updated_at TEXT NOT NULL,
        FOREIGN KEY (building_id) REFERENCES buildings (id),
        FOREIGN KEY (flat_id) REFERENCES flats (id)
    );
    """)

    # 8b. Flat Occupancy Lifecycle & Active / Inactive Timeline History
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS flat_occupancy_history (
        id TEXT PRIMARY KEY,
        building_id TEXT NOT NULL,
        flat_id TEXT NOT NULL,
        flat_number TEXT NOT NULL,
        status TEXT NOT NULL, -- 'ACTIVE_TENANT', 'ACTIVE_OWNER', 'INACTIVE_VACANT', 'UNDER_MAINTENANCE'
        occupant_type TEXT NOT NULL, -- 'TENANT', 'OWNER', 'VACANT'
        occupant_name TEXT,
        occupant_phone TEXT,
        occupant_cnic TEXT,
        start_date TEXT NOT NULL, -- YYYY-MM-DD
        end_date TEXT, -- YYYY-MM-DD or NULL if currently active
        monthly_rent REAL DEFAULT 0.0,
        reason_or_notes TEXT,
        logged_by_user TEXT DEFAULT 'Receptionist',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (building_id) REFERENCES buildings (id),
        FOREIGN KEY (flat_id) REFERENCES flats (id)
    );
    """)

    # 9. Daily Guests / Visitors Log
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS visitor_logs (
        id TEXT PRIMARY KEY,
        building_id TEXT NOT NULL,
        flat_id TEXT,
        flat_number TEXT NOT NULL,
        guest_name TEXT NOT NULL,
        contact_number TEXT,
        cnic_number TEXT,
        purpose_of_visit TEXT,
        entry_time TEXT NOT NULL,
        exit_time TEXT,
        photo_filename TEXT,
        status TEXT DEFAULT 'IN_PREMISES',
        receptionist_name TEXT,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (building_id) REFERENCES buildings (id)
    );
    """)

    # 10. Domestic Staff & Bahria Town Karachi Maid Database
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS domestic_staff (
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
        is_active INTEGER DEFAULT 1,
        last_check_in TEXT,
        last_check_out TEXT,
        status TEXT DEFAULT 'OFF_DUTY',
        updated_at TEXT NOT NULL,
        FOREIGN KEY (building_id) REFERENCES buildings (id)
    );
    """)

    # 11. Staff Attendance Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS staff_attendance (
        id TEXT PRIMARY KEY,
        staff_id TEXT NOT NULL,
        building_id TEXT NOT NULL,
        check_in_time TEXT NOT NULL,
        check_out_time TEXT,
        notes TEXT,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (staff_id) REFERENCES domestic_staff (id),
        FOREIGN KEY (building_id) REFERENCES buildings (id)
    );
    """)

    # 12. Gas Cylinder Inventory & Deliveries
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS gas_inventory_summary (
        building_id TEXT PRIMARY KEY,
        reserve_stock INTEGER DEFAULT 50,
        active_in_apartments INTEGER DEFAULT 20,
        empty_returned INTEGER DEFAULT 10,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (building_id) REFERENCES buildings (id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS gas_deliveries (
        id TEXT PRIMARY KEY,
        building_id TEXT NOT NULL,
        flat_id TEXT,
        flat_number TEXT NOT NULL,
        transaction_type TEXT DEFAULT 'REFILL', -- 'REFILL' or 'NEW_PURCHASE'
        delivery_date TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        unit_price REAL NOT NULL,
        total_amount REAL NOT NULL,
        payment_mode TEXT NOT NULL,
        cash_collector_name TEXT,
        bank_account_id TEXT,
        bank_account_title TEXT,
        transaction_reference TEXT,
        bank_slip_filename TEXT,
        receipt_number TEXT UNIQUE NOT NULL,
        is_empty_returned INTEGER DEFAULT 1,
        receptionist_name TEXT,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (building_id) REFERENCES buildings (id)
    );
    """)

    # 12.b Gas Inward Stock Supply & Procurement (Arrival log: date, supplier, delivered_by, vehicle, quantity)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS gas_inward_supply (
        id TEXT PRIMARY KEY,
        building_id TEXT NOT NULL,
        supply_date TEXT NOT NULL,
        supplier_name TEXT NOT NULL,
        delivered_by TEXT NOT NULL,
        vehicle_number TEXT,
        quantity INTEGER NOT NULL,
        cylinder_type TEXT DEFAULT 'Standard 11.8kg',
        unit_cost REAL DEFAULT 0.0,
        total_cost REAL DEFAULT 0.0,
        payment_mode TEXT DEFAULT 'HAND_CASH',
        batch_reference TEXT,
        notes TEXT,
        received_by_user TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (building_id) REFERENCES buildings (id)
    );
    """)

    # 13. DS Maintenance On-Demand Jobs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS maintenance_jobs (
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
        billed_amount REAL NOT NULL,
        parts_cost REAL DEFAULT 0.0,
        labor_cost REAL DEFAULT 0.0,
        net_profit_margin REAL NOT NULL,
        payment_mode TEXT DEFAULT 'HAND_CASH',
        cash_collector_name TEXT,
        bank_account_id TEXT,
        transaction_reference TEXT,
        receipt_number TEXT,
        receptionist_name TEXT,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (building_id) REFERENCES buildings (id)
    );
    """)

    # 14. Accounts & Cash Ledger
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS accounts_ledger (
        id TEXT PRIMARY KEY,
        building_id TEXT NOT NULL,
        entry_date TEXT NOT NULL,
        category TEXT NOT NULL,
        entry_type TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_mode TEXT NOT NULL,
        person_name TEXT,
        bank_account_id TEXT,
        reference_id TEXT,
        receipt_number TEXT,
        notes TEXT,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (building_id) REFERENCES buildings (id)
    );
    """)

    # 15. Synchronization Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sync_logs (
        id TEXT PRIMARY KEY,
        building_id TEXT NOT NULL,
        sync_type TEXT NOT NULL,
        filename TEXT NOT NULL,
        records_count INTEGER DEFAULT 0,
        media_count INTEGER DEFAULT 0,
        sync_timestamp TEXT NOT NULL,
        operator_name TEXT NOT NULL,
        status TEXT DEFAULT 'SUCCESS',
        details TEXT
    );
    """)

    # 15b. Supabase / Cloud Live Sync Configuration
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cloud_sync_settings (
        id TEXT PRIMARY KEY,
        provider TEXT DEFAULT 'supabase',
        supabase_url TEXT DEFAULT '',
        supabase_key TEXT DEFAULT '',
        is_auto_sync INTEGER DEFAULT 1,
        sync_interval_seconds INTEGER DEFAULT 60,
        last_sync_timestamp TEXT,
        last_sync_status TEXT,
        last_sync_message TEXT,
        updated_at TEXT NOT NULL
    );
    """)

    cursor.execute("SELECT COUNT(*) as count FROM cloud_sync_settings")
    if cursor.fetchone()['count'] == 0:
        cursor.execute("""
        INSERT INTO cloud_sync_settings (id, provider, supabase_url, supabase_key, is_auto_sync, sync_interval_seconds, updated_at)
        VALUES ('default', 'supabase', '', '', 1, 60, ?)
        """, (datetime.now().isoformat(),))

    # 16. Corporate System Profile Metadata (Admin Configurable)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_profile (
        id TEXT PRIMARY KEY,
        company_name TEXT NOT NULL,
        office_address TEXT NOT NULL,
        helpline_phone TEXT NOT NULL,
        official_email TEXT NOT NULL,
        ntn_number TEXT NOT NULL,
        audit_ref_prefix TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    cursor.execute("SELECT COUNT(*) as count FROM system_profile")
    if cursor.fetchone()['count'] == 0:
        cursor.execute("""
        INSERT INTO system_profile (id, company_name, office_address, helpline_phone, official_email, ntn_number, audit_ref_prefix, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "default_profile",
            "DS MAINTENANCE",
            "Office No. 907, 9th Floor, Dominion Business Center 01, Jinnah Avenue, Bahria Town Karachi (BTK)",
            "+92 21 111-DS-MAINT",
            "accounts@dsmaintenance.pk",
            "9028471-4",
            "DSM/AUDIT/2026/REP-8821",
            datetime.now().isoformat()
        ))

    # Safe Auto-Migrations for New Features
    try:
        cursor.execute("ALTER TABLE gas_deliveries ADD COLUMN transaction_type TEXT DEFAULT 'REFILL';")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE maintenance_jobs ADD COLUMN customer_name TEXT;")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE maintenance_jobs ADD COLUMN customer_phone TEXT;")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE maintenance_jobs ADD COLUMN receipt_number TEXT;")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE visitor_logs ADD COLUMN total_persons INTEGER DEFAULT 1;")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE visitor_logs ADD COLUMN accompanying_details TEXT;")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE visitor_logs ADD COLUMN document_filename TEXT;")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE tenants ADD COLUMN document_filename TEXT;")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE domestic_staff ADD COLUMN document_filename TEXT;")
    except sqlite3.OperationalError:
        pass

    # High-Performance Indexes for Instant Queries
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_flats_building ON flats (building_id);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_flats_number ON flats (building_id, flat_number);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_tenants_building ON tenants (building_id, status);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_visitor_building_status ON visitor_logs (building_id, status);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_visitor_entry ON visitor_logs (entry_time);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ledger_building_date ON accounts_ledger (building_id, entry_date);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ledger_ref ON accounts_ledger (reference_id, category);")

    conn.commit()

    # Seed initial buildings and accounts ONLY ONCE if database is completely brand new
    cursor.execute("SELECT COUNT(*) as count FROM buildings")
    if cursor.fetchone()['count'] == 0:
        now = datetime.now().isoformat()
        buildings_data = [
            (str(uuid.uuid4()), 1, "Building 01 [Ocean Tower]", "Plot 101, Main Boulevard, Sector A", 0, 3450.0, 5000.0, now),
            (str(uuid.uuid4()), 2, "Building 02 [Marina Heights]", "Plot 204, Avenue Central, Sector B", 0, 3450.0, 5500.0, now),
            (str(uuid.uuid4()), 3, "Building 03 [Palm Residency]", "Plot 305, Lake View Road, Sector C", 0, 3450.0, 5000.0, now),
            (str(uuid.uuid4()), 4, "Building 04 [Crystal Plaza]", "Plot 412, Commercial Hub, Sector D", 0, 3450.0, 6000.0, now),
            (str(uuid.uuid4()), 5, "Building 05 [Sapphire Bay]", "Plot 515, Coastal Avenue, Sector E", 0, 3450.0, 5500.0, now),
        ]
        cursor.executemany("""
        INSERT INTO buildings (id, building_code, name, address, total_flats, gas_rate_per_cylinder, monthly_maintenance_rate, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, buildings_data)

        # Seed Bank Accounts
        bank_data = [
            (str(uuid.uuid4()), "Meezan Bank", "DS Maintenance Services PVT", "01020304050607", "PK92MEZN0001020304050607", "0102", 1, now),
            (str(uuid.uuid4()), "Habib Bank Limited (HBL)", "DS Maintenance Collection A/C", "09876543210123", "PK36HABB0009876543210123", "0987", 1, now),
            (str(uuid.uuid4()), "Bank Alfalah", "DS Operations Account", "55443322110099", "PK55ALFH0055443322110099", "5544", 1, now),
            (str(uuid.uuid4()), "Faysal Bank Islamic", "DS Building Maintenance", "11223344556677", "PK12FAYS0011223344556677", "1122", 1, now),
        ]
        cursor.executemany("""
        INSERT INTO bank_accounts (id, bank_name, account_title, account_number, iban, branch_code, is_active, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, bank_data)

        # Fetch inserted buildings
        cursor.execute("SELECT id, building_code, name FROM buildings ORDER BY building_code ASC")
        bldgs = cursor.fetchall()

        # Seed Admin User
        admin_pass = hash_password("ADMIN123")
        admin_id = str(uuid.uuid4())
        cursor.execute("""
        INSERT INTO users (id, username, password_hash, full_name, phone, role, assigned_building_id, is_active, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (admin_id, "ADMIN", admin_pass, "Master System Administrator", "0300-1122334", "MASTER_ADMIN", None, 1, now))

        # Seed 5 Receptionist Users with distinct logins
        for b in bldgs:
            b_code = b['building_code']
            b_id = b['id']
            rec_user = f"Receptionist_{b_code:02d}"
            rec_pass = hash_password(f"bldg{b_code}pass")
            rec_name = f"Receptionist Bldg {b_code}"
            cursor.execute("""
            INSERT INTO users (id, username, password_hash, full_name, phone, role, assigned_building_id, is_active, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (str(uuid.uuid4()), rec_user, rec_pass, rec_name, f"0300-88000{b_code}", "RECEPTIONIST", b_id, 1, now))

            # Initialize Gas Inventory summary
            cursor.execute("""
            INSERT INTO gas_inventory_summary (building_id, reserve_stock, active_in_apartments, empty_returned, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """, (b_id, 0, 0, 0, now))

        conn.commit()

    ensure_building_managers(conn)

    conn.close()
    sync_ledger_expenses()
    return True

# Fixed namespace so every PC generates the SAME manager id for the same building
# (prevents duplicate manager rows when data is merged via cloud sync / .dsmync).
MANAGER_ID_NAMESPACE = uuid.UUID('6f1c2d3e-4b5a-4c6d-8e7f-90a1b2c3d4e5')

def ensure_building_managers(conn):
    """Creates one MANAGER account per building if that building has no manager yet.
    Default login: Manager_XX / mgrXpass  (e.g. Manager_01 / mgr1pass)."""
    cursor = conn.cursor()
    cursor.execute("SELECT id, building_code FROM buildings ORDER BY building_code ASC")
    now = datetime.now().isoformat()
    for b in cursor.fetchall():
        b_id, b_code = b['id'], b['building_code']
        cursor.execute("SELECT 1 FROM users WHERE role = 'MANAGER' AND assigned_building_id = ?", (b_id,))
        if cursor.fetchone():
            continue
        username = f"Manager_{b_code:02d}"
        cursor.execute("SELECT 1 FROM users WHERE LOWER(username) = LOWER(?)", (username,))
        if cursor.fetchone():
            continue
        mgr_id = str(uuid.uuid5(MANAGER_ID_NAMESPACE, f"manager:{b_id}"))
        cursor.execute("""
        INSERT OR IGNORE INTO users (id, username, password_hash, full_name, phone, role, assigned_building_id, is_active, updated_at)
        VALUES (?, ?, ?, ?, ?, 'MANAGER', ?, 1, ?)
        """, (mgr_id, username, hash_password(f"mgr{b_code}pass"), f"Manager Bldg {b_code}", "", b_id, now))
    conn.commit()

def sync_ledger_expenses():
    """Ensure all inward gas supplies and maintenance job parts/labor expenses exist in accounts_ledger."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now_iso = datetime.now().isoformat()

    # 1. Sync Inward Gas Supplies
    cursor.execute("SELECT * FROM gas_inward_supply WHERE total_cost > 0")
    supplies = cursor.fetchall()
    for s in supplies:
        s_dict = dict(s)
        sup_id = s_dict['id']
        cursor.execute("SELECT id FROM accounts_ledger WHERE reference_id = ? AND category = 'Gas Refill Supply Purchase'", (sup_id,))
        if not cursor.fetchone():
            b_id = s_dict['building_id']
            dt = (s_dict['supply_date'] or now_iso)[:10]
            amt = float(s_dict['total_cost'] or 0.0)
            pm = s_dict['payment_mode'] or 'HAND_CASH'
            supplier = s_dict['supplier_name'] or 'Gas Supplier'
            qty = s_dict['quantity'] or 1
            ctype = s_dict['cylinder_type'] or 'Standard'
            cursor.execute("""
            INSERT INTO accounts_ledger (id, building_id, entry_date, category, entry_type, amount, payment_mode, person_name, reference_id, notes, updated_at)
            VALUES (?, ?, ?, 'Gas Refill Supply Purchase', 'EXPENSE', ?, ?, ?, ?, ?, ?)
            """, (str(uuid.uuid4()), b_id, dt, amt, pm, supplier, sup_id, f"Inward supply refill purchase of {qty} {ctype} gas cylinders from {supplier}", now_iso))

    # 2. Sync Maintenance Job Parts & Labor Expenses
    cursor.execute("SELECT * FROM maintenance_jobs WHERE status = 'COMPLETED' AND (parts_cost > 0 OR labor_cost > 0)")
    jobs = cursor.fetchall()
    for j in jobs:
        j_dict = dict(j)
        job_id = j_dict['id']
        b_id = j_dict['building_id']
        dt = (j_dict['job_date'] or now_iso)[:10]
        parts = float(j_dict['parts_cost'] or 0.0)
        labor = float(j_dict['labor_cost'] or 0.0)
        pm = j_dict['payment_mode'] or 'HAND_CASH'
        tech = j_dict['assigned_technician'] or 'Technician'
        flat_num = j_dict['flat_number'] or ''
        category = j_dict['category'] or 'Repair'
        rcpt = j_dict['receipt_number'] or ''

        if parts > 0:
            cursor.execute("SELECT id FROM accounts_ledger WHERE reference_id = ? AND category = 'Spare Parts & Material Purchase'", (job_id,))
            if not cursor.fetchone():
                cursor.execute("""
                INSERT INTO accounts_ledger (id, building_id, entry_date, category, entry_type, amount, payment_mode, person_name, reference_id, receipt_number, notes, updated_at)
                VALUES (?, ?, ?, 'Spare Parts & Material Purchase', 'EXPENSE', ?, ?, ?, ?, ?, ?, ?)
                """, (str(uuid.uuid4()), b_id, dt, parts, pm, tech, job_id, rcpt, f"Spare parts & hardware purchase for Flat {flat_num} repair ({category})", now_iso))

        if labor > 0:
            cursor.execute("SELECT id FROM accounts_ledger WHERE reference_id = ? AND category = 'Technician Labor Charges'", (job_id,))
            if not cursor.fetchone():
                cursor.execute("""
                INSERT INTO accounts_ledger (id, building_id, entry_date, category, entry_type, amount, payment_mode, person_name, reference_id, receipt_number, notes, updated_at)
                VALUES (?, ?, ?, 'Technician Labor Charges', 'EXPENSE', ?, ?, ?, ?, ?, ?, ?)
                """, (str(uuid.uuid4()), b_id, dt, labor, pm, tech, job_id, rcpt, f"Technician/Plumber labor fee paid for Flat {flat_num} repair ({tech})", now_iso))

    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_database()
    print("Database updated and verified successfully at:", DB_PATH)
