"""Build offline-files.json: the fallback list of every file the offline download saves.

The page normally asks the GitHub API for each repo's current file tree (so new lessons are
picked up automatically). This file is only used when that API is unreachable, so it is
generated from the local clones at origin/main. Re-run after a course ships new files:

    python tools/build-offline-list.py

The include/exclude rule here must match keep() in offline.js.
"""
import json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(HERE)                      # C:/claude-projects
OWNER = 'evidex-cloud'
HUB = OWNER + '.github.io'

SKIP_DIRS = {'tools', 'node_modules', 'tests', 'test', 'scripts'}
SKIP_TOP_EXT = {'.md', '.bat', '.sh', '.py', '.txt', '.ps1'}
SKIP_TOP_NAMES = {'LICENSE', 'CNAME'}
HUB_SKIP = {'sw.js', 'offline-files.json'}


def keep(path, hub=False):
    parts = path.split('/')
    if any(p.startswith('.') for p in parts):
        return False
    if parts[0] in SKIP_DIRS:
        return False
    if len(parts) == 1:
        name = parts[0]
        if name in SKIP_TOP_NAMES or os.path.splitext(name)[1].lower() in SKIP_TOP_EXT:
            return False
        if hub and name in HUB_SKIP:
            return False
    return True


def remote_repo(d):
    try:
        url = subprocess.run(['git', '-C', d, 'remote', 'get-url', 'origin'], capture_output=True, text=True).stdout.strip()
    except Exception:
        return None
    m = re.search(r'github\.com[/:]' + OWNER + r'/([^/]+?)(?:\.git)?$', url)
    return m.group(1) if m else None


def course_repos():
    src = open(os.path.join(HERE, 'courses.js'), encoding='utf-8').read()
    return re.findall(r"url: 'https://" + re.escape(HUB) + r"/([^/']+)/'", src)


def main():
    wanted = [HUB] + course_repos()
    local = {}
    for name in os.listdir(ROOT):
        d = os.path.join(ROOT, name)
        if os.path.isdir(os.path.join(d, '.git')):
            r = remote_repo(d)
            if r in wanted and (r not in local or name.endswith('-2026')):
                local[r] = d
    out = {'generated': time.strftime('%Y-%m-%d %H:%M'), 'owner': OWNER, 'repos': {}, 'totalBytes': 0}
    for repo in wanted:
        d = local.get(repo)
        if not d:
            print('!! no local clone for', repo, file=sys.stderr)
            continue
        files, total = [], 0
        if repo == HUB:
            # the hub is this folder: list the working tree, so new files are in before they are pushed
            for dp, dn, fn in os.walk(d):
                dn[:] = [x for x in dn if not x.startswith('.')]
                for n in fn:
                    path = os.path.relpath(os.path.join(dp, n), d).replace(os.sep, '/')
                    if keep(path, True):
                        sha = subprocess.run(['git', '-C', d, 'hash-object', path], capture_output=True, text=True).stdout.strip()
                        size = os.path.getsize(os.path.join(d, path))
                        files.append([path, size, sha]); total += size
            files.sort()
            out['repos'][repo] = {'base': '/', 'files': files, 'bytes': total}
            out['totalBytes'] += total
            print(f'{repo:34} {len(files):5} files {total / 1e6:6.1f} MB  (working tree)')
            continue
        subprocess.run(['git', '-C', d, 'fetch', '-q', 'origin'], capture_output=True)
        tree = subprocess.run(['git', '-C', d, 'ls-tree', '-r', '-l', 'origin/main'], capture_output=True, text=True, encoding='utf-8').stdout
        for line in tree.splitlines():
            meta, path = line.split('\t', 1)
            mode, typ, sha, size = meta.split()
            if typ != 'blob' or not keep(path, repo == HUB):
                continue
            files.append([path, int(size), sha])
            total += int(size)
        out['repos'][repo] = {'base': '/' if repo == HUB else '/' + repo + '/', 'files': files, 'bytes': total}
        out['totalBytes'] += total
        print(f'{repo:34} {len(files):5} files {total / 1e6:6.1f} MB  ({os.path.basename(d)})')
    with open(os.path.join(HERE, 'offline-files.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, separators=(',', ':'))
    print(f"total {out['totalBytes'] / 1e6:.1f} MB -> offline-files.json")


if __name__ == '__main__':
    main()
