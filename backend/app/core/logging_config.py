"""Structured (JSON) logging with redaction of secrets.

Rules followed across the code base:
  * never log passwords, JWTs, document text, entity text or search terms;
  * log identifiers (document_id, request_id), counts, durations and statuses only.
"""
import json
import logging
import re
import sys
from datetime import datetime, timezone

_REDACTIONS = [
    (re.compile(r"Bearer\s+[A-Za-z0-9\-_\.=]+", re.I), "Bearer [REDACTED]"),
    (
        re.compile(r"(?i)(password|passwd|secret|token|authorization)(\"?\s*[:=]\s*)\"?[^\s,\"}]+"),
        r"\1\2[REDACTED]",
    ),
]

_EXTRA_FIELDS = ("request_id", "method", "path", "status_code", "duration_ms",
                 "document_id", "stage", "count")


class RedactionFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        message = record.getMessage()
        for pattern, repl in _REDACTIONS:
            message = pattern.sub(repl, message)
        record.msg, record.args = message, ()
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for field in _EXTRA_FIELDS:
            if hasattr(record, field):
                payload[field] = getattr(record, field)
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def setup_logging(level: str = "INFO") -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    handler.addFilter(RedactionFilter())

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level.upper())

    # Uvicorn's access log prints full URLs including query strings (which may
    # contain clinical search terms). We log requests ourselves without them.
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
