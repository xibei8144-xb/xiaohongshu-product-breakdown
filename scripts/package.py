#!/usr/bin/env python3
"""Validate local render outputs and package only numbered PNG pages."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import struct
import zipfile


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate(out, products):
    batches = []
    ids = set()
    for product in products:
        pid = product['id']
        if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]*', pid) or pid in ids:
            raise ValueError(f'Invalid or duplicate product id: {pid}')
        ids.add(pid)
        folder = out / pid
        pages = sorted((folder / 'images').glob('*.png'))
        count = product.get('pageCount', 7)
        expected = [f'{n:02}.png' for n in range(1, count + 1)]
        if [p.name for p in pages] != expected:
            raise ValueError(f'{pid}: expected consecutive pages {expected}')
        for page in pages:
            raw = page.read_bytes()
            if raw[:8] != b'\x89PNG\r\n\x1a\n' or len(raw) < 24:
                raise ValueError(f'Invalid PNG: {page}')
            if struct.unpack('>II', raw[16:24]) != (1080, 1440):
                raise ValueError(f'Wrong dimensions: {page}')
            report = folder / f'layout-{int(page.stem)}.json'
            if not report.exists():
                raise ValueError(f'Missing layout report: {report}')
            layout = json.loads(report.read_text())
            if 'dangerous' not in layout or layout['dangerous']:
                raise ValueError(f'Layout report has overflow or lacks results: {report}')
        caption = folder / '发布文案.md'
        if not caption.exists():
            raise ValueError(f'Missing caption: {caption}')
        batches.append((product, pages, caption))
    return batches


def zip_pages(target, entries):
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as bundle:
        for path, name in entries:
            bundle.write(path, name)
    with zipfile.ZipFile(target) as bundle:
        assert bundle.namelist() == [name for _, name in entries]
        assert bundle.testzip() is None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--content', required=True, type=Path)
    parser.add_argument('--out', required=True, type=Path)
    args = parser.parse_args()
    products = json.loads(args.content.read_text())
    if not isinstance(products, list) or not products:
        raise ValueError('content must be a non-empty product array')
    batches = validate(args.out, products)
    entries, sections, manifest = [], [], {'products': [], 'archives': []}
    for product, pages, caption in batches:
        target = args.out / f"{product['id']}-{len(pages)}张图.zip"
        zip_pages(target, [(p, p.name) for p in pages])
        entries.extend((p, product['id'] + '/' + p.name) for p in pages)
        sections.append('## ' + product['name'] + '\n\n' + re.sub(r'^# ', '### ', caption.read_text(), flags=re.M))
        manifest['products'].append({'id': product['id'], 'name': product['name'], 'page_count': len(pages), 'images': [{'file': str(p.relative_to(args.out)), 'sha256': sha(p)} for p in pages]})
        manifest['archives'].append({'file': target.name, 'sha256': sha(target)})
    combined = args.out / f'全部产品拆解-{len(entries)}张图.zip'
    zip_pages(combined, entries)
    manifest['archives'].append({'file': combined.name, 'sha256': sha(combined)})
    manifest['image_count'] = len(entries)
    manifest['dimensions'] = [1080, 1440]
    manifest['visual_review'] = 'Required separately; structural validation does not establish visual quality.'
    run = args.out / 'render-run.json'
    if run.exists():
        manifest['render_run'] = json.loads(run.read_text())
    (args.out / '发布文案与Tag合集.md').write_text('# ' + ' · '.join(p['name'] for p in products) + '\n\n' + '\n\n---\n\n'.join(sections))
    (args.out / 'delivery-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    print(json.dumps({'products': len(products), 'images': len(entries), 'combined_zip': str(combined)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
