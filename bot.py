import asyncio
import logging

from aiogram import Bot, Dispatcher, F, Router
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, Message

from config import load_settings
from db import add_user, count_users, get_all_user_ids, init_db
from keyboards import (
    admin_keyboard,
    broadcast_confirm_keyboard,
    contact_keyboard,
    menu_keyboard,
    section_keyboard,
    service_keyboard,
)
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


# ── FSM ────────────────────────────────────────────────────────────────────────

class BroadcastState(StatesGroup):
    waiting_for_text = State()
    confirm = State()


# ── helpers ────────────────────────────────────────────────────────────────────

def is_admin(user_id: int) -> bool:
    return settings.admin_id != 0 and user_id == settings.admin_id


async def show_menu(target: Message | CallbackQuery) -> None:
    text = welcome(settings)
    markup = menu_keyboard()
    if isinstance(target, CallbackQuery):
        await target.message.edit_text(text, reply_markup=markup)
        await target.answer()
    else:
        await target.answer(text, reply_markup=markup)


# ── user handlers ──────────────────────────────────────────────────────────────

@router.message(CommandStart())
async def start(message: Message) -> None:
    await add_user(
        user_id=message.from_user.id,
        username=message.from_user.username,
        full_name=message.from_user.full_name,
    )
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
    
    # Check if photo exists
    import os
    photo_path = os.path.join("photos", f"{service_name}.png")
    
    if os.path.exists(photo_path):
        from aiogram.types import FSInputFile
        await callback.message.answer_photo(
            photo=FSInputFile(photo_path),
            caption=service_text(service_name, settings),
            reply_markup=service_keyboard(action, parent_section),
        )
        await callback.message.delete()
    else:
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


# ── admin handlers ─────────────────────────────────────────────────────────────

@router.message(Command("admin"))
async def admin_panel(message: Message) -> None:
    if not is_admin(message.from_user.id):
        return
    total = await count_users()
    await message.answer(
        f"🔐 <b>Панель администратора</b>\n\n"
        f"Пользователей в базе: <b>{total}</b>",
        reply_markup=admin_keyboard(total),
    )


@router.callback_query(F.data == "admin:stats")
async def admin_stats(callback: CallbackQuery) -> None:
    if not is_admin(callback.from_user.id):
        return await callback.answer("Нет доступа.", show_alert=True)
    total = await count_users()
    await callback.message.edit_text(
        f"🔐 <b>Панель администратора</b>\n\n"
        f"Пользователей в базе: <b>{total}</b>",
        reply_markup=admin_keyboard(total),
    )
    await callback.answer()


@router.callback_query(F.data == "admin:broadcast")
async def admin_broadcast_start(callback: CallbackQuery, state: FSMContext) -> None:
    if not is_admin(callback.from_user.id):
        return await callback.answer("Нет доступа.", show_alert=True)
    await state.set_state(BroadcastState.waiting_for_text)
    await callback.message.edit_text(
        "📢 <b>Рассылка</b>\n\n"
        "Напишите текст сообщения.\n"
        "Поддерживается HTML-разметка: <b>жирный</b>, <i>курсив</i>, "
        "<a href='https://t.me'>ссылка</a>.\n\n"
        "Для отмены отправьте /cancel"
    )
    await callback.answer()


@router.message(BroadcastState.waiting_for_text)
async def admin_broadcast_text(message: Message, state: FSMContext) -> None:
    if not is_admin(message.from_user.id):
        return
    await state.update_data(broadcast_text=message.text or message.caption or "")
    await state.set_state(BroadcastState.confirm)
    total = await count_users()
    await message.answer(
        f"📋 <b>Предпросмотр рассылки</b>\n\n"
        f"Будет отправлено <b>{total}</b> пользователям:\n\n"
        f"{'─' * 30}\n"
        f"{message.text or message.caption or ''}\n"
        f"{'─' * 30}\n\n"
        "Подтвердите отправку:",
        reply_markup=broadcast_confirm_keyboard(),
    )


@router.callback_query(F.data == "admin:confirm_broadcast")
async def admin_broadcast_confirm(callback: CallbackQuery, state: FSMContext) -> None:
    if not is_admin(callback.from_user.id):
        return await callback.answer("Нет доступа.", show_alert=True)

    data = await state.get_data()
    text = data.get("broadcast_text", "")
    await state.clear()

    if not text:
        await callback.answer("Текст пустой. Попробуйте снова.", show_alert=True)
        return

    user_ids = await get_all_user_ids()
    await callback.message.edit_text(f"⏳ Рассылка запущена... (0 / {len(user_ids)})")
    await callback.answer()

    bot: Bot = callback.bot
    sent, failed = 0, 0

    for uid in user_ids:
        try:
            await bot.send_message(uid, text, parse_mode=ParseMode.HTML)
            sent += 1
        except Exception:
            failed += 1
        await asyncio.sleep(0.05)  # не превышаем лимиты Telegram

    total = await count_users()
    await callback.message.edit_text(
        f"✅ <b>Рассылка завершена</b>\n\n"
        f"📨 Доставлено: <b>{sent}</b>\n"
        f"❌ Не доставлено: <b>{failed}</b>",
        reply_markup=admin_keyboard(total),
    )


@router.callback_query(F.data == "admin:cancel")
async def admin_cancel(callback: CallbackQuery, state: FSMContext) -> None:
    if not is_admin(callback.from_user.id):
        return await callback.answer("Нет доступа.", show_alert=True)
    await state.clear()
    total = await count_users()
    await callback.message.edit_text(
        f"🔐 <b>Панель администратора</b>\n\n"
        f"Пользователей в базе: <b>{total}</b>\n\n"
        "Рассылка отменена.",
        reply_markup=admin_keyboard(total),
    )
    await callback.answer()


@router.message(Command("cancel"))
async def cancel_fsm(message: Message, state: FSMContext) -> None:
    if not is_admin(message.from_user.id):
        return
    await state.clear()
    total = await count_users()
    await message.answer(
        f"🔐 <b>Панель администратора</b>\n\n"
        f"Пользователей в базе: <b>{total}</b>",
        reply_markup=admin_keyboard(total),
    )


# ── main ───────────────────────────────────────────────────────────────────────

async def main() -> None:
    if not settings.bot_token:
        raise RuntimeError("Не задан BOT_TOKEN. Скопируйте .env.example в .env и заполните токен.")
    await init_db()
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
