import { CONTACT_URL, SETTINGS } from "./worker-config.js";

// ── Admin check ────────────────────────────────────────────────────────────────
// ADMIN_IDS — секрет в Cloudflare, несколько ID через запятую: "882613260,726186585"

function isAdmin(env, userId) {
  if (!env.ADMIN_IDS) return false;
  const ids = env.ADMIN_IDS.split(",").map((s) => s.trim());
  return ids.includes(String(userId));
}

// ── KV: users ──────────────────────────────────────────────────────────────────

async function addUser(env, userId, username, fullName) {
  const key = `user:${userId}`;
  // Only write if new — saves KV write quota
  const existing = await env.BOT_KV.get(key);
  if (!existing) {
    await env.BOT_KV.put(key, JSON.stringify({ username, fullName, ts: Date.now() }));
  }
}

async function getAllUserIds(env) {
  const ids = [];
  let cursor;
  do {
    const opts = { prefix: "user:", limit: 1000 };
    if (cursor) opts.cursor = cursor;
    const result = await env.BOT_KV.list(opts);
    for (const k of result.keys) {
      const id = parseInt(k.name.slice(5), 10);
      if (!isNaN(id)) ids.push(id);
    }
    if (result.list_complete) break;
    cursor = result.cursor;
  } while (true);
  return ids;
}

async function countUsers(env) {
  const ids = await getAllUserIds(env);
  return ids.length;
}

// ── KV: admin FSM state ────────────────────────────────────────────────────────

async function getState(env, adminId) {
  const raw = await env.BOT_KV.get(`state:${adminId}`);
  return raw ? JSON.parse(raw) : null;
}

async function setState(env, adminId, state, data = {}) {
  // TTL 1 hour — auto-cleanup if admin abandons the flow
  await env.BOT_KV.put(`state:${adminId}`, JSON.stringify({ state, data }), {
    expirationTtl: 3600,
  });
}

async function clearState(env, adminId) {
  await env.BOT_KV.delete(`state:${adminId}`);
}

// ── Content ────────────────────────────────────────────────────────────────────

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
• улучшить/поставить технику;
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
    text: `🔥 <b>ТРЕНИРОВКИ В ПАРЕ</b>

Формат для эффективных тренировок с комфортной нагрузкой и дополнительной мотивацией. Занимайтесь вместе, поддерживайте друг друга и достигайте результатов!

Подходит для:
• набора мышечной массы;
• улучшения физической форму;
• развития силы и выносливости;
• мотивации и регулярных тренировок;
• комфортных занятий с подругой/другом.

💪 Преимущества: внимание тренера к каждой участнице, индивидуальный подход и поддержка друг друга.⏱ Длительность: 60 минут

💰 Стоимость за 10 сплит-тренировок:
• ${SETTINGS.splitMatchingPrice} — если нужно найти пару;
• ${SETTINGS.splitPartnerPrice} — если приходите с подругой.
📍 Формат: ${SETTINGS.gymLocation}

Хочешь записаться? Нажми кнопку ниже.`,
  },
  group: {
    section: "training",
    action: "📩 Записаться",
    text: `👥 <b>ГРУППОВАЯ ТРЕНИРОВКА</b>

Тренировка в небольшой группе под моим руководством — с поддержкой, контролем и мотивацией.

Подходит, если хочешь:
• тренироваться в компании;
• заниматься регулярно;
• улучшать физическую форму.

👥 Участников: ${SETTINGS.groupSize}
⏱ Длительность: 60 минут ПН-СБ дневная 9 или 10 утра/ вечерняя 18 или 19 часов 
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

Полноценная тренировка по видеосвязи. Я контролирую технику, объясняю движения и корректирую ошибки.

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

// ── Keyboards ──────────────────────────────────────────────────────────────────

function rows(buttons) {
  return { inline_keyboard: buttons.map(([text, cb]) => [{ text, callback_data: cb }]) };
}

function menuKeyboard() {
  return rows([
    ["🏋️ Записаться на тренировку", "section:training"],
    ["🥗 Курс по питанию", "section:nutrition"],
    ["💻 Онлайн тренировка", "section:online"],
    ["📞 Контакты", "contacts"],
  ]);
}

function sectionKeyboard(section) {
  return rows([...sections[section].buttons, ["◀️ Назад", "menu"]]);
}

function serviceKeyboard(service) {
  const item = services[service];
  return rows([
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

function adminKeyboard(count) {
  return rows([
    [`📢 Рассылка (${count} польз.)`, "admin:broadcast"],
    ["👥 Статистика", "admin:stats"],
  ]);
}

function broadcastConfirmKeyboard() {
  return rows([
    ["✅ Отправить всем", "admin:confirm_broadcast"],
    ["✏️ Изменить текст", "admin:broadcast"],
    ["❌ Отмена", "admin:cancel"],
  ]);
}

// ── Texts ──────────────────────────────────────────────────────────────────────

function welcomeText() {
  return `Привет! 👋\n\nЯ бот персонального тренера ${SETTINGS.trainerName}.\n\nЗдесь ты можешь узнать подробнее о тренировках, программах питания и онлайн-сопровождении.\n\nВыбирай интересующее направление ниже 👇`;
}

function contactsText() {
  return `📞 <b>КОНТАКТЫ</b>\n\nЕсли остались вопросы или ты не знаешь, какой формат тебе подойдёт — просто напиши мне.\n\nЯ помогу выбрать подходящий вариант 👌\n📞 ${SETTINGS.trainerPhone}\n📍 ${SETTINGS.trainerCity}`;
}

function adminPanelText(count) {
  return `🔐 <b>Панель администратора</b>\n\nПользователей в базе: <b>${count}</b>`;
}

// ── Telegram API ───────────────────────────────────────────────────────────────

async function tg(env, method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    await env.BOT_KV.put("debug:last_error", `Telegram ${method} failed: ${JSON.stringify(data)}`);
    console.error(`Telegram ${method} failed:`, JSON.stringify(data));
    throw new Error(`Telegram ${method} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

function sendMessage(env, chatId, text, replyMarkup) {
  return tg(env, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    reply_markup: replyMarkup,
  });
}

