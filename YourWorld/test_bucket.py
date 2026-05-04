import os
import firebase_admin
from firebase_admin import credentials, storage
from dotenv import load_dotenv
import json

load_dotenv()
json_cred = os.environ.get("FIREBASE_ADMIN_CREDENTIALS_JSON")
cred_dict = json.loads(json_cred)
cred = credentials.Certificate(cred_dict)

for bucket_name in ["diary-13644.appspot.com", "diary-13644.firebasestorage.app"]:
    try:
        app = firebase_admin.initialize_app(cred, {'storageBucket': bucket_name}, name=bucket_name)
        bucket = storage.bucket(app=app)
        exists = bucket.exists()
        print(f"Bucket {bucket_name} exists: {exists}")
    except Exception as e:
        print(f"Bucket {bucket_name} error: {e}")
