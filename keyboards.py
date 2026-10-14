from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup


def menu_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🏋️ Записаться на тренировку", callback_data="section:training")],
        [InlineKeyboardButton(text="🥗 Курс по питанию", callback_data="section:nutrition")],
        [InlineKeyboardButton(text="💻 Онлайн тренировка", callback_data="section:online")],
        [InlineKeyboardButton(text="📞 Контакты", callback_data="contacts")],
    ])


def section_keyboard(section: str) -> InlineKeyboardMarkup:
    items = {
        "training": [
            ("Персональная тренировка", "service:personal"),
            ("Сплит", "service:split"),
            ("Групповая", "service:group"),
        ],
        "nutrition": [
            ("📖 Курс", "service:course"),
            ("🥗 Индивидуальное ведение", "service:nutrition_coaching"),
        ],
        "online": [
            ("📹 Тренировка по созвону", "service:online_call"),
            ("📋 Составление плана", "service:plan"),
        ],
    }[section]
    rows = [[InlineKeyboardButton(text=text, callback_data=data)] for text, data in items]
    rows.append([InlineKeyboardButton(text="◀️ Назад", callback_data="menu")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def service_keyboard(action: str, section: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=action, callback_data="contact")],
        [InlineKeyboardButton(text="◀️ Назад", callback_data=f"section:{section}")],
        [InlineKeyboardButton(text="🏠 Главное меню", callback_data="menu")],
    ])


def contact_keyboard(url: str, back: str = "menu") -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💬 Написать тренеру", url=url)],
        [InlineKeyboardButton(text="◀️ Назад", callback_data=back)],
        [InlineKeyboardButton(text="🏠 Главное меню", callback_data="menu")],
    ])


def admin_keyboard(user_count: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=f"📢 Рассылка ({user_count} польз.)", callback_data="admin:broadcast")],
        [InlineKeyboardButton(text="👥 Кол-во пользователей", callback_data="admin:stats")],
    ])


def broadcast_confirm_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✅ Отправить всем", callback_data="admin:confirm_broadcast")],
        [InlineKeyboardButton(text="✏️ Изменить текст", callback_data="admin:broadcast")],
        [InlineKeyboardButton(text="❌ Отмена", callback_data="admin:cancel")],
    ])
