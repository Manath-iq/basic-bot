import asyncio
import logging

from aiogram import Bot, Dispatcher, F, Router
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import CommandStart
from aiogram.types import CallbackQuery, Message

from config import load_settings
from keyboards import contact_keyboard, menu_keyboard, section_keyboard, service_keyboard
from texts import SECTION_TEXTS, contact_text, service_text, welcome


settings = load_settings()
router = Router()

SERVICE_META = {
    "personal": ("📩 Записаться", "training"),
    "split": ("📩 Записаться", "training"),
    "group": ("📩 Записаться", "training"),
    "course": ("💳 Приобрести курс", "nutrition"),
    "nutrition_coaching": ("📩 Начать ведение", "nutrition"),
    "online_call": ("📩 Записаться", "online"),
    "plan": ("📩 Заказать план", "online"),
}


async def show_menu(target: Message | CallbackQuery) -> None:
    text = welcome(settings)
    markup = menu_keyboard()
    if isinstance(target, CallbackQuery):
        await target.message.edit_text(text, reply_markup=markup)
        await target.answer()
    else:
        await target.answer(text, reply_markup=markup)


@router.message(CommandStart())
async def start(message: Message) -> None:
    await show_menu(message)


@router.callback_query(F.data == "menu")
async def menu(callback: CallbackQuery) -> None:
    await show_menu(callback)


@router.callback_query(F.data.startswith("section:"))
async def section(callback: CallbackQuery) -> None:
    section_name = callback.data.split(":", 1)[1]
    await callback.message.edit_text(
        SECTION_TEXTS[section_name], reply_markup=section_keyboard(section_name)
    )
    await callback.answer()


@router.callback_query(F.data.startswith("service:"))
async def service(callback: CallbackQuery) -> None:
    service_name = callback.data.split(":", 1)[1]
    action, parent_section = SERVICE_META[service_name]
    await callback.message.edit_text(
        service_text(service_name, settings),
        reply_markup=service_keyboard(action, parent_section),
    )
    await callback.answer()


@router.callback_query(F.data == "contacts")
async def contacts(callback: CallbackQuery) -> None:
    await callback.message.edit_text(
        contact_text(settings), reply_markup=contact_keyboard(settings.trainer_url)
    )
    await callback.answer()


@router.callback_query(F.data == "contact")
async def contact(callback: CallbackQuery) -> None:
    await callback.message.edit_text(
        "Отлично! 🙌\n\nНапиши мне напрямую — уточним удобную дату и время, "
        "а также отвечу на все вопросы.",
        reply_markup=contact_keyboard(settings.trainer_url),
    )
    await callback.answer()


async def main() -> None:
    if not settings.bot_token:
        raise RuntimeError("Не задан BOT_TOKEN. Скопируйте .env.example в .env и заполните токен.")
    bot = Bot(
        token=settings.bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dispatcher = Dispatcher()
    dispatcher.include_router(router)
    await dispatcher.start_polling(bot)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
    asyncio.run(main())
