"""
Tạo tài khoản admin. Chạy: python scripts/create_admin.py <email> <password> [username]
"""
import os
import sys
import uuid
import sqlite3
from datetime import datetime

# Resolve path to backend root
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
DB_PATH = os.environ.get("USER_DB_PATH", os.path.join(BACKEND_DIR, "users.db"))


def _get_hash_func():
    """Use bcrypt directly — same algorithm as auth_service.py."""
    import bcrypt
    def hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    return hash_password


def create_users_table(conn: sqlite3.Connection):
    """Create the users + schema_version table if they don't exist yet."""
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)"
    )
    row = conn.execute(
        "SELECT version FROM schema_version ORDER BY version DESC LIMIT 1"
    ).fetchone()
    version = row[0] if row else 0

    if version < 1:
        conn.execute(
            """CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                username TEXT NOT NULL,
                hashed_password TEXT NOT NULL,
                is_admin INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                avatar TEXT,
                bio TEXT,
                last_login TEXT
            )"""
        )
        conn.execute(
            "INSERT INTO schema_version VALUES (?, ?)",
            (1, datetime.utcnow().isoformat()),
        )

    if version < 2:
        try:
            conn.execute("ALTER TABLE users ADD COLUMN avatar TEXT")
        except sqlite3.OperationalError:
            pass  # column may already exist
        try:
            conn.execute("ALTER TABLE users ADD COLUMN bio TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute("ALTER TABLE users ADD COLUMN last_login TEXT")
        except sqlite3.OperationalError:
            pass
        try:
            conn.execute(
                "INSERT INTO schema_version VALUES (?, ?)",
                (2, datetime.utcnow().isoformat()),
            )
        except sqlite3.IntegrityError:
            pass

    conn.commit()


def main():
    if len(sys.argv) < 3:
        print("Usage: python scripts/create_admin.py <email> <password> [username]")
        print("Example: python scripts/create_admin.py admin@example.com secretpass123 Admin")
        sys.exit(1)

    email = sys.argv[1]
    password = sys.argv[2]
    username = sys.argv[3] if len(sys.argv) > 3 else email.split("@")[0]

    # Import bcrypt hash function from auth_service
    hash_password = _get_hash_func()

    conn = sqlite3.connect(DB_PATH)
    create_users_table(conn)

    # Check if email already exists
    row = conn.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
    if row:
        print(f"User with email '{email}' already exists.")
        conn.close()
        sys.exit(1)

    user_id = str(uuid.uuid4())
    hashed = hash_password(password)
    created_at = datetime.utcnow().isoformat()

    conn.execute(
        """INSERT INTO users
           (id, email, username, hashed_password, is_admin, created_at, avatar, bio, last_login)
           VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL)""",
        (user_id, email, username, hashed, 1, created_at),
    )
    conn.commit()
    conn.close()

    print(f"Admin account created:")
    print(f"  Email:    {email}")
    print(f"  Username: {username}")
    print(f"  Password: {password}")
    print(f"\nYou can now log in at http://localhost:5173")


if __name__ == "__main__":
    main()
