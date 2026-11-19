#!/usr/bin/env python3
"""Servidor de desarrollo para /home/david/opencode/calendario.
Igual que `python -m http.server` pero con headers anti-caché,
para que el celular siempre traiga la versión fresca.
Uso: python3 serve.py [puerto]  (default 8791)
"""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8791

class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, *a):
        pass  # silencioso

if __name__ == "__main__":
    srv = ThreadingHTTPServer(("0.0.0.0", PORT), NoCache)
    print(f"calendario en http://0.0.0.0:{PORT}/ (sin caché)", flush=True)
    srv.serve_forever()
