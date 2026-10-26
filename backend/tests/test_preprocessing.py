from app.services.preprocessing_service import preprocessing_service as pre


def test_whitespace_and_blank_lines_normalised():
    assert pre.preprocess("Patient   has\t fever.  \n\n\n\n Plan:   rest ") == "Patient has fever.\n\nPlan: rest"


def test_line_endings_and_form_feed():
    assert pre.preprocess("a\r\nb\rc\fd", unwrap_lines=False) == "a\nb\nc\nd"


def test_typography_and_ligatures_normalised():
    out = pre.preprocess("The \u201cdiagnosis\u201d \u2013 \ufb01rst visit\u2026 it\u2019s stable")
    assert out == 'The "diagnosis" - first visit... it\'s stable'


def test_invisible_and_control_characters_removed():
    assert pre.preprocess("hyper\u200btension\x00 \x07ok") == "hypertension ok"


def test_hyphenated_line_break_is_joined_only_for_lowercase():
    assert pre.preprocess("hyper-\ntension") == "hypertension"
    assert pre.preprocess("Type-\nII") == "Type-\nII"


def test_hard_wrapped_lines_unwrapped_but_structure_kept():
    text = "The patient complained of pain in\nthe lower back.\nMedications:\n- Metformin 500 mg\n- Aspirin"
    assert pre.preprocess(text) == (
        "The patient complained of pain in the lower back.\nMedications:\n- Metformin 500 mg\n- Aspirin")


def test_unwrap_can_be_disabled():
    assert pre.preprocess("a\nb", unwrap_lines=False) == "a\nb"


def test_clinical_punctuation_and_symbols_preserved():
    text = "BP 120/80 mmHg; HbA1c \u2265 6.5% (n=3) [ref: 4.0-5.6] T 37.5\u00b0C BSA 1.7 m\u00b2 \u00b12 \u00b5g/L"
    assert pre.preprocess(text) == text


def test_idempotent_and_empty():
    once = pre.preprocess("  A   b\n\n\n c ")
    assert pre.preprocess(once) == once
    assert pre.preprocess("") == "" and pre.preprocess("   \n ") == ""
