#!/usr/bin/env python3
"""Download the explicitly listed official demo assets for local use."""
import argparse
import json
from pathlib import Path
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
MAX_BYTES = 20 * 1024 * 1024


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, default=ROOT / 'assets/example-media')
    args = parser.parse_args()
    sources = json.loads((ROOT / 'assets/example-media/asset-sources.json').read_text())
    args.out.mkdir(parents=True, exist_ok=True)
    for name, url in sources.items():
        if Path(name).name != name or urllib.parse.urlparse(url).scheme != 'https':
            raise ValueError('Invalid filename or non-HTTPS asset URL')
        target = args.out / name
        if target.exists():
            print(f'Keeping existing asset: {name}')
            continue
        request = urllib.request.Request(url, headers={'User-Agent': 'XHS-Skill-Example/1.1'})
        with urllib.request.urlopen(request, timeout=30) as response:
            data = response.read(MAX_BYTES + 1)
            media_type = response.headers.get_content_type()
        if not data or len(data) > MAX_BYTES or not media_type.startswith('image/'):
            raise ValueError(f'Expected an image no larger than 20 MiB: {name}')
        pending = target.with_suffix(target.suffix + '.part')
        try:
            pending.write_bytes(data)
            pending.replace(target)
        finally:
            pending.unlink(missing_ok=True)
        print(f'Downloaded {name}: {len(data)} bytes')
    print('Third-party assets retain their own rights; see THIRD_PARTY_NOTICES.md.')


if __name__ == '__main__':
    main()
