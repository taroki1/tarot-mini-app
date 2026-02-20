from datetime import datetime, timedelta

from sqlalchemy import Integer, func, select, update
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession

from database.models import Card, CardHistory, FunnelLog, User


# ──────────────────────────── Users ────────────────────────────


async def get_or_create_user(
    session: AsyncSession,
    telegram_id: int,
    username: str | None = None,
    first_name: str | None = None,
) -> User:
    result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            telegram_id=telegram_id,
            username=username,
            first_name=first_name,
            joined_at=datetime.utcnow(),
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
    return user


async def get_user(session: AsyncSession, telegram_id: int) -> User | None:
    result = await session.execute(
        select(User).where(User.telegram_id == telegram_id)
    )
    return result.scalar_one_or_none()


async def get_active_users(session: AsyncSession) -> list[User]:
    result = await session.execute(
        select(User).where(User.is_active == True)  # noqa: E712
    )
    return list(result.scalars().all())


async def update_user_subscription(
    session: AsyncSession, telegram_id: int, is_subscribed: bool
) -> None:
    await session.execute(
        update(User)
        .where(User.telegram_id == telegram_id)
        .values(is_channel_subscriber=is_subscribed)
    )
    await session.commit()


async def set_user_inactive(session: AsyncSession, telegram_id: int) -> None:
    await session.execute(
        update(User)
        .where(User.telegram_id == telegram_id)
        .values(is_active=False)
    )
    await session.commit()


async def set_bonus_received(session: AsyncSession, telegram_id: int) -> None:
    await session.execute(
        update(User)
        .where(User.telegram_id == telegram_id)
        .values(bonus_received=True)
    )
    await session.commit()


async def update_card_sent(session: AsyncSession, telegram_id: int) -> None:
    now = datetime.utcnow()
    await session.execute(
        update(User)
        .where(User.telegram_id == telegram_id)
        .values(last_card_sent_at=now, days_active=User.days_active + 1)
    )
    await session.commit()


async def update_funnel_shown(
    session: AsyncSession, telegram_id: int, funnel_type: str
) -> None:
    now = datetime.utcnow()
    await session.execute(
        update(User)
        .where(User.telegram_id == telegram_id)
        .values(last_funnel_shown_at=now, last_funnel_type=funnel_type)
    )
    await session.commit()


# ──────────────────────────── Cards ────────────────────────────


async def get_all_cards(session: AsyncSession) -> list[Card]:
    result = await session.execute(select(Card))
    return list(result.scalars().all())


async def get_cards_by_deck(session: AsyncSession, deck: str) -> list[Card]:
    result = await session.execute(select(Card).where(Card.deck == deck))
    return list(result.scalars().all())


async def upsert_card(
    session: AsyncSession,
    deck: str,
    card_id: str,
    name: str,
    description: str,
    image_path: str,
) -> None:
    stmt = sqlite_insert(Card).values(
        deck=deck,
        card_id=card_id,
        name=name,
        description=description,
        image_path=image_path,
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=["deck", "card_id"],
        set_={
            "name": stmt.excluded.name,
            "description": stmt.excluded.description,
            "image_path": stmt.excluded.image_path,
        },
    )
    await session.execute(stmt)
    await session.commit()


# ──────────────────────── Card History ─────────────────────────


async def get_recent_card_ids(
    session: AsyncSession, telegram_id: int, days: int = 7
) -> list[tuple[str, str]]:
    """Return list of (deck, card_id) sent in the last *days* days."""
    since = datetime.utcnow() - timedelta(days=days)
    result = await session.execute(
        select(CardHistory.card_deck, CardHistory.card_id)
        .where(
            CardHistory.user_id == telegram_id,
            CardHistory.sent_at >= since,
        )
    )
    return list(result.tuples().all())


async def add_card_history(
    session: AsyncSession, telegram_id: int, card_deck: str, card_id: str
) -> None:
    entry = CardHistory(
        user_id=telegram_id,
        card_deck=card_deck,
        card_id=card_id,
        sent_at=datetime.utcnow(),
    )
    session.add(entry)
    await session.commit()


async def count_cards_sent_today(session: AsyncSession) -> int:
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    result = await session.execute(
        select(func.count(CardHistory.id)).where(CardHistory.sent_at >= today_start)
    )
    return result.scalar_one()


async def count_user_cards(session: AsyncSession, telegram_id: int) -> int:
    result = await session.execute(
        select(func.count(CardHistory.id)).where(CardHistory.user_id == telegram_id)
    )
    return result.scalar_one()


# ──────────────────────── Funnel Log ───────────────────────────


async def add_funnel_log(
    session: AsyncSession, telegram_id: int, funnel_type: str
) -> int:
    entry = FunnelLog(
        user_id=telegram_id,
        funnel_type=funnel_type,
        shown_at=datetime.utcnow(),
    )
    session.add(entry)
    await session.commit()
    await session.refresh(entry)
    return entry.id


async def mark_funnel_clicked(session: AsyncSession, funnel_log_id: int) -> None:
    await session.execute(
        update(FunnelLog)
        .where(FunnelLog.id == funnel_log_id)
        .values(clicked=True)
    )
    await session.commit()


async def get_funnel_stats(
    session: AsyncSession,
) -> list[tuple[str, int, int]]:
    """Return (funnel_type, total_shown, total_clicked) grouped by type."""
    result = await session.execute(
        select(
            FunnelLog.funnel_type,
            func.count(FunnelLog.id),
            func.sum(func.cast(FunnelLog.clicked, Integer)),
        ).group_by(FunnelLog.funnel_type)
    )
    return list(result.tuples().all())


# ──────────────────────── Statistics ───────────────────────────


async def get_stats(session: AsyncSession) -> dict:
    total = (await session.execute(select(func.count(User.id)))).scalar_one()
    active = (
        await session.execute(
            select(func.count(User.id)).where(User.is_active == True)  # noqa: E712
        )
    ).scalar_one()
    subscribers = (
        await session.execute(
            select(func.count(User.id)).where(
                User.is_active == True,  # noqa: E712
                User.is_channel_subscriber == True,  # noqa: E712
            )
        )
    ).scalar_one()
    cards_today = await count_cards_sent_today(session)

    return {
        "total_users": total,
        "active_users": active,
        "channel_subscribers": subscribers,
        "cards_sent_today": cards_today,
    }
