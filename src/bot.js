// Главный файл бота "Карта Дня"
// Стиль: тёплый, мистический, профессиональный
require('dotenv').config();

const { Telegraf, Markup } = require('telegraf');
const cron = require('node-cron');

const db = require('./database');
const { getRandomCard, getCardById, getRandomCardsForGame, ALL_CARDS } = require('./data/cards');
const { getCardImageUrl } = require('./data/cardImages');

// Проверяем токен
if (!process.env.BOT_TOKEN) {
  console.error('❌ BOT_TOKEN не найден в .env файле!');
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// Временное хранилище для игры (в памяти)
const gameState = new Map();

// ========== Хелперы ==========

// Получить эмодзи для страйка
function getStreakEmoji(streak) {
  if (streak >= 30) return '👑';
  if (streak >= 14) return '💫';
  if (streak >= 7) return '🌟';
  if (streak >= 3) return '✨';
  return '🌙';
}

// Форматирование карты для отправки
function formatCardMessage(card, includeAdvice = true) {
  let message = `✦ *${card.name}* ✦\n`;
  message += `_${card.nameEn}_\n\n`;
  message += `${card.meaning}\n`;

  if (includeAdvice) {
    message += `\n🌙 *Послание дня:*\n${card.advice}\n`;
    message += `\n_#${card.keywords.join(' #')}_`;
  }

  return message;
}

// ========== Команда /start ==========

bot.start(async (ctx) => {
  const telegramId = ctx.from.id;
  const username = ctx.from.username;
  const firstName = ctx.from.first_name;
  const lastName = ctx.from.last_name;

  // Проверяем реферальный код
  let referrerId = null;
  const startPayload = ctx.startPayload;

  if (startPayload && startPayload.startsWith('ref_')) {
    referrerId = parseInt(startPayload.replace('ref_', ''));
    if (referrerId === telegramId) referrerId = null;
  }

  // Создаём или обновляем пользователя
  const existingUser = db.getUser(telegramId);
  const user = db.createUser(telegramId, username, firstName, lastName, referrerId);

  // Если это новый пользователь и есть реферер
  if (!existingUser && referrerId) {
    const referrerExists = db.getUser(referrerId);
    if (referrerExists) {
      db.addReferral(referrerId, telegramId);

      try {
        await bot.telegram.sendMessage(
          referrerId,
          `✨ По твоей ссылке присоединился${firstName ? ` ${firstName}` : ' новый участник'}!\n\nТвоих приглашённых: ${db.getReferralCount(referrerId)}`
        );
      } catch (e) {}
    }
  }

  const greeting = firstName ? `${firstName}, добро пожаловать` : 'Добро пожаловать';

  await ctx.replyWithMarkdown(
    `${greeting} в мир Таро ✨\n\n` +
    `Я — твой проводник в мир карт Таро Уэйта.\n\n` +
    `Каждый день я буду открывать для тебя карту с посланием и мудростью древних символов. ` +
    `Чем чаще ты обращаешься к картам — тем глубже твоя связь с интуицией 🌙\n\n` +
    `*Что тебя ждёт:*\n\n` +
    `🃏 *Карта дня* — твоё ежедневное послание\n` +
    `🎴 *Познай Таро* — проверь своё понимание карт\n` +
    `📿 *Мой путь* — твоя история с Таро\n` +
    `💜 *Поделиться* — пригласи близких\n\n` +
    `_Готова узнать, что приготовила тебе Вселенная сегодня?_`,
    Markup.keyboard([
      ['🃏 Карта дня'],
      ['🎴 Познать Таро', '📿 Мой путь'],
      ['💜 Пригласить близких', '⚙️ Настройки']
    ]).resize()
  );
});

// ========== Карта дня ==========

bot.hears('🃏 Карта дня', async (ctx) => {
  const telegramId = ctx.from.id;
  db.updateUserActivity(telegramId);

  // Проверяем, получал ли уже карту сегодня
  const todayCard = db.getTodayCard(telegramId);

  if (todayCard) {
    const card = getCardById(todayCard.card_id);
    const streak = db.getStreak(telegramId);
    const imageUrl = getCardImageUrl(card.id);

    const caption = `Твоя карта на сегодня уже открыта ✨\n\n` +
      formatCardMessage(card) +
      `\n\n${getStreakEmoji(streak.current_streak)} _Ты на связи с Таро уже ${streak.current_streak} ${getDaysWord(streak.current_streak)} подряд_`;

    if (imageUrl) {
      await ctx.replyWithPhoto(imageUrl, {
        caption,
        parse_mode: 'Markdown'
      });
    } else {
      await ctx.replyWithMarkdown(caption);
    }
    return;
  }

  // Анимация вытягивания карты
  const waitMessage = await ctx.reply('🌙 Настраиваюсь на твою энергию...');

  await new Promise(resolve => setTimeout(resolve, 1000));
  await ctx.telegram.editMessageText(ctx.chat.id, waitMessage.message_id, null, '✨ Тасую колоду...');

  await new Promise(resolve => setTimeout(resolve, 1000));
  await ctx.telegram.editMessageText(ctx.chat.id, waitMessage.message_id, null, '🃏 Вытягиваю твою карту...');

  await new Promise(resolve => setTimeout(resolve, 800));

  // Получаем случайную карту
  const card = getRandomCard();

  // Сохраняем в БД
  db.saveDailyCard(telegramId, card.id);

  // Получаем обновлённый страйк
  const streak = db.getStreak(telegramId);

  // Удаляем сообщение ожидания
  await ctx.deleteMessage(waitMessage.message_id).catch(() => {});

  // Формируем сообщение
  let streakMessage = '';
  if (streak.current_streak > 1) {
    streakMessage = `\n\n${getStreakEmoji(streak.current_streak)} _${streak.current_streak} ${getDaysWord(streak.current_streak)} на связи с Таро_`;
    if (streak.current_streak === streak.max_streak && streak.current_streak > 2) {
      streakMessage += ' — это твой лучший результат! 💫';
    }
  }

  const imageUrl = getCardImageUrl(card.id);
  const caption = `✨ *Вселенная говорит с тобой через карту:*\n\n` +
    formatCardMessage(card) +
    streakMessage;

  if (imageUrl) {
    await ctx.replyWithPhoto(imageUrl, {
      caption,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '💜 Поделиться посланием', switch_inline_query: `🌙 Моя карта дня — ${card.name}\n\n${card.advice}\n\n✨ Получи своё послание от Таро!` }]
        ]
      }
    });
  } else {
    await ctx.replyWithMarkdown(caption, Markup.inlineKeyboard([
      [Markup.button.switchToChat('💜 Поделиться посланием', `🌙 Моя карта дня — ${card.name}\n\n${card.advice}\n\n✨ Получи своё послание от Таро!`)]
    ]));
  }
});

