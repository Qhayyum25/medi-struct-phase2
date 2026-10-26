import logging

import pytest

from app.services.deidentification_service import RuleBasedDeidentifier
from tests.samples import SYNTHETIC_NOTE

deid = RuleBasedDeidentifier()


@pytest.mark.parametrize("text,leaked,placeholder", [
    ("Email ramesh.k@example.com now", "ramesh.k@example.com", "[EMAIL]"),
    ("Call +91 98765 43210", "98765", "[PHONE]"),
    ("Call 9876543210 today", "9876543210", "[PHONE]"),
    ("Phone: (555) 123-4567", "123-4567", "[PHONE]"),
    ("Tel 555-123-4567", "555-123", "[PHONE]"),
    ("Office 0870-2345678", "2345678", "[PHONE]"),
    ("Seen on 12/03/2024", "12/03/2024", "[DATE]"),
    ("Seen on 12-03-24.", "12-03-24", "[DATE]"),
    ("Seen on 2024-03-12", "2024-03-12", "[DATE]"),
    ("Seen on 12 March 2024", "12 March", "[DATE]"),
    ("Seen on March 12, 2024", "March 12", "[DATE]"),
    ("MRN: 00456712", "00456712", "[ID]"),
    ("UHID AB-1234", "AB-1234", "[ID]"),
    ("Aadhaar 1234 5678 9012", "5678", "[ID]"),
    ("SSN 123-45-6789", "123-45-6789", "[ID]"),
    ("Name: Priya Sharma  Age: 32", "Priya", "[NAME]"),
    ("Patient Name: Priya Sharma Age: 32", "Priya", "[NAME]"),
    ("Referred to Dr. Anita Rao for review", "Anita", "[NAME]"),
    ("Mr. Ramesh Kumar attended", "Ramesh", "[NAME]"),
    ("Address: H.No. 12-3-45, Ramnagar Colony, Hanamkonda", "Ramnagar", "[ADDRESS]"),
    ("He lives at 221B Baker Street.", "Baker", "[ADDRESS]"),
    ("PIN: 506001", "506001", "[ADDRESS]"),
    ("She is resident of Warangal and presented with fever", "Warangal", "[ADDRESS]"),
])
def test_phi_is_replaced(text, leaked, placeholder):
    result = deid.deidentify(text)
    assert leaked not in result.text
    assert placeholder in result.text
    assert result.total >= 1


@pytest.mark.parametrize("text", [
    "Patient has type 2 diabetes mellitus, started on Metformin 500 mg twice daily.",
    "HbA1c 8.2 %. BP 130/85 mmHg. pH 7.35. Dose 1-0-1 after meals.",
    "Platelets 150 140 1200. In March 2024 and again 2023 he improved.",
    "Drug name: Metformin. Doctor Diabetes clinic follow up.",
    "Temperature 98.6 F, pulse 72/min, SpO2 97 %.",
])
def test_clinical_text_is_left_intact(text):
    result = deid.deidentify(text)
    assert result.text == text and result.total == 0


def test_label_is_kept_and_value_replaced():
    assert deid.deidentify("MRN: 00456712").text == "MRN: [ID]"
    assert deid.deidentify("Address: 5 Some Road, Town").text == "Address: [ADDRESS]"


def test_full_synthetic_note():
    result = deid.deidentify(SYNTHETIC_NOTE)
    for secret in ("Ramesh", "00456712", "98765", "ramesh.k@example.com", "Ramnagar",
                   "Anita", "12/03/2024"):
        assert secret not in result.text
    assert set(result.counts) >= {"NAME", "ID", "PHONE", "EMAIL", "ADDRESS", "DATE"}
    # clinical content survives
    assert "type 2 diabetes mellitus" in result.text and "Metformin 500 mg" in result.text
    assert result.total == sum(result.counts.values())


def test_idempotent():
    once = deid.deidentify(SYNTHETIC_NOTE).text
    assert deid.deidentify(once).text == once


def test_no_phi_in_logs(caplog):
    with caplog.at_level(logging.DEBUG):
        deid.deidentify(SYNTHETIC_NOTE)
    logged = " ".join(r.getMessage() for r in caplog.records)
    assert "Ramesh" not in logged and "98765" not in logged and "@example.com" not in logged
