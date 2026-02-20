import random

from sqlalchemy.ext.asyncio import AsyncSession

from database.crud import (
    add_card_history,
    get_all_cards,
    get_recent_card_ids,
    update_card_sent,
)
from database.models import Card
from utils.logger import logger


async def pick_random_card(
    session: AsyncSession, telegram_id: int
) -> Card | None:
    """Pick a random card that wasn't sent to this user in the last 7 days.

    If all cards have been shown recently the filter is dropped and any card
    can be picked.
    """
    all_cards = await get_all_cards(session)
    if not all_cards:
        logger.error("No cards in the database!")
        return None

    recent = await get_recent_card_ids(session, telegram_id, days=7)
    recent_set = set(recent)

    available = [
        c for c in all_cards if (c.deck, c.card_id) not in recent_set
    ]
    if not available:
        # All cards shown in the last 7 days – reset filter
        available = all_cards

    return random.choice(available)


async def send_card_to_user(
    session: AsyncSession, telegram_id: int
) -> Card | None:
    """Select a card, record it in history, and return the Card object.

    The caller is responsible for actually sending the message via the bot.
    """
    card = await pick_random_card(session, telegram_id)
    if card is None:
        return None

    await add_card_history(session, telegram_id, card.deck, card.card_id)
    await update_card_sent(session, telegram_id)
    return card


DECK_DISPLAY_NAMES = {
    "waite": "Таро Уэйта",
    "78doors": "78 Дверей",
    "lenormand": "Ленорман",
}


def format_card_message(card: Card) -> str:
    deck_name = DECK_DISPLAY_NAMES.get(card.deck, card.deck)
    return (
        f"\U0001f0cf Ваша Карта Дня: <b>{card.name}</b>\n"
        f"Колода: {deck_name}\n\n"
        f"{card.description}\n\n"
        f"\U0001f4ab Хорошего дня! Завтра вас ждёт новая карта."
    )
