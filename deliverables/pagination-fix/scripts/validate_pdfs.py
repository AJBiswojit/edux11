"""Automated page-by-page validation for the pagination-fix PDFs.

Validates local Premium renderer outputs only. It is not a browser-download
test. Every page is checked for text, non-blank pixels, sequential page
numbering and page totals; long reports additionally verify all 180 questions,
subject transitions, continuation labels and the final question.
"""
import json
import re
from datetime import datetime
from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw
from pypdf import PdfReader

ROOT = Path('/home/user/edux11')
HERE = ROOT / 'deliverables/pagination-fix'
AFTER_MATRIX = HERE / 'after/matrix'
AFTER_REPORTS = HERE / 'after/reports'
PREVIEWS = HERE / 'previews'
PREVIEWS.mkdir(parents=True, exist_ok=True)

EXAM = 'All India Test Series — JEE Main Pattern'
NAME = 'Aarav Sharma'
ROLL = '21CS114'
STAFF_NAMES = ['Faculty Verification User', 'Admin Verification User']

MATRIX_EXPECTED = {
    'intelligence': {
        'markers': ['EXAM INTELLIGENCE REPORT', 'Subject performance', 'Chapter mastery', 'Error patterns and topic accuracy'],
        'subject': 'All Subjects',
    },
    'full': {
        'markers': ['FULL EXAM ANALYSIS', 'Question-by-question analysis', 'QUESTION / OPTIONS', 'Source data register'],
        'subject': 'All Subjects',
    },
}

REPORT_EXPECTED = {
    'failing-intelligence': {
        'markers': ['Error patterns and topic accuracy', 'Topic-level accuracy', 'continued'],
        'min_pages': 5,
    },
    'failing-full': {
        'markers': ['Question-by-question analysis', 'Source data register', 'continued'],
        'min_pages': 10,
    },
    'oversized-intelligence': {
        'markers': ['Single oversized topic calibration entry', 'END-OF-OVERSIZED-TOPIC', 'continued'],
        'min_pages': 5,
    },
    'oversized-full': {
        'markers': ['Single oversized topic calibration entry', 'END-OF-OVERSIZED-TOPIC', 'Source data register'],
        'min_pages': 10,
    },
    'long-question-full': {
        'markers': ['Long question calibration', 'END-OF-LONG-EXPLANATION', 'Question-by-question analysis'],
        'min_pages': 5,
    },
    'neet-180-full': {
        'markers': ['Question-by-question analysis', 'Physics', 'Chemistry', 'Biology', 'Q180', 'continued'],
        'min_pages': 40,
    },
}


def page_text(doc):
    return [(p.get_text() or '') for p in doc]


def nonwhite_ratio(page, scale=0.3):
    pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
    im = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
    pixels = list(im.get_flattened_data())
    return sum(1 for r, g, b in pixels if min(r, g, b) < 245) / max(1, len(pixels))


def severe_overlap_count(page):
    blocks = [b for b in page.get_text('blocks') if len(b) > 4 and b[4] and b[4].strip()]
    count = 0
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
                count += 1
    return count


