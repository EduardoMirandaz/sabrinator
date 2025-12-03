import os
from datetime import timezone, timedelta

BR_TZ = timezone(timedelta(hours=-3))

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
PROCESSED_DIR = os.path.join(os.path.dirname(__file__), 'processed')
IMAGES_DIR = os.path.join(os.path.dirname(__file__), 'images')

USERS_JSON = os.path.join(DATA_DIR, 'users.json')
INVITES_JSON = os.path.join(DATA_DIR, 'invites.json')
SUBSCRIPTIONS_JSON = os.path.join(DATA_DIR, 'subscriptions.json')
EGG_CHANGES_JSON = os.path.join(PROCESSED_DIR, 'egg_changes.json')

JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-secret-change-me')
JWT_ALG = 'HS256'

VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '')
VAPID_EMAIL = os.environ.get('VAPID_EMAIL', 'mailto:admin@example.com')
