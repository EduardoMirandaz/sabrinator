import json, os, uuid
from datetime import datetime, timedelta
from typing import Optional
from config import USERS_JSON, INVITES_JSON, BR_TZ, JWT_SECRET, JWT_ALG
import hashlib

def hash_password(p: str) -> str:
    return hashlib.sha256(p.encode('utf-8')).hexdigest()

def verify_password(p: str, h: str) -> bool:
    try:
        return hashlib.sha256(p.encode('utf-8')).hexdigest() == h
    except Exception:
        return False
import jwt

def _load(path):
    try:
        with open(path, 'r') as f:
            return json.load(f)
    except Exception:
        return []

def _save(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)

def create_invite(max_uses=1, expires_hours=24) -> dict:
    invites = _load(INVITES_JSON)
    token = str(uuid.uuid4())
    expires_at = (datetime.now(BR_TZ) + timedelta(hours=expires_hours)).isoformat()
    inv = {"token": token, "expires_at": expires_at, "used": False, "max_uses": max_uses, "uses": 0}
    invites.append(inv)
    _save(INVITES_JSON, invites)
    return inv

def list_invites() -> list:
    invites = _load(INVITES_JSON)
    return invites

def revoke_invite(token: str) -> bool:
    invites = _load(INVITES_JSON)
    new_invites = [i for i in invites if i.get('token') != token]
    if len(new_invites) == len(invites):
        return False
    _save(INVITES_JSON, new_invites)
    return True

def register_user(invite_token: str, username: str, name: str, phone: str, password: str) -> Optional[dict]:
    invites = _load(INVITES_JSON)
    now = datetime.now(BR_TZ)
    inv = next((i for i in invites if i['token'] == invite_token), None)
    if not inv:
        return None
    if inv['uses'] >= inv['max_uses']:
        return None
    try:
        if datetime.fromisoformat(inv['expires_at']) < now:
            return None
    except Exception:
        return None
    users = _load(USERS_JSON)
    if any(u['username'] == username for u in users):
        return None
    uid = str(uuid.uuid4())
    user = {
        "id": uid,
        "username": username,
        "role": "user",
        "created_at": now.isoformat(),
        "name": name[:30],
        "phone": phone[:20],
        "password_hash": hash_password(password[:30]),
    }
    users.append(user)
    _save(USERS_JSON, users)
    inv['uses'] += 1
    inv['used'] = inv['uses'] >= inv['max_uses']
    _save(INVITES_JSON, invites)
    return user

def login_user(username: str, password: str) -> Optional[str]:
    users = _load(USERS_JSON)
    user = next((u for u in users if u['username'] == username), None)
    if not user:
        return None
    if not verify_password(password, user.get('password_hash', '')):
        return None
    payload = {"sub": user['id'], "username": user['username'], "role": user['role']}
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)
    return token

def get_user_by_id(user_id: str) -> Optional[dict]:
    users = _load(USERS_JSON)
    return next((u for u in users if u['id'] == user_id), None)

def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        return None

def ensure_admin(username: str, password: str, name: str, phone: str) -> dict:
    users = _load(USERS_JSON)
    admin = next((u for u in users if u['role'] == 'admin' and u['username'] == username), None)
    if admin:
        return admin
    now = datetime.now(BR_TZ)
    admin = {
        "id": str(uuid.uuid4()),
        "username": username,
        "role": "admin",
        "created_at": now.isoformat(),
        "name": name[:30],
        "phone": phone[:20],
        "password_hash": hash_password(password[:30]),
    }
    users.append(admin)
    _save(USERS_JSON, users)
    return admin