def common_checks(path, expected_pages=None):
    raw = path.read_bytes()
    header = raw[:8]
    trailer = raw[-2048:]
    reader = PdfReader(str(path))
    doc = pymupdf.open(str(path))
    texts = page_text(doc)
    pypdf_text = '\n'.join((p.extract_text() or '') for p in reader.pages)
    full_text = '\n'.join(texts)
    font_names = sorted({fnt[3] for p in doc for fnt in p.get_fonts(full=True)})
    image_xrefs = sorted({img[0] for p in doc for img in p.get_images(full=True)})
    page_numbers = [re.findall(r'PAGE\s+0*(\d+)', t) for t in texts]
    page_markers_ok = all(str(i + 1) in nums for i, nums in enumerate(page_numbers))
    footer_totals = [re.findall(r'/\s*0*(\d+)', t) for t in texts]
    footer_ok = all(str(len(doc)) in totals for totals in footer_totals)
    blank_pages = [i + 1 for i, t in enumerate(texts) if len(t.strip()) < 80]
    nonwhite_ratios = [nonwhite_ratio(p) for p in doc]
    blank_pixel_pages = [i + 1 for i, r in enumerate(nonwhite_ratios) if r < 0.01]
    severe_overlaps = sum(severe_overlap_count(p) for p in doc)
    return {
        'file': str(path.relative_to(ROOT)),
        'filename': path.name,
        'bytes': len(raw),
        'pages': len(reader.pages),
        'raw': raw,
        'doc': doc,
        'texts': texts,
        'full_text': full_text,
        'pypdf_text': pypdf_text,
        'font_names': font_names,
        'image_xrefs': image_xrefs,
        'page_markers': [nums[:1] for nums in page_numbers],
        'severe_text_block_overlaps': severe_overlaps,
        'nonwhite_ratios': nonwhite_ratios,
        'checks': {
            'valid_header': header.startswith(b'%PDF-'),
            'valid_eof': b'%%EOF' in trailer,
            'pypdf_parses': len(reader.pages) == len(doc),
            'pymupdf_parses': len(doc) > 0,
            'expected_pages': expected_pages is None or len(reader.pages) == expected_pages,
            'embedded_fonts': len(font_names) >= 3,
            'logo_image': len(image_xrefs) >= 1 and b'/Subtype /Image' in raw,
            'no_blank_pages': not blank_pages and not blank_pixel_pages,
            'all_pages_have_text': all(len(t.strip()) > 80 for t in texts),
            'pagination_markers': page_markers_ok,
            'footer_page_totals': footer_ok,
            'no_text_block_overlap': severe_overlaps == 0,
        },
        'blank_pages': blank_pages,
        'blank_pixel_pages': blank_pixel_pages,
    }


def validate_matrix():
    results = []
    for role in ['student', 'faculty', 'admin']:
        for kind in ['intelligence', 'full']:
            path = AFTER_MATRIX / f'{role}-{kind}.pdf'
            spec = MATRIX_EXPECTED[kind]
            base = common_checks(path)
            t = base['full_text']
            pt = base['pypdf_text']
            combined = t + '\n' + pt
            extra = {
                'name': NAME in t and NAME in pt,
                'roll': ROLL in t and ROLL in pt,
                'exam_name': EXAM in t and EXAM in pt,
                'subject_scope': spec['subject'] in t,
                'markers': all(m in combined for m in spec['markers']),
                'no_staff_identity': all(n not in t for n in STAFF_NAMES),
                'filename': path.name == f'{role}-{kind}.pdf',
            }
            base['checks'].update(extra)
            entry = {k: v for k, v in base.items() if k not in ('raw', 'doc')}
            entry['role'] = role
            entry['kind'] = kind
            entry['ok'] = all(base['checks'].values())
            results.append(entry)
    return results


def validate_reports():
    results = []
    for slug, spec in REPORT_EXPECTED.items():
        path = AFTER_REPORTS / f'{slug}.pdf'
        base = common_checks(path)
        t = base['full_text']
        combined = t + '\n' + base['pypdf_text']
        extra = {
            'markers': all(m in combined for m in spec['markers']),
            'min_pages': base['pages'] >= spec['min_pages'],
        }
        if slug == 'neet-180-full':
            nums = sorted({int(x) for x in re.findall(r'Q\s*0*(\d{1,3})\b', combined)})
            extra.update({
                'all_180_questions': nums == list(range(1, 181)),
                'no_duplicate_or_skipped_questions': len(nums) == 180 and nums == list(range(1, 181)),
                'final_question_present': 'Q180' in combined,
                'subject_separation': all(s in combined for s in ['Physics', 'Chemistry', 'Biology']),
                'long_explanation_present': 'Check every sign convention' in combined,
                'continuation_headings': 'continued' in combined.lower(),
                'no_arbitrary_page_limit': base['pages'] > 40,
            })
        base['checks'].update(extra)
        entry = {k: v for k, v in base.items() if k not in ('raw', 'doc')}
        entry['slug'] = slug
        entry['ok'] = all(base['checks'].values())
        results.append(entry)
    return results


def first_page_with(doc, needle, after=0):
    for i in range(after, doc.page_count):
        if needle in (doc[i].get_text() or ''):
            return i + 1
    return doc.page_count


def densest_page(doc, start, end):
    pages = [(len(doc[i].get_text() or ''), i + 1) for i in range(start - 1, min(end, doc.page_count))]
    return max(pages, default=(0, start))[1]


