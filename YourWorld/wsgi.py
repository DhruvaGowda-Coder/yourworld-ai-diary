import os
from app import app, init_db

# Ensure the database is initialized when starting via a WSGI server (like gunicorn)
init_db()

if __name__ == "__main__":
    app.run()
