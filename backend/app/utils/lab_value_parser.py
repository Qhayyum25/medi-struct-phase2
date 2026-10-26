"""Turns a Lab_value entity's surface text into a structured (value, unit) pair.

Used when building Observation rows from NER output (see pipeline_service). Handles the
common clinical shapes: '8.2 %', '130/85 mmHg' (keeps the first number, e.g. systolic;
the full text is preserved as value_text so nothing is lost), '150 x10^9/L', 'negative',
'4+'. Returns (None, None) when no leading number can be found, e.g. 'positive' -
the caller then stores the raw text as value_text.
"""
import re

_LEADING_NUMBER = re.compile(r"^\s*([-+]?\d+(?:\.\d+)?)\s*(.*)$")
_UNIT_MAX_LEN = 32


def parse_lab_value(raw_text: str) -> tuple[float | None, str | None]:
    text = (raw_text or "").strip()
    if not text:
        return None, None
    match = _LEADING_NUMBER.match(text)
    if not match:
        return None, None
    try:
        value = float(match.group(1))
    except ValueError:
        return None, None
    unit = match.group(2).strip(" /") or None
    if unit and len(unit) > _UNIT_MAX_LEN:
        unit = unit[:_UNIT_MAX_LEN]
    return value, unit
