-- ====================================================================
-- DS MAINTENANCE SUITE — SUPABASE POSTGRESQL CLOUD SCHEMA
-- Open your Supabase Dashboard -> SQL Editor -> New Query
-- Paste this entire script and click 'RUN'.
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

-- 2. Users Table (Master Admin, Managers, Receptionists)
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
    accompany_details TEXT,
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
DROP POLICY IF EXISTS "Allow all for anon on buildings" ON public.buildings;
CREATE POLICY "Allow all for anon on buildings" ON public.buildings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon on users" ON public.users;
CREATE POLICY "Allow all for anon on users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon on bank_accounts" ON public.bank_accounts;
CREATE POLICY "Allow all for anon on bank_accounts" ON public.bank_accounts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon on flats" ON public.flats;
CREATE POLICY "Allow all for anon on flats" ON public.flats FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon on tenants" ON public.tenants;
CREATE POLICY "Allow all for anon on tenants" ON public.tenants FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon on family_members" ON public.family_members;
CREATE POLICY "Allow all for anon on family_members" ON public.family_members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon on vehicles" ON public.vehicles;
CREATE POLICY "Allow all for anon on vehicles" ON public.vehicles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon on tenant_history_archive" ON public.tenant_history_archive;
CREATE POLICY "Allow all for anon on tenant_history_archive" ON public.tenant_history_archive FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon on flat_occupancy_history" ON public.flat_occupancy_history;
CREATE POLICY "Allow all for anon on flat_occupancy_history" ON public.flat_occupancy_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon on visitor_logs" ON public.visitor_logs;
CREATE POLICY "Allow all for anon on visitor_logs" ON public.visitor_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon on domestic_staff" ON public.domestic_staff;
CREATE POLICY "Allow all for anon on domestic_staff" ON public.domestic_staff FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon on staff_attendance" ON public.staff_attendance;
CREATE POLICY "Allow all for anon on staff_attendance" ON public.staff_attendance FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon on gas_inventory_summary" ON public.gas_inventory_summary;
CREATE POLICY "Allow all for anon on gas_inventory_summary" ON public.gas_inventory_summary FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon on gas_deliveries" ON public.gas_deliveries;
CREATE POLICY "Allow all for anon on gas_deliveries" ON public.gas_deliveries FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon on gas_inward_supply" ON public.gas_inward_supply;
CREATE POLICY "Allow all for anon on gas_inward_supply" ON public.gas_inward_supply FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon on maintenance_jobs" ON public.maintenance_jobs;
CREATE POLICY "Allow all for anon on maintenance_jobs" ON public.maintenance_jobs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon on accounts_ledger" ON public.accounts_ledger;
CREATE POLICY "Allow all for anon on accounts_ledger" ON public.accounts_ledger FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for anon on system_profile" ON public.system_profile;
CREATE POLICY "Allow all for anon on system_profile" ON public.system_profile FOR ALL USING (true) WITH CHECK (true);

