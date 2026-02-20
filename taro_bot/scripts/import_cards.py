#!/usr/bin/env python
"""Import card descriptions from JSON files into the database.

Usage:
    python -m scripts.import_cards

Reads every content/cards/<deck>/descriptions.json file and upserts
the cards into the `cards` table.
"""

import asyncio
import json
import sys
from pathlib import Path

# Allow running as `python scripts/import_cards.py` from the taro_bot dir
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import CARDS_DIR
from database.crud import upsert_card
from database.init_db import async_session, init_db
from utils.logger import logger


async def import_deck(deck_name: str, deck_dir: Path) -> int:
    """Import a single deck. Returns the number of cards imported."""
    desc_file = deck_dir / "descriptions.json"
    if not desc_file.exists():
        logger.warning("No descriptions.json in %s – skipping", deck_dir)
        return 0

    with open(desc_file, encoding="utf-8") as f:
        cards = json.load(f)

    count = 0
    async with async_session() as session:
        for card in cards:
            image_path = str(deck_dir / "images" / card["image"])
            await upsert_card(
                session,
                deck=deck_name,
                card_id=card["card_id"],
                name=card["name"],
                description=card["description"],
                image_path=image_path,
            )
            count += 1

    return count


async def main() -> None:
    await init_db()

    cards_dir = Path(CARDS_DIR)
    if not cards_dir.exists():
        logger.error("Cards directory not found: %s", cards_dir)
        return

    total = 0
    for deck_dir in sorted(cards_dir.iterdir()):
        if not deck_dir.is_dir():
            continue
        deck_name = deck_dir.name
        imported = await import_deck(deck_name, deck_dir)
        logger.info("Deck '%s': imported %d cards", deck_name, imported)
        total += imported

    logger.info("Total cards imported: %d", total)


if __name__ == "__main__":
    asyncio.run(main())
