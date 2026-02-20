import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# === BASE DIR ===
BASE_DIR = Path(__file__).resolve().parent

# === ОБЯЗАТЕЛЬНЫЕ НАСТРОЙКИ ===
BOT_TOKEN = os.getenv("BOT_TOKEN", "ВСТАВИТЬ_ТОКЕН_БОТА")
CHANNEL_ID = os.getenv("CHANNEL_ID", "@username_канала")
CHANNEL_URL = os.getenv("CHANNEL_URL", "https://t.me/username_канала")

# === АДМИНИСТРАТОРЫ ===
# Telegram user IDs администраторов (через запятую в .env)
ADMIN_IDS = [
    int(x.strip())
    for x in os.getenv("ADMIN_IDS", "").split(",")
    if x.strip().isdigit()
]

# === РАСПИСАНИЕ ===
DAILY_CARD_TIME = os.getenv("DAILY_CARD_TIME", "09:00")
TIMEZONE = os.getenv("TIMEZONE", "Europe/Moscow")

# === RATE LIMITING ===
MESSAGES_PER_SECOND = int(os.getenv("MESSAGES_PER_SECOND", "25"))
DELAY_BETWEEN_MESSAGES = float(os.getenv("DELAY_BETWEEN_MESSAGES", "0.05"))

# === КОНТЕНТ ===
CARDS_DIR = BASE_DIR / "content" / "cards"
BONUS_FILE = BASE_DIR / "content" / "bonus" / "welcome_guide.pdf"
FUNNELS_CONFIG = BASE_DIR / "content" / "funnels.json"

# === БАЗА ДАННЫХ ===
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite+aiosqlite:///{BASE_DIR / 'data' / 'bot.db'}",
)

# === ЛОГИ ===
LOG_FILE = BASE_DIR / "logs" / "bot.log"
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
