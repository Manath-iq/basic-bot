import { CONTACT_URL, SETTINGS } from "./worker-config.js";

const sections = {
  training: {
    text: "Выбери подходящий формат тренировки 👇",
    buttons: [
      ["Персональная тренировка", "service:personal"],
      ["Сплит", "service:split"],
      ["Групповая", "service:group"],
    ],
  },
  nutrition: {
    text: "🥗 <b>ПП ПО ЛЮБВИ</b>\n\nВыбери подходящий формат.\n\nХочешь разобраться в основах правильного питания самостоятельно или нужна персональная работа со мной?",
    buttons: [
      ["📖 Курс", "service:course"],
      ["🥗 Индивидуальное ведение", "service:nutrition_coaching"],
    ],
  },
  online: {
    text: "💻 <b>ОНЛАЙН-ТРЕНИРОВКА</b>\n\nМожно заниматься со мной дистанционно — независимо от того, где ты находишься.\n\nВыбери формат 👇",
    buttons: [
      ["📹 Тренировка по созвону", "service:online_call"],
      ["📋 Составление плана", "service:plan"],
    ],
  },
};

const services = {
  personal: {
    section: "training",
    action: "📩 Записаться",
    text: `🏋️ <b>ПЕРСОНАЛЬНАЯ ТРЕНИРОВКА</b>

Индивидуальная тренировка один на один с Дарьей.

Разберём технику, подберём нагрузку под твой уровень и цели.

Подходит, если ты хочешь:
• улучшить технику;
• подобрать нагрузку;
• тренироваться безопасно и эффективно.

⏱ Длительность: 60 минут
💰 Стоимость: ${SETTINGS.personalPrice} за ${SETTINGS.personalPackage}
📍 Формат: ${SETTINGS.gymLocation}

Чтобы записаться — нажми кнопку ниже.`,
  },
  split: {
    section: "training",
    action: "📩 Записаться",
    text: `🔥 <b>СПЛИТ</b>

Формат для системной работы над телом и уверенного прогресса. Нагрузка распределяется по мышечным группам с учётом восстановления.

Подходит для:
• набора мышечной массы;
• улучшения формы;
• развития силы.

⏱ Длительность: 60 минут
💰 Стоимость за ${SETTINGS.splitPackage}:
• ${SETTINGS.splitMatchingPrice} — если нужно найти пару;
• ${SETTINGS.splitPartnerPrice} — если приходите с подругой.
📍 Формат: ${SETTINGS.gymLocation}

Хочешь записаться? Нажми кнопку ниже.`,
  },
  group: {
    section: "training",
    action: "📩 Записаться",
    text: `👥 <b>ГРУППОВАЯ ТРЕНИРОВКА</b>

Тренировка в небольшой группе под руководством Дарьи — с поддержкой, контролем и мотивацией.

Подходит, если хочешь:
• тренироваться в компании;
• заниматься регулярно;
• улучшать физическую форму.

👥 Участников: ${SETTINGS.groupSize}
⏱ Длительность: 60 минут
💰 Стоимость: ${SETTINGS.groupPrice} / ${SETTINGS.groupPeriod}
📍 Место: ${SETTINGS.gymLocation}

Для записи нажми кнопку ниже.`,
  },
  course: {
    section: "nutrition",
    action: "💳 Приобрести курс",
    text: `📖 <b>КУРС ПО ПИТАНИЮ</b>

Готовый материал, который поможет разобраться в основах питания без сложных схем и постоянного подсчёта калорий.

Внутри:
• как составлять рацион;
• какие продукты выбирать;
• контроль порций и режим питания;
• практические материалы.

📄 Формат: электронный документ
💰 Стоимость: уточняется

После оплаты ты получишь доступ к материалам курса.`,
  },
  nutrition_coaching: {
    section: "nutrition",
    action: "📩 Начать ведение",
    text: `🥗 <b>ИНДИВИДУАЛЬНОЕ ВЕДЕНИЕ</b>

Персональная работа над питанием с учётом твоих целей, образа жизни и привычек.

Что входит:
• анализ текущего питания;
• рекомендации и корректировки;
• контроль прогресса;
• поддержка и ответы на вопросы.

💰 Стоимость: уточняется

Хочешь начать — нажми кнопку ниже.`,
  },
  online_call: {
    section: "online",
    action: "📩 Записаться",
    text: `📹 <b>ТРЕНИРОВКА ПО СОЗВОНУ</b>

Полноценная тренировка по видеосвязи. Дарья контролирует технику, объясняет движения и корректирует ошибки.

Подходит, если ты:
• тренируешься дома;
• не можешь приехать в зал;
• находишься в другом городе.

⏱ Длительность: 60 минут
💰 Стоимость: уточняется

Для записи нажми кнопку ниже.`,
  },
  plan: {
    section: "online",
    action: "📩 Заказать план",
    text: `📋 <b>СОСТАВЛЕНИЕ ТРЕНИРОВОЧНОГО ПЛАНА</b>

Индивидуальная программа под твои цели, уровень, доступное оборудование и график.

Ты получаешь понятный план, по которому сможешь тренироваться самостоятельно.

💰 Стоимость: уточняется
📦 Формат: ${SETTINGS.planDeliveryFormat}

Хочешь получить план? Нажми кнопку ниже.`,
  },
};

