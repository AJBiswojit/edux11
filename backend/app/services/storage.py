"""Filesystem object storage for generated files (PDFs, uploads)."""

from __future__ import annotations

from pathlib import Path


def storage_root() -> Path:
    root = Path(__file__).resolve().parents[2] / "var" / "storage"
    root.mkdir(parents=True, exist_ok=True)
    return root


def write_bytes(object_key: str, data: bytes) -> Path:
    path = storage_root() / object_key
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return path


def read_bytes(object_key: str) -> bytes | None:
    path = storage_root() / object_key
    if not path.is_file():
        return None
    return path.read_bytes()


def write_simple_pdf(*, title: str, lines: list[str]) -> bytes:
    """Minimal PDF 1.4 bytes — real file, not a fake success flag."""

    def _esc(value: str) -> str:
        return (value or "").replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")[:140]

    ops = ["BT", "/F1 16 Tf", "50 780 Td", f"({_esc(title)}) Tj", "/F1 11 Tf"]
    for line in (lines or [])[:42]:
        ops.append(f"0 -16 Td ({_esc(line)}) Tj")
    ops.append("ET")
    stream = "\n".join(ops).encode("latin-1", errors="replace")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out.extend(f"{index} 0 obj\n".encode())
        out.extend(obj)
        out.extend(b"\nendobj\n")
    xref = len(out)
    out.extend(f"xref\n0 {len(objects) + 1}\n".encode())
    out.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        out.extend(f"{off:010d} 00000 n \n".encode())
    out.extend(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    return bytes(out)
