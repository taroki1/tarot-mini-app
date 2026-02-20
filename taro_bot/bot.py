#!/usr/bin/env python
"""Taro Card Bot — entry point."""

import asyncio

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from config import BOT_TOKEN, DAILY_CARD_TIME, TIMEZONE
from database.init_db import init_db
from handlers import register_all_routers
from services.scheduler import daily_card_job
from utils.logger import logger


async def on_startup(bot: Bot) -> None:
    logger.info("Initialising database…")
    await init_db()
    logger.info("Bot started successfully.")


async def main() -> None:
    bot = Bot(
        token=BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher()

    # Register all routers
    register_all_routers(dp)

    # Set up startup hook
    dp.startup.register(on_startup)

    # Set up scheduler for daily card delivery
    hour, minute = (int(x) for x in DAILY_CARD_TIME.split(":"))
    scheduler = AsyncIOScheduler(timezone=TIMEZONE)
    scheduler.add_job(
        daily_card_job,
        trigger=CronTrigger(hour=hour, minute=minute),
        args=[bot],
        id="daily_card",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(
        "Scheduler started — daily card at %s %s", DAILY_CARD_TIME, TIMEZONE
    )

    try:
        logger.info("Starting polling…")
        await dp.start_polling(bot)
    finally:
        scheduler.shutdown(wait=False)
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