// Склонение слова "день"
function getDaysWord(n) {
  const lastTwo = n % 100;
  const last = n % 10;

  if (lastTwo >= 11 && lastTwo <= 19) return 'дней';
  if (last === 1) return 'день';
  if (last >= 2 && last <= 4) return 'дня';
  return 'дней';
}

// ========== Игра "Познай Таро" ==========

bot.hears('🎴 Познать Таро', async (ctx) => {
  const telegramId = ctx.from.id;
  db.updateUserActivity(telegramId);

  // Выбираем случайную карту
  const correctCard = getRandomCard();

  // Получаем 3 неправильных варианта
  const wrongCards = getRandomCardsForGame(correctCard, 3);

  // Перемешиваем все варианты
  const options = [correctCard, ...wrongCards].sort(() => Math.random() - 0.5);

  // Сохраняем состояние игры
  gameState.set(telegramId, {
    correctCardId: correctCard.id,
    timestamp: Date.now()
  });

  // Формируем вопрос
  const question = `🎴 *Проверь своё знание Таро*\n\n` +
    `_«${correctCard.meaning}»_\n\n` +
    `Какая карта несёт это послание?`;

  const buttons = options.map(card => [
    Markup.button.callback(card.name, `game_answer_${card.id}`)
  ]);

  await ctx.replyWithMarkdown(question, Markup.inlineKeyboard(buttons));
});

