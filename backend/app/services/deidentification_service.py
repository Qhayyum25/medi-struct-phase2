"""Module 7 - de-identification of PHI/PII.

`RuleBasedDeidentifier` combines labelled-field rules and regular expressions. It sits
behind the small `Deidentifier` protocol, so a transformer-based de-identification model
can later replace it without touching the pipeline or the API.

Policy (HIPAA Safe-Harbor inspired): full dates and month-day dates are replaced, bare
years and month-year expressions are kept because they carry little identifying power
but a lot of clinical value.

Nothing in this module logs text; only counts are logged.
"""
import logging
import re
from dataclasses import dataclass, field
from typing import Callable, Protocol

logger = logging.getLogger("app.deidentification")

_MONTH = (r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|"
          r"Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)")
_DAYMON = r"(?:0?[1-9]|[12]\d|3[01])"
# Words that follow a title but are clinical/structural words, not part of a name.
_STOP = (r"(?:Patient|Hospital|Clinic|Department|Diagnosis|Diabetes|Hypertension|Mellitus|"
         r"Report|History|Complaint|Medications?|Assessment|Plan|Discharge|Summary|"
         r"Examination|Advice|Follow|Prescription|Notes?|Doctor)")
_NAME_TOKEN = rf"(?!{_STOP}\b)[A-Z][A-Za-z'’-]+"

@dataclass
class DeidentificationResult:
    text: str
    counts: dict[str, int] = field(default_factory=dict)

    @property
    def total(self) -> int:
        return sum(self.counts.values())

class Deidentifier(Protocol):
    def deidentify(self, text: str) -> DeidentificationResult: ...

# --- rules: (placeholder, compiled regex, group to replace or None for whole match) ----
_Rule = tuple[str, "re.Pattern[str]", str | None]

def _rule(placeholder: str, pattern: str, group: str | None = None, flags: int = 0) -> _Rule:
    return placeholder, re.compile(pattern, flags), group

