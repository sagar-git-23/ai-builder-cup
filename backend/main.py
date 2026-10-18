import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import donations, recipients, jobs, approvals

app = FastAPI(title="FoodRescue Agent API", version="1.0.0")

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(donations.router)
app.include_router(recipients.router)
app.include_router(jobs.router)
app.include_router(approvals.router)


@app.get("/")
def root():
    return {"status": "FoodRescue Agent API running"}


@app.get("/health")
def health():
    return {"status": "ok"}
