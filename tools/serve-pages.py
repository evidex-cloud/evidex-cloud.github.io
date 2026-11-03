"""Serve the hub and every course the way GitHub Pages does, for testing offline mode locally.

    python tools/serve-pages.py 8797

/            -> this folder (evidex-cloud.github.io)
/<repo>/     -> the local clone whose origin is evidex-cloud/<repo> (prefers *-2026 folders)
/<repo>      -> 301 to /<repo>/ (like Pages)
Responses carry Cache-Control: no-store so the browser never hides a stale file.
"""
import os, re, subprocess, sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlsplit, unquote

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(HERE)
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8797
OWNER = 'evidex-cloud'


def mounts():
    m = {}
    for name in sorted(os.listdir(ROOT)):
        d = os.path.join(ROOT, name)
        if not os.path.isdir(os.path.join(d, '.git')) or os.path.samefile(d, HERE):
            continue
        url = subprocess.run(['git', '-C', d, 'remote', 'get-url', 'origin'], capture_output=True, text=True).stdout.strip()
        r = re.search(r'github\.com[/:]' + OWNER + r'/([^/]+?)(?:\.git)?$', url)
        if r and (r.group(1) not in m or name.endswith('-2026')):
            m[r.group(1)] = d
    return m


MOUNTS = mounts()


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = unquote(urlsplit(path).path)
        seg = p.strip('/').split('/')[0]
        if seg in MOUNTS:
            rest = p[len('/' + seg):].lstrip('/')
            return os.path.join(MOUNTS[seg], *rest.split('/')) if rest else MOUNTS[seg] + os.sep
        rest = p.lstrip('/')
        return os.path.join(HERE, *rest.split('/')) if rest else HERE + os.sep

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


Handler.extensions_map.update({'.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml',
                               '.css': 'text/css', '.md': 'text/markdown; charset=utf-8',
                               '.webmanifest': 'application/manifest+json', '.json': 'application/json',
                               '.woff2': 'font/woff2'})
for k, v in sorted(MOUNTS.items()):
    print(f'/{k}/ -> {v}', flush=True)
print(f'Pages-like server on http://localhost:{PORT}', flush=True)
ThreadingHTTPServer(('', PORT), Handler).serve_forever()
