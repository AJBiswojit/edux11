"""Validate the six real-browser PDF downloads produced by the implementation.

Checks PDF syntax/parsing, page count and pagination markers, student identity,
exam metadata, report content, subject scope, filenames, embedded fonts/logo,
and renders low-resolution page previews for visual layout inspection.
"""
import json
import re
from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw
from pypdf import PdfReader

ROOT = Path('/home/user/edux11')
HERE = ROOT / 'deliverables/implementation-verification'
DOWNLOADS = HERE / 'downloads'
PREVIEWS = HERE / 'pdf-previews'
PREVIEWS.mkdir(parents=True, exist_ok=True)

EXAM = 'NEET UG · Full Mock 01'
NAME = 'Dev Student'
ROLL = 'DEV-STU-001'
STAFF_NAMES = ['Dev Faculty', 'Dev Admin']

EXPECTED = {
    'student': {
        'Exam_Intelligence_Report': {'pages': 4, 'subject': 'Physics', 'markers': ['EXAM INTELLIGENCE REPORT', 'Subject performance', 'Chapter mastery']},
        'Full_Exam_Analysis_Report': {'pages': 13, 'subject': 'Physics', 'markers': ['FULL EXAM ANAL YSIS', 'PUBLISHED  PERFORMANCE  BRIEF', 'Question-by-question analysis', 'QUESTION  / OPTIONS', 'question-review rows supplied']},
    },
    'faculty': {
        'Exam_Intelligence_Report': {'pages': 4, 'subject': 'All Subjects', 'markers': ['EXAM INTELLIGENCE REPORT', 'Subject performance', 'Chapter mastery']},
        'Full_Exam_Analysis_Report': {'pages': 19, 'subject': 'All Subjects', 'markers': ['FULL EXAM ANAL YSIS', 'PUBLISHED  PERFORMANCE  BRIEF', 'Question-by-question analysis', 'QUESTION  / OPTIONS', 'question-review rows supplied']},
    },
    'admin': {
        'Exam_Intelligence_Report': {'pages': 4, 'subject': 'All Subjects', 'markers': ['EXAM INTELLIGENCE REPORT', 'Subject performance', 'Chapter mastery']},
        'Full_Exam_Analysis_Report': {'pages': 19, 'subject': 'All Subjects', 'markers': ['FULL EXAM ANAL YSIS', 'PUBLISHED  PERFORMANCE  BRIEF', 'Question-by-question analysis', 'QUESTION  / OPTIONS', 'question-review rows supplied']},
    },
}

