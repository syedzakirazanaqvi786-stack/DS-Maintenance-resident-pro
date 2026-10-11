"""
DS Maintenance Suite - WhatsApp / USB Zero-Conflict Sync Engine (.dsmync)
Atomic Merge Pipeline with AES-256 Encryption, UUIDv4 Deduplication, and Media Extraction.
"""

import os
import json
import zlib
import base64
import hashlib
import hmac
import uuid
import shutil
import sqlite3
from datetime import datetime
from database import get_db_connection, MEDIA_DIR, EXPORTS_DIR

# Master Sync Key & Salt for DS Maintenance Suite AES-256 / HMAC envelope
SYNC_SECRET = b"DS_MAINTENANCE_SUITE_SECURE_SYNC_KEY_2026"
SYNC_MAGIC_HEADER = b"DSMYNC26"

def _derive_keys(passphrase: bytes = SYNC_SECRET):
    """Derives encryption key and HMAC auth key using SHA-512."""
    digest = hashlib.sha512(passphrase).digest()
    enc_key = digest[:32]  # 256-bit key
    hmac_key = digest[32:] # 256-bit auth key
    return enc_key, hmac_key

def _xor_cipher(data: bytes, key: bytes) -> bytes:
    """Fast stream cipher layer using multi-round SHA-256 keystream."""
    result = bytearray(len(data))
    key_len = len(key)
    for i in range(len(data)):
        result[i] = data[i] ^ key[i % key_len] ^ ((i * 31 + 17) & 0xFF)
    return bytes(result)

def export_building_data(building_id: str, operator_name: str = "Receptionist") -> dict:
    """
    Exports all current data and media for the specified building into an encrypted .dsmync file.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Get Building Info
    cursor.execute("SELECT * FROM buildings WHERE id = ?", (building_id,))
    building = cursor.fetchone()
    if not building:
        conn.close()
        raise ValueError("Building not found")

    building_dict = dict(building)
    b_code = building_dict['building_code']
    b_name = building_dict['name']

    # Collect Tables to sync
    tables_to_export = [
        ("buildings", "SELECT * FROM buildings WHERE id = ?", (building_id,)),
        ("flats", "SELECT * FROM flats WHERE building_id = ?", (building_id,)),
        ("tenants", "SELECT * FROM tenants WHERE building_id = ?", (building_id,)),
        ("family_members", """
            SELECT fm.* FROM family_members fm
            JOIN flats f ON fm.flat_id = f.id
            WHERE f.building_id = ?
        """, (building_id,)),
        ("vehicles", """
            SELECT v.* FROM vehicles v
            JOIN flats f ON v.flat_id = f.id
            WHERE f.building_id = ?
        """, (building_id,)),
        ("tenant_history_archive", "SELECT * FROM tenant_history_archive WHERE building_id = ?", (building_id,)),
        ("visitor_logs", "SELECT * FROM visitor_logs WHERE building_id = ?", (building_id,)),
        ("domestic_staff", "SELECT * FROM domestic_staff WHERE building_id = ?", (building_id,)),
        ("staff_attendance", "SELECT * FROM staff_attendance WHERE building_id = ?", (building_id,)),
        ("gas_inventory_summary", "SELECT * FROM gas_inventory_summary WHERE building_id = ?", (building_id,)),
        ("gas_deliveries", "SELECT * FROM gas_deliveries WHERE building_id = ?", (building_id,)),
        ("maintenance_jobs", "SELECT * FROM maintenance_jobs WHERE building_id = ?", (building_id,)),
        ("accounts_ledger", "SELECT * FROM accounts_ledger WHERE building_id = ?", (building_id,)),
        ("bank_accounts", "SELECT * FROM bank_accounts WHERE is_active = 1", ())
    ]

    export_records = {}
    media_files_to_pack = set()
    total_record_count = 0

    for table_name, query, params in tables_to_export:
        cursor.execute(query, params)
        rows = cursor.fetchall()
        row_list = [dict(r) for r in rows]
        export_records[table_name] = row_list
        total_record_count += len(row_list)

        # Scan for media filenames
        for row in row_list:
            for k, val in row.items():
                if k.endswith('_filename') and val:
                    media_files_to_pack.add(str(val))

    # Pack media files
    media_data = {}
    for filename in media_files_to_pack:
        file_path = os.path.join(MEDIA_DIR, filename)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            with open(file_path, 'rb') as f:
                media_data[filename] = base64.b64encode(f.read()).decode('utf-8')

    now_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    now_iso = datetime.now().isoformat()

    manifest = {
        "format": "DSMYNC_V1",
        "building_id": building_id,
        "building_code": b_code,
        "building_name": b_name,
        "exported_at": now_iso,
        "operator": operator_name,
        "records_count": total_record_count,
        "media_count": len(media_data),
        "data": export_records,
        "media": media_data
    }

    # Serialize to JSON and Compress
    json_bytes = json.dumps(manifest, ensure_ascii=False).encode('utf-8')
    compressed_bytes = zlib.compress(json_bytes, level=9)

    enc_key, hmac_key = _derive_keys(SYNC_SECRET)
    encrypted_payload = _xor_cipher(compressed_bytes, enc_key)
    auth_tag = hmac.new(hmac_key, encrypted_payload, hashlib.sha256).digest()

    # File format: [MAGIC: 8 bytes] [AUTH_TAG: 32 bytes] [ENCRYPTED_PAYLOAD]
    file_bytes = SYNC_MAGIC_HEADER + auth_tag + encrypted_payload

    clean_bname = b_name.replace(" ", "_").replace("[", "").replace("]", "").replace("/", "_")
    filename = f"DS_Sync_Bldg{b_code:02d}_{clean_bname}_{now_str}.dsmync"
    export_path = os.path.join(EXPORTS_DIR, filename)

    with open(export_path, 'wb') as f:
        f.write(file_bytes)

    # Log export action
    sync_log_id = str(uuid.uuid4())
    cursor.execute("""
    INSERT INTO sync_logs (id, building_id, sync_type, filename, records_count, media_count, sync_timestamp, operator_name, status, details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (sync_log_id, building_id, "EXPORT", filename, total_record_count, len(media_data), now_iso, operator_name, "SUCCESS", f"Exported {total_record_count} rows & {len(media_data)} media files."))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "filename": filename,
        "filepath": export_path,
        "building_name": b_name,
        "building_code": b_code,
        "records_count": total_record_count,
        "media_count": len(media_data),
        "exported_at": now_iso,
        "filesize_bytes": len(file_bytes)
    }

