"""Upload validation: extension whitelist and content-signature checks."""
import zipfile
from pathlib import Path

from app.core.errors import AppError

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt"}
MAX_FILENAME_LENGTH = 150
MAX_DOCX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024  # zip-bomb guard


def validate_extension(filename: str) -> str:
    """Return the lower-case extension, or raise 415 if it is not allowed."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise AppError(
            415, "UNSUPPORTED_FILE_TYPE",
            f"Only {', '.join(sorted(e.upper() for e in ALLOWED_EXTENSIONS))} files are accepted.")
    return ext


def validate_signature(path: Path, ext: str) -> None:
    """Check that the bytes on disk really look like the claimed type.

    The extension and Content-Type header are chosen by the client, so they are
    never trusted on their own.
    """
    bad = AppError(400, "INVALID_FILE_CONTENT",
                   f"The file content does not look like a valid .{ext} document.")
    with open(path, "rb") as fh:
        head = fh.read(8192)

    if ext == "pdf":
        if b"%PDF-" not in head[:1024]:
            raise bad
    elif ext == "docx":
        if not zipfile.is_zipfile(path):
            raise bad
        try:
            with zipfile.ZipFile(path) as zf:
                names = zf.namelist()
                total = sum(i.file_size for i in zf.infolist())
        except zipfile.BadZipFile:
            raise bad
        if "word/document.xml" not in names:
            raise bad
        if total > MAX_DOCX_UNCOMPRESSED_BYTES:
            raise AppError(413, "PAYLOAD_TOO_LARGE",
                           "The document expands to an unreasonable size.")
    elif ext == "txt":
        if b"\x00" in head and not head.startswith((b"\xff\xfe", b"\xfe\xff")):
            raise bad  # binary data disguised as text (UTF-16 with BOM is allowed)
