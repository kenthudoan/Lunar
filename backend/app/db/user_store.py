# backend/app/db/user_store.py
import sqlite3
import uuid
from dataclasses import dataclass
from datetime import datetime
from threading import Lock


@dataclass
class User:
    id: str
    email: str
    username: str
    hashed_password: str
    is_admin: bool
    created_at: str
    avatar: str | None = None
    bio: str | None = None
    last_login: str | None = None


class UserStore:
    SCHEMA_VERSION = 2

    _MIGRATIONS = {
        1: [
            """CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                username TEXT NOT NULL,
                hashed_password TEXT NOT NULL,
                is_admin INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            )""",
        ],
        2: [
            """ALTER TABLE users ADD COLUMN avatar TEXT""",
            """ALTER TABLE users ADD COLUMN bio TEXT""",
            """ALTER TABLE users ADD COLUMN last_login TEXT""",
        ],
    }

    def __init__(self, db_path: str = "users.db"):
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        self._lock = Lock()
        self._migrate()

    def _get_schema_version(self) -> int:
        try:
            row = self._conn.execute(
                "SELECT version FROM schema_version ORDER BY version DESC LIMIT 1"
            ).fetchone()
            return row[0] if row else 0
        except sqlite3.OperationalError:
            return 0

    def _migrate(self):
        with self._lock:
            self._conn.execute(
                "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)"
            )
            current = self._get_schema_version()
            for version in sorted(self._MIGRATIONS.keys()):
                if version <= current:
                    continue
                for sql in self._MIGRATIONS[version]:
                    self._conn.execute(sql)
                self._conn.execute(
                    "INSERT INTO schema_version VALUES (?, ?)",
                    (version, datetime.utcnow().isoformat()),
                )
            self._conn.commit()

    def create_user(self, email: str, username: str, hashed_password: str, is_admin: bool = False) -> User:
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            username=username,
            hashed_password=hashed_password,
            is_admin=is_admin,
            created_at=datetime.utcnow().isoformat(),
            avatar=None,
            bio=None,
            last_login=None,
        )
        with self._lock:
            self._conn.execute(
                "INSERT INTO users (id, email, username, hashed_password, is_admin, created_at, avatar, bio, last_login) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (user.id, user.email, user.username, user.hashed_password, int(user.is_admin), user.created_at, user.avatar, user.bio, user.last_login),
            )
            self._conn.commit()
        return user

    def get_by_email(self, email: str) -> "User | None":
        row = self._conn.execute(
            "SELECT id, email, username, hashed_password, is_admin, created_at, avatar, bio, last_login FROM users WHERE email=?",
            (email,),
        ).fetchone()
        if not row:
            return None
        return User(row[0], row[1], row[2], row[3], bool(row[4]), row[5], row[6], row[7], row[8])

    def get_by_id(self, user_id: str) -> "User | None":
        row = self._conn.execute(
            "SELECT id, email, username, hashed_password, is_admin, created_at, avatar, bio, last_login FROM users WHERE id=?",
            (user_id,),
        ).fetchone()
        if not row:
            return None
        return User(row[0], row[1], row[2], row[3], bool(row[4]), row[5], row[6], row[7], row[8])

    def list_users(self, limit: int = 50, offset: int = 0) -> "list[User]":
        rows = self._conn.execute(
            "SELECT id, email, username, hashed_password, is_admin, created_at, avatar, bio, last_login "
            "FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (limit, offset),
        ).fetchall()
        return [User(r[0], r[1], r[2], r[3], bool(r[4]), r[5], r[6], r[7], r[8]) for r in rows]

    def count_users(self) -> int:
        row = self._conn.execute("SELECT COUNT(*) FROM users").fetchone()
        return row[0] if row else 0

    def delete_user(self, user_id: str) -> bool:
        with self._lock:
            cursor = self._conn.execute("DELETE FROM users WHERE id=?", (user_id,))
            self._conn.commit()
            return cursor.rowcount > 0

    def update_user(self, user_id: str, username: str | None = None, bio: str | None = None, avatar: str | None = None) -> "User | None":
        user = self.get_by_id(user_id)
        if not user:
            return None
        with self._lock:
            self._conn.execute(
                "UPDATE users SET username=?, bio=?, avatar=? WHERE id=?",
                (username if username is not None else user.username, bio if bio is not None else user.bio, avatar if avatar is not None else user.avatar, user_id),
            )
            self._conn.commit()
        return self.get_by_id(user_id)

    def update_password(self, user_id: str, hashed_password: str) -> bool:
        with self._lock:
            cursor = self._conn.execute("UPDATE users SET hashed_password=? WHERE id=?", (hashed_password, user_id))
            self._conn.commit()
            return cursor.rowcount > 0

    def update_last_login(self, user_id: str):
        now = datetime.utcnow().isoformat()
        with self._lock:
            self._conn.execute("UPDATE users SET last_login=? WHERE id=?", (now, user_id))
            self._conn.commit()

    def email_exists(self, email: str) -> bool:
        row = self._conn.execute("SELECT 1 FROM users WHERE email=?", (email,)).fetchone()
        return row is not None

    def close(self):
        self._conn.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
        return False
