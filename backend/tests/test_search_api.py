import uuid

from tests.samples import NLP_NOTE


def _search(client, headers, **params):
    r = client.get("/api/search", params=params, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()


def test_search_requires_at_least_one_filter(nlp_client, auth_headers):
    r = nlp_client.get("/api/search", headers=auth_headers)
    assert r.status_code == 422 and r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_search_by_entity_type(processed_doc, nlp_client, auth_headers):
    doc_id, _ = processed_doc
    res = _search(nlp_client, auth_headers, entity_type="Medication")
    assert res["entities"]["total"] == 1 and res["entities"]["items"][0]["entity_text"] == "Metformin"
    assert res["relations"]["total"] >= 3                       # dosage, frequency, treated_by ...
    assert all("Medication" in (r["subject_entity"]["entity_type"], r["object_entity"]["entity_type"])
               for r in res["relations"]["items"])
    assert [d["id"] for d in res["documents"]["items"]] == [doc_id]


def test_search_by_entity_text_is_case_insensitive_contains(processed_doc, nlp_client, auth_headers):
    res = _search(nlp_client, auth_headers, entity_text="DIABETES")
    assert res["entities"]["total"] == 2 and res["documents"]["total"] == 1
    assert res["relations"]["total"] >= 2


def test_search_by_relation_type(processed_doc, nlp_client, auth_headers):
    res = _search(nlp_client, auth_headers, relation_type="dosage")
    assert res["relations"]["total"] == 1
    assert {e["entity_text"] for e in res["entities"]["items"]} == {"Metformin", "500 mg"}
    assert res["documents"]["total"] == 1
    assert _search(nlp_client, auth_headers, relation_type="no_such_type")["documents"]["total"] == 0


def test_search_combines_filters_with_and(processed_doc, nlp_client, auth_headers):
    res = _search(nlp_client, auth_headers, entity_type="Disease", entity_text="liver")
    assert [e["entity_text"] for e in res["entities"]["items"]] == ["fatty liver"]
    none = _search(nlp_client, auth_headers, entity_type="Medication", entity_text="liver")
    assert none["entities"]["total"] == 0 and none["documents"]["total"] == 0


def test_q_matches_entity_text_and_filenames(processed_doc, nlp_client, upload, auth_headers):
    upload("cardiology_report.txt", b"Nothing clinical here.")
    by_entity = _search(nlp_client, auth_headers, q="polyuria")
    assert by_entity["entities"]["total"] == 1 and by_entity["documents"]["total"] == 1
    by_filename = _search(nlp_client, auth_headers, q="cardio")
    assert by_filename["entities"]["total"] == 0
    assert [d["filename"] for d in by_filename["documents"]["items"]] == ["cardiology_report.txt"]


def test_search_scoped_to_one_document(processed_doc, nlp_client, upload, auth_headers):
    doc_id, _ = processed_doc
    second = upload("second.txt", NLP_NOTE.encode()).json()["document_id"]
    nlp_client.post(f"/api/documents/{second}/process", headers=auth_headers)
    both = _search(nlp_client, auth_headers, entity_type="Medication")
    one = _search(nlp_client, auth_headers, entity_type="Medication", document_id=doc_id)
    assert both["entities"]["total"] == 2 and one["entities"]["total"] == 1
    assert one["entities"]["items"][0]["document_id"] == doc_id
    assert _search(nlp_client, auth_headers, document_id=doc_id)["documents"]["total"] == 1


def test_search_min_confidence_and_pagination(processed_doc, nlp_client, auth_headers):
    strict = _search(nlp_client, auth_headers, entity_type="Symptom", min_confidence=0.92)
    assert [e["entity_text"] for e in strict["entities"]["items"]] == ["polyuria"]
    paged = _search(nlp_client, auth_headers, relation_type="treated_by", page_size=1)
    assert len(paged["relations"]["items"]) <= 1 and paged["relations"]["page_size"] == 1
    assert nlp_client.get("/api/search?q=a&page_size=500", headers=auth_headers).status_code == 422


def test_search_input_is_treated_as_data(processed_doc, nlp_client, auth_headers):
    for evil in ["'; DROP TABLE entities; --", "%", "_", "\\", "' OR '1'='1"]:
        res = _search(nlp_client, auth_headers, entity_text=evil)
        assert res["entities"]["total"] in (0, 1)              # only '%' legitimately matches "8.2 %"
    assert nlp_client.get("/api/entities", headers=auth_headers).json()["total"] > 5   # table intact


def test_search_is_private_per_user(processed_doc, nlp_client, second_user_headers):
    res = _search(nlp_client, second_user_headers, entity_type="Medication")
    assert res["entities"]["total"] == res["relations"]["total"] == res["documents"]["total"] == 0
    assert nlp_client.get(f"/api/search?document_id={uuid.uuid4()}", headers=second_user_headers).status_code == 200
