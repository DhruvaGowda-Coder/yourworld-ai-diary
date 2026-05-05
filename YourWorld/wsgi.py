"""
Production WSGI entry point.

Run with:
  gunicorn wsgi:app -w 4 -k gevent --timeout 30 --keep-alive 5 --max-requests 1000

Flags explained:
  -w 4           : 4 worker processes (tune to CPU cores)
  -k gevent      : async worker class (handles blocking I/O like Firestore/AI calls)
  --timeout 30   : kill workers that hang >30s
  --keep-alive 5 : keep HTTP connections alive for 5s
  --max-requests 1000 : restart workers after 1000 requests (prevents memory leaks)
"""
from app import app
