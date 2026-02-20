from pathlib import Path

from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import (
    FSInputFile,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)

from config import BONUS_FILE, CHANNEL_URL
from database.crud import get_or_create_user, set_bonus_received
from database.init_db import async_session
from services.subscription import check_subscription
from utils.logger import logger

router = Router(name="start")


@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    tg_user = message.from_user
    if tg_user is None:
        return

    async with async_session() as session:
        user = await get_or_create_user(
            session,
            telegram_id=tg_user.id,
            username=tg_user.username,
            first_name=tg_user.first_name,
        )

        is_sub = await check_subscription(message.bot, tg_user.id)

        if is_sub:
            from database.crud import update_user_subscription

            await update_user_subscription(session, tg_user.id, True)

            await message.answer(
                f"Добро пожаловать, {tg_user.first_name or 'друг'}! \U0001f52e\n\n"
                "Рады видеть вас в нашем боте «Карта Дня».\n\n"
                "Каждый день в 9:00 по Москве вы будете получать "
                "персональную Карту Дня! Это работает, пока вы "
                "подписаны на наш канал.\n\n"
                "Используйте /card чтобы получить карту прямо сейчас,\n"
                "/help — справка о боте.",
                parse_mode="HTML",
            )

            # Send bonus if not yet received
            if not user.bonus_received:
                bonus_path = Path(BONUS_FILE)
                if bonus_path.exists():
                    await message.answer_document(
                        document=FSInputFile(bonus_path),
                        caption="Вот ваш бонусный материал! \U0001f381",
                    )
                else:
                    await message.answer(
                        "Бонусный материал будет доступен в ближайшее время."
                    )
                await set_bonus_received(session, tg_user.id)

        else:
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
            await message.answer(
                "Привет! \U0001f44b\n\n"
                "Чтобы получать ежедневную Карту Дня и забрать бонус, "
                "подпишитесь на наш канал:",
                reply_markup=keyboard,
                parse_mode="HTML",
            )

    logger.info("User %s (%s) started the bot", tg_user.id, tg_user.username)
