#!/usr/bin/env python3
"""Exercise actual rendering/packaging and rejection of unsafe output reuse."""
import json
import os
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
NODE = os.environ.get('NODE_BINARY', 'node')


def run(*args, ok=True):
    result = subprocess.run(args, cwd=ROOT, text=True, capture_output=True)
    if ok and result.returncode:
        raise AssertionError(result.stdout + result.stderr)
    if not ok and result.returncode == 0:
        raise AssertionError('Expected command to reject invalid input')
    return result


with tempfile.TemporaryDirectory(prefix='xhs-skill-smoke-') as tmp:
    work = Path(tmp)
    assets = work / 'assets'
    assets.mkdir()
    # Original synthetic fixtures, not product screenshots or claims.
    (assets / 'logo.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect x="16" y="16" width="96" height="96" rx="24" fill="#456c91"/></svg>')
    (assets / 'screen.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="936" height="470"><rect width="936" height="470" fill="#eef4fa"/><rect x="40" y="40" width="240" height="390" rx="12" fill="#ccdbe8"/><rect x="320" y="40" width="576" height="180" rx="12" fill="white"/></svg>')
    products = json.loads((ROOT / 'assets/example-content.json').read_text())
    for p in products:
        p.update(logo='logo.svg', shot='screen.svg', shot2='screen.svg')
    content = work / 'content.json'
    content.write_text(json.dumps(products, ensure_ascii=False))
    output = work / 'output'
    command = [NODE, str(ROOT / 'scripts/render.cjs'), '--content', str(content), '--assets', str(assets), '--out', str(output)]
    run(*command)
    package = [sys.executable, str(ROOT / 'scripts/package.py'), '--content', str(content), '--out', str(output)]
    run(*package)
    folder = output / products[0]['id']
    pages = sorted((folder / 'images').glob('*.png'))
    assert len(pages) == 7
    for page in pages:
        assert struct.unpack('>II', page.read_bytes()[16:24]) == (1080, 1440)
    archive = output / f"{products[0]['id']}-7张图.zip"
    with zipfile.ZipFile(archive) as z:
        assert z.namelist() == [f'{n:02}.png' for n in range(1, 8)]
        assert z.testzip() is None
    assert json.loads((output / 'render-run.json').read_text())['avatarSha256'] is None
    rejected = run(*command, ok=False)
    assert 'Output already exists' in rejected.stderr
    report = folder / 'layout-1.json'
    report.write_text(json.dumps({'dangerous': [{'text': 'overflow fixture'}]}))
    rejected = run(*package, ok=False)
    assert 'overflow' in rejected.stderr
    print('PASS: rendered 7 PNGs, packaged only numbered images, omitted private avatar, rejected output reuse and overflow.')
