#!/usr/bin/env python3
"""Verified answer keys for the Jean Inman practice tests.

The sequences live in scripts/keys/{d1,d2,d34}.txt: the correct option (a-d) for
questions 1..N of each Inman domain file, in order. They were transcribed by hand
from the high-resolution key images, then independently cross-checked cell by
cell against a column-wise Tesseract read; every one of the 9 disagreements was
zoomed and resolved from the source image (the OCR was wrong in all 9).
Counts: Domain I = 358, Domain II = 467, Domain III/IV = 361.
"""
from pathlib import Path

KEYS_DIR = Path(__file__).parent / "keys"
EXPECTED = {"d1": 358, "d2": 467, "d34": 361}


def as_dict(name):
    """Return {question_number: 'a'|'b'|'c'|'d'} for a key sequence."""
    letters = (KEYS_DIR / f"{name}.txt").read_text().split()
    assert len(letters) == EXPECTED[name], (
        f"{name}: got {len(letters)} answers, expected {EXPECTED[name]}"
    )
    assert all(x in "abcd" for x in letters), f"{name}: invalid letter present"
    return {i + 1: letters[i] for i in range(len(letters))}


if __name__ == "__main__":
    for n in EXPECTED:
        d = as_dict(n)
        print(f"{n}: {len(d)} answers OK (expected {EXPECTED[n]})")
