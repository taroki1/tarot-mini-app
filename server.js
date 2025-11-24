// server.js - Главный файл нашего сервера
// Этот файл - как диспетчерская в аэропорту, направляет все запросы по нужным маршрутам

const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Загружаем переменные окружения из файла .env
dotenv.config();

// Создаем приложение Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - это как контрольно-пропускные пункты для запросов
app.use(cors()); // Разрешаем запросы с других доменов
app.use(express.json()); // Парсим JSON в теле запросов
app.use(express.static('public')); // Отдаем статические файлы из папки public

// Подключение к базе данных PostgreSQL
// Это наше хранилище всех данных приложения
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/tarot_app',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Инициализация Telegram Bot
// Это наш помощник для отправки уведомлений
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

// Функция для проверки Telegram Web App данных
// Это как проверка паспорта на входе - убеждаемся, что пользователь пришел из Telegram
function verifyTelegramWebAppData(telegramInitData) {
  const urlParams = new URLSearchParams(telegramInitData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');
  
  // Сортируем параметры и создаем строку для проверки
  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  // Проверяем подпись данных
  const secret = crypto
    .createHmac('sha256', 'WebAppData')
    .update(process.env.TELEGRAM_BOT_TOKEN)
    .digest();
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(dataCheckString)
    .digest('hex');
  
  return signature === hash;
}

// ========== МАРШРУТЫ API ==========
// Каждый маршрут - это дверь в определенную функцию нашего приложения

// Получение списка всех тарологов
app.get('/api/tarot-readers', async (req, res) => {
  try {
    // Запрашиваем из базы всех активных тарологов с их статистикой
    const query = `
      SELECT 
        tr.*,
        COUNT(DISTINCT c.id) as total_consultations,
        AVG(r.rating) as average_rating,
        COUNT(DISTINCT r.id) as total_reviews
      FROM tarot_readers tr
      LEFT JOIN consultations c ON tr.id = c.tarot_reader_id
      LEFT JOIN reviews r ON c.id = r.consultation_id
      WHERE tr.is_active = true
      GROUP BY tr.id
      ORDER BY tr.is_featured DESC, average_rating DESC NULLS LAST
    `;
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при получении списка тарологов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получение детальной информации о конкретном тарологе
app.get('/api/tarot-readers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Получаем полную информацию о тарологе, включая отзывы
    const tarotReaderQuery = `
      SELECT 
        tr.*,
        COUNT(DISTINCT c.id) as total_consultations,
        AVG(r.rating) as average_rating
      FROM tarot_readers tr
      LEFT JOIN consultations c ON tr.id = c.tarot_reader_id
      LEFT JOIN reviews r ON c.id = r.consultation_id
      WHERE tr.id = $1
      GROUP BY tr.id
    `;
    
    const reviewsQuery = `
      SELECT r.*, u.first_name, u.last_name
      FROM reviews r
      JOIN consultations c ON r.consultation_id = c.id
      JOIN users u ON c.client_id = u.id
      WHERE c.tarot_reader_id = $1
      ORDER BY r.created_at DESC
      LIMIT 10
    `;
    
    const [tarotReader, reviews] = await Promise.all([
      pool.query(tarotReaderQuery, [id]),
      pool.query(reviewsQuery, [id])
    ]);
    
    if (tarotReader.rows.length === 0) {
      return res.status(404).json({ error: 'Таролог не найден' });
    }
    
    res.json({
      ...tarotReader.rows[0],
      reviews: reviews.rows
    });
  } catch (error) {
    console.error('Ошибка при получении информации о тарологе:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создание новой консультации (когда клиент выбирает таролога)
app.post('/api/consultations', async (req, res) => {
  try {
    const { tarot_reader_id, client_telegram_id, client_name } = req.body;
    
    // Генерируем уникальный код подтверждения
    const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Создаем запись о консультации
    const insertQuery = `
      INSERT INTO consultations (tarot_reader_id, client_telegram_id, client_name, confirmation_code, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      tarot_reader_id,
      client_telegram_id,
      client_name,
      confirmationCode
    ]);
    
    // Получаем информацию о тарологе для отправки уведомления
    const tarotReaderQuery = await pool.query(
      'SELECT * FROM tarot_readers WHERE id = $1',
      [tarot_reader_id]
    );
    
    const tarotReader = tarotReaderQuery.rows[0];
    
    // Отправляем уведомление тарологу через Telegram
    if (tarotReader.telegram_id) {
      const message = `
🔮 Новая заявка на консультацию!

👤 Клиент: ${client_name}
🔢 Код подтверждения: ${confirmationCode}

Пожалуйста, свяжитесь с клиентом и запросите код для подтверждения начала консультации.
      `;
      
      await bot.sendMessage(tarotReader.telegram_id, message);
    }
    
    res.json({
      consultation_id: result.rows[0].id,
      confirmation_code: confirmationCode,
      tarot_reader_telegram: tarotReader.telegram_username
    });
  } catch (error) {
    console.error('Ошибка при создании консультации:', error);
    res.status(500).json({ error: 'Не удалось создать заявку на консультацию' });
  }
});

// Подтверждение проведения консультации (тарологом)
app.post('/api/consultations/confirm', async (req, res) => {
  try {
    const { confirmation_code, tarot_reader_id } = req.body;
    
    // Проверяем код и обновляем статус консультации
    const updateQuery = `
      UPDATE consultations 
      SET status = 'completed', completed_at = NOW()
      WHERE confirmation_code = $1 
        AND tarot_reader_id = $2 
        AND status = 'pending'
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [confirmation_code, tarot_reader_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Консультация не найдена или уже подтверждена' });
    }
    
    // Отправляем уведомление клиенту о возможности оставить отзыв
    const consultation = result.rows[0];
    if (consultation.client_telegram_id) {
      const message = `
✅ Ваша консультация завершена!

Пожалуйста, оцените работу таролога и оставьте отзыв в нашем приложении.
Это поможет другим клиентам с выбором специалиста.

Спасибо, что выбрали нашу школу! 💜
      `;
      
      await bot.sendMessage(consultation.client_telegram_id, message);
    }
    
    res.json({ success: true, consultation: result.rows[0] });
  } catch (error) {
    console.error('Ошибка при подтверждении консультации:', error);
    res.status(500).json({ error: 'Не удалось подтвердить консультацию' });
  }
});

// Добавление отзыва
app.post('/api/reviews', async (req, res) => {
  try {
    const { consultation_id, rating, comment, client_telegram_id } = req.body;
    
    // Проверяем, что консультация существует и завершена
    const consultationCheck = await pool.query(
      'SELECT * FROM consultations WHERE id = $1 AND client_telegram_id = $2 AND status = $3',
      [consultation_id, client_telegram_id, 'completed']
    );
    
    if (consultationCheck.rows.length === 0) {
      return res.status(403).json({ 
        error: 'Вы можете оставить отзыв только после завершенной консультации' 
      });
    }
    
    // Проверяем, не оставлял ли уже отзыв
    const existingReview = await pool.query(
      'SELECT * FROM reviews WHERE consultation_id = $1',
      [consultation_id]
    );
    
    if (existingReview.rows.length > 0) {
      return res.status(400).json({ error: 'Вы уже оставили отзыв для этой консультации' });
    }
    
    // Создаем отзыв
    const insertQuery = `
      INSERT INTO reviews (consultation_id, rating, comment)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [consultation_id, rating, comment]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка при добавлении отзыва:', error);
    res.status(500).json({ error: 'Не удалось добавить отзыв' });
  }
});

// ========== АДМИН-ПАНЕЛЬ ==========
// Эти маршруты доступны только администраторам

// Middleware для проверки админских прав
async function checkAdmin(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Недействительный токен' });
  }
}

// Авторизация администратора
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // В реальном приложении пароли должны быть захешированы в базе
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign(
        { username, role: 'admin' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
      
      res.json({ token });
    } else {
      res.status(401).json({ error: 'Неверные учетные данные' });
    }
  } catch (error) {
    console.error('Ошибка при авторизации:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Добавление нового таролога (только для админов)
app.post('/api/admin/tarot-readers', checkAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      specialization,
      price_range,
      telegram_username,
      telegram_id,
      photo_url,
      courses_completed,
      is_featured
    } = req.body;
    
    const insertQuery = `
      INSERT INTO tarot_readers (
        name, description, specialization, price_range,
        telegram_username, telegram_id, photo_url,
        courses_completed, is_featured, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      name, description, specialization, price_range,
      telegram_username, telegram_id, photo_url,
      courses_completed, is_featured || false
    ]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка при добавлении таролога:', error);
    res.status(500).json({ error: 'Не удалось добавить таролога' });
  }
});

// Получение статистики для админ-панели
app.get('/api/admin/statistics', checkAdmin, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM tarot_readers WHERE is_active = true) as total_readers,
        (SELECT COUNT(*) FROM consultations) as total_consultations,
        (SELECT COUNT(*) FROM consultations WHERE created_at > NOW() - INTERVAL '7 days') as weekly_consultations,
        (SELECT COUNT(*) FROM reviews) as total_reviews,
        (SELECT AVG(rating) FROM reviews) as average_rating
    `);
    
    const topReaders = await pool.query(`
      SELECT 
        tr.name,
        COUNT(c.id) as consultations_count,
        AVG(r.rating) as average_rating
      FROM tarot_readers tr
      LEFT JOIN consultations c ON tr.id = c.tarot_reader_id
      LEFT JOIN reviews r ON c.id = r.consultation_id
      GROUP BY tr.id
      ORDER BY consultations_count DESC
      LIMIT 5
    `);
    
    res.json({
      general: stats.rows[0],
      top_readers: topReaders.rows
    });
  } catch (error) {
    console.error('Ошибка при получении статистики:', error);
    res.status(500).json({ error: 'Не удалось получить статистику' });
  }
});

// Обновление таролога (только для админов)
app.put('/api/admin/tarot-readers/:id', checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Формируем SET часть SQL запроса динамически
    const allowedFields = [
      'name', 'description', 'specialization', 'price_range',
      'telegram_username', 'telegram_id', 'photo_url',
      'courses_completed', 'is_featured', 'is_active',
      'personal_philosophy', 'example_readings', 'years_of_experience'
    ];

    const setFields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        setFields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (setFields.length === 0) {
      return res.status(400).json({ error: 'Нет полей для обновления' });
    }

    values.push(id);
    const updateQuery = `
      UPDATE tarot_readers
      SET ${setFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Таролог не найден' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка при обновлении таролога:', error);
    res.status(500).json({ error: 'Не удалось обновить таролога' });
  }
});

// Удаление таролога (архивирование) (только для админов)
app.delete('/api/admin/tarot-readers/:id', checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Не удаляем физически, а просто деактивируем
    const updateQuery = `
      UPDATE tarot_readers
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Таролог не найден' });
    }

    res.json({ message: 'Таролог успешно деактивирован', tarotReader: result.rows[0] });
  } catch (error) {
    console.error('Ошибка при удалении таролога:', error);
    res.status(500).json({ error: 'Не удалось удалить таролога' });
  }
});

// ========== ПРОМО-БАННЕРЫ ==========

// Получение активных баннеров
app.get('/api/promo-banners', async (req, res) => {
  try {
    const query = `
      SELECT * FROM promotional_banners
      WHERE is_active = true
        AND (start_date IS NULL OR start_date <= NOW())
        AND (end_date IS NULL OR end_date >= NOW())
        AND show_to_clients = true
      ORDER BY priority DESC, created_at DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при получении баннеров:', error);
    res.status(500).json({ error: 'Не удалось получить баннеры' });
  }
});

// Увеличение счетчика кликов баннера
app.post('/api/promo-banners/:id/click', async (req, res) => {
  try {
    const { id } = req.params;

    const updateQuery = `
      UPDATE promotional_banners
      SET clicks_count = clicks_count + 1
      WHERE id = $1
      RETURNING *
    `;

    await pool.query(updateQuery, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка при увеличении счетчика кликов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Управление баннерами (только для админов)
app.get('/api/admin/promo-banners', checkAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM promotional_banners ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при получении баннеров:', error);
    res.status(500).json({ error: 'Не удалось получить баннеры' });
  }
});

app.post('/api/admin/promo-banners', checkAdmin, async (req, res) => {
  try {
    const {
      title, description, image_url, link_url, button_text,
      show_to_clients, position, priority, start_date, end_date
    } = req.body;

    const insertQuery = `
      INSERT INTO promotional_banners (
        title, description, image_url, link_url, button_text,
        show_to_clients, position, priority, start_date, end_date,
        is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      title, description, image_url, link_url, button_text,
      show_to_clients !== false, position || 'top', priority || 0,
      start_date, end_date, req.admin.username
    ]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка при создании баннера:', error);
    res.status(500).json({ error: 'Не удалось создать баннер' });
  }
});

// ========== БЛОГ ==========

// Получение опубликованных статей блога
app.get('/api/blog-posts', async (req, res) => {
  try {
    const query = `
      SELECT * FROM blog_posts
      WHERE status = 'published'
      ORDER BY published_at DESC
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при получении статей:', error);
    res.status(500).json({ error: 'Не удалось получить статьи' });
  }
});

// Получение конкретной статьи
app.get('/api/blog-posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM blog_posts WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Статья не найдена' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка при получении статьи:', error);
    res.status(500).json({ error: 'Не удалось получить статью' });
  }
});

// Увеличение счетчика просмотров статьи
app.post('/api/blog-posts/:id/view', async (req, res) => {
  try {
    const { id } = req.params;

    const updateQuery = `
      UPDATE blog_posts
      SET views_count = views_count + 1
      WHERE id = $1
      RETURNING *
    `;

    await pool.query(updateQuery, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка при увеличении счетчика просмотров:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Управление блогом (только для админов)
app.get('/api/admin/blog-posts', checkAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM blog_posts ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при получении статей:', error);
    res.status(500).json({ error: 'Не удалось получить статьи' });
  }
});

app.post('/api/admin/blog-posts', checkAdmin, async (req, res) => {
  try {
    const {
      title, slug, content, excerpt, category, tags,
      featured_image_url, status
    } = req.body;

    const insertQuery = `
      INSERT INTO blog_posts (
        title, slug, content, excerpt, author_name, category, tags,
        featured_image_url, status, published_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const publishedAt = status === 'published' ? new Date() : null;

    const result = await pool.query(insertQuery, [
      title,
      slug || title.toLowerCase().replace(/\s+/g, '-'),
      content,
      excerpt,
      req.admin.username,
      category,
      tags || [],
      featured_image_url,
      status || 'draft',
      publishedAt
    ]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка при создании статьи:', error);
    res.status(500).json({ error: 'Не удалось создать статью' });
  }
});

// ========== МОДЕРАЦИЯ ОТЗЫВОВ ==========

// Получение всех отзывов для модерации (только для админов)
app.get('/api/admin/reviews', checkAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT
        r.*,
        c.tarot_reader_id,
        tr.name as tarot_reader_name,
        u.first_name as client_first_name,
        u.last_name as client_last_name
      FROM reviews r
      JOIN consultations c ON r.consultation_id = c.id
      JOIN tarot_readers tr ON c.tarot_reader_id = tr.id
      LEFT JOIN users u ON c.client_id = u.id
    `;

    if (status === 'pending') {
      query += ' WHERE r.is_approved = false';
    } else if (status === 'approved') {
      query += ' WHERE r.is_approved = true';
    }

    query += ' ORDER BY r.created_at DESC';

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка при получении отзывов:', error);
    res.status(500).json({ error: 'Не удалось получить отзывы' });
  }
});

// Модерация отзыва (одобрение/отклонение)
app.put('/api/admin/reviews/:id', checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_approved, moderation_comment } = req.body;

    const updateQuery = `
      UPDATE reviews
      SET is_approved = $1,
          moderation_comment = $2,
          moderated_by = $3,
          moderated_at = NOW()
      WHERE id = $4
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      is_approved,
      moderation_comment,
      req.admin.username,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Отзыв не найден' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка при модерации отзыва:', error);
    res.status(500).json({ error: 'Не удалось модерировать отзыв' });
  }
});

// Удаление отзыва (только для админов)
app.delete('/api/admin/reviews/:id', checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const deleteQuery = 'DELETE FROM reviews WHERE id = $1 RETURNING *';
    const result = await pool.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Отзыв не найден' });
    }

    res.json({ message: 'Отзыв успешно удален' });
  } catch (error) {
    console.error('Ошибка при удалении отзыва:', error);
    res.status(500).json({ error: 'Не удалось удалить отзыв' });
  }
});

// ========== ЗАПУСК СЕРВЕРА ==========
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📱 Telegram Mini App готово к работе!`);
});
