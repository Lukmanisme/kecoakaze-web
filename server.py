#!/usr/bin/env python3
"""Lightweight static file server for Kecoakaze Web dist/ on WeCHIP."""
import functools
import http.server
import mimetypes
import os
import socketserver

PORT = int(os.environ.get("PORT", "8100"))
BIND = os.environ.get("BIND", "127.0.0.1")
DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")

mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("image/svg+xml", ".svg")


class DistHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        if self.path == "/" or self.path.endswith(".html"):
            self.send_header("Cache-Control", "no-cache")
        else:
            self.send_header("Cache-Control", "public, max-age=3600")
        super().end_headers()


class ReusableTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main() -> None:
    os.makedirs(DIST_DIR, exist_ok=True)
    handler = functools.partial(DistHandler, directory=DIST_DIR)
    with ReusableTCPServer((BIND, PORT), handler) as httpd:
        print(f"Serving Kecoakaze Web from {DIST_DIR} on http://{BIND}:{PORT}", flush=True)
        httpd.serve_forever()


if __name__ == "__main__":
    main()
