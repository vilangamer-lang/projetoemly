#!/usr/bin/env python3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from pathlib import Path
import os
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent.parent
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "4173"))


class CleanURLHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        parsed = urlparse(path)
        local_path = super().translate_path(parsed.path)

        if parsed.path.endswith("/"):
            return local_path

        if os.path.exists(local_path):
            return local_path

        if not os.path.splitext(local_path)[1]:
            html_path = f"{local_path}.html"
            if os.path.exists(html_path):
                return html_path

        return local_path


def main() -> None:
    handler = partial(CleanURLHandler, directory=str(ROOT))
    server = ThreadingHTTPServer((HOST, PORT), handler)
    print(f"Dev server running at http://localhost:{PORT}")
    print(f"Serving from {ROOT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
