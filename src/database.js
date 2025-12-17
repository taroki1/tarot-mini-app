// Модуль работы с базой данных SQLite
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'tarot.db');
const db = new Database(dbPath);

// Включаем foreign keys
db.pragma('journal_mode = WAL');

// Создаём таблицы
function initDatabase() {
  // Таблица пользователей
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      telegram_id INTEGER UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      referrer_id INTEGER,
      notifications_enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      last_active TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (referrer_id) REFERENCES users(telegram_id)
    )
  `);

  // Таблица истории карт дня
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      card_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(telegram_id),
      UNIQUE(user_id, date)
    )
  `);

  // Таблица страйков
  db.exec(`
    CREATE TABLE IF NOT EXISTS streaks (
      user_id INTEGER PRIMARY KEY,
      current_streak INTEGER DEFAULT 0,
      max_streak INTEGER DEFAULT 0,
      last_card_date TEXT,
      FOREIGN KEY (user_id) REFERENCES users(telegram_id)
    )
  `);

  // Таблица результатов игры
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_scores (
      user_id INTEGER PRIMARY KEY,
      total_games INTEGER DEFAULT 0,
      correct_answers INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(telegram_id)
    )
  `);

  // Таблица рефералов
  db.exec(`
    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id INTEGER NOT NULL,
      referred_id INTEGER NOT NULL,
      bonus_given INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (referrer_id) REFERENCES users(telegram_id),
      FOREIGN KEY (referred_id) REFERENCES users(telegram_id),
      UNIQUE(referred_id)
    )
  `);

  // Индексы для быстрого поиска
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_daily_cards_user_date ON daily_cards(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
  `);

  console.log('✅ База данных инициализирована');
}

// ========== Пользователи ==========

function getUser(telegramId) {
  return db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
}

function createUser(telegramId, username, firstName, lastName, referrerId = null) {
  const stmt = db.prepare(`
    INSERT INTO users (telegram_id, username, first_name, last_name, referrer_id)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(telegram_id) DO UPDATE SET
      username = excluded.username,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      last_active = datetime('now')
  `);

  stmt.run(telegramId, username, firstName, lastName, referrerId);

  // Создаём запись страйка
  db.prepare(`
    INSERT OR IGNORE INTO streaks (user_id) VALUES (?)
  `).run(telegramId);

  // Создаём запись игрового счёта
  db.prepare(`
    INSERT OR IGNORE INTO game_scores (user_id) VALUES (?)
  `).run(telegramId);

  return getUser(telegramId);
}

function updateUserActivity(telegramId) {
  db.prepare(`
    UPDATE users SET last_active = datetime('now') WHERE telegram_id = ?
  `).run(telegramId);
}

function getAllUsersWithNotifications() {
  return db.prepare(`
    SELECT telegram_id FROM users WHERE notifications_enabled = 1
  `).all();
}

function toggleNotifications(telegramId, enabled) {
  db.prepare(`
    UPDATE users SET notifications_enabled = ? WHERE telegram_id = ?
  `).run(enabled ? 1 : 0, telegramId);
}

// ========== Карта дня ==========

function getTodayCard(telegramId) {
  const today = new Date().toISOString().split('T')[0];
  return db.prepare(`
    SELECT * FROM daily_cards WHERE user_id = ? AND date = ?
  `).get(telegramId, today);
}

function saveDailyCard(telegramId, cardId) {
  const today = new Date().toISOString().split('T')[0];

  db.prepare(`
    INSERT INTO daily_cards (user_id, card_id, date)
    VALUES (?, ?, ?)
  `).run(telegramId, cardId, today);

  // Обновляем страйк
  updateStreak(telegramId, today);

  return { cardId, date: today };
}

// ========== Страйки ==========

function getStreak(telegramId) {
  return db.prepare('SELECT * FROM streaks WHERE user_id = ?').get(telegramId);
}

function updateStreak(telegramId, today) {
  const streak = getStreak(telegramId);
  if (!streak) return;

  const lastDate = streak.last_card_date;
  let newStreak = 1;

  if (lastDate) {
    const last = new Date(lastDate);
    const current = new Date(today);
    const diffDays = Math.floor((current - last) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Продолжаем страйк
      newStreak = streak.current_streak + 1;
    } else if (diffDays === 0) {
      // Та же дата, не меняем
      return streak;
    }
    // diffDays > 1 означает пропуск, страйк сбрасывается на 1
  }

  const maxStreak = Math.max(streak.max_streak, newStreak);

  db.prepare(`
    UPDATE streaks
    SET current_streak = ?, max_streak = ?, last_card_date = ?
    WHERE user_id = ?
  `).run(newStreak, maxStreak, today, telegramId);

  return { current: newStreak, max: maxStreak };
}

// ========== Игра ==========

function getGameScore(telegramId) {
  return db.prepare('SELECT * FROM game_scores WHERE user_id = ?').get(telegramId);
}

function updateGameScore(telegramId, correct) {
  const stmt = correct
    ? db.prepare(`
        UPDATE game_scores
        SET total_games = total_games + 1, correct_answers = correct_answers + 1
        WHERE user_id = ?
      `)
    : db.prepare(`
        UPDATE game_scores
        SET total_games = total_games + 1
        WHERE user_id = ?
      `);

  stmt.run(telegramId);
  return getGameScore(telegramId);
}

function getTopPlayers(limit = 10) {
  return db.prepare(`
    SELECT u.first_name, u.username, g.correct_answers, g.total_games,
           ROUND(CAST(g.correct_answers AS FLOAT) / NULLIF(g.total_games, 0) * 100, 1) as accuracy
    FROM game_scores g
    JOIN users u ON g.user_id = u.telegram_id
    WHERE g.total_games > 0
    ORDER BY g.correct_answers DESC, accuracy DESC
    LIMIT ?
  `).all(limit);
}

// ========== Рефералы ==========

function addReferral(referrerId, referredId) {
  try {
    db.prepare(`
      INSERT INTO referrals (referrer_id, referred_id)
      VALUES (?, ?)
    `).run(referrerId, referredId);
    return true;
  } catch (e) {
    // Уже есть реферал или ошибка
    return false;
  }
}

function getReferralCount(telegramId) {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ?
  `).get(telegramId);
  return result?.count || 0;
}

function getReferralStats(telegramId) {
  const count = getReferralCount(telegramId);
  return {
    count,
    referralLink: `https://t.me/${process.env.BOT_USERNAME}?start=ref_${telegramId}`
  };
}

// ========== Статистика ==========

function getUserStats(telegramId) {
  const streak = getStreak(telegramId);
  const game = getGameScore(telegramId);
  const referrals = getReferralCount(telegramId);
  const cardsCount = db.prepare(`
    SELECT COUNT(*) as count FROM daily_cards WHERE user_id = ?
  `).get(telegramId);

  return {
    currentStreak: streak?.current_streak || 0,
    maxStreak: streak?.max_streak || 0,
    totalCards: cardsCount?.count || 0,
    gamesPlayed: game?.total_games || 0,
    correctAnswers: game?.correct_answers || 0,
    accuracy: game?.total_games > 0
      ? Math.round((game.correct_answers / game.total_games) * 100)
      : 0,
    referrals
  };
}

// Инициализируем при запуске
initDatabase();

module.exports = {
  db,
  getUser,
  createUser,
  updateUserActivity,
  getAllUsersWithNotifications,
  toggleNotifications,
  getTodayCard,
  saveDailyCard,
  getStreak,
  getGameScore,
  updateGameScore,
  getTopPlayers,
  addReferral,
  getReferralCount,
  getReferralStats,
  getUserStats
};
