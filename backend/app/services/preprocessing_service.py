"""Module 6 - text preprocessing.

Entity positions: this service runs BEFORE de-identification and NER. Entity offsets
are always computed against the final stored `deidentified_text`, which is never
modified afterwards, so positions cannot drift.
"""
from app.utils import text_utils as tu


class PreprocessingService:
    def preprocess(self, text: str, *, unwrap_lines: bool = True) -> str:
        """Clean raw extracted text for NLP.

        Steps: newline normalisation -> Unicode/typography normalisation -> removal of
        invisible/control characters -> de-hyphenation of wrapped words -> whitespace
        collapsing -> optional unwrapping of hard-wrapped lines -> blank-line collapsing.
        Clinically meaningful punctuation (/ % . , : ; ( ) [ ] < > = + - ° ± ≥ ≤) is kept.
        """
        if not text:
            return ""
        text = tu.normalize_newlines(text)
        text = tu.normalize_unicode(text)
        text = tu.strip_invisible(text)
        text = tu.join_hyphenated_line_breaks(text)
        text = tu.collapse_horizontal_whitespace(text)
        if unwrap_lines:
            text = tu.unwrap_hard_wrapped_lines(text)
        text = tu.collapse_blank_lines(text)
        return text.strip()


preprocessing_service = PreprocessingService()
