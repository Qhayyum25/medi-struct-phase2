"""Low-level text helpers shared by the preprocessing service."""
import re
import unicodedata

# Typographic characters that PDFs/Word love to insert, mapped to plain equivalents.
_TRANSLATE = str.maketrans({
    "\u2018": "'", "\u2019": "'", "\u201a": "'", "\u201b": "'",
    "\u201c": '"', "\u201d": '"', "\u201e": '"',
    "\u2013": "-", "\u2014": "-", "\u2212": "-", "\u2010": "-", "\u2011": "-",
    "\u2022": "-", "\u2023": "-", "\u25cf": "-", "\u25aa": "-", "\u25e6": "-", "\u2043": "-",
    "\u2026": "...",
    "\ufb00": "ff", "\ufb01": "fi", "\ufb02": "fl", "\ufb03": "ffi", "\ufb04": "ffl",
    "\u00a0": " ", "\u2002": " ", "\u2003": " ", "\u2009": " ", "\u202f": " ", "\u3000": " ",
    "\f": "\n",
})

# Invisible / control characters that carry no clinical meaning.
_INVISIBLE = re.compile(
    "[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f"
    "\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff\u00ad]")
_HORIZONTAL_WS = re.compile(r"[ \t]+")
_MANY_BLANK_LINES = re.compile(r"\n{3,}")
_SOFT_HYPHEN_BREAK = re.compile(r"(?<=[a-z])-\n(?=[a-z])")


def normalize_unicode(text: str) -> str:
    """NFC-normalise and replace typographic characters with plain ASCII equivalents.

    NFC (not NFKC) is used on purpose so clinically meaningful symbols such as
    m², µ, ½, ± and ≥ are preserved.
    """
    text = unicodedata.normalize("NFC", text)
    return text.translate(_TRANSLATE)


def strip_invisible(text: str) -> str:
    return _INVISIBLE.sub("", text)


def normalize_newlines(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n")


def join_hyphenated_line_breaks(text: str) -> str:
    """'hyper-\\ntension' -> 'hypertension' (only when both sides are lower-case letters)."""
    return _SOFT_HYPHEN_BREAK.sub("", text)


def collapse_horizontal_whitespace(text: str) -> str:
    """Collapse runs of spaces/tabs to one space and trim each line."""
    return "\n".join(_HORIZONTAL_WS.sub(" ", line).strip() for line in text.split("\n"))


def collapse_blank_lines(text: str) -> str:
    return _MANY_BLANK_LINES.sub("\n\n", text)


def unwrap_hard_wrapped_lines(text: str) -> str:
    """Join lines that were only broken by page width.

    A line is joined to the next one only when it does NOT end in sentence/list
    punctuation and the next line starts with a lower-case letter. Headings,
    bullet lists and 'Label: value' lines therefore keep their structure.
    """
    lines = text.split("\n")
    out: list[str] = []
    for line in lines:
        if (out and out[-1] and line and line[0].islower()
                and out[-1][-1] not in ".:;?!"):
            out[-1] = f"{out[-1]} {line}"
        else:
            out.append(line)
    return "\n".join(out)


# ------------------------------------------------------------------ sentence / chunk spans
_ABBREVIATIONS = {"dr", "mr", "mrs", "ms", "prof", "vs", "approx", "fig", "no", "st", "sr",
                  "jr", "inj", "tab", "cap", "amp", "cf", "viz", "etc"}
_DOTTED_ABBREVIATION = re.compile(r"[a-z](?:\.[a-z])+")          # b.i.d  e.g  i.v
_SENTENCE_BOUNDARY = re.compile(r"(?<=[.!?])[ \t]+(?=[A-Z0-9\[(\"'])")
_LAST_TOKEN = re.compile(r"(\S+)$")


def _is_abbreviation(word: str) -> bool:
    return (word in _ABBREVIATIONS or bool(_DOTTED_ABBREVIATION.fullmatch(word))
            or (len(word) == 1 and word.isalpha()))


def split_sentences(text: str) -> list[tuple[int, int]]:
    """Return (start, end) character spans of sentences. Every line break is a boundary,
    which suits clinical notes (headings, bullet lists). Offsets index into `text`."""
    spans: list[tuple[int, int]] = []

    def add(line_start: int, line: str, s: int, e: int) -> None:
        segment = line[s:e]
        stripped = segment.strip()
        if stripped:
            lead = len(segment) - len(segment.lstrip())
            spans.append((line_start + s + lead, line_start + s + lead + len(stripped)))

    pos = 0
    for line in text.split("\n"):
        line_start, pos = pos, pos + len(line) + 1
        if not line.strip():
            continue
        seg_start = 0
        for m in _SENTENCE_BOUNDARY.finditer(line):
            token = _LAST_TOKEN.search(line[seg_start:m.start()])
            word = token.group(1).rstrip(".!?").lower() if token else ""
            if _is_abbreviation(word):
                continue
            add(line_start, line, seg_start, m.start())
            seg_start = m.end()
        add(line_start, line, seg_start, len(line))
    return spans


def chunk_spans(text: str, max_chars: int) -> list[tuple[int, int]]:
    """Pack whole sentences into chunks of at most `max_chars` characters.

    A single sentence longer than `max_chars` is split at whitespace. Spans index into
    `text`, so entity offsets found inside a chunk can be shifted back exactly.
    """
    pieces: list[tuple[int, int]] = []
    for s, e in split_sentences(text):
        while e - s > max_chars:
            cut = text.rfind(" ", s + 1, s + max_chars)
            cut = cut if cut > s else s + max_chars
            pieces.append((s, cut))
            s = cut
            while s < e and text[s].isspace():
                s += 1
        if s < e:
            pieces.append((s, e))

    chunks: list[tuple[int, int]] = []
    for s, e in pieces:
        if chunks and e - chunks[-1][0] <= max_chars:
            chunks[-1] = (chunks[-1][0], e)
        else:
            chunks.append((s, e))
    return chunks
