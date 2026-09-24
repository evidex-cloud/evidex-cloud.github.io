"""Local dev server for the Droplet Labs Paths landing page.
Same as `python -m http.server`, but every response carries `Cache-Control: no-store`
so the browser always fetches the current file.   Usage: python tools/serve.py [port]"""
import sys, os
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8791

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    def log_message(self, fmt, *args):
        sys.stdout.write("%s %s\n" % (self.log_date_time_string(), fmt % args)); sys.stdout.flush()

Handler.extensions_map.update({'.js': 'text/javascript', '.svg': 'image/svg+xml', '.css': 'text/css'})
print(f'Droplet Labs dev server on http://localhost:{PORT} (no-cache)', flush=True)
ThreadingHTTPServer(('', PORT), Handler).serve_forever()
