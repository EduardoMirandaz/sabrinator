from pydantic import BaseModel, Field
from typing import Optional

class InviteCreateRequest(BaseModel):
    max_uses: int = Field(default=1, ge=1)
    expires_hours: int = Field(default=24, ge=1)

class InviteToken(BaseModel):
    token: str
    expires_at: str
    used: bool = False
    max_uses: int = 1
    uses: int = 0

class RegisterRequest(BaseModel):
    invite_token: str
    username: str
    name: str
    phone: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class User(BaseModel):
    id: str
    username: str
    role: str = 'user'
    created_at: str
    name: str
    phone: str
    password_hash: str

class JWTResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
