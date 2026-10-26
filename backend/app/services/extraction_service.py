"""Module 5 - real text extraction from PDF (PyMuPDF), DOCX (python-docx) and TXT."""
import codecs
import logging
from dataclasses import dataclass
from pathlib import Path

from app.core.errors import AppError

logger = logging.getLogger("app.extraction")

MAX_PDF_PAGES = 500


@dataclass
class ExtractionResult:
    text: str
    file_type: str
    page_count: int | None = None
    paragraph_count: int | None = None
    table_count: int | None = None
    encoding: str | None = None

    @property
    def character_count(self) -> int:
        return len(self.text)

    @property
    def word_count(self) -> int:
        return len(self.text.split())


def _corrupted(kind: str) -> AppError:
    return AppError(422, "CORRUPTED_DOCUMENT", f"The {kind} file is corrupted or unreadable.")


def _empty() -> AppError:
    return AppError(422, "EMPTY_DOCUMENT",
                    "No readable text was found. Scanned/image-only documents are not "
                    "supported (no OCR).")


def extract_pdf(path: Path) -> ExtractionResult:
    import pymupdf  # imported lazily so the API starts even if the wheel is missing

    try:
        doc = pymupdf.open(path)
    except Exception as exc:  # PyMuPDF raises several unrelated exception types
        logger.warning("PDF could not be opened (%s)", type(exc).__name__)
        raise _corrupted("PDF") from exc
    try:
        if doc.needs_pass:
            raise AppError(422, "ENCRYPTED_DOCUMENT", "Password-protected PDFs are not supported.")
        if doc.page_count > MAX_PDF_PAGES:
            raise AppError(422, "DOCUMENT_TOO_LONG",
                           f"PDFs longer than {MAX_PDF_PAGES} pages are not supported.")
        try:
            pages = [page.get_text("text") for page in doc]
        except Exception as exc:
            logger.warning("PDF text extraction failed (%s)", type(exc).__name__)
            raise _corrupted("PDF") from exc
        page_count = doc.page_count
    finally:
        doc.close()

    text = "\n\n".join(p.strip() for p in pages if p.strip())
    if not text.strip():
        raise _empty()
    return ExtractionResult(text=text, file_type="pdf", page_count=page_count)


def extract_docx(path: Path) -> ExtractionResult:
    from docx import Document as load_docx
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    try:
        doc = load_docx(str(path))
    except Exception as exc:
        logger.warning("DOCX could not be opened (%s)", type(exc).__name__)
        raise _corrupted("DOCX") from exc

    blocks: list[str] = []
    paragraphs = tables = 0
    try:
        # Walk the body in document order so tables stay next to the text around them.
        for child in doc.element.body.iterchildren():
            tag = child.tag.rsplit("}", 1)[-1]
            if tag == "p":
                line = Paragraph(child, doc).text.strip()
                if line:
                    blocks.append(line)
                    paragraphs += 1
            elif tag == "tbl":
                tables += 1
                for row in Table(child, doc).rows:
                    cells = []
                    for cell in row.cells:
                        value = " ".join(cell.text.split())
                        if value and (not cells or cells[-1] != value):  # merged cells repeat
                            cells.append(value)
                    if cells:
                        blocks.append(" | ".join(cells))
    except Exception as exc:
        logger.warning("DOCX parsing failed (%s)", type(exc).__name__)
        raise _corrupted("DOCX") from exc

    text = "\n".join(blocks)
    if not text.strip():
        raise _empty()
    return ExtractionResult(text=text, file_type="docx",
                            paragraph_count=paragraphs, table_count=tables)


def _decode_text(data: bytes) -> tuple[str, str]:
    if data.startswith((codecs.BOM_UTF16_LE, codecs.BOM_UTF16_BE)):
        return data.decode("utf-16"), "utf-16"
    for encoding in ("utf-8-sig", "cp1252"):
        try:
            return data.decode(encoding), encoding
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace"), "utf-8 (lossy)"


def extract_txt(path: Path) -> ExtractionResult:
    try:
        data = path.read_bytes()
    except OSError as exc:
        logger.error("TXT could not be read (%s)", type(exc).__name__)
        raise _corrupted("text") from exc
    text, encoding = _decode_text(data)
    if not text.strip():
        raise _empty()
    return ExtractionResult(text=text, file_type="txt", encoding=encoding,
                            paragraph_count=sum(1 for ln in text.splitlines() if ln.strip()))


_EXTRACTORS = {"pdf": extract_pdf, "docx": extract_docx, "txt": extract_txt}


def extract_text(path: Path, file_type: str) -> ExtractionResult:
    try:
        extractor = _EXTRACTORS[file_type]
    except KeyError:
        raise AppError(415, "UNSUPPORTED_FILE_TYPE", f"Unsupported file type: {file_type}")
    if not path.is_file():
        raise AppError(404, "FILE_MISSING", "The stored file could not be found.")
    return extractor(path)
