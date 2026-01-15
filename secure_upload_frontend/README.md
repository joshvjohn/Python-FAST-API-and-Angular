# Secure Upload Frontend

This folder contains two ways to run a frontend that talks to the FastAPI backend:

1. Quick static demo (no Node required):
   - Serve `demo/` on port 4200: `python -m http.server 4200 --directory demo` and open http://localhost:4200/demo/index.html
   - Use the Register / Login and Upload UI to test end-to-end with the backend.

2. Full Angular app (requires Node + npm):
   - `npm install`
   - `npm start` (runs `ng serve`)

Notes:
- The demo uses `http://localhost:8000` for the backend. Start the backend before using the demo.
- For best compatibility with Angular tooling, use Node LTS (v18 or v20); newer Node versions may produce warnings or unexpected behavior.
- To avoid the Angular analytics prompt when running `ng` commands, run: `ng analytics disable` (optional).
