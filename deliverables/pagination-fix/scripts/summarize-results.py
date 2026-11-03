"""Build a compact, repeatable summary from the regenerated render manifests."""
import json
from datetime import datetime
from pathlib import Path

ROOT = Path('/home/user/edux11/deliverables/pagination-fix')
ROLES = ['student', 'faculty', 'admin']
KINDS = ['intelligence', 'full']
REPORTS = [
    'failing-intelligence', 'failing-full', 'oversized-intelligence',
    'oversized-full', 'long-question-full', 'neet-180-full',
]


def entry(path):
    d = json.loads((ROOT / path).read_text())
    summary = d.get('auditSummary') or {}
    return {
        'file': path,
        'ok': d.get('ok'),
        'error': (d.get('error') or {}).get('message'),
        'componentHeight': d.get('componentHeight'),
        'pageCount': d.get('pageCount'),
        'bytes': d.get('bytes'),
        'studentName': d.get('studentName'),
        'rollNo': d.get('rollNo'),
        'examName': d.get('examName'),
        'zeroUnintendedOverlaps': summary.get('zeroUnintendedOverlaps'),
        'repeatedTableHeaderFailures': len(summary.get('repeatedTableHeaderFailures') or []),
        'componentBoundaryViolations': len(summary.get('componentBoundaryViolations') or []),
        'overflowingComponents': len(summary.get('overflowingComponents') or []),
        'missingValuesCount': len(d.get('missingValues') or []),
        'flags': len(d.get('flags') or []),
    }


def main():
    calibration = json.loads((ROOT / 'calibration.json').read_text())
    result = {
        'generatedAt': datetime.now().isoformat(),
        'source': 'Synthetic/local fixtures rendered by the Node Premium PDFKit integration harness; exact original failing production payload is unavailable.',
        'calibration': calibration,
        'beforeFailingIntelligence': entry('before/failing-intelligence.json'),
        'beforeMatrix': [entry(f'before/matrix/{r}-{k}.json') for r in ROLES for k in KINDS],
        'afterMatrix': [entry(f'after/matrix/{r}-{k}.json') for r in ROLES for k in KINDS],
        'afterReports': [entry(f'after/reports/{s}.json') for s in REPORTS],
    }
    after = result['afterMatrix'] + result['afterReports']
    result['allAfterOk'] = all(e['ok'] for e in after)
    result['allAfterAuditsClean'] = all(e['zeroUnintendedOverlaps'] for e in after)
    (ROOT / 'generation-results.json').write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
    print('allAfterOk', result['allAfterOk'])
    print('allAfterAuditsClean', result['allAfterAuditsClean'])
    for e in after:
        print(e['file'], 'pages', e['pageCount'], 'audit', e['zeroUnintendedOverlaps'])


if __name__ == '__main__':
    main()
