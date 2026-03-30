"""
Bootstrap script to create the initial admin user.
Run with: python setup_admin.py
"""
from app.db.user_store import UserStore
from app.services.auth_service import hash_password

store = UserStore("users.db")

# Check if admin already exists
existing = store.get_by_email("admin@lunar.com")
if existing:
    print(f"Admin user already exists: {existing.email}")
else:
    admin = store.create_user(
        email="admin@lunar.com",
        username="Admin",
        hashed_password=hash_password("changeme"),
        is_admin=True,
    )
    print(f"Admin created: {admin.email} (id={admin.id})")
