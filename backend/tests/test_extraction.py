import codecs

import pytest

from app.core.errors import AppError
from app.services.extraction_service import extract_text
from tests.samples import SYNTHETIC_NOTE, make_blank_pdf, make_docx, make_pdf


def test_txt_utf8(tmp_path):
    p = tmp_path / "a.txt"
    p.write_text("Patient has asthma.\nPlan: inhaler", encoding="utf-8")
    r = extract_text(p, "txt")
    assert r.text.startswith("Patient has asthma.") and r.encoding == "utf-8-sig"
    assert r.word_count == 5 and r.paragraph_count == 2


def test_txt_bom_cp1252_and_utf16(tmp_path):
    p = tmp_path / "b.txt"
    p.write_bytes(codecs.BOM_UTF8 + "caf\u00e9 \u2265 5".encode("utf-8"))
    assert extract_text(p, "txt").text == "caf\u00e9 \u2265 5"
    p.write_bytes("temp 37\u00b0C \u2013 ok".encode("cp1252"))
    r = extract_text(p, "txt")
    assert r.text == "temp 37\u00b0C \u2013 ok" and r.encoding == "cp1252"
    p.write_bytes("Patient stable".encode("utf-16"))
    assert extract_text(p, "txt").text == "Patient stable"


def test_pdf_text_and_metadata(tmp_path):
    p = tmp_path / "a.pdf"
    p.write_bytes(make_pdf())
    r = extract_text(p, "pdf")
    assert "type 2 diabetes mellitus" in " ".join(r.text.split())
    assert r.page_count == 1 and r.character_count > 50


def test_docx_paragraphs_and_tables_in_order(tmp_path):
    p = tmp_path / "a.docx"
    p.write_bytes(make_docx())
    r = extract_text(p, "docx")
    lines = r.text.splitlines()
    assert lines == ["Discharge summary", "Test | Result", "Hemoglobin | 11.2 g/dL", "Patient has asthma."]
    assert r.paragraph_count == 2 and r.table_count == 1


@pytest.mark.parametrize("ext,data,code", [
    ("txt", b"   \n  ", "EMPTY_DOCUMENT"),
    ("pdf", make_blank_pdf(), "EMPTY_DOCUMENT"),
    ("pdf", b"%PDF-1.4 this is not really a pdf", "CORRUPTED_DOCUMENT"),
    ("docx", b"PK\x03\x04 not a real docx", "CORRUPTED_DOCUMENT"),
    ("docx", make_docx(paragraphs=("",), table=None), "EMPTY_DOCUMENT"),
])
def test_bad_documents_raise_clean_errors(tmp_path, ext, data, code):
    p = tmp_path / f"x.{ext}"
    p.write_bytes(data)
    with pytest.raises(AppError) as err:
        extract_text(p, ext)
    assert err.value.status_code == 422 and err.value.code == code


def test_missing_file_and_unsupported_type(tmp_path):
    with pytest.raises(AppError) as err:
        extract_text(tmp_path / "nope.txt", "txt")
    assert err.value.status_code == 404
    with pytest.raises(AppError) as err:
        extract_text(tmp_path / "nope.exe", "exe")
    assert err.value.status_code == 415


def test_encrypted_pdf_rejected(tmp_path):
    import pymupdf
    doc = pymupdf.open()
    doc.new_page().insert_text((50, 50), SYNTHETIC_NOTE[:20])
    p = tmp_path / "enc.pdf"
    doc.save(str(p), encryption=pymupdf.PDF_ENCRYPT_AES_256, user_pw="secret", owner_pw="owner")
    with pytest.raises(AppError) as err:
        extract_text(p, "pdf")
    assert err.value.code == "ENCRYPTED_DOCUMENT"
