# Secure Upload Demo

Backend: `secure_upload_backend/`
- `main.py` implements register/login/upload endpoints using FastAPI
- `requirements.txt` lists dependencies
- `.env` contains a generated SECRET_KEY (do not commit to git in real projects)

Frontend: `secure_upload_frontend/`
- Contains an Angular scaffold in `src/` and a quick static demo in `demo/`

Quick start (backend):
- Create a venv and install requirements:
  ```bash
  python -m venv .venv
  source .venv/bin/activate
  pip install -r secure_upload_backend/requirements.txt
  ```
- Run the backend:
  ```bash
  ./secure_upload_backend/run_backend.sh
  ```

Quick tests: use the included TestClient-based tests (no server required):

```bash
PYTHONPATH=$(pwd) .venv/bin/python secure_upload_backend/test_backend.py
```

Quick frontend demo (no Node required):
- Serve the static demo directory and open it in a browser:
  ```bash
  python -m http.server 4200 --directory secure_upload_frontend/demo
  # open http://localhost:4200
  ```

Full Angular app:
- Install dependencies and run (requires Node & npm):
  ```bash
  cd secure_upload_frontend
  npm install
  npm start
  ```

Notes:
- Use Node LTS (v18 or v20) for best compatibility with Angular CLI.
- If the Angular CLI prompts about analytics, you can disable it with `ng analytics disable`.


If you'd like, I can attempt to run `npm install` and `npm start` here to verify the Angular app (if Node is available).