#!/usr/bin/env python3
"""Prepare the reusable Full Exam Analysis doorway illustration.

The source is the supplied minimalist open-door poster (secondary composition
reference). This script crops only the doorway / walking-student / upper-path
artwork, keys out the white negative space, preserves the doorway glow and
shoes, fades the lower path into the native PDFKit pathway, and upsamples 2x
for embedding. It never crops report text or UI from the generated cover.

Usage:
  python3 frontend/scripts/prepare-cover-illustration.py SOURCE_POSTER.png
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "src/assets/premium-cover-doorway.png"

# Crop in the original 1024 x 1536 poster coordinate system.
CROP = (630, 430, 955, 980)
# Upper edge of the blue floor in the original poster.
PATH_TOP_INTERCEPT = 1133.0
PATH_TOP_SLOPE = -0.365
# Bright doorway opening, kept opaque so the glow survives alpha keying.
DOOR_OPENING = [(754, 497), (818, 487), (818, 884), (754, 858)]


def clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: prepare-cover-illustration.py SOURCE_POSTER.png")
    source = Image.open(sys.argv[1]).convert("RGB")
    if source.size != (1024, 1536):
        raise SystemExit(f"Expected the supplied 1024x1536 poster, got {source.size}")

    crop = source.crop(CROP)
    width, height = crop.size
    opening_mask = Image.new("L", source.size, 0)
    ImageDraw.Draw(opening_mask).polygon(DOOR_OPENING, fill=255)
    opening_mask = opening_mask.crop(CROP)

    rgba = crop.convert("RGBA")
    pixels = rgba.load()
    opening = opening_mask.load()
    for y in range(height):
        original_y = y + CROP[1]
        for x in range(width):
            original_x = x + CROP[0]
            r, g, b, _ = pixels[x, y]
            path_top = PATH_TOP_INTERCEPT + PATH_TOP_SLOPE * original_x
            in_path = original_y >= path_top
            in_opening = opening[x, y] > 0
            if in_path or in_opening:
                alpha = 255
            else:
                luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
                saturation = max(r, g, b) - min(r, g, b)
                # White paper becomes transparent; blue-tinted glow and the
                # dark walking figure remain. This keeps the asset reusable on
                # the white editorial canvas without a visible rectangle.
                if luminance > 245 and saturation < 12:
                    alpha = 0
                else:
                    alpha = round(255 * clamp((250.0 - luminance) / 30.0 + saturation / 40.0))
            # The native PDFKit pathway continues below the asset. Fade only
            # the last 20 source pixels (below the student's shoes) to avoid a
            # hard seam where the vector gradient takes over.
            if original_y > 960:
                alpha = round(alpha * clamp((980 - original_y) / 20.0))
            pixels[x, y] = (r, g, b, alpha)

    rgba = rgba.resize((width * 2, height * 2), Image.Resampling.LANCZOS)
    rgba = rgba.filter(ImageFilter.UnsharpMask(radius=1.0, percent=70, threshold=2))
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    rgba.save(TARGET, optimize=True)
    print(f"Wrote {TARGET.relative_to(ROOT)} ({rgba.width}x{rgba.height}, RGBA)")


if __name__ == "__main__":
    main()
