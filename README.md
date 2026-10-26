# Medistruct (full stack)

```
medistruct/
├── backend/    FastAPI + PostgreSQL + clinical NLP   -> http://localhost:8000/docs
└── frontend/   React + Vite                          -> http://localhost:5173
```

`backend/.env` is already filled in (random DB password + JWT secret). Frontend `.env` points to http://localhost:8000.

## Run (open 3 terminals in Antigravity: Terminal > New Terminal)

### Terminal 1 - database
```bash
cd backend
docker compose up -d db
```

### Terminal 2 - backend
```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt   # big download (torch)
alembic upgrade head
uvicorn app.main:app --reload
```

### Terminal 3 - frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173, register, log in, upload a PDF/DOCX/TXT.
First upload downloads the ~400 MB NER model (or run `python -m scripts.download_models` once).

No Docker? Install PostgreSQL 16 and run:
```sql
CREATE USER medistruct_user WITH PASSWORD '<password from backend/.env>';
CREATE DATABASE medistruct OWNER medistruct_user;
```
