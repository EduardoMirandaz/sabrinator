#!/usr/bin/env python3
import os
import sys
from common import env_int, env_str, list_jpegs, dir_size_bytes, human_bytes, BYTES_IN_GB, acquire_lock, release_lock
import time

RAW_DIR = env_str('RAW_DIR', '/backend/images')
PROCESSED_DIR = env_str('PROCESSED_DIR', '/backend/processed')
LOG_DIR = env_str('LOG_DIR', '/backend/data')
LOCK_PATH = env_str('LOCK_PATH', '/backend/processed/.maintenance.lock')
RAW_MAX_IMAGES = env_int('RAW_MAX_IMAGES', 100)
PROCESSED_MAX_GB = env_int('PROCESSED_MAX_GB', 150)
RETENTION_MIN_AGE_SEC = env_int('RETENTION_MIN_AGE_SEC', 30)
DRY_RUN = env_str('MAINTENANCE_DRY_RUN', 'false').lower() == 'true'


def log(msg: str):
    ts = time.strftime('%Y-%m-%d %H:%M:%S')
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    try:
        os.makedirs(LOG_DIR, exist_ok=True)
        with open(os.path.join(LOG_DIR, 'retention.log'), 'a') as f:
            f.write(line + "\n")
    except Exception:
        pass


def delete_file(path: str):
    if DRY_RUN:
        log(f"DRY-RUN delete {path}")
        return
    try:
        os.remove(path)
        log(f"deleted {path}")
    except Exception as e:
        log(f"error deleting {path}: {e}")


def prune_raw():
    if not os.path.isdir(RAW_DIR):
        return
    images, names = list_jpegs(RAW_DIR)
    count = len(images)
    if count <= RAW_MAX_IMAGES:
        return
    # delete oldest first beyond cap
    excess = count - RAW_MAX_IMAGES
    log(f"raw prune: {count} -> keep {RAW_MAX_IMAGES}, deleting {excess}")
    for i in range(excess):
        name, mtime, _size = images[i]
        if time.time() - mtime < RETENTION_MIN_AGE_SEC:
            continue
        delete_file(os.path.join(RAW_DIR, name))


def prune_processed_by_size():
    if not os.path.isdir(PROCESSED_DIR):
        return
    cap_bytes = PROCESSED_MAX_GB * BYTES_IN_GB
    current = dir_size_bytes(PROCESSED_DIR)
    if current <= cap_bytes:
        log(f"processed usage {human_bytes(current)} within cap {PROCESSED_MAX_GB} GB")
        return
    images, names = list_jpegs(PROCESSED_DIR)
    log(f"processed prune: {human_bytes(current)} over cap {PROCESSED_MAX_GB} GB, deleting oldest")
    idx = 0
    while current > cap_bytes and idx < len(images):
        name, mtime, size = images[idx]
        if time.time() - mtime < RETENTION_MIN_AGE_SEC:
            idx += 1
            continue
        delete_file(os.path.join(PROCESSED_DIR, name))
        current -= size
        idx += 1
    log(f"processed usage after prune: {human_bytes(current)}")


def main():
    if not acquire_lock(LOCK_PATH, 1):
        log("another maintenance run is in progress; skipping")
        return
    try:
        prune_raw()
        prune_processed_by_size()
    finally:
        release_lock(LOCK_PATH)

if __name__ == '__main__':
    main()
