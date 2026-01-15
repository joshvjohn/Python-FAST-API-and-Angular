#!/usr/bin/env bash
set -euo pipefail
source .venv/bin/activate || true
uvicorn secure_upload_backend.main:app --reload --port 8000