// Обработка ответа в игре
bot.action(/game_answer_(\d+)/, async (ctx) => {
  const telegramId = ctx.from.id;
  const answerId = parseInt(ctx.match[1]);

  const state = gameState.get(telegramId);

  if (!state) {
    await ctx.answerCbQuery('Начни новую игру 🎴');
    return;
  }

  gameState.delete(telegramId);

  const isCorrect = answerId === state.correctCardId;
  const correctCard = getCardById(state.correctCardId);

  const score = db.updateGameScore(telegramId, isCorrect);
  const accuracy = Math.round((score.correct_answers / score.total_games) * 100);

  let responseText;
  if (isCorrect) {
    responseText = `✨ *Верно!*\n\n` +
      `Это *${correctCard.name}*\n\n` +
      `Твоя интуиция работает прекрасно 💫\n\n` +
      `_Твой результат: ${score.correct_answers} из ${score.total_games} (${accuracy}%)_`;
  } else {
    responseText = `🌙 *Не совсем так*\n\n` +
      `Это была карта *${correctCard.name}*\n\n` +
      `Каждая ошибка — шаг к глубокому пониманию Таро ✨\n\n` +
      `_Твой результат: ${score.correct_answers} из ${score.total_games} (${accuracy}%)_`;
  }

  // Удаляем старое сообщение с вопросом
  await ctx.deleteMessage().catch(() => {});

  // Отправляем картинку с правильным ответом
  const imageUrl = getCardImageUrl(correctCard.id);
  if (imageUrl) {
    await ctx.replyWithPhoto(imageUrl, {
      caption: responseText,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎴 Продолжить познание', callback_data: 'play_again' }]
        ]
      }
    });
  } else {
    await ctx.reply(responseText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎴 Продолжить познание', callback_data: 'play_again' }]
        ]
      }
    });
  }

  await ctx.answerCbQuery(isCorrect ? '✨ Верно!' : '🌙 Учимся дальше');
});

// Играть ещё
bot.action('play_again', async (ctx) => {
  await ctx.answerCbQuery();

  const telegramId = ctx.from.id;

  const correctCard = getRandomCard();
  const wrongCards = getRandomCardsForGame(correctCard, 3);
  const options = [correctCard, ...wrongCards].sort(() => Math.random() - 0.5);

  gameState.set(telegramId, {
    correctCardId: correctCard.id,
    timestamp: Date.now()
  });

  const question = `🎴 *Проверь своё знание Таро*\n\n` +
    `_«${correctCard.meaning}»_\n\n` +
    `Какая карта несёт это послание?`;

  const buttons = options.map(card => [
    Markup.button.callback(card.name, `game_answer_${card.id}`)
  ]);

  await ctx.editMessageText(question, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
});

// ========== Мой путь (Статистика) ==========

bot.hears('📿 Мой путь', async (ctx) => {
  const telegramId = ctx.from.id;
  db.updateUserActivity(telegramId);

  const stats = db.getUserStats(telegramId);

  const message = `📿 *Твой путь в мире Таро*\n\n` +
    `✨ *Связь с картами:*\n` +
    `└ Текущий поток: ${stats.currentStreak} ${getDaysWord(stats.currentStreak)}\n` +
    `└ Лучший результат: ${stats.maxStreak} ${getDaysWord(stats.maxStreak)}\n` +
    `└ Всего посланий получено: ${stats.totalCards}\n\n` +
    `🎴 *Познание Таро:*\n` +
    `└ Пройдено испытаний: ${stats.gamesPlayed}\n` +
    `└ Верных ответов: ${stats.correctAnswers}\n` +
    `└ Точность интуиции: ${stats.accuracy}%\n\n` +
    `💜 *Приглашённых в мир Таро:* ${stats.referrals}`;

  await ctx.replyWithMarkdown(message, Markup.inlineKeyboard([
    [Markup.button.callback('👑 Мастера Таро', 'show_leaderboard')]
  ]));
});

// Рейтинг игроков
bot.action('show_leaderboard', async (ctx) => {
  await ctx.answerCbQuery();

  const topPlayers = db.getTopPlayers(10);

  if (topPlayers.length === 0) {
    await ctx.reply('Пока здесь никого нет. Стань первым мастером! 🎴');
    return;
  }

  let message = `👑 *Мастера познания Таро*\n\n`;

  topPlayers.forEach((player, index) => {
    const medal = index === 0 ? '👑' : index === 1 ? '💫' : index === 2 ? '✨' : `${index + 1}.`;
    const name = player.first_name || player.username || 'Странник';
    message += `${medal} *${name}* — ${player.correct_answers} верных (${player.accuracy || 0}%)\n`;
  });

  await ctx.replyWithMarkdown(message);
});

// ========== Пригласить близких ==========

bot.hears('💜 Пригласить близких', async (ctx) => {
  const telegramId = ctx.from.id;
  db.updateUserActivity(telegramId);

  const botUsername = (await bot.telegram.getMe()).username;
  const referralLink = `https://t.me/${botUsername}?start=ref_${telegramId}`;
  const referralCount = db.getReferralCount(telegramId);

  const message = `💜 *Подели магию Таро с близкими*\n\n` +
    `Отправь ссылку тем, кому хочешь подарить ежедневные послания от Вселенной ✨\n\n` +
    `🔗 *Твоя личная ссылка:*\n\`${referralLink}\`\n\n` +
    `_Ты уже пригласил${referralCount > 0 ? `: ${referralCount} ${getPersonsWord(referralCount)}` : 'а: пока никого'}_`;

  await ctx.replyWithMarkdown(message, Markup.inlineKeyboard([
    [Markup.button.switchToChat('💜 Поделиться ссылкой', `✨ Приглашаю тебя в мир Таро!\n\nКаждый день — новое послание от Вселенной через карты Таро Уэйта 🌙\n\nПрисоединяйся: ${referralLink}`)]
  ]));
});

// Склонение слова "человек"
function getPersonsWord(n) {
  const lastTwo = n % 100;
  const last = n % 10;

  if (lastTwo >= 11 && lastTwo <= 19) return 'человек';
  if (last === 1) return 'человека';
  if (last >= 2 && last <= 4) return 'человека';
  return 'человек';
}

// ========== Настройки ==========

bot.hears('⚙️ Настройки', async (ctx) => {
  const telegramId = ctx.from.id;
  const user = db.getUser(telegramId);

  const notifStatus = user?.notifications_enabled ? '🔔 Включены' : '🔕 Выключены';

  await ctx.reply(
    '⚙️ *Настройки*\n\n_Утренние напоминания о карте дня_',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(`Уведомления: ${notifStatus}`, 'toggle_notifications')]
      ])
    }
  );
});