results = []
for role in ['student', 'faculty', 'admin']:
    files = sorted((DOWNLOADS / role).glob('*.pdf'))
    assert len(files) == 2, (role, files)
    for f in files:
        kind = 'Exam_Intelligence_Report' if 'Exam_Intelligence_Report' in f.name else 'Full_Exam_Analysis_Report'
        spec = EXPECTED[role][kind]
        raw = f.read_bytes()
        header = raw[:8]
        trailer = raw[-2048:]
        reader = PdfReader(str(f))
        doc = pymupdf.open(str(f))
        page_texts = [p.get_text() or '' for p in doc]
        full_text = '\n'.join(page_texts)
        pypdf_text = '\n'.join((p.extract_text() or '') for p in reader.pages)
        combined_text = full_text + '\n' + pypdf_text

        font_names = sorted({fnt[3] for p in doc for fnt in p.get_fonts(full=True)})
        image_xrefs = sorted({img[0] for p in doc for img in p.get_images(full=True)})
        page_numbers = [re.findall(r'PAGE\s+(\d+)', t) for t in page_texts]
        page_markers_ok = all(str(i + 1).zfill(2) in nums for i, nums in enumerate(page_numbers))
        blank_pages = [i + 1 for i, t in enumerate(page_texts) if len(t.strip()) < 80]

        # Detect severely overlapping text blocks across every page.
        severe_text_overlaps = 0
        for page in doc:
            blocks = [b for b in page.get_text('blocks') if len(b) > 4 and b[4] and b[4].strip()]
            for i in range(len(blocks)):
                a = pymupdf.Rect(blocks[i][:4])
                aa = a.get_area()
                for j in range(i + 1, len(blocks)):
                    b = pymupdf.Rect(blocks[j][:4])
                    bb = b.get_area()
                    inter = a & b
                    if inter.is_empty or min(aa, bb) <= 0:
                        continue
                    ratio = inter.get_area() / min(aa, bb)
                    if ratio > 0.35 and inter.get_area() > 50:
                        severe_text_overlaps += 1

        # Low-resolution render of first and last page for visual inspection.
        first_png = PREVIEWS / f'{role}-{kind}-first.png'
        last_png = PREVIEWS / f'{role}-{kind}-last.png'
        for page_idx, out in [(0, first_png), (len(doc) - 1, last_png)]:
            pix = doc[page_idx].get_pixmap(matrix=pymupdf.Matrix(0.65, 0.65), alpha=False)
            pix.save(str(out))
        for out in (first_png, last_png):
            im = Image.open(out).convert('RGB')
            pixels = list(im.get_flattened_data())
            nonwhite = sum(1 for r, g, b in pixels if min(r, g, b) < 245)
            if nonwhite < 0.01 * len(pixels):
                raise AssertionError(f'{out.name} appears blank')

        checks = {
            'valid_header': header.startswith(b'%PDF-'),
            'valid_eof': b'%%EOF' in trailer,
            'pypdf_parses': len(reader.pages) == spec['pages'],
            'pymupdf_parses': len(doc) == spec['pages'],
            'page_count': len(reader.pages) == spec['pages'],
            'name': NAME in full_text and NAME in pypdf_text,
            'roll': ROLL in full_text and ROLL in pypdf_text,
            'exam_name': EXAM in full_text and EXAM in pypdf_text,
            'subject_scope': spec['subject'] in full_text,
            'markers': all(m in combined_text for m in spec['markers']),
            'no_staff_identity': all(n not in full_text for n in STAFF_NAMES),
            'filename': f.name.startswith('MediXO_EduX_NEET_UG_Full_Mock_01_') and f.name.endswith('.pdf'),
            'embedded_fonts': len(font_names) >= 3,
            'logo_image': len(image_xrefs) >= 1 and b'/Subtype /Image' in raw,
            'no_blank_pages': not blank_pages,
            'pagination_markers': page_markers_ok,
            'all_pages_have_text': all(len(t.strip()) > 80 for t in page_texts),
            'no_text_block_overlap': severe_text_overlaps == 0,
        }
        entry = {
            'role': role,
            'kind': kind,
            'file': str(f.relative_to(ROOT)),
            'filename': f.name,
            'bytes': len(raw),
            'pages': len(reader.pages),
            'page_text_lengths': [len(t) for t in page_texts],
            'page_markers': [nums[:1] for nums in page_numbers],
            'severe_text_block_overlaps': severe_text_overlaps,
            'font_names': font_names,
            'image_xrefs': image_xrefs,
            'image_object_count': raw.count(b'/Subtype /Image'),
            'checks': checks,
            'ok': all(checks.values()),
            'previews': [str(first_png.relative_to(ROOT)), str(last_png.relative_to(ROOT))],
        }
        results.append(entry)

# Contact sheets for quick visual review of first and last pages.
for pos in ['first', 'last']:
    imgs = []
    for r in results:
        p = PREVIEWS / f"{r['role']}-{r['kind']}-{pos}.png"
        im = Image.open(p).convert('RGB')
        im.thumbnail((420, 560))
        imgs.append((f"{r['role']} · {r['kind'].replace('_', ' ')}", im))
    w = max(i.width for _, i in imgs) + 24
    h = max(i.height for _, i in imgs) + 46
    sheet = Image.new('RGB', (w * 2, h * 3), (235, 238, 243))
    draw = ImageDraw.Draw(sheet)
    for idx, (label, im) in enumerate(imgs):
        x = (idx % 2) * w
        y = (idx // 2) * h
        sheet.paste(im, (x + 12, y + 34))
        draw.text((x + 12, y + 10), label, fill=(15, 23, 42))
    sheet.save(PREVIEWS / f'{pos}-pages-contact-sheet.png')

out = {
    'generatedAt': __import__('datetime').datetime.now().isoformat(),
    'source': 'Six real Chromium downloads from verify-implementation.mjs (real local backend/auth/data)',
    'pypdf': __import__('pypdf').__version__,
    'pymupdf': pymupdf.__doc__.splitlines()[0],
    'results': results,
    'all_ok': all(r['ok'] for r in results),
}
(HERE / 'pdf-validation.json').write_text(json.dumps(out, indent=2, ensure_ascii=False))
(HERE / 'pdf-validation.log').write_text('\n'.join(
    f"{r['role']:8} {r['kind']:28} pages={r['pages']:2} bytes={r['bytes']:8} fonts={len(r['font_names'])} images={r['image_object_count']} ok={r['ok']} "
    + ' '.join(f'{k}={int(v)}' for k, v in r['checks'].items()) for r in results) + '\n')
print(json.dumps({'all_ok': out['all_ok'], 'files': len(results), 'previews': str(PREVIEWS)}, indent=2))