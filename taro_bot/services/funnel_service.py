import json
from datetime import datetime, timedelta
from pathlib import Path

from aiogram import Bot
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from sqlalchemy.ext.asyncio import AsyncSession

from config import FUNNELS_CONFIG
from database.crud import add_funnel_log, update_funnel_shown
from database.models import User
from utils.logger import logger

_funnels_cache: dict | None = None


def _load_funnels() -> dict:
    global _funnels_cache
    if _funnels_cache is None:
        path = Path(FUNNELS_CONFIG)
        if not path.exists():
            logger.warning("Funnels config not found at %s", path)
            return {"funnels": [], "repeat_cycle_days": 20, "min_days_between_funnels": 3}
        with open(path, encoding="utf-8") as f:
            _funnels_cache = json.load(f)
    return _funnels_cache


def _pick_funnel_for_day(days_active: int) -> dict | None:
    """Return the funnel config dict that should be shown on this day, or None."""
    config = _load_funnels()
    funnels = config.get("funnels", [])
    if not funnels:
        return None

    cycle = config.get("repeat_cycle_days", 20)

    # Check exact trigger days first
    for f in funnels:
        if days_active == f["trigger_day"]:
            return f

    # After all explicit trigger days, cycle
    max_trigger = max(f["trigger_day"] for f in funnels)
    if days_active > max_trigger:
        offset = (days_active - max_trigger - 1) % (cycle * len(funnels))
        idx = offset // cycle
        if offset % cycle == 0 and idx < len(funnels):
            return funnels[idx]

    return None


async def maybe_show_funnel(
    bot: Bot, session: AsyncSession, user: User
) -> bool:
    """Check if a funnel should be shown and send it. Returns True if sent."""
    config = _load_funnels()
    min_gap = config.get("min_days_between_funnels", 3)

    # Respect minimum gap
    if user.last_funnel_shown_at:
        gap = datetime.utcnow() - user.last_funnel_shown_at
        if gap < timedelta(days=min_gap):
            return False

    funnel = _pick_funnel_for_day(user.days_active)
    if funnel is None:
        return False

    messages = funnel.get("messages", [])
    if not messages:
        return False

    msg = messages[0]  # use first message variant
    funnel_type = funnel["type"]

    log_id = await add_funnel_log(session, user.telegram_id, funnel_type)
    await update_funnel_shown(session, user.telegram_id, funnel_type)

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text=msg.get("button_text", "Подробнее"),
                    url=msg.get("url", "https://example.com"),
                )
            ]
        ]
    )

    try:
        await bot.send_message(
            chat_id=user.telegram_id,
            text=msg["text"],
            reply_markup=keyboard,
            parse_mode="HTML",
        )
        logger.info(
            "Funnel '%s' shown to user %s (log_id=%s)",
            funnel_type,
            user.telegram_id,
            log_id,
        )
        return True
    except Exception as exc:
        logger.error(
            "Failed to send funnel to user %s: %s", user.telegram_id, exc
        )
        return False