bot.action('toggle_notifications', async (ctx) => {
  const telegramId = ctx.from.id;
  const user = db.getUser(telegramId);

  const newState = !user?.notifications_enabled;
  db.toggleNotifications(telegramId, newState);

  const notifStatus = newState ? '🔔 Включены' : '🔕 Выключены';

  await ctx.editMessageText(
    '⚙️ *Настройки*\n\n_Утренние напоминания о карте дня_',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: `Уведомления: ${notifStatus}`, callback_data: 'toggle_notifications' }]
        ]
      }
    }
  );

  await ctx.answerCbQuery(newState ? '🔔 Буду напоминать о карте' : '🔕 Напоминания отключены');
});

// ========== Ежедневные уведомления ==========

const DAILY_TIME = process.env.DAILY_CARD_TIME || '08:00';
const [hours, minutes] = DAILY_TIME.split(':');

cron.schedule(`${minutes} ${hours} * * *`, async () => {
  console.log('🌙 Отправка утренних посланий...');

  const users = db.getAllUsersWithNotifications();

  for (const user of users) {
    try {
      const todayCard = db.getTodayCard(user.telegram_id);

      if (!todayCard) {
        await bot.telegram.sendMessage(
          user.telegram_id,
          `🌅 *Доброе утро!*\n\nВселенная приготовила для тебя послание.\nТвоя карта дня ждёт ✨`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              keyboard: [['🃏 Карта дня'], ['🎴 Познать Таро', '📿 Мой путь'], ['💜 Пригласить близких', '⚙️ Настройки']],
              resize_keyboard: true
            }
          }
        );
      }

      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      console.log(`Не удалось отправить: ${user.telegram_id}`);
    }
  }

  console.log(`✅ Отправлено ${users.length} пользователям`);
}, {
  timezone: process.env.TIMEZONE || 'Europe/Moscow'
});

// ========== Обработка текстовых сообщений ==========

bot.on('text', async (ctx) => {
  await ctx.reply(
    '✨ Используй меню для навигации',
    Markup.keyboard([
      ['🃏 Карта дня'],
      ['🎴 Познать Таро', '📿 Мой путь'],
      ['💜 Пригласить близких', '⚙️ Настройки']
    ]).resize()
  );
});

// ========== Запуск бота ==========

bot.launch()
  .then(() => {
    console.log('✨ Бот "Карта Дня" запущен!');
    console.log(`🌙 Утренние послания в ${DAILY_TIME}`);
  })
  .catch((err) => {
    console.error('❌ Ошибка запуска бота:', err);
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
