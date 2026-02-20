from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, nullable=False)
    username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    first_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_channel_subscriber: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_card_sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    days_active: Mapped[int] = mapped_column(Integer, default=0)
    last_funnel_shown_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )
    last_funnel_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bonus_received: Mapped[bool] = mapped_column(Boolean, default=False)

    card_history: Mapped[list["CardHistory"]] = relationship(
        back_populates="user", lazy="selectin"
    )
    funnel_logs: Mapped[list["FunnelLog"]] = relationship(
        back_populates="user", lazy="selectin"
    )


class Card(Base):
    __tablename__ = "cards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    deck: Mapped[str] = mapped_column(String(50), nullable=False)
    card_id: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    image_path: Mapped[str] = mapped_column(String(500), nullable=False)

    __table_args__ = (
        UniqueConstraint("deck", "card_id", name="uq_deck_card_id"),
    )


class CardHistory(Base):
    __tablename__ = "card_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.telegram_id"), nullable=False
    )
    card_deck: Mapped[str] = mapped_column(String(50), nullable=False)
    card_id: Mapped[str] = mapped_column(String(50), nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="card_history")


class FunnelLog(Base):
    __tablename__ = "funnel_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.telegram_id"), nullable=False
    )
    funnel_type: Mapped[str] = mapped_column(String(50), nullable=False)
    shown_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    clicked: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped["User"] = relationship(back_populates="funnel_logs")
