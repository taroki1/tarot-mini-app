import logging
import sys
from pathlib import Path

from config import LOG_FILE, LOG_LEVEL


def setup_logger() -> logging.Logger:
    """Configure and return the application logger."""
    log_path = Path(LOG_FILE)
    log_path.parent.mkdir(parents=True, exist_ok=True)

    logger = logging.getLogger("taro_bot")
    logger.setLevel(getattr(logging, LOG_LEVEL.upper(), logging.INFO))

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # File handler
    fh = logging.FileHandler(log_path, encoding="utf-8")
    fh.setFormatter(formatter)
    logger.addHandler(fh)

    # Console handler
    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(formatter)
    logger.addHandler(ch)

    return logger


logger = setup_logger()
