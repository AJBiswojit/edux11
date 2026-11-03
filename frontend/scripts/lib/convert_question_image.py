#!/usr/bin/env python3
"""Convert one question figure to PNG for the Node PDF generation harness.

The browser export converts WebP/AVIF/SVG with the browser's own decoder
(`convertImageWithCanvas`). This script exists only so the headless generation
harness can exercise the same asset pipeline against real files. It reads the
source image on stdin and writes PNG bytes to stdout.

Usage (called by frontend/scripts/lib/node-media-loader.mjs):
    python3 scripts/convert_question_image.py <webp|avif|gif|bmp|tiff|svg>
"""

from __future__ import annotations

import io
import sys

try:
    from PIL import Image
except ImportError as exc:  # pragma: no cover - dev tooling only
    raise SystemExit(f"Pillow is required for headless figure conversion: {exc}")

try:  # AVIF support is optional; installed in the QA environment.
    import pillow_avif  # noqa: F401
except ImportError:
    pass


def main() -> int:
    source_format = (sys.argv[1] if len(sys.argv) > 1 else "webp").lower()
    payload = sys.stdin.buffer.read()
    if not payload:
        raise SystemExit("no image bytes on stdin")
    if source_format == "svg":
        # Rasterise SVG via CairoSVG when available; otherwise fail loudly.
        try:
            import cairosvg  # type: ignore
        except ImportError as exc:
            raise SystemExit(f"SVG conversion requires cairosvg: {exc}")
        png = cairosvg.svg2png(bytestring=payload)
        sys.stdout.buffer.write(png)
        return 0
    with Image.open(io.BytesIO(payload)) as image:
        image.load()
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA")
        output = io.BytesIO()
        image.save(output, format="PNG", optimize=True)
        sys.stdout.buffer.write(output.getvalue())
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
