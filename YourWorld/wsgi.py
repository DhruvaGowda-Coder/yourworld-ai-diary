"""
Production WSGI entry point.

Run with:
  gunicorn wsgi:app -w 4 --worker-class gthread --threads 4 --timeout 30 --keep-alive 5 --max-requests 1000

Flags explained:
  -w 4                  : 4 worker processes (tune to CPU cores)
  --worker-class gthread: thread-based workers (handles blocking I/O safely)
  --threads 4           : 4 threads per worker
  --timeout 30          : kill workers that hang >30s
  --keep-alive 5        : keep HTTP connections alive for 5s
  --max-requests 1000   : restart workers after 1000 requests (prevents memory leaks)
"""
from app import app