function keyboard(rows) {
  return { inline_keyboard: rows.map((row) => row.map(([text, callback_data]) => ({ text, callback_data }))) };
}

function menuKeyboard() {
  return keyboard([
    ["🏋️ Записаться на тренировку", "section:training"],
    ["🥗 Курс по питанию", "section:nutrition"],
    ["💻 Онлайн тренировка", "section:online"],
    ["📞 Контакты", "contacts"],
  ]);
}

function sectionKeyboard(section) {
  return keyboard([...sections[section].buttons, ["◀️ Назад", "menu"]]);
}

function serviceKeyboard(service) {
  const item = services[service];
  return keyboard([
    [item.action, "contact"],
    ["◀️ Назад", `section:${item.section}`],
    ["🏠 Главное меню", "menu"],
  ]);
}

function contactKeyboard(back = "menu") {
  return {
    inline_keyboard: [
      [{ text: "💬 Написать тренеру", url: CONTACT_URL }],
      [{ text: "◀️ Назад", callback_data: back }],
      [{ text: "🏠 Главное меню", callback_data: "menu" }],
    ],
  };
}

function welcome() {
  return `Привет! 👋\n\nЯ бот персонального тренера ${SETTINGS.trainerName}.\n\nЗдесь ты можешь узнать подробнее о тренировках, программах питания и онлайн-сопровождении.\n\nВыбирай интересующее направление ниже 👇`;
}

async function telegram(env, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Telegram API error: ${response.status}`);
  return response.json();
}

async function sendMessage(env, chatId, text, replyMarkup) {
  return telegram(env, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML", reply_markup: replyMarkup });
}

async function editMessage(env, callback, text, replyMarkup) {
  return telegram(env, "editMessageText", {
    chat_id: callback.message.chat.id,
    message_id: callback.message.message_id,
    text,
    parse_mode: "HTML",
    reply_markup: replyMarkup,
  });
}

async function answerCallback(env, id) {
  return telegram(env, "answerCallbackQuery", { callback_query_id: id });
}

async function handleCallback(env, callback) {
  const data = callback.data || "";
  if (data === "menu") {
    await editMessage(env, callback, welcome(), menuKeyboard());
  } else if (data.startsWith("section:")) {
    const section = data.split(":")[1];
    if (sections[section]) await editMessage(env, callback, sections[section].text, sectionKeyboard(section));
  } else if (data.startsWith("service:")) {
    const service = data.split(":")[1];
    if (services[service]) await editMessage(env, callback, services[service].text, serviceKeyboard(service));
  } else if (data === "contacts") {
    const text = `📞 <b>КОНТАКТЫ</b>\n\nЕсли остались вопросы или ты не знаешь, какой формат тебе подойдёт — просто напиши Дарье.\n\nОна поможет выбрать подходящий вариант 👌\n📞 ${SETTINGS.trainerPhone}\n📍 ${SETTINGS.trainerCity}`;
    await editMessage(env, callback, text, contactKeyboard());
  } else if (data === "contact") {
    await editMessage(env, callback, "Отлично! 🙌\n\nНапиши Дарье напрямую — уточните удобную дату и время, а также она ответит на все вопросы.", contactKeyboard());
  }
  await answerCallback(env, callback.id);
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST") return new Response("Darya trainer bot is running", { status: 200 });
    if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const update = await request.json();
      if (update.message?.text === "/start") {
        await sendMessage(env, update.message.chat.id, welcome(), menuKeyboard());
      } else if (update.callback_query) {
        await handleCallback(env, update.callback_query);
      }
      return new Response("OK");
    } catch (error) {
      console.error(error);
      return new Response("Internal error", { status: 500 });
    }
  },
};
