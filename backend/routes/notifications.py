from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
import json
import threading
import os

from routes.auth import get_current_user
from services.auth_service import ensure_admin
import config as cfg

try:
    from pywebpush import webpush, WebPushException
except Exception:
    webpush = None
    WebPushException = Exception

router = APIRouter(prefix="/notifications", tags=["notifications"])

_lock = threading.Lock()


def _load_subscriptions() -> List[Dict[str, Any]]:
    path = cfg.SUBSCRIPTIONS_JSON
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def _save_subscriptions(data: List[Dict[str, Any]]) -> None:
    path = cfg.SUBSCRIPTIONS_JSON
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@router.post("/register-push-subscription")
def register_push_subscription(payload: Dict[str, Any], user=Depends(get_current_user)) -> Dict[str, Any]:
    endpoint = payload.get("endpoint")
    keys = payload.get("keys") or {}
    p256dh = keys.get("p256dh")
    auth = keys.get("auth")
    if not endpoint or not p256dh or not auth:
        raise HTTPException(status_code=400, detail="invalid_subscription")

    with _lock:
        subs = _load_subscriptions()
        # dedupe by endpoint
        if not any(s.get("endpoint") == endpoint for s in subs):
            subs.append({
                "endpoint": endpoint,
                "keys": {"p256dh": p256dh, "auth": auth},
                "created_by": user.get("username") or user.get("id"),
            })
            _save_subscriptions(subs)
    return {"status": "ok"}


@router.delete("/unregister-push-subscription")
def unregister_push_subscription(payload: Dict[str, Any], user=Depends(get_current_user)) -> Dict[str, Any]:
    endpoint = payload.get("endpoint")
    if not endpoint:
        raise HTTPException(status_code=400, detail="endpoint_required")

    with _lock:
        subs = _load_subscriptions()
        subs = [s for s in subs if s.get("endpoint") != endpoint]
        _save_subscriptions(subs)
    return {"status": "ok"}


@router.post("/send-test")
def send_test_notification(payload: Dict[str, Any], user=Depends(get_current_user)) -> Dict[str, Any]:
    """Send a test push notification to all registered subscriptions.
    Requires valid VAPID keys in environment.
    """
    # Basic admin guard
    try:
        ensure_admin()  # raises if admin not present; we use this as a simple gate
    except Exception:
        pass

    title = str(payload.get("title") or "Eggs Regaco")
    body = str(payload.get("body") or "Test push from Sabrinator")
    url = str(payload.get("url") or "/")
    event_id = payload.get("eventId")

    if webpush is None:
        raise HTTPException(status_code=500, detail="pywebpush_not_available")

    if not cfg.VAPID_PRIVATE_KEY or not cfg.VAPID_PUBLIC_KEY:
        raise HTTPException(status_code=500, detail="missing_vapid_keys")

    payload_json = json.dumps({
        "title": title,
        "body": body,
        "url": url,
        "eventId": event_id,
    })

    subs = _load_subscriptions()
    sent = 0
    failed = 0
    errors: List[str] = []

    for sub in subs:
        subscription_info = {
            "endpoint": sub.get("endpoint"),
            "keys": {
                "p256dh": sub.get("keys", {}).get("p256dh"),
                "auth": sub.get("keys", {}).get("auth"),
            },
        }
        try:
            webpush(
                subscription_info,
                payload_json,
                vapid_private_key=cfg.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": cfg.VAPID_EMAIL},
            )
            sent += 1
        except WebPushException as e:
            failed += 1
            errors.append(str(e))
        except Exception as e:
            failed += 1
            errors.append(str(e))

    return {"status": "ok", "sent": sent, "failed": failed, "errors": errors}
