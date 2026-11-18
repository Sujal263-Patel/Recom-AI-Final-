from collections.abc import Generator

from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import PROJECT_ROOT, settings


def _sqlite_url(url: str) -> str:
    """Resolve a relative SQLite path against the project folder, not the current directory."""
    path = url[len("sqlite:///"):]
    if path and path != ":memory:" and not Path(path).is_absolute():
        resolved = (PROJECT_ROOT / path).resolve()
        resolved.parent.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{resolved.as_posix()}"
    return url


if settings.database_url.startswith("sqlite"):
    engine = create_engine(_sqlite_url(settings.database_url), connect_args={"check_same_thread": False}, pool_pre_ping=True)
else:
    engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


# Lightweight additive migrations for columns added after a table already
# exists (create_all only creates missing tables, never alters columns).
_ADDITIVE_COLUMNS: dict[str, dict[str, str]] = {
    "uploads": {
        "visible_to_client": "BOOLEAN NOT NULL DEFAULT false",
        "category": "VARCHAR(40) NOT NULL DEFAULT 'invoice'",
        "document_type": "VARCHAR(50) DEFAULT 'TAX_INVOICE'",
        "gstin": "VARCHAR(20) DEFAULT ''",
        "financial_year": "VARCHAR(20) DEFAULT ''",
        "tax_periods": "VARCHAR(255) DEFAULT ''",
        "period_warnings": "TEXT DEFAULT '[]'",
        "gstin_verification_status": "VARCHAR(40) DEFAULT 'valid'",
        "object_key": "VARCHAR(500) DEFAULT ''",
        "status": "VARCHAR(40) DEFAULT 'received'",
        "validation_errors": "TEXT DEFAULT '[]'",
        "parsed_rows": "INTEGER DEFAULT 0",
        "is_reupload": "BOOLEAN DEFAULT false",
        "reupload_invoice_id": "VARCHAR(80) DEFAULT ''",
        "reupload_note": "TEXT DEFAULT ''",
        "extracted_json": "TEXT DEFAULT ''",
        "processed_at": "TIMESTAMP",
        "file_sha256": "VARCHAR(64) DEFAULT ''",
    },
    "invoices": {
        "recipient_gstin": "VARCHAR(20) DEFAULT ''",
        "cgst": "FLOAT DEFAULT 0",
        "sgst": "FLOAT DEFAULT 0",
        "igst": "FLOAT DEFAULT 0",
        "source_document_type": "VARCHAR(50) DEFAULT 'TAX_INVOICE'",
        "tax_period": "VARCHAR(50) DEFAULT ''",
        "period_warning": "VARCHAR(255) DEFAULT ''",
        "validation_flags": "TEXT DEFAULT '{}'",
        "reupload_status": "VARCHAR(40) DEFAULT ''",
        "reupload_note": "TEXT DEFAULT ''",
        "reuploaded_at": "TIMESTAMP",
        "reuploaded_file_name": "VARCHAR(255) DEFAULT ''",
        "duplicate_count": "INTEGER DEFAULT 0",
        "itc_status": "VARCHAR(20) DEFAULT ''",
        "itc_decided_at": "TIMESTAMP",
        "itc_decided_by": "VARCHAR(80) DEFAULT ''",
        "itc_reject_reason": "TEXT DEFAULT ''",
    },
    "fraud_alerts": {
        "reupload_status": "VARCHAR(40) DEFAULT ''",
        "reupload_note": "TEXT DEFAULT ''",
    },
    "users": {
        "email_verified": "BOOLEAN DEFAULT false",
    },
    "clients": {
        "gst_legal_name": "VARCHAR(255) DEFAULT ''",
        "gst_trade_name": "VARCHAR(255) DEFAULT ''",
        "gst_status": "VARCHAR(80) DEFAULT ''",
        "gst_details_json": "TEXT DEFAULT '{}'",
        "gst_verified_at": "TIMESTAMP",
    },
}


def ensure_schema() -> None:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    for table, columns in _ADDITIVE_COLUMNS.items():
        if table not in existing_tables:
            continue
        present = {col["name"] for col in inspector.get_columns(table)}
        for name, ddl in columns.items():
            if name in present:
                continue
            # SQLite doesn't accept "NOT NULL DEFAULT false" cleanly on ALTER; use 0.
            column_ddl = ddl.replace("false", "0") if engine.dialect.name == "sqlite" else ddl
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {column_ddl}"))

    with engine.begin() as conn:
        try:
            conn.execute(text("UPDATE users SET email = 'taxofficer.demo@reconai.local', name = 'Tax Officer Demo', firm_name = 'ReconAI Tax Office' WHERE email = 'ca.demo@reconai.local'"))
        except Exception:
            pass
        try:
            to_user = conn.execute(text("SELECT id FROM users WHERE role = 'ca' LIMIT 1")).fetchone()
            to_id = to_user[0] if to_user else "usr_to_demo"
            count = conn.execute(text("SELECT count(*) FROM assistant_chat_logs")).scalar()
            if count == 0:
                conn.execute(text(f"""
                    INSERT INTO assistant_chat_logs (id, user_id, user_name, user_email, user_role, question, answer, engine, tools_used, refused, created_at)
                    VALUES 
                    ('chat_seed_1', '{to_id}', 'Tax Officer Demo', 'taxofficer.demo@reconai.local', 'ca', 'What were last month''s ITC claims for all my clients?', 'Across all active clients in your portfolio for the last period, total eligible Input Tax Credit claimed is ₹14,82,450. ₹2,26,466.40 remains at risk due to invoices missing in GSTR-2B filings.', 'gemini-1.5-pro', '["get_reconciliation_summary", "get_itc_breakdown"]', 0, CURRENT_TIMESTAMP),
                    ('chat_seed_2', '{to_id}', 'Tax Officer Demo', 'taxofficer.demo@reconai.local', 'ca', 'Show open high-risk fraud alerts and circular trading rings', 'There is 1 Critical anomaly flagged for Suraksha Fabricators Pvt Ltd (Invoice SPE/26-27/0017) with ₹2,26,466.40 ITC at stake. 1 circular trading loop was detected involving 3 counterparty nodes with suspicious round-tripping volume.', 'gemini-1.5-pro', '["get_fraud_alerts", "detect_circular_trading"]', 0, CURRENT_TIMESTAMP)
                """))
        except Exception:
            pass
