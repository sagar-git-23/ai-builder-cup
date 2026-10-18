import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
import os

load_dotenv()

_app = None

def get_db():
    global _app
    if not _app:
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        project_id = os.getenv("FIREBASE_PROJECT_ID")
        options = {"projectId": project_id} if project_id else None
        if cred_path:
            _app = firebase_admin.initialize_app(credentials.Certificate(cred_path), options=options)
        else:
            # Cloud Run supplies Application Default Credentials from its service identity.
            _app = firebase_admin.initialize_app(options=options)
    return firestore.client()
