# FoodRescue Agent

An agentic AI system that intelligently coordinates surplus food redistribution from restaurants, bakeries and grocery stores to community kitchens, NGOs and shelters.

Built with **Gemini AI · Firebase · FastAPI · React · Google Cloud Run**

---

## What it does

Every day, food businesses generate surplus food that goes to waste while community organisations struggle to source donations. FoodRescue Agent automates the entire coordination workflow:

- Understands food listings using Gemini AI
- Validates eligibility against food-safety rules
- Matches donations to suitable recipients by category, capacity and location
- Coordinates pickups through volunteer drivers
- Recovers automatically when a recipient cancels or transport fails
- Requires human approval for consequential decisions
- Records a full audit trail of every agent decision

---

## Roles

| Role | What they do |
|---|---|
| **Donor** | Restaurants, bakeries, grocery stores — submit surplus food |
| **Recipient** | Community kitchens, NGOs, shelters — register and accept donations |
| **Driver** | Volunteer drivers — accept pickup jobs and confirm handoffs |
| **Coordinator** | Admin — monitor agent activity, approve split allocations, review held donations |

---

## How the agent works

1. Donor submits food description, quantity, storage details and pickup deadline
2. Gemini classifies the food category (`cooked`, `bakery`, `produce`, `packaged`)
3. Backend validates required fields — missing info holds the donation for review
4. Agent searches recipients by category, capacity, unit and location
5. Single recipient → directly coordinated. Split allocation → coordinator approval required
6. Recipient accepts → pickup job created for drivers automatically
7. Recipient declines → agent replans with alternative recipients
8. Driver completes delivery → donation marked `Handoff Verified`

> If Gemini is unavailable, the backend falls back to keyword classification. Food safety is never inferred from appearance alone.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | Firebase Firestore |
| AI | Google Gemini (`gemini-3.5-flash-lite`) |
| Hosting | Google Cloud Run |
| Auth | Coordinator PIN gate (demo) |

---

## Project structure

```
foodrescue-agent/
├── src/
│   ├── pages/
│   │   ├── Landing.jsx          # Role selector
│   │   ├── DonorPage.jsx        # Submit surplus food
│   │   ├── RecipientPage.jsx    # Register + accept donations
│   │   ├── DriverPage.jsx       # Accept jobs + confirm delivery
│   │   └── CoordinatorPage.jsx  # Dashboard + approvals
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── StatusBadge.jsx
│   │   └── AgentLog.jsx
│   └── lib/
│       ├── firebase.js          # Firebase config
│       ├── firestoreService.js  # Firestore listeners
│       └── api.js               # FastAPI client
├── backend/
│   ├── main.py                  # FastAPI app
│   ├── coordination.py          # Agent logic + Gemini
│   ├── models.py                # Pydantic models
│   ├── firebase_client.py       # Firebase Admin SDK
│   ├── seed.py                  # Seed Firestore with dummy data
│   ├── routers/
│   │   ├── donations.py
│   │   ├── recipients.py
│   │   ├── jobs.py
│   │   └── approvals.py
│   ├── Dockerfile
│   └── requirements.txt
├── Dockerfile                   # Frontend container
├── nginx.conf                   # SPA routing
└── .env.example                 # Environment variable template
```

---

## Local setup

### Prerequisites
- Node.js 20+
- Python 3.11+
- Firebase project with Firestore enabled
- Gemini API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### 1. Frontend

Copy `.env.example` to `.env` and fill in your Firebase config:

```bash
cp .env.example .env
```

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_BASE_URL=http://localhost:8000
```

```bash
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

### 2. Backend

Copy `backend/.env.example` to `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

```env
GOOGLE_APPLICATION_CREDENTIALS=serviceAccountKey.json
FIREBASE_PROJECT_ID=your_project_id
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash-lite
```

Place your Firebase service account key at `backend/serviceAccountKey.json`

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`  
API docs at `http://localhost:8000/docs`

### 3. Seed dummy data

```bash
cd backend
python seed.py
```

This populates Firestore with 4 recipients, 3 donations, 2 pickup jobs and 1 approval.

---

## Deployment (Google Cloud Run)

### Backend

```bash
cd backend

gcloud secrets create GEMINI_API_KEY --data-file=- <<< "your_key"
gcloud secrets create FIREBASE_SA --data-file=serviceAccountKey.json

gcloud run deploy foodrescue-backend \
  --source . \
  --region australia-southeast1 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --set-env-vars="FIREBASE_PROJECT_ID=your_project_id,GEMINI_MODEL=gemini-3.5-flash-lite"
```

### Frontend

Update `VITE_API_BASE_URL` in `.env` with the backend Cloud Run URL, then:

```bash
gcloud run deploy foodrescue-frontend \
  --source . \
  --region australia-southeast1 \
  --platform managed \
  --allow-unauthenticated
```

---

## Coordinator access

PIN: `admin123`

---

## Donation workflow states

| State | Meaning |
|---|---|
| `Submitted` | Donor submitted the form |
| `Extracting Details` | Agent reviewing food details |
| `Eligibility Check` | Validating storage and safety fields |
| `Planning Redistribution` | Agent searching for recipients |
| `Awaiting Human Approval` | Split allocation needs coordinator sign-off |
| `Coordinating Pickup` | Recipients confirmed, driver job created |
| `Recovering — Replanning` | Recipient declined, agent finding alternatives |
| `Handoff Verified` | Driver delivered, donation complete |
| `Held for Review` | Missing info or no recipient match found |

---

## Important notes

- This is a hackathon prototype — the coordinator PIN is a frontend-only demo gate
- Firestore rules are currently open (test mode) — add proper rules before production
- The system does not certify food as safe — eligibility is based on documented fields only
- Gemini classifies food category only — it does not make food safety decisions
