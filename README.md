# ai-builder-cup — FoodRescue Agent

FoodRescue Agent is a prototype for coordinating surplus-food donations across donors, recipient organizations, volunteer drivers, and coordinators. The frontend uses Firebase Firestore for live updates. A FastAPI backend now owns writes that trigger coordination.

## Coordination flow

1. A donor submits the food description, amount and unit, preparation time, pickup deadline, storage details, organization, pickup town/suburb, and street address.
2. The backend asks Gemini to classify the description as `cooked`, `bakery`, `produce`, or `packaged`. It sends the food description and optional packaging notes only. Gemini does not decide food safety, choose actions, or write to Firestore.
3. Deterministic backend checks require preparation time, pickup deadline, storage information, pickup town/suburb, and street address. Missing details pause the donation for review. The system does not certify food as safe.
4. The backend matches category, quantity unit, capacity, and location against recipient records. A complete split across multiple recipients waits for coordinator approval.
5. Recipients select their organization and accept or decline their proposed allocation. Acceptance creates a pickup job; a decline triggers a deterministic replan, with a coordinator approval step if the replacement plan is split.
6. Drivers update pickup/delivery progress. The donation becomes `Handoff Verified` only after every linked pickup job is completed. Agent decisions and state changes are recorded in each donation's `agentLogs` subcollection.

If Gemini is unavailable, the backend records that fact and tries a small deterministic keyword classifier. If the category remains uncertain, it holds the donation for review instead of making an offer.

## Local setup

### Firebase and frontend

1. Create a Firebase project and enable Firestore. Configure the web app values in the root `.env` using [.env.example](./.env.example).
2. Set `VITE_API_BASE_URL=http://localhost:8000`.
3. Install and run the frontend from the repository root:

   ```powershell
   npm install
   npm run dev
   ```

### Backend and Gemini

1. Use Python 3.15 and create a Firebase service account with only the Firestore permissions the prototype needs. Save its JSON key as `backend/serviceAccountKey.json` (or set `GOOGLE_APPLICATION_CREDENTIALS` to its path).
2. Copy `backend/.env.example` to `backend/.env`, then set `GEMINI_API_KEY` there. Keep this key server-side; do not put it in a `VITE_` variable or commit it.
3. Install and start the API from the `backend` directory:

   ```powershell
   cd backend
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   python -m unittest discover -s tests
   uvicorn main:app --reload
   ```

4. Open `http://localhost:8000/docs` and create recipient records with `POST /recipients`. Each recipient needs a name, location, address, accepted categories, capacity, and `capacityUnit` matching the donor's unit (for example, `portions`). Matching never assumes different units are interchangeable.

## Prototype limitations and deployment warning

The API currently has no authentication or authorization, and the coordinator PIN is a frontend-only demo gate. Firebase client reads also require appropriate Firestore rules. Run this prototype locally with trusted test data only; before deployment, add authenticated role-based access, server-side authorization, rate limits, and production Firestore rules. Do not use this prototype as a food-safety determination system.
