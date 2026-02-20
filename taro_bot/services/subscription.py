from aiogram import Bot
from aiogram.enums import ChatMemberStatus

from config import CHANNEL_ID
from utils.logger import logger


async def check_subscription(bot: Bot, user_id: int) -> bool:
    """Return True if the user is a member of the channel."""
    try:
        member = await bot.get_chat_member(chat_id=CHANNEL_ID, user_id=user_id)
        return member.status in (
            ChatMemberStatus.MEMBER,
            ChatMemberStatus.ADMINISTRATOR,
            ChatMemberStatus.CREATOR,
        )
    except Exception as exc:
        # Benefit of doubt: treat errors as subscribed, log the issue.
        logger.warning(
            "Subscription check failed for user %s: %s – treating as subscribed",
            user_id,
            exc,
        )
        return True
