import asyncio
from pathlib import Path

from aiogram import Bot
from aiogram.types import FSInputFile, InlineKeyboardButton, InlineKeyboardMarkup

from config import CHANNEL_URL, DELAY_BETWEEN_MESSAGES
from database.crud import (
    get_active_users,
    set_user_inactive,
    update_user_subscription,
)
from database.init_db import async_session
from services.card_service import format_card_message, send_card_to_user
from services.funnel_service import maybe_show_funnel
from services.subscription import check_subscription
from utils.logger import logger

# Telegram error text fragments indicating the bot was blocked
_BLOCKED_ERRORS = ("bot was blocked", "user is deactivated", "chat not found")


async def daily_card_job(bot: Bot) -> None:
    """Send the daily card to every eligible user."""
    logger.info("Starting daily card distribution…")
    sent = 0
    skipped = 0
    errors = 0

    async with async_session() as session:
        users = await get_active_users(session)
        logger.info("Active users to process: %d", len(users))

        for user in users:
            try:
                is_sub = await check_subscription(bot, user.telegram_id)

                if is_sub:
                    if not user.is_channel_subscriber:
                        await update_user_subscription(
                            session, user.telegram_id, True
                        )

                    card = await send_card_to_user(session, user.telegram_id)
                    if card is None:
                        logger.warning(
                            "No card picked for user %s", user.telegram_id
                        )
                        skipped += 1
                        continue

                    # Send card image + text
                    image_path = Path(card.image_path)
                    text = format_card_message(card)

                    if image_path.exists():
                        await bot.send_photo(
                            chat_id=user.telegram_id,
                            photo=FSInputFile(image_path),
                            caption=text,
                            parse_mode="HTML",
                        )
                    else:
                        await bot.send_message(
                            chat_id=user.telegram_id,
                            text=text,
                            parse_mode="HTML",
                        )

                    sent += 1

                    # Refresh user object to get updated days_active
                    await session.refresh(user)

                    # Maybe show funnel
                    await maybe_show_funnel(bot, session, user)

                else:
                    # Not subscribed
                    if user.is_channel_subscriber:
                        # Was subscribed before – send one-time unsubscribe notice
                        await update_user_subscription(
                            session, user.telegram_id, False
                        )
                        keyboard = InlineKeyboardMarkup(
                            inline_keyboard=[
                                [
                                    InlineKeyboardButton(
                                        text="Подписаться на канал",
                                        url=CHANNEL_URL,
                                    )
                                ],
                                [
                                    InlineKeyboardButton(
                                        text="Я подписался \u2713",
                                        callback_data="check_sub",
                                    )
                                ],
                            ]
                        )
                        await bot.send_message(
                            chat_id=user.telegram_id,
                            text=(
                                "Вы отписались от нашего канала.\n\n"
                                "К сожалению, Карта Дня доступна только для "
                                "подписчиков канала. Это наша благодарность за "
                                "то, что вы с нами!\n\n"
                                "Подпишитесь снова, чтобы продолжить получать "
                                "ежедневные расклады \U0001f52e"
                            ),
                            reply_markup=keyboard,
                            parse_mode="HTML",
                        )
                    # else: already marked as non-subscriber, don't spam
                    skipped += 1

            except Exception as exc:
                exc_text = str(exc).lower()
                if any(err in exc_text for err in _BLOCKED_ERRORS):
                    await set_user_inactive(session, user.telegram_id)
                    logger.info(
                        "User %s blocked the bot – marked inactive",
                        user.telegram_id,
                    )
                else:
                    logger.error(
                        "Error sending card to user %s: %s",
                        user.telegram_id,
                        exc,
                    )
                errors += 1

            await asyncio.sleep(DELAY_BETWEEN_MESSAGES)

    logger.info(
        "Daily card distribution finished: sent=%d, skipped=%d, errors=%d",
        sent,
        skipped,
        errors,
    )
