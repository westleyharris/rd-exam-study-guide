#!/usr/bin/env python3
"""Independent OCR read of an answer-key page, column by column.

The key is a grid of "<number> <letter>" cells in column-major order. Cropping to
one column at a time keeps Tesseract reading top-to-bottom without scrambling.
This produces a machine read of {number: letter} used to CROSS-CHECK the careful
vision transcription in answer_keys.py (mismatches get zoomed and resolved by
hand). Letters must be verified, so ambiguous cells are reported as '?'.

Usage: python3 ocr_answer_key.py <page.png> x0 x1 x2 ...   (column boundaries)
"""
import re
import subprocess
import sys

from PIL import Image

LETTER_FIX = {"¢": "c", "€": "c", "©": "c", "o": "c", "0": "c",
              "6": "b", "&": "b", "|": "d", "1": "d", "l": "d"}


def clean_letter(token: str):
    token = token.strip().lower()
    for ch in token:
        if ch in "abcd":
            return ch
    for ch in token:
        if ch in LETTER_FIX:
            return LETTER_FIX[ch]
    return "?"


def ocr_column(im, x0, x1):
    w, h = im.size
    crop = im.crop((max(0, x0), 0, min(w, x1), h))
    txt = subprocess.run(
        ["tesseract", "-", "-", "--psm", "6"],
        input=_png_bytes(crop), capture_output=True, check=True
    ).stdout.decode()
    pairs = {}
    for line in txt.splitlines():
        line = line.strip()
        if not line:
            continue
        m = re.match(r"^[^0-9]{0,2}(\d{1,3})(.*)$", line)
        if not m:
            continue
        num = int(m.group(1))
        pairs[num] = clean_letter(m.group(2))
    return pairs


def _png_bytes(im):
    import io
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    return buf.getvalue()


def main():
    page = sys.argv[1]
    bounds = [int(x) for x in sys.argv[2:]]
    im = Image.open(page)
    allpairs = {}
    for a, b in zip(bounds, bounds[1:]):
        col = ocr_column(im, a, b)
        for k, v in col.items():
            allpairs.setdefault(k, v)
    for num in sorted(allpairs):
        print(f"{num} {allpairs[num]}")


if __name__ == "__main__":
    main()
