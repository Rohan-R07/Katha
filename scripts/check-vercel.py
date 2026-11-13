"""Read-only smoke checks for the actual Vercel entrypoint, after build:vercel."""
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient
from vercel_app import app

config = json.loads((ROOT / "vercel.json").read_text())
assert config["framework"] == "vite"
assert config["outputDirectory"] == "artifacts/khata-dashboard/dist/public"
assert config["routes"][0] == {"src": "/api(?:/.*)?", "dest": "/api/index"}
assert config["routes"][1] == {"handle": "filesystem"}
assert (ROOT / "lib/api-spec/openapi.yaml").is_file()
frontend = ROOT / config["outputDirectory"]
assert 'id="root"' in (frontend / "index.html").read_text()
assert list((frontend / "assets").glob("*.js"))

with TestClient(app) as client:
    assert client.get("/api/healthz").json() == {"status": "ok"}
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/customers").status_code == 401
    assert client.post("/api/purchases", json={}).status_code == 401
    assert client.get("/api/openapi.json").json()["openapi"].startswith("3.")
    assert client.get("/api/docs").status_code == 200
    for path in ("/api", "/api/no-such-endpoint"):
        response = client.get(path, headers={"accept": "text/html"})
        assert response.status_code == 404 and response.headers["content-type"].startswith("application/json")
    assert client.get("/assets/missing.js", headers={"accept": "text/html"}).status_code == 404
    assert client.post("/customers", json={}).status_code != 200

print("Vercel adapter passed: static build/routing config, protected APIs, real PostgreSQL health, OpenAPI and JSON 404s. No data was written.")
