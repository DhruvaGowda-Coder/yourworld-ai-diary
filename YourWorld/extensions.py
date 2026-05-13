from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_wtf.csrf import CSRFProtect

# We initialize these without the 'app' object first
# They will be "attached" to the app in app.py
limiter = Limiter(key_func=get_remote_address, default_limits=["10000 per day", "1000 per hour"])
csrf = CSRFProtect()
