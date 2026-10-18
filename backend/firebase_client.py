import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
import os

load_dotenv()

_app = None

def get_db():
    global _app
    if not _app:
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "serviceAccountKey.json")
        cred = credentials.Certificate(cred_path)
        _app = firebase_admin.initialize_app(cred)
    return firestore.client()
