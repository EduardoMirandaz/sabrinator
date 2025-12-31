#!/usr/bin/env python3
import os
import sys
import json
from common import env_int, env_str, dir_size_bytes, human_bytes, BYTES_IN_GB

RAW_DIR = env_str('RAW_DIR', '/backend/images')
PROCESSED_DIR = env_str('PROCESSED_DIR', '/backend/processed')
DATA_DIR = env_str('DATA_DIR', '/backend/data')
STORAGE_CAP_GB = env_int('STORAGE_CAP_GB', 200)
STORAGE_WARN_GB = env_int('STORAGE_WARN_GB', 180)


def main():
    human = '--human' in sys.argv
    as_json = '--json' in sys.argv
    raw_b = dir_size_bytes(RAW_DIR)
    proc_b = dir_size_bytes(PROCESSED_DIR)
    data_b = dir_size_bytes(DATA_DIR)
    total_b = raw_b + proc_b + data_b

    cap_b = STORAGE_CAP_GB * BYTES_IN_GB
    warn_b = STORAGE_WARN_GB * BYTES_IN_GB

    payload = {
        'raw_bytes': raw_b,
        'processed_bytes': proc_b,
        'data_bytes': data_b,
        'total_bytes': total_b,
        'cap_gb': STORAGE_CAP_GB,
        'warn_gb': STORAGE_WARN_GB,
    }

    if as_json:
        print(json.dumps(payload))
    elif human:
        print(f"raw: {human_bytes(raw_b)}")
        print(f"processed: {human_bytes(proc_b)}")
        print(f"data: {human_bytes(data_b)}")
        print(f"total: {human_bytes(total_b)}")
        print(f"cap: {STORAGE_CAP_GB} GB, warn: {STORAGE_WARN_GB} GB")
    else:
        print(payload)

    if total_b >= cap_b:
        sys.exit(2)
    if total_b >= warn_b:
        sys.exit(1)

if __name__ == '__main__':
    main()
