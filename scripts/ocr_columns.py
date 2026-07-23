#!/usr/bin/env python3
"""Re-OCR the two-column scanned practice tests into clean, correctly ordered text.

The PDFs' embedded OCR layer interleaves the two page columns line-by-line, which
is unparseable. This renders each page to an image, splits it into left/right
columns, OCRs each column separately with Tesseract, and concatenates them in
natural reading order (page1 left, page1 right, page2 left, ...).

Usage: python3 ocr_columns.py "<input.pdf>" "<output.txt>"
"""
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

DPI = 300
# Split slightly right of dead-center; the printed gutter sits near the middle.
GUTTER_OFFSET = 20


def page_count(pdf: str) -> int:
    out = subprocess.run(
        ["pdfinfo", pdf], capture_output=True, text=True, check=True
    ).stdout
    for line in out.splitlines():
        if line.startswith("Pages:"):
            return int(line.split()[1])
    raise RuntimeError("could not read page count")


def ocr_image(path: Path) -> str:
    return subprocess.run(
        ["tesseract", str(path), "-", "--psm", "6"],
        capture_output=True,
        text=True,
        check=True,
    ).stdout


def main(pdf: str, out_txt: str) -> None:
    n = page_count(pdf)
    chunks: list[str] = []
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        for pg in range(1, n + 1):
            prefix = tmp / f"pg{pg}"
            subprocess.run(
                ["pdftoppm", "-png", "-r", str(DPI), "-f", str(pg), "-l",
                 str(pg), pdf, str(prefix)],
                check=True,
            )
            # pdftoppm zero-pads the page suffix to the width of the max page num.
            png = next(tmp.glob(f"pg{pg}-*.png"))
            im = Image.open(png)
            w, h = im.size
            mid = w // 2 + GUTTER_OFFSET
            left = im.crop((0, 0, mid, h))
            right = im.crop((mid, 0, w, h))
            lpath = tmp / f"pg{pg}-L.png"
            rpath = tmp / f"pg{pg}-R.png"
            left.save(lpath)
            right.save(rpath)
            chunks.append(ocr_image(lpath))
            chunks.append(ocr_image(rpath))
            print(f"  page {pg}/{n} done", file=sys.stderr)
    Path(out_txt).write_text("\n".join(chunks), encoding="utf-8")
    print(f"Wrote {out_txt}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
