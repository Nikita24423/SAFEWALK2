"""
SafeWalk — Telegram-бот (Aiogram 3) + HTTP API для Mini App.

Локально:
  pip install -r telegram_bot/requirements.txt
  set BOT_TOKEN=... & set WEB_APP_URL=https://... & python telegram_bot/main.py

PythonAnywhere (www.pythonanywhere.com):
  1. Загрузите каталог telegram_bot, создайте venv, pip install -r requirements.txt
  2. В Web → WSGI configuration укажите файл wsgi.py из этого каталога
  3. В разделе Web → Environment variables (или в начале wsgi.py) задайте:
     BOT_TOKEN, WEB_APP_URL, USE_WEBHOOK=1,
     WEBHOOK_BASE_URL=https://ВАШ_ЛОГИН.pythonanywhere.com
     TELEGRAM_WEBHOOK_PATH=случайная_длинная_строка (тот же путь в URL вебхука)
     Опционально: TELEGRAM_WEBHOOK_SECRET_TOKEN (и тот же токен в @BotFather для вебхука)
     SOS_SHARED_SECRET — если используется с Next.js
  4. Reload сайта. На PythonAnywhere нельзя держать long polling в воркере — используется webhook.

Переменные окружения:
  BOT_TOKEN                    — токен @BotFather (обязательно)
  WEB_APP_URL                  — HTTPS URL Mini App (кнопка в /start)
  USE_WEBHOOK                  — 1 = webhook (нужно для PythonAnywhere), 0 = polling (локально)
  WEBHOOK_BASE_URL             — https://логин.pythonanywhere.com (без слэша в конце)
  TELEGRAM_WEBHOOK_PATH        — секретный сегмент пути, например a1b2c3d4e5f6
  TELEGRAM_WEBHOOK_SECRET_TOKEN — опционально; заголовок X-Telegram-Bot-Api-Secret-Token
  API_HOST / API_PORT          — только для локального uvicorn
  SOS_SHARED_SECRET            — общий секрет с Next.js /api/sos (опционально)
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
from contextlib import asynccontextmanager
from typing import Any

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, Update, WebAppInfo
from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import BaseModel, Field
import uvicorn

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("safewalk_bot")

BOT_TOKEN = os.environ.get("BOT_TOKEN", "").strip()
WEB_APP_URL = os.environ.get("WEB_APP_URL", "https://example.com").strip()
API_HOST = os.environ.get("API_HOST", "0.0.0.0")
API_PORT = int(os.environ.get("API_PORT", "8000"))
SOS_SHARED_SECRET = os.environ.get("SOS_SHARED_SECRET", "").strip()

USE_WEBHOOK = os.environ.get("USE_WEBHOOK", "").strip().lower() in ("1", "true", "yes", "on")
WEBHOOK_BASE_URL = os.environ.get("WEBHOOK_BASE_URL", "").strip().rstrip("/")
TELEGRAM_WEBHOOK_PATH = os.environ.get("TELEGRAM_WEBHOOK_PATH", "").strip()
TELEGRAM_WEBHOOK_SECRET_TOKEN = os.environ.get("TELEGRAM_WEBHOOK_SECRET_TOKEN", "").strip()

# При импорте как WSGI-модуль (PythonAnywhere) не завершаем процесс — проверка токена при старте uvicorn
_STANDALONE = __name__ == "__main__"
if _STANDALONE and not BOT_TOKEN:
    logger.error("Задайте переменную окружения BOT_TOKEN")
    sys.exit(1)

if not BOT_TOKEN:
    logger.warning("BOT_TOKEN пуст — задайте его в окружении PythonAnywhere (Web → env или файл wsgi.py)")

# Формат токена нужен для импорта WSGI до подстановки env на PythonAnywhere; в работе обязателен реальный BOT_TOKEN
_DUMMY_TG_TOKEN = "000000000:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
bot = Bot(BOT_TOKEN if BOT_TOKEN else _DUMMY_TG_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
dp = Dispatcher()


def _humanize_telegram_send_error(exc: Exception) -> str:
    """Короткое сообщение для пользователя вместо сырого ответа Telegram API."""
    raw = str(exc).strip()
    low = raw.lower()
    if "chat not found" in low or "chat_not_found" in low:
        return (
            "Контакт ещё не открывал вашего бота: пусть зайдёт в Telegram, найдёт этого бота "
            "и нажмёт «Запустить» (/start). Без этого бот не может прислать ему сообщение."
        )
    if "bot was blocked" in low or "blocked by the user" in low:
        return "Пользователь заблокировал бота — разблокируйте в настройках чата с ботом."
    if "user is deactivated" in low:
        return "Аккаунт Telegram этого пользователя недоступен."
    if "too many requests" in low or "flood" in low:
        return "Слишком много запросов к Telegram, попробуйте позже."
    return raw


def _build_sos_text(
    contact_name: str | None,
    route_label: str | None,
    route_from: str | None,
    route_to: str | None,
    situation: str | None,
    lat: float | None,
    lng: float | None,
    share_location: bool,
    instagram_username: str | None,
    requester_name: str | None = None,
    requester_telegram_username: str | None = None,
) -> str:
    lines: list[str] = ["🚨 <b>SOS — SafeWalk</b>"]
    rn = (requester_name or "").strip()
    rt = (requester_telegram_username or "").strip().lstrip("@")
    if rn or rt:
        if rn and rt:
            lines.append(f"От: {rn} (@{rt})")
        elif rn:
            lines.append(f"От: {rn}")
        else:
            lines.append(f"От: @{rt}")
    who = (contact_name or "").strip() or "контакт"
    lines.append(f"Кому: {who}")
    if situation:
        lines.append(f"Ситуация: {situation}")
    parts: list[str] = []
    if route_label:
        parts.append(f"название: {route_label}")
    if route_from or route_to:
        parts.append(f"откуда → куда: {(route_from or '—')} → {(route_to or '—')}")
    if parts:
        lines.append("Маршрут: " + "; ".join(parts))
    if share_location and lat is not None and lng is not None:
        lines.append(f"📍 Текущее местоположение: {lat:.6f}, {lng:.6f}")
        lines.append(f'<a href="https://www.google.com/maps?q={lat},{lng}">Открыть на карте</a>')
    if instagram_username:
        insta = instagram_username.lstrip("@").strip()
        if insta:
            lines.append(
                f"Instagram контакта: @{insta} (авто-DM в Instagram ботом недоступен; "
                f"проверьте сообщение в Telegram или свяжитесь вручную.)"
            )
    return "\n".join(lines)


class ContactIn(BaseModel):
    contact_name: str | None = None
    telegram_username: str | None = None
    instagram_username: str | None = None


class SosRequest(BaseModel):
    contacts: list[ContactIn] = Field(default_factory=list)
    route_label: str | None = None
    route_from: str | None = None
    route_to: str | None = None
    situation: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    share_location: bool = False
    requester_telegram_id: int | None = None
    requester_name: str | None = None
    requester_telegram_username: str | None = None


@dp.message(CommandStart())
async def cmd_start(message: Message) -> None:
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Открыть приложение SafeWalk",
                    web_app=WebAppInfo(url=WEB_APP_URL),
                )
            ]
        ]
    )
    await message.answer(
        "Привет! Вы запустили бота <b>SafeWalk</b>.\n\n"
        "Нажмите кнопку ниже, чтобы перейти в приложение и настроить маршрут, контакты и SOS.",
        reply_markup=keyboard,
    )


@asynccontextmanager
async def lifespan(_app: FastAPI):
    polling_task: asyncio.Task[None] | None = None

    if USE_WEBHOOK:
        if not (WEBHOOK_BASE_URL and TELEGRAM_WEBHOOK_PATH):
            logger.error(
                "USE_WEBHOOK=1, но не заданы WEBHOOK_BASE_URL и TELEGRAM_WEBHOOK_PATH — "
                "бот не получит /start до исправления .env"
            )
        elif BOT_TOKEN:
            wh_url = f"{WEBHOOK_BASE_URL}/telegram/webhook/{TELEGRAM_WEBHOOK_PATH}"
            secret = TELEGRAM_WEBHOOK_SECRET_TOKEN or None
            await bot.set_webhook(url=wh_url, secret_token=secret)
            logger.info("Telegram webhook: %s", wh_url)
    else:
        if BOT_TOKEN:
            polling_task = asyncio.create_task(dp.start_polling(bot))
            logger.info("Aiogram: long polling запущен")

    try:
        yield
    finally:
        if polling_task is not None:
            polling_task.cancel()
            try:
                await polling_task
            except asyncio.CancelledError:
                pass
        if USE_WEBHOOK and BOT_TOKEN:
            try:
                await bot.delete_webhook(drop_pending_updates=False)
            except Exception as e:
                logger.warning("delete_webhook: %s", e)
        await bot.session.close()


app = FastAPI(title="SafeWalk SOS API", lifespan=lifespan)


def _check_secret(x_sos_secret: str | None) -> None:
    if not SOS_SHARED_SECRET:
        return
    if (x_sos_secret or "").strip() != SOS_SHARED_SECRET:
        raise HTTPException(status_code=401, detail="Invalid SOS secret")


@app.post("/sos")
async def post_sos(
    body: SosRequest,
    x_sos_secret: str | None = Header(default=None, alias="X-SOS-Secret"),
) -> dict[str, Any]:
    if not BOT_TOKEN:
        raise HTTPException(status_code=503, detail="BOT_TOKEN не настроен")
    _check_secret(x_sos_secret)
    if not body.contacts:
        raise HTTPException(status_code=400, detail="Нет контактов")

    results: list[dict[str, Any]] = []
    for c in body.contacts:
        text = _build_sos_text(
            contact_name=c.contact_name,
            route_label=body.route_label,
            route_from=body.route_from,
            route_to=body.route_to,
            situation=body.situation,
            lat=body.latitude,
            lng=body.longitude,
            share_location=body.share_location,
            instagram_username=c.instagram_username,
            requester_name=body.requester_name,
            requester_telegram_username=body.requester_telegram_username,
        )
        tg = (c.telegram_username or "").strip().lstrip("@")
        if tg:
            try:
                await bot.send_message(chat_id=f"@{tg}", text=text)
                results.append({"contact": c.contact_name, "telegram": tg, "ok": True})
            except Exception as e:
                logger.warning("send_message @%s: %s", tg, e)
                results.append(
                    {
                        "contact": c.contact_name,
                        "telegram": tg,
                        "ok": False,
                        "error": _humanize_telegram_send_error(e),
                    }
                )
        else:
            results.append(
                {
                    "contact": c.contact_name,
                    "ok": False,
                    "error": "Нет Telegram @username — укажите Telegram в контакте для авто-отправки",
                }
            )

    summary = (
        "✅ Запрос SOS обработан сервером.\n"
        + "\n".join(
            f"• {r.get('contact', '?')}: {'ок' if r.get('ok') else r.get('error', 'ошибка')}"
            for r in results
        )
    )
    summary = summary[:4000]
    if body.requester_telegram_id:
        try:
            await bot.send_message(chat_id=body.requester_telegram_id, text=summary)
        except Exception as e:
            logger.warning("notify requester (id): %s", e)
    else:
        ru = (body.requester_telegram_username or "").strip().lstrip("@")
        if ru:
            try:
                await bot.send_message(chat_id=f"@{ru}", text=summary)
            except Exception as e:
                logger.warning("notify requester (@%s): %s", ru, e)

    return {"ok": True, "results": results}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


if TELEGRAM_WEBHOOK_PATH:

    @app.post("/telegram/webhook/{path_token}")
    async def telegram_webhook(path_token: str, request: Request) -> dict[str, bool]:
        if path_token != TELEGRAM_WEBHOOK_PATH:
            raise HTTPException(status_code=404, detail="Not found")
        if TELEGRAM_WEBHOOK_SECRET_TOKEN:
            hdr = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
            if hdr != TELEGRAM_WEBHOOK_SECRET_TOKEN:
                raise HTTPException(status_code=403, detail="Invalid secret token")
        if not BOT_TOKEN:
            raise HTTPException(status_code=503, detail="BOT_TOKEN не настроен")
        data = await request.json()
        update = Update.model_validate(data)
        await dp.feed_update(bot, update)
        return {"ok": True}


if __name__ == "__main__":
    uvicorn.run(app, host=API_HOST, port=API_PORT)
