// public/src/components/TarotReaderProfile.jsx
// Детальная страница профиля таролога - здесь происходит "продажа" услуг специалиста
import React, { useState, useEffect } from 'react';
import './TarotReaderProfile.css';

function TarotReaderProfile({ tarotReader, userData, onBack }) {
  // Состояния для управления процессом записи и отображения данных
  const [reviews, setReviews] = useState([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState(null);
  const [bookingStatus, setBookingStatus] = useState('idle'); // idle, booking, success, error
  const [selectedTopic, setSelectedTopic] = useState('');
  const [clientMessage, setClientMessage] = useState('');
  
  // Загружаем отзывы при открытии профиля
  useEffect(() => {
    if (tarotReader) {
      loadReviews();
    }
  }, [tarotReader]);
  
  // Функция загрузки отзывов о тарологе
  const loadReviews = async () => {
    try {
      const response = await fetch(`/api/tarot-readers/${tarotReader.id}`);
      const data = await response.json();
      setReviews(data.reviews || []);
    } catch (error) {
      console.error('Ошибка при загрузке отзывов:', error);
    }
  };
  
  // Функция для записи на консультацию
  const bookConsultation = async () => {
    try {
      setBookingStatus('booking');
      
      // Подготавливаем данные для отправки
      const bookingData = {
        tarot_reader_id: tarotReader.id,
        client_telegram_id: userData?.id || null,
        client_name: userData ? `${userData.firstName} ${userData.lastName || ''}`.trim() : 'Гость',
        consultation_topic: selectedTopic
      };
      
      // Отправляем запрос на сервер
      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setConfirmationCode(result.confirmation_code);
        setBookingStatus('success');
        
        // Вибрация при успешной записи (для мобильных устройств)
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
      } else {
        throw new Error(result.error || 'Ошибка при записи');
      }
    } catch (error) {
      console.error('Ошибка при записи на консультацию:', error);
      setBookingStatus('error');
      
      // Показываем уведомление об ошибке
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showAlert('Не удалось записаться. Попробуйте позже.');
      }
    }
  };
  
  // Функция для открытия Telegram чата с тарологом
  const openTelegramChat = () => {
    if (tarotReader.telegram_username) {
      // Открываем чат в Telegram
      const telegramUrl = `https://t.me/${tarotReader.telegram_username}`;
      
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.openTelegramLink(telegramUrl);
      } else {
        window.open(telegramUrl, '_blank');
      }
    }
  };
  
  // Функция для форматирования даты отзыва
  const formatReviewDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Вчера';
    if (diffDays < 7) return `${diffDays} дней назад`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} недель назад`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} месяцев назад`;
    return `${Math.floor(diffDays / 365)} лет назад`;
  };
  
  // Функция для рендеринга звезд рейтинга
  const renderRatingStars = (rating) => {
    return '⭐'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
  };
  
  if (!tarotReader) {
    return <div>Загрузка...</div>;
  }
  
  return (
    <div className="tarot-reader-profile">
      {/* Шапка профиля с основной информацией */}
      <div className="profile-header">
        <button className="back-button" onClick={onBack}>
          ← Назад к списку
        </button>
        
        <div className="profile-main-info">
          {tarotReader.photo_url ? (
            <img 
              src={tarotReader.photo_url} 
              alt={tarotReader.name}
              className="profile-photo"
            />
          ) : (
            <div className="profile-photo-placeholder">
              {tarotReader.name.charAt(0).toUpperCase()}
            </div>
          )}
          
          <div className="profile-details">
            <h1>{tarotReader.name}</h1>
            <p className="specialization">{tarotReader.specialization}</p>
            
            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-value">{tarotReader.total_consultations || 0}</span>
                <span className="stat-label">консультаций</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {tarotReader.average_rating ? tarotReader.average_rating.toFixed(1) : '—'}
                </span>
                <span className="stat-label">рейтинг</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{tarotReader.years_of_experience || 1}+</span>
                <span className="stat-label">лет опыта</span>
              </div>
            </div>
            
            <div className="price-info">
              💰 Стоимость: <strong>{tarotReader.price_range}</strong>
            </div>
          </div>
        </div>
      </div>
      
      {/* Секция "О себе" */}
      <section className="profile-section">
        <h2>О себе</h2>
        <p className="description">{tarotReader.description}</p>
        
        {tarotReader.personal_philosophy && (
          <>
            <h3>Моя философия работы</h3>
            <p className="philosophy">{tarotReader.personal_philosophy}</p>
          </>
        )}
      </section>
      
      {/* Секция обучения и сертификатов */}
      {tarotReader.courses_completed && tarotReader.courses_completed.length > 0 && (
        <section className="profile-section">
          <h2>Образование в нашей школе</h2>
          <div className="courses-list">
            {tarotReader.courses_completed.map((course, index) => (
              <div key={index} className="course-item">
                🎓 {course}
              </div>
            ))}
          </div>
        </section>
      )}
      
      {/* Секция с примерами работ */}
      {tarotReader.example_readings && (
        <section className="profile-section">
          <h2>Примеры моих раскладов</h2>
          <p className="examples">{tarotReader.example_readings}</p>
        </section>
      )}
      
      {/* Секция отзывов */}
      <section className="profile-section">
        <h2>Отзывы клиентов ({reviews.length})</h2>
        
        {reviews.length > 0 ? (
          <div className="reviews-list">
            {reviews.map((review, index) => (
              <div key={index} className="review-item">
                <div className="review-header">
                  <span className="review-author">{review.first_name || 'Клиент'}</span>
                  <span className="review-date">{formatReviewDate(review.created_at)}</span>
                </div>
                <div className="review-rating">{renderRatingStars(review.rating)}</div>
                <p className="review-comment">{review.comment}</p>
                
                {review.tarot_reader_response && (
                  <div className="tarot-reader-response">
                    <strong>Ответ таролога:</strong>
                    <p>{review.tarot_reader_response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="no-reviews">Пока нет отзывов. Будьте первым!</p>
        )}
      </section>
      
      {/* Кнопка записи на консультацию */}
      <div className="booking-section">
        <button 
          className="booking-button"
          onClick={() => setShowBookingModal(true)}
        >
          Записаться на консультацию
        </button>
      </div>
      
      {/* Модальное окно для записи */}
      {showBookingModal && (
        <div className="modal-overlay" onClick={() => setShowBookingModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Запись на консультацию</h2>
            
            {bookingStatus === 'idle' && (
              <>
                <p>Вы записываетесь к специалисту: <strong>{tarotReader.name}</strong></p>
                
                <div className="form-group">
                  <label>Выберите тему консультации:</label>
                  <select 
                    value={selectedTopic} 
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className="topic-select"
                  >
                    <option value="">Выберите тему...</option>
                    <option value="relationships">Отношения и любовь</option>
                    <option value="career">Карьера и финансы</option>
                    <option value="personal">Личностное развитие</option>
                    <option value="spiritual">Духовные вопросы</option>
                    <option value="general">Общий расклад</option>
                  </select>
                </div>
                
                <div className="booking-info">
                  <p>📱 После записи таролог свяжется с вами в Telegram</p>
                  <p>💰 Оплата производится напрямую специалисту</p>
                  <p>🔐 Вы получите код подтверждения для начала консультации</p>
                </div>
                
                <div className="modal-buttons">
                  <button 
                    className="confirm-button"
                    onClick={bookConsultation}
                    disabled={!selectedTopic}
                  >
                    Подтвердить запись
                  </button>
                  <button 
                    className="cancel-button"
                    onClick={() => setShowBookingModal(false)}
                  >
                    Отмена
                  </button>
                </div>
              </>
            )}
            
            {bookingStatus === 'booking' && (
              <div className="booking-loading">
                <div className="spinner">⏳</div>
                <p>Оформляем вашу запись...</p>
              </div>
            )}
            
            {bookingStatus === 'success' && (
              <div className="booking-success">
                <div className="success-icon">✅</div>
                <h3>Вы успешно записались!</h3>
                
                <div className="confirmation-code-block">
                  <p>Ваш код подтверждения:</p>
                  <div className="confirmation-code">{confirmationCode}</div>
                  <p className="code-hint">Сообщите этот код тарологу при начале консультации</p>
                </div>
                
                <p>Таролог свяжется с вами в ближайшее время через Telegram</p>
                
                {tarotReader.telegram_username && (
                  <button 
                    className="open-chat-button"
                    onClick={openTelegramChat}
                  >
                    Открыть чат с тарологом
                  </button>
                )}
                
                <button 
                  className="close-button"
                  onClick={() => {
                    setShowBookingModal(false);
                    setBookingStatus('idle');
                  }}
                >
                  Закрыть
                </button>
              </div>
            )}
            
            {bookingStatus === 'error' && (
              <div className="booking-error">
                <div className="error-icon">❌</div>
                <h3>Произошла ошибка</h3>
                <p>Не удалось оформить запись. Попробуйте позже или свяжитесь с поддержкой.</p>
                <button 
                  className="retry-button"
                  onClick={() => setBookingStatus('idle')}
                >
                  Попробовать снова
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TarotReaderProfile;