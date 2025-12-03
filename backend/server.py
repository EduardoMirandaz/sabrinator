from fastapi import FastAPI, UploadFile, File, Request
from datetime import datetime, timezone, timedelta
import os
import cv2
from ultralytics import YOLO
import json
from typing import Optional, Dict, Any
from fastapi import Depends
from fastapi.middleware.cors import CORSMiddleware
import os
from services.auth_service import ensure_admin
from routes.auth import router as auth_router, admin_router

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure admin exists on startup using environment variables
@app.on_event("startup")
def _bootstrap_admin_on_startup():
    username = os.environ.get("ADMIN_USERNAME", "admin")
    password = os.environ.get("ADMIN_PASSWORD", "admin123")
    name = os.environ.get("ADMIN_NAME", "Admin")
    phone = os.environ.get("ADMIN_PHONE", "+00 00 00000-0000")
    try:
        ensure_admin(username=username, password=password, name=name, phone=phone)
    except Exception:
        # Avoid blocking startup if something goes wrong
        pass
app.include_router(auth_router)
app.include_router(admin_router)

SAVE_DIR = "images"
PROCESSED_DIR = "processed"
os.makedirs(SAVE_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

# Load model once at startup for efficiency
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pt") if __file__ else "model.pt"
model = None
try:
    model = YOLO(MODEL_PATH)
except Exception:
    # Model may not be available during initial container build; defer load errors.
    model = None

def process_image(src_path: str, dst_path: str):
    """Run inference to count eggs, draw bboxes, and write count on image."""
    if model is None:
        # Try lazy load in case startup load failed
        try:
            mpath = MODEL_PATH
            globals()['model'] = YOLO(mpath)
        except Exception:
            return False

    img = cv2.imread(src_path)
    if img is None:
        return False

    # Run detection (simple, single-image predict)
    results = model(img)
    egg_count = 0

    # Draw boxes and count
    for r in results:
        boxes = r.boxes
        if boxes is None:
            continue
        for b in boxes:
            xyxy = b.xyxy[0].cpu().numpy().astype(int)
            x1, y1, x2, y2 = xyxy
            conf = float(b.conf[0]) if hasattr(b, 'conf') else 0.0
            cls_id = int(b.cls[0]) if hasattr(b, 'cls') else 0
            egg_count += 1  # Count every detection as an egg
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
            label = f"egg {cls_id} {conf:.2f}"
            cv2.putText(img, label, (x1, max(0, y1-6)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,255,0), 1, cv2.LINE_AA)

    # Write total egg count on image (top-left)
    cv2.putText(img, f"EGGS: {egg_count}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2, cv2.LINE_AA)

    # Save processed image with same filename into processed dir
    cv2.imwrite(dst_path, img)
    return True

# --- Change detection and logging state ---
LOG_PATH = os.path.join(PROCESSED_DIR, "egg_changes.json")

state: Dict[str, Any] = {
    "last_confirmed_count": None,           # int or None
    "last_confirmed_time": None,            # datetime or None
    "last_processed_filename": None,        # str or None
    "pending_change": None,                 # dict with keys: new_count, first_seen_time, prev_count, prev_image
    "current_box_id": 1,                    # incremental egg box identifier
    "current_box_meta": {                   # metadata for the active egg box
        "inserted_at": None,               # datetime
        "payer_name": "Gustavo",
        "payer_pix": "gumartins2001@gmail.com",
    },
    "current_taker_name": "unknown",       # who took eggs (set via future endpoint)
}

# --- Timezone helpers (Brazil GMT-3) ---
BR_TZ = timezone(timedelta(hours=-3))

def now_br() -> datetime:
    return datetime.now(tz=BR_TZ)

def fmt_br(dt: datetime) -> str:
    # Ensure timezone-aware and ISO 8601 with offset
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=BR_TZ)
    return dt.isoformat()

def fname_from_dt(dt: datetime) -> str:
    # Filename with local BR time, preserving sortable pattern
    return dt.strftime("%Y%m%d_%H%M%S_%f") + ".jpg"

def get_last_confirmed_from_log() -> Optional[Dict[str, Any]]:
    logs = load_log()
    if not logs:
        return None
    last = logs[-1]
    try:
        return {
            "count": int(last["after"]["count"]),
            "time": datetime.fromisoformat(last["after"]["timestamp"]),
            "image": last["after"].get("image_path"),
            "box_id": int(last.get("box_id", 1)),
        }
    except Exception:
        return None

def load_log() -> list:
    if os.path.exists(LOG_PATH):
        try:
            with open(LOG_PATH, "r") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def append_log(entry: dict) -> None:
    logs = load_log()
    logs.append(entry)
    try:
        with open(LOG_PATH, "w") as f:
            json.dump(logs, f, indent=2)
    except Exception:
        pass

def write_change_entry(before_count: int, after_count: int, before_time: datetime, after_time: datetime,
                       before_image: Optional[str], after_image: Optional[str], box_id: int,
                       box_meta: Optional[Dict[str, Any]] = None,
                       taker_name: Optional[str] = None) -> None:
    entry = {
        "before": {
            "count": before_count,
            "timestamp": fmt_br(before_time),
            "image_path": before_image,
        },
        "after": {
            "count": after_count,
            "timestamp": fmt_br(after_time),
            "image_path": after_image,
        },
        "confirmed_delay_seconds": 10,
        "delta": after_count - before_count,
        "box_id": box_id,
    }
    # Attach taker info (who took eggs). Defaults to 'unknown'.
    entry["taker_name"] = taker_name or state.get("current_taker_name", "unknown")
    if box_meta is not None:
        entry["box"] = {
            "id": box_id,
            "inserted_at": fmt_br(box_meta.get("inserted_at") or after_time),
            "payer_name": box_meta.get("payer_name"),
            "payer_pix": box_meta.get("payer_pix"),
        }
    append_log(entry)

def detect_and_maybe_confirm_change(now: datetime, current_count: int, current_image_path: str,
                                    processed_image_path: str) -> None:
    # Initialize baseline if none
    if state["last_confirmed_count"] is None:
        # Initialize from last log entry if available
        last = get_last_confirmed_from_log()
        has_any_processed = False
        try:
            has_any_processed = any(fn.lower().endswith('.jpg') for fn in os.listdir(PROCESSED_DIR))
        except Exception:
            pass
        if last is not None:
            # Seed baseline from log without saving new image
            state["last_confirmed_count"] = last["count"]
            state["last_confirmed_time"] = last["time"]
            state["last_processed_filename"] = last["image"]
            state["current_box_id"] = last.get("box_id", 1)
            # Seed box meta inserted_at to last change time if unknown
            state["current_box_meta"]["inserted_at"] = last["time"]
            return
        # No log yet: if processed folder empty, create first processed and log before=0 -> after=current
        if not has_any_processed:
            process_image(current_image_path, processed_image_path)
            # Write initial log entry
            write_change_entry(
                before_count=0,
                after_count=current_count,
                before_time=now,
                after_time=now,
                before_image=None,
                after_image=processed_image_path,
                box_id=state["current_box_id"],
                box_meta={
                    "inserted_at": now,
                    "payer_name": state["current_box_meta"]["payer_name"],
                    "payer_pix": state["current_box_meta"]["payer_pix"],
                },
                taker_name=state["current_taker_name"],
            )
        # Establish baseline regardless
        state["last_confirmed_count"] = current_count
        state["last_confirmed_time"] = now
        state["last_processed_filename"] = processed_image_path if not has_any_processed else None
        if state["current_box_meta"]["inserted_at"] is None:
            state["current_box_meta"]["inserted_at"] = now
        return

    baseline_count = state["last_confirmed_count"]
    baseline_time = state["last_confirmed_time"]

    # If count equals baseline, cancel any pending change
    if current_count == baseline_count:
        state["pending_change"] = None
        return

    # If there is no pending change yet, start one
    if state["pending_change"] is None:
        state["pending_change"] = {
            "new_count": current_count,
            "first_seen_time": now,
            "prev_count": baseline_count,
            "prev_image": state["last_processed_filename"],
        }
        return

    pending = state["pending_change"]
    # If the observed count flips to a different value than the pending target, restart pending window
    if current_count != pending["new_count"]:
        state["pending_change"] = {
            "new_count": current_count,
            "first_seen_time": now,
            "prev_count": baseline_count,
            "prev_image": state["last_processed_filename"],
        }
        return

    # Confirm if at least 10 seconds have passed since first seen and the count persists
    elapsed = (now - pending["first_seen_time"]).total_seconds()
    if elapsed >= 10:
        # If the count increase is >10 compared to last confirmed, start a new egg box
        if pending["new_count"] - baseline_count > 10:
            state["current_box_id"] += 1
            state["current_box_meta"]["inserted_at"] = now
        # Save processed image as confirmation snapshot
        process_image(current_image_path, processed_image_path)
        # Log the change
        write_change_entry(
            before_count=pending["prev_count"],
            after_count=pending["new_count"],
            before_time=baseline_time,
            after_time=now,
            before_image=pending["prev_image"],
            after_image=processed_image_path,
            box_id=state["current_box_id"],
            box_meta={
                "inserted_at": state["current_box_meta"]["inserted_at"],
                "payer_name": state["current_box_meta"]["payer_name"],
                "payer_pix": state["current_box_meta"]["payer_pix"],
            },
            taker_name=state["current_taker_name"],
        )
        # Update baseline to new confirmed state
        state["last_confirmed_count"] = pending["new_count"]
        state["last_confirmed_time"] = now
        state["last_processed_filename"] = processed_image_path
        state["pending_change"] = None

@app.post("/upload")
async def upload_image(request: Request, file: UploadFile = File(None)):
    """Accept either multipart/form-data with field 'file' or raw binary body (image/jpeg)."""
    current_dt = now_br()
    timestamp_name = fname_from_dt(current_dt)
    filename = f"{SAVE_DIR}/{timestamp_name}"
    processed_filename = f"{PROCESSED_DIR}/{timestamp_name}"

    if file is not None:
        content = await file.read()
    else:
        content = await request.body()

    with open(filename, "wb") as f:
        f.write(content)

    # Run inference to get the current egg count, but only save processed image
    # if it's the first image or a confirmed change after 10 seconds.
    try:
        # Ensure model is lazy-loaded
        if model is None:
            globals()['model'] = YOLO(MODEL_PATH)
        img = cv2.imread(filename)
        if img is None:
            raise RuntimeError("Failed to read uploaded image")
        results = model(img)
        egg_count = 0
        for r in results:
            boxes = r.boxes
            if boxes is None:
                continue
            egg_count += len(boxes)

        # Use BR timestamp captured at request time
        now = current_dt
        detect_and_maybe_confirm_change(now, egg_count, filename, processed_filename)
    except Exception:
        # Keep upload working even if inference fails
        pass
    # Enforce max image count (keep most recent 30 based on filename timestamps)
    try:
        files = [fn for fn in os.listdir(SAVE_DIR) if fn.lower().endswith('.jpg')]
        if len(files) > 30:
            # Sort ascending (oldest first) because names start with chronological timestamp
            files.sort()
            to_delete = files[0:len(files)-30]
            for old in to_delete:
                try:
                    os.remove(os.path.join(SAVE_DIR, old))
                except Exception:
                    pass
    except Exception:
        pass

    return {"status": "ok", "file": filename, "bytes": len(content)}
