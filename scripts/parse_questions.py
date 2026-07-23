#!/usr/bin/env python3
"""Parse Jean Inman practice-test OCR text into structured questions.

Correct answers are keyed by ORIGINAL question number (answer_keys.py), so a
mis-numbered question would receive the wrong answer. To make alignment safe:

  * A question is anchored ONLY on a number that EXACTLY equals the next expected
    number. A misread label (e.g. "1." OCR'd as "4.") never matches and is
    dropped, instead of being trusted at a wrong position.
  * Resynchronisation happens by advancing the expected number (skipping a
    garbled/missing question) while scanning forward for its exact label — never
    by accepting a jumped-ahead number.

The result is a bank where every included question is confidently aligned to its
answer; unreadable questions are simply omitted (and recoverable separately).
"""
import re
import sys

OPTION_RE = re.compile(r"^[\s'‘’\"“·.,_—\-*|]*([a-dA-D])[.)]\s*(\S.*)$")
NUM_RE = re.compile(r"^[\s'‘’\"“·.,_—\-*|]{0,2}(\d{1,3})[.)]\s*(.*)$")

# How far ahead to hunt for an exact number label (covers a few dropped items).
SEARCH_WINDOW = 90


def _option(line):
    m = OPTION_RE.match(line)
    return (m.group(1).lower(), m.group(2).strip()) if m else (None, None)


def _num_at(line):
    m = NUM_RE.match(line)
    return (int(m.group(1)), m.group(2).strip()) if m else (None, None)


def _parse_block(lines, j, num):
    """Parse the question labelled `num` starting at line index j.

    Returns (question_dict_or_None, end_index).
    """
    n = len(lines)
    _, stem_first = _num_at(lines[j])
    stem_parts = [stem_first] if stem_first else []
    i = j + 1

    # Stem lines until the first "a" option.
    while i < n:
        letter, _ = _option(lines[i])
        if letter == "a":
            break
        nn, _ = _num_at(lines[i])
        if nn is not None and nn != num:
            break  # ran into another numbered line -> this item has no options
        if lines[i].strip():
            stem_parts.append(lines[i].strip())
        i += 1

    options = {}
    expect = "a"
    order = "abcd"
    while i < n:
        line = lines[i]
        letter, body = _option(line)
        nn, _ = _num_at(line)
        # A new (different) question number ends option collection.
        if nn is not None and nn != num and letter is None:
            break
        if letter == expect:
            options[expect] = body
            if expect == "d":
                i += 1
                break
            expect = order[order.index(expect) + 1]
            i += 1
        elif letter is not None and order.index(letter) > order.index(expect):
            options[letter] = body  # a letter was skipped/misread; jump ahead
            if letter == "d":
                i += 1
                break
            expect = order[order.index(letter) + 1]
            i += 1
        else:
            prev = order[order.index(expect) - 1] if expect != "a" else None
            if prev and prev in options and line.strip():
                options[prev] += " " + line.strip()
            i += 1

    stem = " ".join(p for p in stem_parts if p).strip()
    if stem and all(k in options and options[k] for k in "abcd"):
        return {"num": num, "stem": stem, "options": options}, i
    return None, i


def _find_exact(lines, expected, start, stop):
    for k in range(start, stop):
        num, _ = _num_at(lines[k])
        if num == expected:
            return k
    return None


def parse_text(text, total):
    lines = [ln.rstrip() for ln in text.splitlines()]
    n = len(lines)
    questions = []
    pos = 0
    expected = 1
    while expected <= total and pos < n:
        j = _find_exact(lines, expected, pos, min(n, pos + SEARCH_WINDOW))
        if j is None:
            expected += 1  # this question is unreadable/missing -> skip it
            continue
        q, end = _parse_block(lines, j, expected)
        if q:
            questions.append(q)
        pos = end
        expected += 1
    return questions


if __name__ == "__main__":
    total = int(sys.argv[2])
    with open(sys.argv[1], encoding="utf-8", errors="replace") as fh:
        qs = parse_text(fh.read(), total)
    nums = [q["num"] for q in qs]
    print(f"Parsed {len(qs)}  Highest: {max(nums) if nums else 0}")
    dupes = sorted({x for x in nums if nums.count(x) > 1})
    print(f"Duplicates: {dupes}")
    print(f"Missing vs {total}: {sorted(set(range(1, total + 1)) - set(nums))}")
