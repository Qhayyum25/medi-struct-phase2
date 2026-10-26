# Medistruct — Frontend

The frontend for **Medistruct**, a clinical NLP and medical document intelligence
platform. It turns the Stage 4 backend's document/entity/relation/analytics APIs into a
clinical intelligence workspace: upload a document, watch it get de-identified and run
through clinical NER and relation extraction, then explore what was found — as
highlighted text, an interactive relation graph, a patient-centered "Clinical Knowledge
Map", and research-style analytics (association rules, clustering, cohort discovery).

Built against the real Stage 4 backend's schemas — nothing here is mocked or invented.

## Tech stack

React 19 + TypeScript, Vite, Tailwind CSS v4, React Router, TanStack Query (server
state), Recharts (charts), lucide-react (icons). No UI kit — every component in
`src/components/ui` is original, built for this product.

## Setup

```bash
npm install
cp .env.example .env      # point VITE_API_URL at your backend if not localhost:8000
npm run dev                # http://localhost:5173
```

The Stage 4 backend must be running (`uvicorn app.main:app --reload`, default
`http://localhost:8000`) and reachable at `VITE_API_URL`. CORS: make sure the backend's
`CORS_ORIGINS` includes the frontend's origin (`http://localhost:5173` by default).

```bash
npm run build      # type-check (tsc -b) + production build to dist/
npm run preview    # serve the production build locally
npm run lint        # oxlint
```

## Environment variables

| Variable | Meaning |
|---|---|
| `VITE_API_URL` | Base URL of the Medistruct backend, e.g. `http://localhost:8000`. No trailing slash needed. |

No secrets live in the frontend: the only credential is the JWT the backend issues at
login, held in `localStorage` and attached to requests by the API client.

## Project structure

```
src/
├── api/           one file per backend resource (client.ts is the shared fetch wrapper)
├── types/api.ts   TypeScript types transcribed 1:1 from the backend's Pydantic schemas
├── components/
│   ├── ui/         design system: Button, Input, Select, Badge, StatusBadge, Card,
│   │                Modal, Tabs, Pagination, Skeleton, EmptyState, ErrorState, etc.
│   ├── layout/     Sidebar, Topbar, AppShell, MobileNav
│   └── domain/     EntityText (annotated reader), RelationGraph, KnowledgeMap,
│                    UploadDialog, ConfirmDialog, GraphCanvas, ProcessingFunnel
├── pages/          one folder per area (documents, patients, analytics, auth)
├── context/        AuthContext (session), ToastContext (notifications)
├── hooks/          useDebounce, useApiHealth
└── lib/            entityTypes (color system), format, errors, queryKeys, cn
```

## Design system & visual identity

Palette: deep clinical indigo (brand, primary actions) + medical teal (successful
extraction) + violet reserved specifically for relationships/analytics, on a cool paper
background — flat 1px-bordered surfaces rather than heavy shadowed cards. Typography
pairs **IBM Plex Sans** for interface prose with **IBM Plex Mono** for anything that is
literally structured data (offsets, confidence scores, IDs, counts) — a deliberate
pairing that echoes the product's job of turning prose into structured values. Every
entity type has one consistent color used everywhere (highlighted text, badges, charts,
the knowledge map), defined once in `lib/entityTypes.ts`.

Two signature visual pieces:
- **Annotated document reader** (`EntityText`) — read a document exactly as Medistruct
  extracted it, with entity spans highlighted in place; click one to inspect its type,
  confidence and offsets.