_RULES: list[_Rule] = [
    # E-mail / URL
    _rule("EMAIL", r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+"),
    _rule("URL", r"\b(?:https?://|www\.)[^\s<>\"']+", flags=re.I),

    # Government-style numbers without a label
    _rule("ID", r"(?<!\d)\d{4}[ ]\d{4}[ ]\d{4}(?!\d)"),          # Aadhaar
    _rule("ID", r"(?<!\d)\d{3}-\d{2}-\d{4}(?!\d)"),               # US SSN
    _rule("ID", r"\b[A-Z]{5}\d{4}[A-Z]\b"),                       # PAN

    # Labelled identifiers: keep the label, replace the value
    _rule("ID", (
        r"(?P<label>\b(?:MRN|UHID|medical[ \t]+record(?:[ \t]+(?:no\.?|number|#))?|"
        r"patient[ \t]+id|pt\.?[ \t]*id|member[ \t]+id|(?:op|ip)[ \t]*(?:no\.?|number)|"
        r"reg(?:istration)?\.?[ \t]*(?:no\.?|number)|hospital[ \t]*(?:no\.?|number)|"
        r"case[ \t]*(?:no\.?|number)|file[ \t]*(?:no\.?|number)|"
        r"account[ \t]*(?:no\.?|number)|insurance[ \t]*(?:no\.?|number|id)|"
        r"policy[ \t]*(?:no\.?|number)|aadhaar(?:[ \t]*(?:no\.?|number))?|ssn|"
        r"pan[ \t]*(?:no\.?|number)|(?-i:ID))[ \t]*[:#\-]?[ \t]*)"
        r"(?P<value>(?=[A-Za-z0-9\-/]*\d)[A-Za-z0-9][A-Za-z0-9\-/]{3,})"), "value", re.I),

    # Addresses
    _rule("ADDRESS", (
        r"(?P<label>\b(?:permanent[ \t]+|current[ \t]+|residential[ \t]+)?address[ \t]*[:\-][ \t]*)"
        r"(?P<value>[^\n]{5,150})"), "value", re.I),
    _rule("ADDRESS", (
        r"(?P<label>\b(?:resident[ \t]+of|resides[ \t]+at|residing[ \t]+at|r/o)[ \t]+)"
        r"(?P<value>[A-Z0-9][^\n.;]{2,80}?)"
        r"(?=[.;\n]|[ \t]+(?:and|who|with|presented|presenting|complains|c/o|known|has|had|was|is)\b|$)"),
        "value", re.M),
    _rule("ADDRESS", (
        r"\b(?:pin(?:[ \t]*code)?|zip(?:[ \t]*code)?|postal[ \t]*code)[ \t]*[:\-]?[ \t]*"
        r"\d{5,6}(?:-\d{4})?"), None, re.I),
    _rule("ADDRESS", (
        r"\b(?:(?:H|D|Door|Flat|Plot)\.?[ \t]*(?:No\.?|#)?[ \t]*)?"
        r"\d{1,5}[A-Za-z]?(?:[-/]\d{1,5}){0,3},?[ \t]+(?:[A-Z][\w.'-]*[ \t]+){1,4}"
        r"(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Nagar|Colony|Marg|Boulevard|Blvd|Drive|"
        r"Layout|Enclave|Circle|Highway|Hwy)\b\.?"), None),

    # Phones
    _rule("PHONE", (
        r"(?P<label>\b(?:phone|tel|telephone|mobile|mob|cell|contact|fax|whatsapp)\b\.?[ \t]*"
        r"(?:no\.?|number|#)?[ \t]*[:\-]?[ \t]*)(?P<value>\+?\d[\d \t\-().]{5,18}\d)"),
        "value", re.I),
    _rule("PHONE", r"(?<![\w.])\+\d{1,3}[ \t.-]?\(?\d{2,5}\)?[ \t.-]?\d{3,5}[ \t.-]?\d{3,5}(?!\d)"),
    _rule("PHONE", r"(?<![\w.])(?:\(\d{3}\)[ \t]?|\d{3}[-.])\d{3}[-.]\d{4}(?!\d)"),  # US
    _rule("PHONE", r"(?<![\d.])0?[6-9]\d{4}[ \t-]?\d{5}(?!\d)"),                     # India mobile
    _rule("PHONE", r"(?<![\d.])0\d{2,4}[ \t-]\d{6,8}(?!\d)"),                        # India landline

    # Dates (bare years and month-year are intentionally kept)
    _rule("DATE", r"\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b"),
    _rule("DATE", rf"(?<![\d/.-]){_DAYMON}[-/.]{_DAYMON}[-/.](?:\d{{4}}|\d{{2}})(?![\d/-]|\.\d)"),
    _rule("DATE", rf"\b\d{{1,2}}(?:st|nd|rd|th)?[ \t]+(?:of[ \t]+)?{_MONTH}\b\.?,?[ \t]+\d{{2,4}}\b"),
    _rule("DATE", rf"\b{_MONTH}\b\.?[ \t]+\d{{1,2}}(?:st|nd|rd|th)?(?:,?[ \t]+\d{{4}})?\b"),

    # Names: titles, then explicitly labelled patient/relative fields
    _rule("NAME", (
        rf"\b(?:Mr|Mrs|Ms|Miss|Mx|Dr|Prof|Shri|Smt|Sri|Master)\b\.?[ \t]+"
        rf"(?:[A-Z]\.[ \t]?)*{_NAME_TOKEN}(?:[ \t]+(?:[A-Z]\.|{_NAME_TOKEN})){{0,2}}"), None),
    _rule("NAME", (
        r"(?P<label>(?:^[ \t]*name|\b(?:patient(?:'s)?[ \t]+name|pt\.?[ \t]*name|"
        r"(?:father|mother|husband|wife|spouse|guardian)(?:'s)?[ \t]*name|guardian|"
        r"next[ \t]+of[ \t]+kin|emergency[ \t]+contact|informant))[ \t]*[:\-][ \t]*)"
        r"(?P<value>[A-Za-z][^\n,;|:]{1,59}?)"
        r"(?=[ \t]{2,}|[ \t]+[A-Za-z]+[ \t]*:|[ \t]*(?:\n|,|;|\||$))"), "value", re.I | re.M),
]

def _apply(rule: _Rule, text: str) -> tuple[str, int]:
    placeholder, pattern, group = rule
    token = f"[{placeholder}]"

    def repl(match: "re.Match[str]") -> str:
        if group is None:
            return token
        start, end = match.span(group)
        offset = match.start()
        whole = match.group(0)
        return whole[: start - offset] + token + whole[end - offset:]

    return pattern.subn(repl, text)

class RuleBasedDeidentifier:
    """Regex + labelled-field de-identifier. See module docstring for the policy."""

    def __init__(self, rules: list[_Rule] | None = None) -> None:
        self._rules = rules if rules is not None else _RULES

    def deidentify(self, text: str) -> DeidentificationResult:
        counts: dict[str, int] = {}
        for rule in self._rules:
            text, n = _apply(rule, text)
            if n:
                counts[rule[0]] = counts.get(rule[0], 0) + n
        logger.info("de-identification finished", extra={"count": sum(counts.values())})
        return DeidentificationResult(text=text, counts=counts)

_default: Deidentifier = RuleBasedDeidentifier()

def get_deidentifier() -> Deidentifier:
    """FastAPI-friendly accessor; swap the implementation here (or override in tests)."""
    return _default