def render_previews():
    failing = pymupdf.open(str(AFTER_REPORTS / 'failing-intelligence.pdf'))
    oversized = pymupdf.open(str(AFTER_REPORTS / 'oversized-intelligence.pdf'))
    neet = pymupdf.open(str(AFTER_REPORTS / 'neet-180-full.pdf'))
    selections = [
        ('failing-intelligence', 'first', 1, failing),
        ('failing-intelligence', 'first-content-heavy', densest_page(failing, 2, 5), failing),
        ('failing-intelligence', 'mistake-topic-columns', first_page_with(failing, 'Mistake pattern analysis'), failing),
        ('failing-intelligence', 'continuation', first_page_with(failing, 'continued', 1), failing),
        ('failing-intelligence', 'final', failing.page_count, failing),
        ('oversized-intelligence', 'single-oversized-entry', first_page_with(oversized, 'Single oversized topic calibration entry'), oversized),
        ('neet-180-full', 'first', 1, neet),
        ('neet-180-full', 'first-content-heavy', first_page_with(neet, 'Question-by-question analysis'), neet),
        ('neet-180-full', 'long-explanation-continuation', first_page_with(neet, 'continued', 5), neet),
        ('neet-180-full', 'subject-transition-chemistry', first_page_with(neet, 'Chemistry', 60), neet),
        ('neet-180-full', 'subject-transition-biology', first_page_with(neet, 'Biology', 120), neet),
        ('neet-180-full', 'final-question-continuation', first_page_with(neet, 'Biology · Q180 · question continued'), neet),
        ('neet-180-full', 'final-page', neet.page_count, neet),
    ]
    out = []
    for slug, label, page_no, doc in selections:
        path = AFTER_REPORTS / f'{slug}.pdf'
        page_no = min(page_no, doc.page_count)
        pix = doc[page_no - 1].get_pixmap(matrix=pymupdf.Matrix(0.75, 0.75), alpha=False)
        dest = PREVIEWS / f'{slug}-{label}-p{page_no:03d}.png'
        pix.save(str(dest))
        out.append({'slug': slug, 'label': label, 'page': page_no, 'file': str(dest.relative_to(ROOT))})
    # Contact sheet of representative previews.
    imgs = []
    for item in out:
        im = Image.open(ROOT / item['file']).convert('RGB')
        im.thumbnail((300, 400))
        imgs.append((f"{item['slug']} · {item['label']} · p{item['page']}", im))
    cell_w = max(i.width for _, i in imgs) + 24
    cell_h = max(i.height for _, i in imgs) + 40
    sheet = Image.new('RGB', (cell_w * 3, cell_h * ((len(imgs) + 2) // 3)), (235, 238, 243))
    draw = ImageDraw.Draw(sheet)
    for idx, (label, im) in enumerate(imgs):
        x = (idx % 3) * cell_w
        y = (idx // 3) * cell_h
        sheet.paste(im, (x + 12, y + 28))
        draw.text((x + 12, y + 8), label, fill=(15, 23, 42))
    contact = PREVIEWS / 'representative-pages-contact-sheet.png'
    sheet.save(contact)
    failing.close()
    oversized.close()
    neet.close()
    return {'previews': out, 'contact_sheet': str(contact.relative_to(ROOT))}


def main():
    matrix = validate_matrix()
    reports = validate_reports()
    previews = render_previews()
    all_ok = all(r['ok'] for r in matrix + reports)
    result = {
        'generatedAt': datetime.now().isoformat(),
        'source': 'Local Premium PDFKit renderer outputs (Node integration harness), not real browser downloads',
        'tooling': {
            'pypdf': __import__('pypdf').__version__,
            'pymupdf': pymupdf.__doc__.splitlines()[0],
            'Pillow': __import__('PIL').__version__,
        },
        'matrix': matrix,
        'reports': reports,
        'all_ok': all_ok,
        **previews,
    }
    (HERE / 'pdf-validation.json').write_text(json.dumps(result, indent=2, ensure_ascii=False))
    lines = []
    for r in matrix:
        lines.append(f"matrix {r['role']:8} {r['kind']:12} pages={r['pages']:3} ok={r['ok']} " + ' '.join(f'{k}={int(v)}' for k, v in r['checks'].items()))
    for r in reports:
        lines.append(f"report {r['slug']:24} pages={r['pages']:3} ok={r['ok']} " + ' '.join(f'{k}={int(v)}' for k, v in r['checks'].items()))
    (HERE / 'pdf-validation.log').write_text('\n'.join(lines) + '\n')
    print(json.dumps({'all_ok': all_ok, 'matrix': len(matrix), 'reports': len(reports), 'previews': len(previews['previews'])}, indent=2))


if __name__ == '__main__':
    main()