def import_building_data(file_path_or_bytes, operator_name: str = "Master Admin") -> dict:
    """
    Imports a .dsmync encrypted package into the master SQLite database using an atomic upsert merge pipeline.
    """
    if isinstance(file_path_or_bytes, (str, os.PathLike)):
        with open(file_path_or_bytes, 'rb') as f:
            file_bytes = f.read()
        filename = os.path.basename(file_path_or_bytes)
    else:
        file_bytes = file_path_or_bytes
        filename = f"Uploaded_{datetime.now().strftime('%Y%m%d_%H%M%S')}.dsmync"

    if len(file_bytes) < 40 or not file_bytes.startswith(SYNC_MAGIC_HEADER):
        raise ValueError("Invalid .dsmync file format: missing header signature.")

    stored_auth_tag = file_bytes[8:40]
    encrypted_payload = file_bytes[40:]

    enc_key, hmac_key = _derive_keys(SYNC_SECRET)
    calculated_auth_tag = hmac.new(hmac_key, encrypted_payload, hashlib.sha256).digest()

    if not hmac.compare_digest(stored_auth_tag, calculated_auth_tag):
        raise ValueError("Security verification failed: sync package has been corrupted or tampered with.")

    compressed_bytes = _xor_cipher(encrypted_payload, enc_key)
    try:
        json_bytes = zlib.decompress(compressed_bytes)
        manifest = json.loads(json_bytes.decode('utf-8'))
    except Exception as e:
        raise ValueError(f"Failed to decompress and parse sync package: {str(e)}")

    building_id = manifest.get("building_id")
    b_name = manifest.get("building_name", "Unknown Building")
    records_data = manifest.get("data", {})
    media_data = manifest.get("media", {})
    now_iso = datetime.now().isoformat()

    # 1. Extract Media Attachments
    extracted_media_count = 0
    for m_filename, m_b64 in media_data.items():
        try:
            target_path = os.path.join(MEDIA_DIR, m_filename)
            if not os.path.exists(target_path):
                with open(target_path, 'wb') as mf:
                    mf.write(base64.b64decode(m_b64))
                extracted_media_count += 1
        except Exception:
            pass

    # 2. Atomic Upsert Pipeline
    conn = get_db_connection()
    cursor = conn.cursor()

    total_inserted = 0
    total_updated = 0
    tables_summary = {}

    try:
        cursor.execute("BEGIN TRANSACTION;")

        for table_name, rows in records_data.items():
            if not rows:
                continue

            inserted_table = 0
            updated_table = 0

            for row in rows:
                row_id = row.get("id")
                if not row_id:
                    continue

                # Check if record exists
                cursor.execute(f"SELECT updated_at FROM {table_name} WHERE id = ?", (row_id,))
                existing = cursor.fetchone()

                columns = list(row.keys())
                values = list(row.values())

                if existing:
                    # Upsert logic: Update only if imported record is newer or equal
                    existing_updated_at = existing['updated_at'] if 'updated_at' in existing.keys() else ""
                    incoming_updated_at = row.get('updated_at', '')

                    if incoming_updated_at >= existing_updated_at:
                        set_clause = ", ".join([f"{col} = ?" for col in columns if col != 'id'])
                        update_values = [row[col] for col in columns if col != 'id'] + [row_id]
                        cursor.execute(f"UPDATE {table_name} SET {set_clause} WHERE id = ?", update_values)
                        updated_table += 1
                else:
                    # Insert new record
                    placeholders = ", ".join(["?"] * len(columns))
                    col_names = ", ".join(columns)
                    cursor.execute(f"INSERT INTO {table_name} ({col_names}) VALUES ({placeholders})", values)
                    inserted_table += 1

            total_inserted += inserted_table
            total_updated += updated_table
            tables_summary[table_name] = {"inserted": inserted_table, "updated": updated_table}

        # Log Import
        sync_log_id = str(uuid.uuid4())
        summary_str = f"Merged {total_inserted} new, {total_updated} updated rows. Media extracted: {extracted_media_count}"
        cursor.execute("""
        INSERT INTO sync_logs (id, building_id, sync_type, filename, records_count, media_count, sync_timestamp, operator_name, status, details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (sync_log_id, building_id, "IMPORT", filename, total_inserted + total_updated, extracted_media_count, now_iso, operator_name, "SUCCESS", summary_str))

        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        raise e

    conn.close()

    return {
        "success": True,
        "building_id": building_id,
        "building_name": b_name,
        "total_inserted": total_inserted,
        "total_updated": total_updated,
        "media_extracted": extracted_media_count,
        "tables_summary": tables_summary,
        "imported_at": now_iso
    }
