#!/usr/bin/env python
"""Print quick bot statistics to stdout.

Usage:
    python -m scripts.stats
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database.crud import get_funnel_stats, get_stats
from database.init_db import async_session, init_db


async def main() -> None:
    await init_db()

    async with async_session() as session:
        s = await get_stats(session)
        print("=== Статистика бота ===")
        print(f"Всего пользователей:    {s['total_users']}")
        print(f"Активных:               {s['active_users']}")
        print(f"Подписчиков канала:     {s['channel_subscribers']}")
        print(f"Карт отправлено сегодня:{s['cards_sent_today']}")
        print()

        funnel_stats = await get_funnel_stats(session)
        if funnel_stats:
            print("=== Воронки ===")
            for ft, shown, clicked in funnel_stats:
                clicked = clicked or 0
                ctr = (clicked / shown * 100) if shown else 0
                print(f"  {ft}: показов={shown}, кликов={clicked}, CTR={ctr:.1f}%")
        else:
            print("Данных по воронкам пока нет.")


if __name__ == "__main__":
    asyncio.run(main())
