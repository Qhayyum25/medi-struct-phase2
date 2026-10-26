"""Safe filename handling and streaming saves for uploads."""
import re
import unicodedata
import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core.errors import AppError
from app.utils.validators import MAX_FILENAME_LENGTH, validate_extension, validate_signature

_CHUNK = 1024 * 1024
_UNSAFE = re.compile(r"[^\w.\- ()]", re.UNICODE)


def sanitize_filename(raw: str | None) -> str:
    """Return a display-safe filename (no directories, control chars or odd symbols)."""
    if not raw:
        raise AppError(400, "INVALID_FILENAME", "A filename is required.")
    name = raw.replace("\\", "/").split("/")[-1]           # drop any directory part
    name = unicodedata.normalize("NFKC", name)
    name = "".join(ch for ch in name if ch.isprintable())   # drop control characters
    name = _UNSAFE.sub("_", name).strip(" .")
    name = re.sub(r"\s+", " ", name)
    if not name or "." not in name:
        raise AppError(400, "INVALID_FILENAME", "The filename is invalid.")
    if len(name) > MAX_FILENAME_LENGTH:
        stem, ext = name.rsplit(".", 1)
        name = f"{stem[:MAX_FILENAME_LENGTH - len(ext) - 1]}.{ext}"
    return name


def resolve_stored_path(upload_root: Path, relative_path: str) -> Path:
    """Map a stored relative path to an absolute one, refusing to leave upload_root."""
    root = upload_root.resolve()
    target = (root / relative_path).resolve()
    if root != target and root not in target.parents:
        raise AppError(500, "INTERNAL_ERROR", "An unexpected error occurred.")
    return target


def save_upload(upload: UploadFile, owner_dir: Path, ext: str, max_bytes: int) -> tuple[str, int]:
    """Stream `upload` to disk under a random server-generated name.

    Returns (stored_file_name, size_in_bytes). The client-supplied filename is never
    used on disk, so path traversal is impossible by construction.
    """
    if upload.size is not None and upload.size > max_bytes:
        raise AppError(413, "PAYLOAD_TOO_LARGE",
                       f"File exceeds the {max_bytes // (1024 * 1024)} MB limit.")

    owner_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}.{ext}"
    final_path = owner_dir / stored_name
    part_path = owner_dir / f"{stored_name}.part"
    total = 0
    try:
        with open(part_path, "wb") as out:
            while chunk := upload.file.read(_CHUNK):
                total += len(chunk)
                if total > max_bytes:
                    raise AppError(413, "PAYLOAD_TOO_LARGE",
                                   f"File exceeds the {max_bytes // (1024 * 1024)} MB limit.")
                out.write(chunk)
        if total == 0:
            raise AppError(400, "EMPTY_FILE", "The uploaded file is empty.")
        validate_signature(part_path, ext)
        part_path.rename(final_path)
    except BaseException:
        part_path.unlink(missing_ok=True)
        raise
    return stored_name, total


def delete_file_quietly(path: Path) -> bool:
    """Remove a file; return False (instead of raising) if it could not be removed."""
    try:
        path.unlink(missing_ok=True)
        return True
    except OSError:
        return False


__all__ = ["sanitize_filename", "validate_extension", "resolve_stored_path",
           "save_upload", "delete_file_quietly"]
