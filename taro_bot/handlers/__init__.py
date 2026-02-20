from aiogram import Router

from handlers.callbacks import router as callbacks_router
from handlers.commands import router as commands_router
from handlers.start import router as start_router


def register_all_routers(parent_router: Router) -> None:
    parent_router.include_router(start_router)
    parent_router.include_router(commands_router)
    parent_router.include_router(callbacks_router)
