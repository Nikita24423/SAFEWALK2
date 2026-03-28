"""
Точка входа WSGI для www.pythonanywhere.com (вкладка Web → Code → WSGI configuration file).

1. Virtualenv: укажите venv, где установлены зависимости из requirements.txt
2. В WSGI-файле (или оставьте этот файл как основной) задайте путь к каталогу telegram_bot в sys.path
3. Обязательные переменные окружения (Web → Environment variables):
   BOT_TOKEN, WEB_APP_URL, WEBHOOK_BASE_URL, TELEGRAM_WEBHOOK_PATH
4. USE_WEBHOOK=1 (ниже выставляется по умолчанию)

Полный URL вебхука будет:
  {WEBHOOK_BASE_URL}/telegram/webhook/{TELEGRAM_WEBHOOK_PATH}
Его же указывает main.py при set_webhook (HTTPS обязателен для Telegram).
"""

from __future__ import annotations

import os
import sys

# Каталог, где лежат main.py и этот файл
_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

# Режим PythonAnywhere: webhook вместо polling
os.environ.setdefault("USE_WEBHOOK", "1")

from a2wsgi import ASGIMiddleware

from main import app as fastapi_app

application = ASGIMiddleware(fastapi_app)
