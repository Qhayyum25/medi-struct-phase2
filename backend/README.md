# MediStruct AI — Backend

An AI-powered clinical NLP backend: it accepts clinical documents (PDF/DOCX/TXT), extracts
and de-identifies the text, runs clinical Named Entity Recognition and relation extraction,
turns the result into structured PostgreSQL records, and exposes analytics (association
rules, clustering, cohort discovery) and search over that structured data.

Built as a final-year B.Tech project. Every module is a real, working implementation —
nothing here is a hardcoded demo.

## 1. Project overview

The backend takes an unstructured clinical document through a pipeline:

```
upload -> extract text -> preprocess -> de-identify -> clinical NER -> relation extraction
       -> structured entities/relations/observations in PostgreSQL -> analytics & search
```

Every stage is available as its own API call, and `POST /documents/{id}/process` runs the
whole pipeline (extraction/de-identification/NER/relations) in one request.

## 2. Architecture

```
Client (Swagger UI / curl / frontend)
        |  JWT bearer token
        v
FastAPI app  (app/main.py)
  ├─ api/routes/    thin HTTP layer: parse request, call a service, shape the response
  ├─ services/      business logic: documents, NLP orchestration, analytics, search
  ├─ nlp/           model abstractions: ClinicalNERModel, RelationExtractionModel
  ├─ models/        SQLAlchemy ORM tables
  ├─ schemas/       Pydantic request/response models
  └─ core/          config, security (JWT/bcrypt), logging, centralised error handling
        |
        v
PostgreSQL  (users, documents, entities, relations, patients, observations)
        |
        v
uploads/<user_id>/<random-name>.<ext>   (files are stored under random names; the API
                                          never returns filesystem paths)
```

Design principles followed throughout: services contain the logic, routes stay thin;
NLP models sit behind abstractions (`ClinicalNERModel`, `RelationExtractionModel`) so the
underlying model can be swapped via `.env` without touching the API; every derived table
(entities/relations/observations) is cleared and rebuilt atomically whenever the text it
was computed from changes, so stored character offsets can never point at stale text.

## 3. Technology stack

Python 3.11+, FastAPI, Uvicorn, PostgreSQL, SQLAlchemy 2.x, Alembic, Pydantic v2, PyJWT +
bcrypt, Hugging Face Transformers + PyTorch, mlxtend (association rules), scikit-learn
(KMeans), pandas, PyMuPDF (PDF), python-docx (DOCX), pytest, Docker.

## 4. Folder structure

```
backend/
├── app/
│   ├── main.py                  FastAPI app: middleware, error handlers, routers
│   ├── core/                    config.py, security.py, logging_config.py, errors.py, middleware.py
│   ├── db/                      database.py (engine/session), base.py, init_db.py
│   ├── models/                  user, document, patient, entity, relation, observation
│   ├── schemas/                 Pydantic models per resource
│   ├── api/
│   │   ├── deps.py              DB session, current user, pagination
│   │   └── routes/               auth, documents, entities, relations, patients, analytics, search
│   ├── services/                document_service, pipeline_service, ner_service,
│   │                             relation_extraction_service, knowledge_discovery_service,
│   │                             search_service, patient_service, entity/relation_service
│   ├── nlp/                     clinical_ner.py, relation_extraction.py, model_loader.py, confidence.py
│   └── utils/                   file_utils, validators, text_utils, lab_value_parser
├── scripts/download_models.py   pre-download & smoke-test the NER model
├── tests/                       93+ pytest tests (see §14)
├── alembic/                     one migration (0001_initial_schema)
├── uploads/                     uploaded files (random names, per user)
├── .env.example, requirements.txt, Dockerfile, docker-compose.yml
```

## 5. PostgreSQL setup

Fastest: use the provided Docker Compose service (see §12). To use an existing PostgreSQL
16+ server instead:

```sql
CREATE USER medistruct_user WITH PASSWORD 'choose-a-password';
CREATE DATABASE medistruct OWNER medistruct_user;
```

Point `DATABASE_URL` at it (see §7).

## 6. Python environment setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```
`torch` + `transformers` are the largest dependencies (~1-2 GB). If you only need to work
on the non-NLP parts, everything except NER model loading works without them installed.

## 7. Environment variables

