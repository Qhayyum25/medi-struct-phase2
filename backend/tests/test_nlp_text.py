from app.utils.text_utils import chunk_spans, split_sentences


def _sentences(text):
    return [text[s:e] for s, e in split_sentences(text)]


def test_sentence_split_basic_and_offsets():
    text = "Patient has diabetes. Started on Metformin.\nBP 130/85 mmHg. HbA1c 8.2. Stable."
    assert _sentences(text) == ["Patient has diabetes.", "Started on Metformin.",
                                "BP 130/85 mmHg.", "HbA1c 8.2.", "Stable."]


def test_abbreviations_and_decimals_do_not_split():
    text = "Seen by Dr. Rao today. Take 1 tab b.i.d. with food. Weight 70.5 kg. Fine."
    assert _sentences(text) == ["Seen by Dr. Rao today.", "Take 1 tab b.i.d. with food.",
                                "Weight 70.5 kg.", "Fine."]


def test_every_line_break_is_a_boundary_and_blank_lines_ignored():
    text = "Medications:\n- Metformin 500 mg\n\n- Aspirin 75 mg"
    assert _sentences(text) == ["Medications:", "- Metformin 500 mg", "- Aspirin 75 mg"]


def test_chunks_cover_all_text_and_respect_limit():
    text = " ".join(f"Sentence number {i} has fever." for i in range(120))
    chunks = chunk_spans(text, 300)
    assert len(chunks) > 5 and all(e - s <= 300 for s, e in chunks)
    assert chunks[0][0] == 0 and chunks[-1][1] == len(text)
    rebuilt = "".join(text[s:e] for s, e in chunks)
    assert rebuilt.replace(" ", "") == text.replace(" ", "")


def test_oversized_sentence_is_split_at_whitespace():
    text = "word " * 400
    chunks = chunk_spans(text.strip(), 100)
    assert all(e - s <= 100 for s, e in chunks) and len(chunks) >= 20
    assert all(not text[s].isspace() for s, _ in chunks)


def test_empty_text():
    assert split_sentences("") == [] and chunk_spans("  \n ", 100) == []
