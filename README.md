# DS Maintenance Suite - Resident Pro

Enterprise Facility Management & Multi-Building Operations Suite with Offline-First Architecture, Building Manager Hierarchical Controls, and Live Supabase Cloud Synchronization.

---

## 🌟 Key Features

1. **Multi-Role Security Hierarchy**:
   - **Master Administrator**: Full access across all 5 buildings, consolidated Master Admin Cockpit, executive dossiers, company profile & accounts.
   - **Building Manager (1 per building)**: Complete building-level authority over apartments, tenant registry, owner contacts, visitor logs, domestic staff/maids, gas logistics, repairs & ledger expenses. Can generate building executive reports and create/manage building receptionists. *(Master Admin multi-building console is restricted).*
   - **Receptionist Desk**: Front desk operational check-ins, guest logging, gas deliveries, customer receipts.

2. **Supabase Cloud Live Synchronization**:
   - Zero-dependency REST-based bidirectional sync (Push local updates & Pull cloud changes).
   - Real-time cloud storage with PostgreSQL database.
   - Offline-First: App runs 100% offline; syncs automatically once internet connectivity is restored.

3. **Multi-Building Portfolio**:
   - Building 01 [Ocean Tower]
   - Building 02 [Marina Heights]
   - Building 03 [Palm Residency]
   - Building 04 [Crystal Plaza]
   - Building 05 [Sapphire Bay]

---

## ⚡ Supabase Setup Instructions

1. Log into your [Supabase Dashboard](https://supabase.com).
2. Create a new project or select an existing one.
3. Open the **SQL Editor** on the left menu.
4. Copy and paste the contents of `supabase_schema.sql` into the SQL Editor and click **Run**.
5. Go to **Project Settings &rarr; API**:
   - Copy your **Project URL** (`https://<project-ref>.supabase.co`).
   - Copy your **Project API Key** (`anon` or `service_role`).
6. In DS Maintenance, click the **⚡ Supabase Cloud** button in the header.
7. Paste your URL and API Key, test the connection, and click **Save Settings** & **Sync Now**.

---

## 🚀 Running the Application

### Option A: Launcher Script
Double-click `Start_DS_Maintenance.bat` or run:
```bat
Start_DS_Maintenance.bat
```

### Option B: Python Server
```bash
python app.py
```
Then open `http://127.0.0.1:58920` in any modern browser.

---

## 👥 Default Credentials

| Role | Username | Password | Assigned Scope |
|---|---|---|---|
| Master Admin | `ADMIN` | `ADMIN123` | All 5 Buildings |
| Manager (Bldg 1) | `Manager_01` | `mgr1pass` | Building 01 |
| Manager (Bldg 2) | `Manager_02` | `mgr2pass` | Building 02 |
| Manager (Bldg 3) | `Manager_03` | `mgr3pass` | Building 03 |
| Manager (Bldg 4) | `Manager_04` | `mgr4pass` | Building 04 |
| Manager (Bldg 5) | `Manager_05` | `mgr5pass` | Building 05 |
| Receptionist | `Receptionist_01` | `bldg1pass` | Building 01 |
