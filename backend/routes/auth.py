from fastapi import APIRouter, Depends, Header
from typing import Optional
from schemas.auth import InviteCreateRequest, RegisterRequest, LoginRequest, JWTResponse, User
import os
from services.auth_service import create_invite, list_invites, revoke_invite, register_user, login_user, decode_token, get_user_by_id, ensure_admin

router = APIRouter(prefix="/auth", tags=["auth"])
admin_router = APIRouter(prefix="/admin", tags=["admin"])

@admin_router.post("/invite/create")
def create_invite_endpoint(req: InviteCreateRequest):
    inv = create_invite(max_uses=req.max_uses, expires_hours=req.expires_hours)
    return inv

@admin_router.get("/invites")
def list_invites_endpoint():
    return list_invites()

@admin_router.delete("/invites/{token}")
def revoke_invite_endpoint(token: str):
    ok = revoke_invite(token)
    return {"status": "ok"} if ok else {"error": "not_found"}

@router.post("/register")
def register_endpoint(req: RegisterRequest):
    user = register_user(req.invite_token, req.username, req.name, req.phone, req.password)
    if not user:
        return {"error": "invalid_invite_or_username"}
    return user

@router.get("/validate-invite/{token}")
def validate_invite_endpoint(token: str):
    invites = list_invites()
    inv = next((i for i in invites if i.get("token") == token), None)
    if not inv:
        return {"valid": False, "expiresAt": None}
    try:
        from datetime import datetime
        from config import BR_TZ
        valid = datetime.fromisoformat(inv["expires_at"]) > datetime.now(BR_TZ) and inv.get("uses", 0) < inv.get("max_uses", 1)
    except Exception:
        valid = False
    return {"valid": bool(valid), "expiresAt": inv.get("expires_at")}

@router.post("/login")
def login_endpoint(req: LoginRequest):
    token = login_user(req.username, req.password)
    if not token:
        return {"error": "invalid_credentials"}
    return JWTResponse(access_token=token)

@router.get("/me")
def me_endpoint(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return {"error": "unauthorized"}
    payload = decode_token(authorization.split(" ", 1)[1])
    if not payload:
        return {"error": "unauthorized"}
    user = get_user_by_id(payload.get("sub"))
    return user or {"error": "not_found"}

@admin_router.post("/bootstrap-admin")
def bootstrap_admin():
    # Use provided env or default; allows pre-creating admin with given credentials
    username = os.environ.get("ADMIN_USERNAME", "admin")
    password = os.environ.get("ADMIN_PASSWORD", "admin123")
    name = os.environ.get("ADMIN_NAME", "Admin")
    phone = os.environ.get("ADMIN_PHONE", "+00 00 00000-0000")
    admin = ensure_admin(username=username, password=password, name=name, phone=phone)
    return {"status": "ok", "admin": {"id": admin['id'], "username": admin['username']}}
