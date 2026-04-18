
import os
from dotenv import load_dotenv

APP_DIR = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(APP_DIR, ".env")
print(f"Loading env from {env_path}")
load_dotenv(env_path)

try:
    print("Importing app...")
    from app import app
    print("App imported successfully!")
    
    # Check firebase
    import firebase_db
    print("Firebase DB imported successfully!")
    
    db = firebase_db.get_db()
    print("Firebase DB connection established!")
    
except Exception as e:
    import traceback
    print("Error during startup check:")
    traceback.print_exc()
