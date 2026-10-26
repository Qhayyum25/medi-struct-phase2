import uuid


def test_document_entities_are_paginated_and_in_text_order(processed_doc, nlp_client, auth_headers):
    doc_id, body = processed_doc
    total = body["statistics"]["entity_count"]
    page1 = nlp_client.get(f"/api/documents/{doc_id}/entities?page_size=5", headers=auth_headers).json()
    assert page1["total"] == total and len(page1["items"]) == 5 and page1["page"] == 1
    starts = [e["start_position"] for e in page1["items"]]
    assert starts == sorted(starts)
    last = nlp_client.get(f"/api/documents/{doc_id}/entities?page_size=5&page={(total - 1) // 5 + 1}",
                          headers=auth_headers).json()
    assert 1 <= len(last["items"]) <= 5
    assert nlp_client.get(f"/api/documents/{doc_id}/entities?page=0", headers=auth_headers).status_code == 422
    assert nlp_client.get(f"/api/documents/{doc_id}/entities?page_size=101", headers=auth_headers).status_code == 422


def test_entity_filters(processed_doc, nlp_client, auth_headers):
    doc_id, _ = processed_doc
    meds = nlp_client.get("/api/entities?entity_type=Medication", headers=auth_headers).json()
    assert meds["total"] == 1 and meds["items"][0]["entity_text"] == "Metformin"
    diabetes = nlp_client.get("/api/entities?entity_text=DIABETES", headers=auth_headers).json()   # case-insensitive
    assert diabetes["total"] == 2 and all(e["entity_type"] == "Disease" for e in diabetes["items"])
    assert nlp_client.get("/api/entities?entity_type=Disease&entity_text=liver", headers=auth_headers).json()["total"] == 1
    assert nlp_client.get("/api/entities?min_confidence=0.97", headers=auth_headers).json()["total"] >= 3
    assert all(e["confidence"] >= 0.97 for e in
               nlp_client.get("/api/entities?min_confidence=0.97", headers=auth_headers).json()["items"])
    assert nlp_client.get(f"/api/entities?document_id={doc_id}", headers=auth_headers).json()["total"] > 5
    assert nlp_client.get(f"/api/documents/{doc_id}/entities?entity_type=Symptom", headers=auth_headers).json()["total"] == 2
    assert nlp_client.get("/api/entities?min_confidence=2", headers=auth_headers).status_code == 422


def test_like_wildcards_are_matched_literally(processed_doc, nlp_client, auth_headers):
    pct = nlp_client.get("/api/entities?entity_text=%25", headers=auth_headers).json()      # a single '%'
    assert pct["total"] == 1 and pct["items"][0]["entity_text"] == "8.2 %"
    assert nlp_client.get("/api/entities?entity_text=_", headers=auth_headers).json()["total"] == 0


def test_get_single_entity(processed_doc, nlp_client, auth_headers, second_user_headers):
    _, body = processed_doc
    ent = body["entities"][0]
    r = nlp_client.get(f"/api/entities/{ent['id']}", headers=auth_headers)
    assert r.status_code == 200 and r.json() == ent
    assert nlp_client.get(f"/api/entities/{ent['id']}", headers=second_user_headers).status_code == 404
    assert nlp_client.get(f"/api/entities/{uuid.uuid4()}", headers=auth_headers).status_code == 404
    assert nlp_client.get("/api/entities/xyz", headers=auth_headers).status_code == 422


def test_entities_and_relations_are_private_per_user(processed_doc, nlp_client, second_user_headers):
    doc_id, _ = processed_doc
    assert nlp_client.get("/api/entities", headers=second_user_headers).json()["total"] == 0
    assert nlp_client.get("/api/relations", headers=second_user_headers).json()["total"] == 0
    assert nlp_client.get(f"/api/documents/{doc_id}/entities", headers=second_user_headers).status_code == 404
    assert nlp_client.get(f"/api/documents/{doc_id}/relations", headers=second_user_headers).status_code == 404


def test_entity_and_relation_endpoints_require_auth(client):
    for url in ("/api/entities", "/api/relations", "/api/search?q=a", f"/api/entities/{uuid.uuid4()}"):
        assert client.get(url).status_code == 401


def test_relations_include_nested_entities_and_filters(processed_doc, nlp_client, auth_headers):
    doc_id, body = processed_doc
    everything = nlp_client.get("/api/relations", headers=auth_headers).json()
    assert everything["total"] == body["statistics"]["relation_count"]
    dosage = nlp_client.get("/api/relations?relation_type=dosage", headers=auth_headers).json()
    assert dosage["total"] == 1
    rel = dosage["items"][0]
    assert rel["subject_entity"]["entity_text"] == "Metformin" and rel["object_entity"]["entity_type"] == "Dosage"
    assert rel["document_id"] == doc_id
    by_subject = nlp_client.get("/api/relations?subject_type=Medication", headers=auth_headers).json()
    assert by_subject["total"] >= 2 and all(r["subject_entity"]["entity_type"] == "Medication" for r in by_subject["items"])
    by_object = nlp_client.get("/api/relations?object_type=Disease", headers=auth_headers).json()
    assert by_object["total"] >= 2 and all(r["object_entity"]["entity_type"] == "Disease" for r in by_object["items"])
    confident = nlp_client.get("/api/relations?min_confidence=0.8", headers=auth_headers).json()
    assert all(r["confidence"] >= 0.8 for r in confident["items"])


def test_document_relations_pagination(processed_doc, nlp_client, auth_headers):
    doc_id, body = processed_doc
    total = body["statistics"]["relation_count"]
    r = nlp_client.get(f"/api/documents/{doc_id}/relations?page_size=2", headers=auth_headers).json()
    assert r["total"] == total and len(r["items"]) == 2
    other = nlp_client.get(f"/api/documents/{doc_id}/relations?relation_type=has_value", headers=auth_headers).json()
    assert other["total"] == 1
    assert nlp_client.get(f"/api/documents/{uuid.uuid4()}/relations", headers=auth_headers).status_code == 404


def test_deleting_a_document_removes_its_entities_and_relations(processed_doc, nlp_client, auth_headers):
    doc_id, _ = processed_doc
    assert nlp_client.delete(f"/api/documents/{doc_id}", headers=auth_headers).status_code == 204
    assert nlp_client.get("/api/entities", headers=auth_headers).json()["total"] == 0
    assert nlp_client.get("/api/relations", headers=auth_headers).json()["total"] == 0
