from dataclasses import dataclass
import os

from dotenv import load_dotenv


load_dotenv()


def _value(name: str, default: str = "") -> str:
    value = os.getenv(name, "").strip()
    return value or default


@dataclass(frozen=True)
class Settings:
    bot_token: str
    admin_id: int
    trainer_name: str
    trainer_username: str
    trainer_phone: str
    trainer_city: str
    personal_training_price: str
    personal_training_package: str
    split_with_matching_price: str
    split_with_partner_price: str
    split_package: str
    group_training_price: str
    group_training_period: str
    nutrition_course_price: str
    nutrition_coaching_price: str
    nutrition_coaching_period: str
    online_call_price: str
    training_plan_price: str
    gym_location: str
    group_size: str
    plan_delivery_format: str

    @property
    def trainer_url(self) -> str:
        return f"https://t.me/{self.trainer_username.lstrip('@')}"


def load_settings() -> Settings:
    return Settings(
        bot_token=_value("BOT_TOKEN"),
        admin_id=int(_value("ADMIN_ID", "0")),
        trainer_name=_value("TRAINER_NAME", "Ваш тренер"),
        trainer_username=_value("TRAINER_USERNAME", "trainer_username"),
        trainer_phone=_value("TRAINER_PHONE"),
        trainer_city=_value("TRAINER_CITY"),
        personal_training_price=_value("PERSONAL_TRAINING_PRICE", "—"),
        personal_training_package=_value("PERSONAL_TRAINING_PACKAGE", "10 тренировок"),
        split_with_matching_price=_value("SPLIT_WITH_MATCHING_PRICE", "—"),
        split_with_partner_price=_value("SPLIT_WITH_PARTNER_PRICE", "—"),
        split_package=_value("SPLIT_PACKAGE", "10 тренировок"),
        group_training_price=_value("GROUP_TRAINING_PRICE", "—"),
        group_training_period=_value("GROUP_TRAINING_PERIOD", "1 месяц"),
        nutrition_course_price=_value("NUTRITION_COURSE_PRICE", "—"),
        nutrition_coaching_price=_value("NUTRITION_COACHING_PRICE", "—"),
        nutrition_coaching_period=_value("NUTRITION_COACHING_PERIOD", "месяц"),
        online_call_price=_value("ONLINE_CALL_PRICE", "—"),
        training_plan_price=_value("TRAINING_PLAN_PRICE", "—"),
        gym_location=_value("GYM_LOCATION", "Зал / адрес"),
        group_size=_value("GROUP_SIZE", "уточняется"),
        plan_delivery_format=_value("PLAN_DELIVERY_FORMAT", "PDF в Telegram"),
    )