Copy `.env.example` to `.env` and fill it in:

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | `postgresql+psycopg2://user:pass@host:5432/dbname` |
| `JWT_SECRET_KEY` | ≥32 random chars. Generate: `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT settings (defaults: HS256, 60 min) |
| `NER_MODEL_NAME` | Hugging Face model id, default `d4data/biomedical-ner-all` |
| `NER_MODEL_REVISION` | optional pinned git revision |
| `NER_AGGREGATION_STRATEGY` | `simple` \| `first` \| `average` \| `max` (default `max`) |
| `NER_MIN_CONFIDENCE` | entities below this score are dropped (default `0.5`) |
| `NER_CHUNK_CHARS` | text is chunked to stay under the model's token limit (default `1000`) |
| `NER_LABEL_MAP_PATH` | optional JSON file to replace the built-in label mapping |
| `RELATION_MODEL_NAME` | `rule_based` (built in) |
| `RELATION_SCHEMA_PATH` | optional JSON file of relation rules (see §12 of the module docstring in `app/nlp/relation_extraction.py`) |
| `RELATION_MIN_CONFIDENCE` | relations below this score are dropped (default `0.35`) |
| `PRELOAD_MODELS` | `true` to load the NER model at startup instead of on first use |
| `UPLOAD_DIR`, `MAX_UPLOAD_MB` | file storage location and size limit |
| `CORS_ORIGINS` | comma-separated allowed origins |
| `AUTO_CREATE_TABLES` | dev convenience; use Alembic normally |

Never commit `.env`. `JWT_SECRET_KEY` is validated at startup (the app refuses to start
if it is missing or too short).

## 8. Installation

```bash
pip install -r requirements.txt
cp .env.example .env      # then edit it, see §7
```

## 9. Database migration

```bash
alembic upgrade head            # apply
alembic downgrade base          # roll back everything
alembic revision --autogenerate -m "message"   # after changing a model
```

## 10. How to start the backend

```bash
uvicorn app.main:app --reload
```
Open http://localhost:8000/docs (Swagger) or http://localhost:8000/redoc.

Optionally pre-download the NER model so the first request isn't slow:
```bash
python -m scripts.download_models
```

## 11. API endpoints

**Auth**
| Method | Path |
|---|---|
| POST | `/api/auth/register` |
| POST | `/api/auth/login` (OAuth2 password form: `username`, `password`) |
| GET | `/api/auth/me` |

**Documents**
| Method | Path |
|---|---|
| POST | `/api/documents/upload` (multipart field `file`; PDF/DOCX/TXT) |
| GET | `/api/documents` (`page`, `page_size`, `status`, `file_type`) |
| GET | `/api/documents/{id}` (`?include_text=true` for stored text) |
| GET | `/api/documents/{id}/status` |
| POST | `/api/documents/{id}/extract` |
| POST | `/api/documents/{id}/deidentify` |
| POST | `/api/documents/{id}/process` — runs the whole pipeline |
| DELETE | `/api/documents/{id}` |

**Entities & relations**
| Method | Path |
|---|---|
| GET | `/api/entities`, `/api/entities/{id}` |
| GET | `/api/documents/{id}/entities` |
| GET | `/api/relations`, `/api/documents/{id}/relations` |

**Analytics** (all POST, JSON body)
| Path | Purpose |
|---|---|
| `/api/analytics/association-rules` | Apriori over entity co-occurrence across your documents |
| `/api/analytics/clusters` | K-Means over patients' numeric observations |
| `/api/analytics/cohorts` | filter patients by entity/observation criteria |

**Patients** (read-only, pseudonymous)
| Method | Path |
|---|---|
| GET | `/api/patients`, `/api/patients/{id}` |

**Search**
| Method | Path |
|---|---|
| GET | `/api/search` — combined entities/relations/documents, needs ≥1 filter |

Every list endpoint is paginated (`page`, `page_size`) and scoped to the logged-in user
(an admin role can see everything). Full request/response schemas are in `/docs`.

## 12. NLP model configuration

- **NER** wraps any Hugging Face token-classification model trained on clinical text.
  Default: `d4data/biomedical-ner-all` (Apache-2.0, no access token required), trained on
  the MACCROBAT clinical case-report corpus. Its labels map to: Disease, Symptom,
  Medication, Procedure, Test, LabValue, Anatomy, Dosage, Frequency, Duration,
  Administration, Age, Sex, Severity (see `DEFAULT_LABEL_MAP` in `app/nlp/clinical_ner.py`).
  The model loads lazily (first request) and is cached as a process-wide singleton, so it
  is never reloaded per request. First use downloads ~400 MB of weights to `HF_HOME`
  (default `~/.cache/huggingface`); use `python -m scripts.download_models` to warm the
  cache ahead of time. **Do not point `NER_MODEL_NAME` at a generic (non-clinical) model**
  — its labels won't match anything in the label map and every entity will be dropped.
- **Confidence** — exactly how NER and relation scores are computed is documented in
  `app/nlp/confidence.py` (NER: mean softmax probability per entity; relations: a
  transparent heuristic combining the rule's prior, entity confidences, distance and
  trigger-phrase cues — not a calibrated probability).
- **Relations** use a rule-based model driven entirely by data
  (`app/nlp/relation_extraction.py`, `DEFAULT_RULES`), not hardcoded logic. Override the
  whole rule set with a JSON file via `RELATION_SCHEMA_PATH` without changing any Python.
- Both models sit behind an abstraction (`ClinicalNERModel`, `RelationExtractionModel`);
  add a learned relation model later by implementing the interface and registering it in
  `relation_extraction_service.BACKENDS`.

## 13. Docker setup

```bash
docker compose up -d db     # PostgreSQL only, for local development
# or, to run the whole stack in containers:
docker compose up -d
```
The `api` service applies migrations automatically on start (`alembic upgrade head`) and
serves on port 8000. Environment variables come from `.env` (see `docker-compose.yml`).

## 14. Testing

```bash
pytest              # runs the whole suite
pytest -q tests/test_deidentification.py    # one file
```
220+ tests across: auth, document upload/validation/privacy, text extraction (PDF/DOCX/TXT,
corrupted/encrypted/empty files), preprocessing, de-identification (names, phones, emails,
dates, addresses, IDs — with clinical text proven to survive untouched), clinical NER
(label mapping, chunking, confidence thresholds, offset correctness — via a stub that
mirrors the real Hugging Face pipeline's exact output shape), relation extraction (every
rule, cue detection, confidence bounds, JSON schema override), the full `/process`
pipeline (including concurrent-processing conflicts and model-failure handling),
entity/relation/search APIs (filtering, pagination, per-user privacy, SQL-injection-style
input), Observation derivation and pseudonymous Patient assignment, association-rule
mining, clustering (including validation of insufficient data), cohort discovery, database
relationships/cascades, and centralised error formatting. Tests use only synthetic,
invented clinical text — never real patient data — and assert that no PHI or secret
reaches the application logs.

## 15. Example API requests

```bash
# Register and log in
curl -X POST localhost:8000/api/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"a@b.com","password":"S3cure-pass!"}'
TOKEN=$(curl -X POST localhost:8000/api/auth/login \
  -d 'username=a@b.com&password=S3cure-pass!' | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
AUTH="Authorization: Bearer $TOKEN"

# Upload and run the full pipeline
DOC_ID=$(curl -s -X POST localhost:8000/api/documents/upload -H "$AUTH" \
  -F "file=@note.pdf" | python -c "import sys,json;print(json.load(sys.stdin)['document_id'])")
curl -X POST localhost:8000/api/documents/$DOC_ID/process -H "$AUTH"

# Association rules
curl -X POST localhost:8000/api/analytics/association-rules -H "$AUTH" \
  -H 'Content-Type: application/json' -d '{"min_support":0.1,"min_confidence":0.5}'

# Search
curl "localhost:8000/api/search?entity_type=Medication" -H "$AUTH"
```

## 16. Known limitations

- **De-identification is rule-based** (regex + labelled fields), not a learned model. It
  is built behind an interface (`Deidentifier`) specifically so a stronger model can
  replace it later; unlabelled names in free text can still be missed.
- **No OCR** — scanned/image-only PDFs are rejected (`EMPTY_DOCUMENT`).
- **No real patient linkage.** De-identification deliberately removes the identifiers
  that would let two documents be linked to the same real person, so a fresh pseudonymous
  `Patient` is created per document the first time it is processed. Multiple documents
  from the same real patient will appear as separate patients unless linked by an
  external system.
- **Relation extraction is rule-based**, not a trained classifier — see §12.
- **NER confidence is an uncalibrated model probability** (see `app/nlp/confidence.py`),
  useful for ranking/thresholding, not as a literal accuracy percentage.
- **Association rules / clustering need enough data** to be meaningful; both return
  `422 INSUFFICIENT_DATA` with a clear message below their minimums (defaults: ≥3
  documents for rules, ≥4 patients with complete observations for clustering).
- Filenames are stored and shown to their owner as-is (they may contain a patient's
  name if the person who uploaded it named the file that way) — they are never written
  to logs.

## 17. Future improvements

- Swap the rule-based de-identifier for a trained clinical de-identification model.
- Add a learned relation-extraction model behind the existing `RelationExtractionModel`
  interface.
- Background job queue (e.g. Celery/RQ) so `/process` returns immediately for large
  documents instead of blocking the request.
- OCR for scanned documents.
- A proper patient-linkage step (e.g. matching on a hashed external MRN before
  de-identification removes it) instead of one pseudonymous patient per document.
- Role-based access beyond the current user/admin split (e.g. per-organisation sharing).
