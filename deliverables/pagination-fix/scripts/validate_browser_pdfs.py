"""Validate the six PDFs downloaded by the authenticated browser verification."""
import json
import re
from datetime import datetime
from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw
from pypdf import PdfReader

import sys
ROOT = Path('/home/user/edux11')
SCRIPTS = ROOT / 'deliverables/pagination-fix/scripts'
sys.path.insert(0, str(SCRIPTS))
from validate_pdfs import common_checks  # noqa: E402

HERE = ROOT / 'deliverables/pagination-fix/browser-verification'
DOWNLOADS = HERE / 'downloads'
PREVIEWS = HERE / 'pdf-previews'
PREVIEWS.mkdir(parents=True, exist_ok=True)

EXPECTED = {
    'intelligence': {
        'markers': ['EXAM INTELLIGENCE REPORT', 'Subject performance', 'Chapter mastery', 'Error patterns and topic accuracy'],
    },
    'full': {
        'markers': ['FULL EXAM ANALYSIS', 'Question-by-question analysis', 'QUESTION / OPTIONS', 'Source data register'],
    },
}
NAME = 'Dev Student'
ROLL = 'DEV-STU-001'
EXAM = 'NEET UG · Full Mock 01'


def main():
    results = []
    images = []
    for role in ['student', 'faculty', 'admin']:
        for kind in ['intelligence', 'full']:
            pattern = f'*{kind.title()}*' if kind == 'full' else '*Exam_Intelligence_Report.pdf'
            if kind == 'full':
                pattern = '*Full_Exam_Analysis_Report.pdf'
            matches = sorted((DOWNLOADS / role).glob(pattern))
            if not matches:
                raise SystemExit(f'Missing downloaded PDF for {role}/{kind}')
            path = matches[0]
            base = common_checks(path)
            text = base['full_text']
            combined = text + '\n' + base['pypdf_text']
            extra = {
                'name': NAME in text and NAME in base['pypdf_text'],
                'roll': ROLL in text and ROLL in base['pypdf_text'],
                'exam_name': EXAM in text and EXAM in base['pypdf_text'],
                'markers': all(m in combined for m in EXPECTED[kind]['markers']),
                'no_staff_identity_in_cover_block': all(n not in base['texts'][0] for n in ['Dev Faculty', 'Dev Admin']),
                'production_filename': path.name.startswith('MediXO_EduX_') and path.name.endswith('.pdf'),
            }
            base['checks'].update(extra)
            entry = {k: v for k, v in base.items() if k not in ('raw', 'doc')}
            entry['role'] = role
            entry['kind'] = kind
            entry['ok'] = all(base['checks'].values())
            results.append(entry)
            # First and last page previews.
            doc = pymupdf.open(str(path))
            for label, page_index in [('first', 0), ('last', doc.page_count - 1)]:
                pix = doc[page_index].get_pixmap(matrix=pymupdf.Matrix(0.72, 0.72), alpha=False)
                dest = PREVIEWS / f'{role}-{kind}-{label}-p{page_index + 1:03d}.png'
                pix.save(str(dest))
                images.append((f'{role} · {kind} · {label} p{page_index + 1}', dest))
            doc.close()

    # Two contact sheets: first pages and last pages.
    def sheet(subset, name):
        imgs = []
        for label, path in subset:
            im = Image.open(path).convert('RGB')
            im.thumbnail((300, 400))
            imgs.append((label, im))
        cell_w = max(i.width for _, i in imgs) + 24
        cell_h = max(i.height for _, i in imgs) + 40
        out = Image.new('RGB', (cell_w * 3, cell_h * 2), (235, 238, 243))
        draw = ImageDraw.Draw(out)
        for idx, (label, im) in enumerate(imgs):
            x = (idx % 3) * cell_w
            y = (idx // 3) * cell_h
            out.paste(im, (x + 12, y + 28))
            draw.text((x + 12, y + 8), label, fill=(15, 23, 42))
        dest = PREVIEWS / name
        out.save(dest)
        return str(dest.relative_to(ROOT))

    first_sheet = sheet([i for i in images if '-first-' in i[1].name], 'first-pages-contact-sheet.png')
    last_sheet = sheet([i for i in images if '-last-' in i[1].name], 'last-pages-contact-sheet.png')
    all_ok = all(r['ok'] for r in results)
    result = {
        'generatedAt': datetime.now().isoformat(),
        'source': 'Six PDFs downloaded by real authenticated Chromium from the local Vite + FastAPI + SQLite environment',
        'tooling': {'pypdf': __import__('pypdf').__version__, 'pymupdf': pymupdf.__doc__.splitlines()[0], 'Pillow': __import__('PIL').__version__},
        'all_ok': all_ok,
        'results': results,
        'previews': [str(p.relative_to(ROOT)) for _, p in images],
        'contact_sheets': [first_sheet, last_sheet],
    }
    (HERE / 'pdf-validation.json').write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
    lines = [f"{r['role']:8} {r['kind']:12} pages={r['pages']:3} ok={r['ok']} " + ' '.join(f'{k}={int(v)}' for k, v in r['checks'].items()) for r in results]
    (HERE / 'pdf-validation.log').write_text('\n'.join(lines) + '\n')
    print(json.dumps({'all_ok': all_ok, 'pdfs': len(results), 'previews': len(images)}, indent=2))


if __name__ == '__main__':
    main()
