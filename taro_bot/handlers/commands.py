from datetime import datetime
from pathlib import Path

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import FSInputFile, Message

from config import ADMIN_IDS, CHANNEL_ID
from database.crud import (
    count_user_cards,
    get_active_users,
    get_funnel_stats,
    get_stats,
    get_user,
)
from database.init_db import async_session
from services.card_service import format_card_message, send_card_to_user
from services.subscription import check_subscription
from utils.logger import logger

router = Router(name="commands")


# ───────────────────── /help ─────────────────────


@router.message(Command("help"))
async def cmd_help(message: Message) -> None:
    await message.answer(
        "<b>Карта Дня — справка</b>\n\n"
        "/start — запуск бота и получение бонуса\n"
        "/card — получить Карту Дня (если ещё не получали сегодня)\n"
        "/status — ваша статистика\n"
        "/help — эта справка\n\n"
        "Каждый день в 9:00 МСК вы автоматически получаете Карту Дня, "
        "если подписаны на наш канал.",
        parse_mode="HTML",
    )


# ───────────────────── /card ─────────────────────


@router.message(Command("card"))
async def cmd_card(message: Message) -> None:
    tg_user = message.from_user
    if tg_user is None:
        return

    is_sub = await check_subscription(message.bot, tg_user.id)
    if not is_sub:
        await message.answer(
            "Карта Дня доступна только для подписчиков канала. "
            "Подпишитесь и попробуйте снова!"
        )
        return

    async with async_session() as session:
        user = await get_user(session, tg_user.id)
        if user is None:
            await message.answer("Пожалуйста, сначала нажмите /start.")
            return

        # Check if card was already sent today
        if user.last_card_sent_at:
            today = datetime.utcnow().date()
            if user.last_card_sent_at.date() == today:
                await message.answer(
                    "Вы уже получили Карту Дня сегодня! "
                    "Следующая карта будет завтра в 9:00 МСК."
                )
                return

        card = await send_card_to_user(session, tg_user.id)
        if card is None:
            await message.answer(
                "К сожалению, сейчас нет доступных карт. "
                "Попробуйте позже."
            )
            return

        text = format_card_message(card)
        image_path = Path(card.image_path)

        if image_path.exists():
            await message.answer_photo(
                photo=FSInputFile(image_path),
                caption=text,
                parse_mode="HTML",
            )
        else:
            await message.answer(text, parse_mode="HTML")


# ───────────────────── /status ─────────────────────


@router.message(Command("status"))
async def cmd_status(message: Message) -> None:
    tg_user = message.from_user
    if tg_user is None:
        return

    async with async_session() as session:
        user = await get_user(session, tg_user.id)
        if user is None:
            await message.answer("Пожалуйста, сначала нажмите /start.")
            return

        total_cards = await count_user_cards(session, tg_user.id)
        sub_status = "активна \u2705" if user.is_channel_subscriber else "нет \u274c"

        await message.answer(
            f"<b>Ваш статус</b>\n\n"
            f"Получено карт: {total_cards}\n"
            f"Дней активности: {user.days_active}\n"
            f"Подписка на канал: {sub_status}",
            parse_mode="HTML",
        )


# ──────────────── Admin: /stats ────────────────────


@router.message(Command("stats"))
async def cmd_stats(message: Message) -> None:
    tg_user = message.from_user
    if tg_user is None or tg_user.id not in ADMIN_IDS:
        return

    async with async_session() as session:
        s = await get_stats(session)

    await message.answer(
        "<b>Статистика бота</b>\n\n"
        f"Всего пользователей: {s['total_users']}\n"
        f"Активных: {s['active_users']}\n"
        f"Подписчиков канала: {s['channel_subscribers']}\n"
        f"Карт отправлено сегодня: {s['cards_sent_today']}",
        parse_mode="HTML",
    )


# ──────────────── Admin: /broadcast ────────────────


@router.message(Command("broadcast"))
async def cmd_broadcast(message: Message) -> None:
    tg_user = message.from_user
    if tg_user is None or tg_user.id not in ADMIN_IDS:
        return

    text = message.text
    if text is None:
        return

    # Strip the /broadcast prefix
    content = text.removeprefix("/broadcast").strip()
    if not content:
        await message.answer("Использование: /broadcast Текст сообщения")
        return

    async with async_session() as session:
        users = await get_active_users(session)

    sent = 0
    failed = 0
    import asyncio

    for user in users:
        try:
            await message.bot.send_message(
                chat_id=user.telegram_id, text=content, parse_mode="HTML"
            )
            sent += 1
        except Exception:
            failed += 1
        await asyncio.sleep(0.05)

    await message.answer(
        f"Рассылка завершена.\nОтправлено: {sent}\nОшибок: {failed}"
    )

    logger.info(
        "Broadcast by admin %s: sent=%d, failed=%d",
        tg_user.id,
        sent,
        failed,
    )


# ──────────────── Admin: /funnel_stats ─────────────


@router.message(Command("funnel_stats"))
async def cmd_funnel_stats(message: Message) -> None:
    tg_user = message.from_user
    if tg_user is None or tg_user.id not in ADMIN_IDS:
        return

    async with async_session() as session:
        stats = await get_funnel_stats(session)

    if not stats:
        await message.answer("Пока нет данных по воронкам.")
        return

    lines = ["<b>Статистика воронок</b>\n"]
    for funnel_type, shown, clicked in stats:
        clicked = clicked or 0
        ctr = (clicked / shown * 100) if shown > 0 else 0
        lines.append(
            f"<b>{funnel_type}</b>: показов {shown}, кликов {clicked}, "
            f"CTR {ctr:.1f}%"
        )

    await message.answer("\n".join(lines), parse_mode="HTML")
