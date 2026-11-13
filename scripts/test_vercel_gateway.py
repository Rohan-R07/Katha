"""Hosting-only regression tests; no real database connection or financial writes."""
from pathlib import Path
import os
import json
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from starlette.responses import JSONResponse
from vercel_app import create_hosting_app


class HostingTests(unittest.TestCase):
    def test_static_pages_and_api_have_separate_deployment_routes(self):
        config = json.loads(Path("vercel.json").read_text())
        self.assertEqual(config["framework"], "vite")
        self.assertEqual(config["outputDirectory"], "artifacts/khata-dashboard/dist/public")
        self.assertEqual(config["routes"][0], {"src": "/api(?:/.*)?", "dest": "/api/index"})
        self.assertEqual(config["routes"][1], {"handle": "filesystem"})
        self.assertEqual(config["routes"][2]["status"], 404)
        self.assertEqual(config["routes"][-1]["dest"], "/index.html")
        self.assertIn("api/index.py", config["functions"])

    def test_missing_configuration_fails_closed_for_every_api_method(self):
        with patch.dict(os.environ, {}, clear=True):
            with TestClient(create_hosting_app()) as client:
                for method, path in (("GET", "/api/auth/me"), ("GET", "/api/healthz"),
                                     ("GET", "/api/customers"), ("POST", "/api/purchases"),
                                     ("POST", "/api/auth/register"), ("POST", "/api/payments"),
                                     ("PUT", "/api/shops/profile"), ("DELETE", "/api/customers/example")):
                    response = client.request(method, path)
                    self.assertEqual(response.status_code, 503)
                    self.assertEqual(response.json()["code"], "backend_not_configured")
                    self.assertIn("no-store", response.headers["cache-control"])

    def test_gateway_preserves_api_prefix_body_cookies_and_origin(self):
        received = []

        async def backend(scope, receive, send):
            body = await receive()
            received.append((scope, body))
            await JSONResponse({"backend": True})(scope, receive, send)

        calls = []

        def loader():
            calls.append(True)
            return backend

        with TestClient(create_hosting_app(loader)) as client:
            for _ in range(2):
                response = client.post("/api/purchases?limit=20", content=b'{"items":[]}',
                                       headers={"origin": "https://shop.example.test", "cookie": "khata_session=test-only"})
                self.assertEqual(response.json(), {"backend": True})
        self.assertEqual(len(calls), 1)
        for scope, body in received:
            self.assertEqual(scope["path"], "/api/purchases")
            self.assertEqual(scope["root_path"], "")
            self.assertEqual(scope["query_string"], b"limit=20")
            self.assertEqual(dict(scope["headers"])[b"origin"], b"https://shop.example.test")
            self.assertEqual(dict(scope["headers"])[b"cookie"], b"khata_session=test-only")
            self.assertEqual(body["body"], b'{"items":[]}')

    def test_startup_errors_are_redacted_and_never_become_success(self):
        def broken():
            raise RuntimeError("PRIVATE_SENTINEL_DO_NOT_ECHO")

        with TestClient(create_hosting_app(broken)) as client:
            response = client.get("/api/auth/me")
            self.assertEqual(response.status_code, 503)
            self.assertEqual(response.json()["code"], "backend_startup_failed")
            self.assertNotIn("PRIVATE_SENTINEL", response.text)


if __name__ == "__main__":
    unittest.main()
