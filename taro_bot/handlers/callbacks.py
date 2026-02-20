from pathlib import Path

from aiogram import F, Router
from aiogram.types import CallbackQuery, FSInputFile

from config import BONUS_FILE, CHANNEL_URL
from database.crud import (
    get_or_create_user,
    set_bonus_received,
    update_user_subscription,
)
from database.init_db import async_session
from services.subscription import check_subscription
from utils.logger import logger

router = Router(name="callbacks")


@router.callback_query(F.data == "check_sub")
async def cb_check_subscription(callback: CallbackQuery) -> None:
    """User clicked 'Я подписался' — re-check channel membership."""
    tg_user = callback.from_user
    if tg_user is None:
        return

    await callback.answer()  # dismiss the spinner

    is_sub = await check_subscription(callback.bot, tg_user.id)

    if is_sub:
        async with async_session() as session:
            user = await get_or_create_user(
                session,
                telegram_id=tg_user.id,
                username=tg_user.username,
                first_name=tg_user.first_name,
            )
            await update_user_subscription(session, tg_user.id, True)

            await callback.message.edit_text(
                f"Отлично, {tg_user.first_name or 'друг'}! "
                "Подписка подтверждена \u2705\n\n"
                "Каждый день в 9:00 МСК вы будете получать персональную "
                "Карту Дня!\n\n"
                "Используйте /card чтобы получить карту прямо сейчас.",
                parse_mode="HTML",
            )

            # Send bonus if not yet received
            if not user.bonus_received:
                bonus_path = Path(BONUS_FILE)
                if bonus_path.exists():
                    await callback.message.answer_document(
                        document=FSInputFile(bonus_path),
                        caption="Вот ваш бонусный материал! \U0001f381",
                    )
                else:
                    await callback.message.answer(
                        "Бонусный материал будет доступен в ближайшее время."
                    )
                await set_bonus_received(session, tg_user.id)

        logger.info("User %s confirmed subscription", tg_user.id)
    else:
        await callback.message.answer(
            "Подписка не найдена. Пожалуйста, подпишитесь на канал "
            f"и нажмите кнопку ещё раз.",
            parse_mode="HTML",
        )