function sendPhoto(env, chatId, photoUrl, caption, replyMarkup) {
  return tg(env, "sendPhoto", {
    chat_id: chatId,
    photo: photoUrl,
    caption,
    parse_mode: "HTML",
    reply_markup: replyMarkup,
  });
}

function editMessage(env, cb, text, replyMarkup) {
  return tg(env, "editMessageText", {
    chat_id: cb.message.chat.id,
    message_id: cb.message.message_id,
    text,
    parse_mode: "HTML",
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

function answerCallback(env, id) {
  return tg(env, "answerCallbackQuery", { callback_query_id: id });
}

// Редактирует сообщение; если Telegram вернул ошибку — удаляет и шлёт новое.
async function safeEdit(env, cb, text, replyMarkup) {
  try {
    await editMessage(env, cb, text, replyMarkup);
  } catch {
    try {
      await tg(env, "deleteMessage", {
        chat_id: cb.message.chat.id,
        message_id: cb.message.message_id,
      });
    } catch { /* ignore */ }
    await sendMessage(env, cb.message.chat.id, text, replyMarkup);
  }
}

// ── Handlers ───────────────────────────────────────────────────────────────────

async function handleMessage(env, msg) {
  const userId = msg.from.id;
  const text = msg.text || "";

  // Save every user who writes to the bot
  await addUser(env, userId, msg.from.username, msg.from.first_name);

  // ── /start ──
  if (text === "/start") {
    return sendMessage(env, msg.chat.id, welcomeText(), menuKeyboard());
  }

  // ── Admin commands ──
  if (!isAdmin(env, userId)) return;

  if (text === "/admin") {
    const count = await countUsers(env);
    return sendMessage(env, msg.chat.id, adminPanelText(count), adminKeyboard(count));
  }

  if (text === "/cancel") {
    await clearState(env, userId);
    const count = await countUsers(env);
    return sendMessage(env, msg.chat.id, adminPanelText(count) + "\n\nРассылка отменена.", adminKeyboard(count));
  }

  // ── FSM: waiting for broadcast text ──
  const stateData = await getState(env, userId);
  if (stateData?.state === "waiting_broadcast") {
    if (!text) {
      return sendMessage(env, msg.chat.id, "⚠️ Поддерживается только текстовое сообщение. Попробуй ещё раз:");
    }
    await setState(env, userId, "confirm_broadcast", { text });
    const count = await countUsers(env);
    const divider = "─".repeat(28);
    return sendMessage(
      env,
      msg.chat.id,
      `📋 <b>Предпросмотр рассылки</b>\n\nБудет отправлено <b>${count}</b> пользователям:\n\n${divider}\n${text}\n${divider}\n\nПодтвердить отправку?`,
      broadcastConfirmKeyboard()
    );
  }
}

async function handleCallback(env, cb) {
  const data = cb.data || "";
  const userId = cb.from.id;

  try {
    // ── Public callbacks ──
    if (data === "menu") {
      await safeEdit(env, cb, welcomeText(), menuKeyboard());
    } else if (data.startsWith("section:")) {
      const s = data.split(":")[1];
      if (sections[s]) await safeEdit(env, cb, sections[s].text, sectionKeyboard(s));
    } else if (data.startsWith("service:")) {
      const s = data.split(":")[1];
      if (services[s]) {
        try {
          const photoUrl = `https://darya-trainer-bot.todominate-ai.workers.dev/${s}.png`;
          const photoExists = await fetch(photoUrl, { method: 'HEAD' }).then(res => res.ok).catch(() => false);

          if (photoExists) {
            await tg(env, "deleteMessage", {
              chat_id: cb.message.chat.id,
              message_id: cb.message.message_id,
            });
            await sendPhoto(env, cb.message.chat.id, photoUrl, services[s].text, serviceKeyboard(s));
            return;
          } else {
            await env.BOT_KV.put("debug:last_error", `HEAD returned false for ${photoUrl}`);
          }
        } catch (e) {
          await env.BOT_KV.put("debug:last_error", `Error: ${e.message} | ${e.stack}`);
          console.error("Photo error:", e);
        }
        await safeEdit(env, cb, services[s].text, serviceKeyboard(s));
      }
    } else if (data === "contacts") {
      await safeEdit(env, cb, contactsText(), contactKeyboard());
    } else if (data === "contact") {
      await safeEdit(
        env, cb,
        "Отлично! 🙌\n\nНапиши мне напрямую — уточним удобную дату и время, а также отвечу на все вопросы.",
        contactKeyboard()
      );

    // ── Admin callbacks ──
    } else if (data === "admin:stats") {
      if (!isAdmin(env, userId)) return;
      const count = await countUsers(env);
      await safeEdit(env, cb, adminPanelText(count), adminKeyboard(count));

    } else if (data === "admin:broadcast") {
      if (!isAdmin(env, userId)) return;
      await setState(env, userId, "waiting_broadcast");
      await safeEdit(
        env, cb,
        "📢 <b>Рассылка</b>\n\nНапишите текст сообщения следующим сообщением.\n\nПоддерживается HTML: <b>жирный</b>, <i>курсив</i>.\n\nДля отмены отправьте /cancel"
      );

    } else if (data === "admin:confirm_broadcast") {
      if (!isAdmin(env, userId)) return;

      const stateData = await getState(env, userId);
      const broadcastText = stateData?.data?.text;
      if (!broadcastText) return;

      await clearState(env, userId);
      const userIds = await getAllUserIds(env);
      await safeEdit(env, cb, `⏳ Рассылка запущена... Всего: ${userIds.length} польз.`);
      // answerCallback вызовется в finally — это нормально

      let sent = 0;
      let failed = 0;
      for (const uid of userIds) {
        try {
          await tg(env, "sendMessage", { chat_id: uid, text: broadcastText, parse_mode: "HTML" });
          sent++;
        } catch { failed++; }
      }

      const count = await countUsers(env);
      await safeEdit(env, cb,
        `✅ <b>Рассылка завершена</b>\n\n📨 Доставлено: <b>${sent}</b>\n❌ Не доставлено: <b>${failed}</b>`,
        adminKeyboard(count)
      );

    } else if (data === "admin:cancel") {
      if (!isAdmin(env, userId)) return;
      await clearState(env, userId);
      const count = await countUsers(env);
      await safeEdit(env, cb, adminPanelText(count) + "\n\nРассылка отменена.", adminKeyboard(count));
    }
  } finally {
    // Всегда закрываем спиннер кнопки, даже если выше была ошибка
    try { await answerCallback(env, cb.id); } catch { /* ignore */ }
  }
}

// ── Entry point ────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Trainer bot is running ✅", { status: 200 });
    }
    if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const update = await request.json();
      if (update.message) {
        await handleMessage(env, update.message);
      } else if (update.callback_query) {
        await handleCallback(env, update.callback_query);
      }
      return new Response("OK");
    } catch (err) {
      console.error(err);
      return new Response("Internal error", { status: 500 });
    }
  },
};
