from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime, timezone, timedelta
import json
import hashlib
import threading

from routes.auth import get_current_user

BASE_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DIR = BASE_DIR / "processed"
LOG_PATH = PROCESSED_DIR / "egg_changes.json"
TAKERS_LOG_PATH = PROCESSED_DIR / "takers_history.json"
TZ_BR = timezone(timedelta(hours=-3))
_lock = threading.Lock()

router = APIRouter(prefix="/eggs", tags=["eggs"])


def _stable_signature(entry: Dict[str, Any]) -> Dict[str, Any]:
    """Build a signature from immutable fields only so ID doesn't change after verification."""
    before = entry.get("before") or {}
    after = entry.get("after") or {}
    sig = {
        "box_id": entry.get("box_id"),
        "before": {
            "count": before.get("count"),
            "timestamp": before.get("timestamp"),
            "image": Path(before.get("image_path") or "").name if before.get("image_path") else None,
        },
        "after": {
            "count": after.get("count"),
            "timestamp": after.get("timestamp"),
            "image": Path(after.get("image_path") or "").name if after.get("image_path") else None,
        },
    }
    return sig


def _hash_obj(obj: Any) -> str:
    return hashlib.sha1(json.dumps(obj, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()[:24]


def _stable_event_id(entry: Dict[str, Any]) -> str:
    return _hash_obj(_stable_signature(entry))


def _legacy_event_id(entry: Dict[str, Any]) -> str:
    # Legacy used entire entry; keep for backward compatibility
    return _hash_obj(entry)


def _image_url(local_path: Optional[str]) -> Optional[str]:
    if not local_path:
        return None
    return f"/images/{Path(local_path).name}"


def _read_log() -> List[Dict[str, Any]]:
    if not LOG_PATH.exists():
        return []
    try:
        return json.loads(LOG_PATH.read_text(encoding="utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"failed_to_read_log: {e}")


def _write_log(data: List[Dict[str, Any]]) -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    LOG_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _append_takers_log(entry: Dict[str, Any]) -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    existing: List[Dict[str, Any]] = []
    if TAKERS_LOG_PATH.exists():
        try:
            existing = json.loads(TAKERS_LOG_PATH.read_text(encoding="utf-8"))
        except Exception:
            existing = []
    existing.append(entry)
    TAKERS_LOG_PATH.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")


def _normalize(entry: Dict[str, Any]) -> Dict[str, Any]:
    e = dict(entry)
    e["event_id"] = e.get("event_id") or _stable_event_id(e)
    # Normalize before/after image URLs
    if isinstance(e.get("before"), dict):
        e["before"]["image_url"] = _image_url(e["before"].get("image_path"))
    if isinstance(e.get("after"), dict):
        e["after"]["image_url"] = _image_url(e["after"].get("image_path"))
    e.setdefault("egg_taker_verified", False)
    e.setdefault("verified_by_user", None)
    e.setdefault("verification_timestamp", None)
    e.setdefault("mistake_flag", False)
    return e


def _find_event_index_by_id(data: List[Dict[str, Any]], needle_id: str) -> Optional[int]:
    for i, raw in enumerate(data):
        ne = _normalize(raw)
        if ne.get("event_id") == needle_id:
            return i
        # try legacy and stable fallbacks
        if _legacy_event_id(raw) == needle_id:
            return i
        if _stable_event_id(raw) == needle_id:
            return i
    return None


def _equals_ci(a: Optional[str], b: Optional[str]) -> bool:
    if a is None or b is None:
        return False
    return str(a).strip().casefold() == str(b).strip().casefold()


@router.get("/history")
def get_history(
    user=Depends(get_current_user),
    date_from: Optional[str] = Query(None, description="ISO date/time"),
    date_to: Optional[str] = Query(None, description="ISO date/time"),
    box_id: Optional[int] = Query(None),
) -> List[Dict[str, Any]]:
    data = [_normalize(e) for e in _read_log()]

    def parse_dt(s: Optional[str]) -> Optional[datetime]:
        if not s:
            return None
        try:
            return datetime.fromisoformat(s)
        except Exception:
            return None

    def within_range(e: Dict[str, Any]) -> bool:
        t = e.get("after", {}).get("timestamp") or e.get("before", {}).get("timestamp")
        dt = parse_dt(t)
        if not dt:
            return True
        if date_from:
            dfrom = parse_dt(date_from)
            if dfrom and dt < dfrom:
                return False
        if date_to:
            dto = parse_dt(date_to)
            if dto and dt > dto:
                return False
        return True

    if box_id is not None:
        data = [e for e in data if int(e.get("box_id", -1)) == int(box_id)]
    data = [e for e in data if within_range(e)]
    data.sort(key=lambda e: e.get("after", {}).get("timestamp") or e.get("before", {}).get("timestamp") or "", reverse=True)
    return data


@router.post("/confirm-taker")
def confirm_taker(payload: Dict[str, Any], user=Depends(get_current_user)) -> Dict[str, Any]:
    event_id = payload.get("event_id")
    if not event_id:
        raise HTTPException(status_code=400, detail="event_id_required")

    with _lock:
        data = _read_log()
        idx = _find_event_index_by_id(data, event_id)
        if idx is None:
            raise HTTPException(status_code=404, detail="event_not_found")

        entry = _normalize(data[idx])
        if entry.get("egg_taker_verified"):
            raise HTTPException(status_code=409, detail="already_verified")

        now = datetime.now(TZ_BR).isoformat()
        entry["egg_taker_verified"] = True
        entry["verified_by_user"] = user.get("username") or user.get("id")
        entry["verification_timestamp"] = now
        entry["taker_name"] = user.get("username") or "unknown"
        data[idx].update(entry)
        _write_log(data)
        # Append to takers history
        _append_takers_log({
            "event_id": entry["event_id"],
            "action": "confirm",
            "by": entry["taker_name"],
            "timestamp": now,
            "box_id": entry.get("box_id"),
            "delta": entry.get("delta"),
        })
        return entry


@router.get("/takers-history")
def get_takers_history(event_id: str, user=Depends(get_current_user)) -> List[Dict[str, Any]]:
    # Return taker actions related to a specific event
    if not event_id:
        raise HTTPException(status_code=400, detail="event_id_required")
    if not TAKERS_LOG_PATH.exists():
        return []
    try:
        entries = json.loads(TAKERS_LOG_PATH.read_text(encoding="utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"failed_to_read_takers_log: {e}")
    out = [e for e in entries if e.get("event_id") == event_id]
    # sort by timestamp ascending
    def keyfn(x: Dict[str, Any]):
        return x.get("timestamp") or ""
    out.sort(key=keyfn)
    return out


@router.get("/current")
def get_current_state(user=Depends(get_current_user)) -> Dict[str, Any]:
    data = [_normalize(e) for e in _read_log()]
    if not data:
        raise HTTPException(status_code=404, detail="no_data")
    # Sort newest first based on after/before timestamp
    data.sort(key=lambda e: e.get("after", {}).get("timestamp") or e.get("before", {}).get("timestamp") or "", reverse=True)
    latest = data[0]
    before = latest.get("before") or {}
    after = latest.get("after") or {}
    # Ensure image URLs are exposed via /images
    before_url = _image_url(before.get("image_path")) if before else None
    after_url = _image_url(after.get("image_path")) if after else None
    return {
        "boxId": str(latest.get("box_id")),
        "currentCount": int(after.get("count") or 0),
        "previousCount": int(before.get("count") or 0),
        "lastUpdated": after.get("timestamp") or before.get("timestamp"),
        "lastImageUrl": after_url,
        "previousImageUrl": before_url,
    }


@router.post("/mistake")
def mark_mistake(payload: Dict[str, Any], user=Depends(get_current_user)) -> Dict[str, Any]:
    event_id = payload.get("event_id")
    if not event_id:
        raise HTTPException(status_code=400, detail="event_id_required")

    with _lock:
        data = _read_log()
        idx = _find_event_index_by_id(data, event_id)
        if idx is None:
            raise HTTPException(status_code=404, detail="event_not_found")

        entry = _normalize(data[idx])
        # Only the original taker (who confirmed) can mark a mistake
        if not entry.get("egg_taker_verified"):
            raise HTTPException(status_code=409, detail="not_verified")
        current_username = str(user.get("username") or "")
        current_id = str(user.get("id") or "")
        taker_name = entry.get("taker_name")
        verified_by = entry.get("verified_by_user")
        allowed = (
            _equals_ci(taker_name, current_username)
            or _equals_ci(verified_by, current_username)
            or (verified_by is not None and str(verified_by) == current_id)
        )
        if not allowed:
            raise HTTPException(status_code=403, detail="not_event_taker")

        entry["mistake_flag"] = True
        entry["egg_taker_verified"] = False
        # Remove taker assignment
        entry["taker_name"] = None
        entry["verified_by_user"] = None
        entry["verification_timestamp"] = None
        entry["mistake_reported_by"] = user.get("username") or user.get("id")
        data[idx].update(entry)
        _write_log(data)
        # Append to takers history
        now = datetime.now(TZ_BR).isoformat()
        _append_takers_log({
            "event_id": entry["event_id"],
            "action": "mistake",
            "by": user.get("username") or user.get("id"),
            "timestamp": now,
            "box_id": entry.get("box_id"),
            "delta": entry.get("delta"),
        })
        return entry
