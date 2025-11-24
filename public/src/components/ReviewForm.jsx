// public/src/components/ReviewForm.jsx
// Компонент для добавления отзыва о тарологе
import React, { useState } from 'react';
import './ReviewForm.css';

function ReviewForm({ consultationId, tarotReaderName, userData, onSuccess, onCancel }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Валидация формы
  const validateForm = () => {
    if (rating === 0) {
      setError('Пожалуйста, поставьте оценку');
      return false;
    }

    if (comment.trim().length < 50) {
      setError('Отзыв должен содержать минимум 50 символов');
      return false;
    }

    if (comment.trim().length > 1000) {
      setError('Отзыв должен содержать максимум 1000 символов');
      return false;
    }

    setError('');
    return true;
  };

  // Отправка отзыва
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      const reviewData = {
        consultation_id: consultationId,
        rating: rating,
        comment: comment.trim(),
        client_telegram_id: userData?.id || null
      };

      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reviewData)
      });

      if (response.ok) {
        const result = await response.json();

        // Показываем уведомление об успехе
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.showAlert('Спасибо за ваш отзыв! ✨');
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }

        // Вызываем callback для обновления списка отзывов
        if (onSuccess) {
          onSuccess(result);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось отправить отзыв');
      }
    } catch (error) {
      console.error('Ошибка при отправке отзыва:', error);
      setError(error.message);

      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showAlert('Ошибка при отправке отзыва. Попробуйте позже.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Рендер звезд для рейтинга
  const renderStarRating = () => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            className={`star ${star <= (hoveredRating || rating) ? 'active' : ''}`}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
          >
            {star <= (hoveredRating || rating) ? '⭐' : '☆'}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="review-form-container">
      <div className="review-form-header">
        <h2>Оставить отзыв</h2>
        <p>О работе специалиста: <strong>{tarotReaderName}</strong></p>
      </div>

      <form onSubmit={handleSubmit} className="review-form">
        {/* Блок с оценкой */}
        <div className="form-section">
          <label className="form-label">
            Ваша оценка <span className="required">*</span>
          </label>
          {renderStarRating()}
          {rating > 0 && (
            <p className="rating-text">
              {rating === 1 && 'Очень плохо'}
              {rating === 2 && 'Плохо'}
              {rating === 3 && 'Нормально'}
              {rating === 4 && 'Хорошо'}
              {rating === 5 && 'Отлично'}
            </p>
          )}
        </div>

        {/* Блок с текстом отзыва */}
        <div className="form-section">
          <label className="form-label">
            Ваш отзыв <span className="required">*</span>
          </label>
          <textarea
            className="review-textarea"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Расскажите о вашем опыте консультации. Что понравилось? Помогла ли консультация найти ответы на ваши вопросы?"
            rows={6}
            maxLength={1000}
          />
          <div className="character-count">
            {comment.length} / 1000 символов
            {comment.length < 50 && (
              <span className="hint"> (минимум 50)</span>
            )}
          </div>
        </div>

        {/* Сообщение об ошибке */}
        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {/* Информационный блок */}
        <div className="info-block">
          <p>
            💡 <strong>Важно:</strong> Отзывы проходят модерацию.
            Мы публикуем только честные и содержательные отзывы,
            которые помогут другим клиентам сделать выбор.
          </p>
        </div>

        {/* Кнопки */}
        <div className="form-buttons">
          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Отправка...' : 'Опубликовать отзыв'}
          </button>
          <button
            type="button"
            className="cancel-button"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}

export default ReviewForm;
