-- database_schema.sql
-- Схема базы данных для Telegram Mini App каталога тарологов
-- Эта схема создает все необходимые таблицы и связи между ними

-- Удаляем таблицы если они существуют (для чистой установки)
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS consultations CASCADE;
DROP TABLE IF EXISTS blog_posts CASCADE;
DROP TABLE IF EXISTS promotional_banners CASCADE;
DROP TABLE IF EXISTS tarot_readers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- Таблица пользователей (клиентов)
-- Здесь мы храним базовую информацию о всех, кто использует приложение
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    telegram_username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_subscribed_to_notifications BOOLEAN DEFAULT true
);

-- Таблица тарологов
-- Основная таблица с информацией о каждом специалисте
CREATE TABLE tarot_readers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT, -- Подробное описание и философия работы
    specialization VARCHAR(255), -- Специализация: отношения, карьера, духовное развитие
    price_range VARCHAR(100), -- Например: "1000-2000 руб" или "от 1500 руб"
    telegram_username VARCHAR(255),
    telegram_id BIGINT,
    photo_url TEXT, -- URL фотографии таролога
    courses_completed TEXT[], -- Массив пройденных курсов в школе
    years_of_experience INTEGER DEFAULT 0,
    
    -- Флаги и статусы
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false, -- Для "Таролога недели/дня"
    featured_until TIMESTAMP, -- До какого времени таролог в рекомендациях
    
    -- Дополнительная информация для профиля
    personal_philosophy TEXT, -- Личная философия работы с картами
    example_readings TEXT, -- Примеры раскладов или кейсов
    certificates TEXT[], -- Сертификаты и достижения
    
    -- Статистика (денормализованная для быстрого доступа)
    total_consultations INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    
    -- Метаданные
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255), -- Кто добавил таролога (админ)
    
    -- Настройки уведомлений
    notify_on_new_client BOOLEAN DEFAULT true,
    notify_on_new_review BOOLEAN DEFAULT true
);

-- Таблица консультаций
-- Каждая запись - это одна консультация между клиентом и тарологом
CREATE TABLE consultations (
    id SERIAL PRIMARY KEY,
    tarot_reader_id INTEGER REFERENCES tarot_readers(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    client_telegram_id BIGINT,
    client_name VARCHAR(255),
    
    -- Система подтверждения
    confirmation_code VARCHAR(6),
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, completed, cancelled
    
    -- Временные метки
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Дополнительная информация
    consultation_topic VARCHAR(255), -- Тема консультации (если указана)
    notes TEXT -- Заметки от таролога (приватные)
);

-- Таблица отзывов
-- Отзывы могут оставлять только клиенты после завершенной консультации
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    consultation_id INTEGER UNIQUE REFERENCES consultations(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    
    -- Ответ таролога на отзыв (если есть)
    tarot_reader_response TEXT,
    response_date TIMESTAMP,
    
    -- Модерация
    is_approved BOOLEAN DEFAULT true, -- Для модерации отзывов
    moderation_comment TEXT, -- Причина отклонения (если есть)
    moderated_by VARCHAR(255),
    moderated_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица рекламных баннеров
-- Для продвижения вебинаров и курсов школы
CREATE TABLE promotional_banners (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    link_url TEXT,
    button_text VARCHAR(100), -- Текст на кнопке CTA
    
    -- Таргетинг и показ
    show_to_clients BOOLEAN DEFAULT true,
    show_to_tarot_readers BOOLEAN DEFAULT false,
    position VARCHAR(50), -- top, middle, bottom
    priority INTEGER DEFAULT 0, -- Чем выше, тем приоритетнее показ
    
    -- Период показа
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    
    -- Статистика
    views_count INTEGER DEFAULT 0,
    clicks_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255)
);

-- Таблица постов блога
-- Для образовательного контента и удержания аудитории
CREATE TABLE blog_posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL, -- URL-friendly версия заголовка
    content TEXT NOT NULL,
    excerpt TEXT, -- Краткое описание для превью
    author_name VARCHAR(255),
    author_id INTEGER REFERENCES tarot_readers(id) ON DELETE SET NULL,
    
    -- Категоризация
    category VARCHAR(100), -- Обучение, Практика, Истории успеха, и т.д.
    tags TEXT[], -- Массив тегов для поиска
    
    -- Медиа
    featured_image_url TEXT,
    
    -- Статус и публикация
    status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
    published_at TIMESTAMP,
    
    -- SEO и метрики
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица администраторов
-- Для управления доступом к админ-панели
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin', -- admin, super_admin, moderator
    
    -- Права доступа (можно расширять)
    can_manage_tarot_readers BOOLEAN DEFAULT true,
    can_manage_banners BOOLEAN DEFAULT true,
    can_manage_blog BOOLEAN DEFAULT true,
    can_view_statistics BOOLEAN DEFAULT true,
    can_moderate_reviews BOOLEAN DEFAULT true,
    
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Индексы для оптимизации запросов
-- Эти индексы ускоряют поиск и сортировку данных

CREATE INDEX idx_tarot_readers_active ON tarot_readers(is_active);
CREATE INDEX idx_tarot_readers_featured ON tarot_readers(is_featured, featured_until);
CREATE INDEX idx_tarot_readers_specialization ON tarot_readers(specialization);
CREATE INDEX idx_consultations_status ON consultations(status);
CREATE INDEX idx_consultations_tarot_reader ON consultations(tarot_reader_id);
CREATE INDEX idx_consultations_client ON consultations(client_id);
CREATE INDEX idx_reviews_consultation ON reviews(consultation_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_published ON blog_posts(published_at);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Применяем триггер к таблицам с полем updated_at
CREATE TRIGGER update_tarot_readers_updated_at BEFORE UPDATE ON tarot_readers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Вставка начальных данных для тестирования
-- Создаем администратора по умолчанию (пароль: admin123 - нужно будет захешировать)
INSERT INTO admin_users (username, password_hash, full_name, role)
VALUES ('admin', '$2b$10$YourHashedPasswordHere', 'Главный администратор', 'super_admin');

-- Пример рекламного баннера
INSERT INTO promotional_banners (
    title,
    description,
    button_text,
    link_url,
    position,
    priority,
    is_active
) VALUES (
    'Бесплатный вебинар: Начни свой путь в Таро',
    'Узнай, как читать карты и помогать людям находить ответы на важные вопросы',
    'Записаться бесплатно',
    'https://your-school-website.ru/webinar',
    'top',
    100,
    true
);

-- Комментарий о синхронизации с Google Sheets
-- Для интеграции с Google Sheets мы будем использовать отдельный скрипт синхронизации,
-- который будет периодически обновлять данные в таблице tarot_readers из вашей таблицы
