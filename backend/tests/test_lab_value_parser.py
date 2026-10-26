import pytest

from app.utils.lab_value_parser import parse_lab_value


@pytest.mark.parametrize("text,value,unit", [
    ("8.2 %", 8.2, "%"),
    ("7.35", 7.35, None),
    ("-2.5 mmol/L", -2.5, "mmol/L"),
    ("150 x10^9/L", 150.0, "x10^9/L"),
    ("  4.0  ", 4.0, None),
    ("0.5mg/dL", 0.5, "mg/dL"),
])
def test_parses_leading_number_and_unit(text, value, unit):
    v, u = parse_lab_value(text)
    assert v == value and u == unit


@pytest.mark.parametrize("text", ["negative", "positive", "", "   ", "trace", "not detected"])
def test_non_numeric_values_return_none(text):
    assert parse_lab_value(text) == (None, None)


def test_long_unit_is_truncated():
    v, u = parse_lab_value("5 " + "x" * 50)
    assert v == 5.0 and len(u) == 32
