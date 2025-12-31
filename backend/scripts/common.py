import os
import sys
import time
from typing import Tuple

BYTES_IN_GB = 1024 ** 3

def env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, str(default)))
    except Exception:
        return default

def env_str(name: str, default: str) -> str:
    return os.environ.get(name, default)

def human_bytes(n: int) -> str:
    for unit in ['B','KB','MB','GB','TB']:
        if n < 1024.0:
            return f"{n:3.1f} {unit}" if unit != 'B' else f"{n} B"
        n /= 1024.0
    return f"{n:.1f} PB"

def dir_size_bytes(path: str) -> int:
    total = 0
    for root, _dirs, files in os.walk(path):
        for f in files:
            try:
                fp = os.path.join(root, f)
                total += os.path.getsize(fp)
            except Exception:
                pass
    return total

def list_jpegs(path: str) -> Tuple[list, list]:
    images = []
    for f in os.listdir(path):
        if f.lower().endswith('.jpg') or f.lower().endswith('.jpeg'):
            try:
                fp = os.path.join(path, f)
                st = os.stat(fp)
                images.append((f, st.st_mtime, st.st_size))
            except Exception:
                pass
    # sort oldest first by mtime
    images.sort(key=lambda x: x[1])
    return images, [i[0] for i in images]

def acquire_lock(lock_path: str, timeout_sec: int = 1) -> bool:
    start = time.time()
    while time.time() - start < timeout_sec:
        try:
            fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.close(fd)
            return True
        except FileExistsError:
            time.sleep(0.1)
        except Exception:
            break
    return False

def release_lock(lock_path: str) -> None:
    try:
        os.remove(lock_path)
    except Exception:
        pass
