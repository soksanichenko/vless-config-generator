#!/bin/sh
set -e

python scripts/create_db.py
alembic -c alembic.ini upgrade head

exec uvicorn vless_admin.app:app --host 0.0.0.0 --port 8999