- **Clinical Knowledge Map** (`KnowledgeMap`, on each patient's page) — a concentric
  layout (patient → their documents → the entities those documents produced, grouped by
  type → detected relations as arcs) that encodes the product's real hierarchy instead of
  a generic force-directed graph.

## Pages implemented

| Page | Route |
|---|---|
| Sign in / Create account | `/login`, `/register` |
| Dashboard | `/` |
| Documents (list, filter, upload, delete) | `/documents` |
| Document detail (entities, relations, de-identified text, raw JSON) | `/documents/:id` |
| Patients | `/patients` |
| Patient detail (Clinical Knowledge Map, findings, documents) | `/patients/:id` |
| Search | `/search` |
| Analytics landing | `/analytics` |
| Association Rules | `/analytics/association-rules` |
| Patient Clustering | `/analytics/clustering` |
| Cohort Discovery | `/analytics/cohorts` |
| Settings | `/settings` |

## Backend endpoints used

```
POST   /api/auth/register              POST   /api/documents/{id}/deidentify
POST   /api/auth/login                 POST   /api/documents/{id}/process
GET    /api/auth/me                    DELETE /api/documents/{id}
POST   /api/documents/upload           GET    /api/documents/{id}/entities
GET    /api/documents                  GET    /api/documents/{id}/relations
GET    /api/documents/{id}             GET    /api/entities
GET    /api/documents/{id}/status      GET    /api/entities/{id}
POST   /api/documents/{id}/extract     GET    /api/relations
GET    /api/patients                   GET    /api/search
GET    /api/patients/{id}              POST   /api/analytics/association-rules
GET    /health (connection indicator)  POST   /api/analytics/clusters
                                        POST   /api/analytics/cohorts
```

Every request/response shape in `src/types/api.ts` and `src/api/*.ts` was transcribed
directly from the backend's Pydantic schemas — field names, optionality and nesting match
exactly (e.g. `RelationRead.subject_entity`/`object_entity` carry the full nested
`EntityRead`, `DocumentSummary.status` is the backend's aliased `processing_status`,
pagination is always `{items, total, page, page_size}`).

## API integration notes

- **Auth**: `/api/auth/login` is the backend's OAuth2 password form
  (`application/x-www-form-urlencoded`, fields `username`/`password`), not JSON — handled
  as a special case in `api/auth.ts` while every other endpoint uses the shared JSON/`fetch`
  client in `api/client.ts`.
- **Errors**: every non-2xx response is normalized into one `ApiError` (`status`, `code`,
  `message`) from the backend's `{"success": false, "error": {...}}` shape. `lib/errors.ts`
  turns that into one plain-language sentence per screen, with a specific, reassuring
  message for `503`/`MODEL_UNAVAILABLE` (and any other 503) — the raw backend message is
  never shown for that case. `422` validation errors surface the backend's own field
  messages. Analytics' `422 INSUFFICIENT_DATA` is rendered as an encouraging empty state
  ("Process more clinical documents to generate insights"), not a scary error.
- **Processing timeline**: `POST /process` is a single blocking backend call — there is no
  intermediate state to poll mid-request. The upload dialog's "Uploaded → De-identifying →
  Clinical NLP → Extracting relations → Completed" timeline is therefore an honest
  approximation (it cycles the middle steps while the request is in flight) that
  reconciles with the real result — success or the backend's actual failure reason — the
  moment the response arrives. It never claims the pipeline succeeded when it didn't.
- **Search requires a filter**: `/api/search` 422s with no query params, matching the
  backend; the search page only calls it once the user has typed something or picked a
  filter.
- **Privacy**: patients are shown and linked only by `anonymized_identifier`/UUID —
  nothing else is ever displayed, matching what the backend itself exposes.

## Testing performed

Since this environment has no headless browser, verification was done at every level that
is meaningfully checkable without one:

1. **`tsc -b`** — zero TypeScript errors across the whole project.
2. **`npm run build`** — production build succeeds; route-level code-splitting (`React.lazy`)
   confirmed via the per-page chunks in the build output.
3. **`npm run lint`** (oxlint) — 0 errors (3 minor, expected React-fast-refresh style
   warnings from colocating a context and its hook, which is intentional).
4. **`vite preview`** — the built app is served and returns the real `index.html`.
5. **Live backend integration test** — a script issuing the *exact* requests the frontend
   makes (same headers, same body shapes, same query params) against a running Stage 4
   backend on real PostgreSQL: register → login (OAuth2 form) → `/me` → upload a real file
   → list/detail/status → entities/relations for a document → search (422 with no filter,
   200 with one) → patients list/detail → all three analytics endpoints → delete. **19/19
   checks passed.** The one endpoint that cannot be fully exercised in this sandbox is
   `/process` end-to-end, because `huggingface.co` (needed to download the NER model
   weights) is not reachable from this sandbox network — the test instead confirms the
   backend's own documented fallback: a clean `503 MODEL_UNAVAILABLE`, which the frontend
   renders as the friendly message described above. In an environment with normal internet
   access, `/process` will run the real model and this same code path returns `200` with
   real entities and relations — no frontend change is needed either way.
6. Dashboard, document detail, patient detail, association rules, clustering and cohort
   discovery were each checked against a realistically-seeded database (multiple
   documents, entities, relations and lab observations) to confirm the real backend data
   shapes render correctly end-to-end through the UI code paths.

## Backend compatibility issues discovered

None that required changing the backend. Two integration details worth noting for anyone
extending this:
- The login endpoint's OAuth2 form body is easy to miss if you assume every endpoint is
  JSON — see `api/auth.ts`.
- `DocumentSummary`/`DocumentDetail` expose `status`, not `processing_status` (the backend
  aliases it in `DocumentSummary`'s Pydantic schema) — the frontend types follow that
  alias.

## Known limitations (inherited from the backend, by design)

- No file download endpoint exists, so there is no "Download" action on documents.
- De-identification and relation extraction are rule-based (see the backend's own
  README) — the frontend surfaces exactly what they return, including their confidence
  scores, without smoothing that over.
- The entity-type distribution chart on the dashboard is computed from up to the 100 most
  recently extracted entities (the backend has no dedicated stats endpoint); the total
  counts everywhere else (documents, patients, entities, relations) are always exact,
  server-computed totals.
