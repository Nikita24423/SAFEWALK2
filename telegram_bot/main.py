"""
SafeWalk — Telegram-бот (Aiogram 3) + HTTP API для SOS из Mini App.

Запуск: из каталога проекта
  pip install -r telegram_bot/requirements.txt
  set BOT_TOKEN=... & set WEB_APP_URL=https://your-domain.example & python telegram_bot/main.py

Переменные окружения:
  BOT_TOKEN           — токен @BotFather (обязательно)
  WEB_APP_URL         — HTTPS URL веб-приложения (кнопка «открыть приложение»)
  API_HOST            — по умолчанию 0.0.0.0
  API_PORT            — по умолчанию 8000
  SOS_SHARED_SECRET   — общий секрет с Next.js /api/sos (опционально)
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
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
import uvicorn

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("safewalk_bot")

BOT_TOKEN = os.environ.get("BOT_TOKEN", "8631299684:AAGYA1aHtx5F1VI6gS3CTw5-HN79ymmt134").strip()
WEB_APP_URL = os.environ.get("WEB_APP_URL", "https://safewalk-2.vercel.app/map").strip()
API_HOST = os.environ.get("API_HOST", "0.0.0.0")
API_PORT = int(os.environ.get("API_PORT", "8000"))
SOS_SHARED_SECRET = os.environ.get("SOS_SHARED_SECRET", "").strip()

if not BOT_TOKEN:
    logger.error("Задайте переменную окружения BOT_TOKEN")
    sys.exit(1)

bot = Bot(BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
dp = Dispatcher()


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
) -> str:
    lines: list[str] = ["🚨 <b>SOS — SafeWalk</b>"]
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
    polling_task = asyncio.create_task(dp.start_polling(bot))
    logger.info("Aiogram: polling запущен")
    yield
    polling_task.cancel()
    try:
        await polling_task
    except asyncio.CancelledError:
        pass
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
                        "error": str(e),
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

    if body.requester_telegram_id:
        try:
            summary = (
                "✅ Запрос SOS обработан сервером.\n"
                + "\n".join(
                    f"• {r.get('contact', '?')}: {'ок' if r.get('ok') else r.get('error', 'ошибка')}"
                    for r in results
                )
            )
            await bot.send_message(chat_id=body.requester_telegram_id, text=summary[:4000])
        except Exception as e:
            logger.warning("notify requester: %s", e)

    return {"ok": True, "results": results}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(app, host=API_HOST, port=API_PORT)
