// public/src/components/PromoBanner.jsx
// Компонент для отображения рекламных баннеров школы
import React from 'react';
import './PromoBanner.css';

function PromoBanner({ banner }) {
  if (!banner || !banner.is_active) {
    return null;
  }

  // Проверяем, не истек ли срок показа баннера
  if (banner.end_date && new Date(banner.end_date) < new Date()) {
    return null;
  }

  // Функция для открытия ссылки баннера
  const handleClick = () => {
    if (banner.link_url) {
      // Увеличиваем счетчик кликов (в реальном приложении - отправляем на backend)
      incrementBannerClicks(banner.id);

      // Открываем ссылку
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.openLink(banner.link_url);
      } else {
        window.open(banner.link_url, '_blank');
      }
    }
  };

  // Функция для увеличения счетчика кликов
  const incrementBannerClicks = async (bannerId) => {
    try {
      await fetch(`/api/promo-banners/${bannerId}/click`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Ошибка при отправке клика:', error);
    }
  };

  return (
    <div className={`promo-banner position-${banner.position || 'top'}`}>
      <div className="banner-content">
        {banner.image_url && (
          <div className="banner-image">
            <img src={banner.image_url} alt={banner.title} />
          </div>
        )}

        <div className="banner-text">
          <h2 className="banner-title">{banner.title}</h2>
          {banner.description && (
            <p className="banner-description">{banner.description}</p>
          )}

          {banner.button_text && banner.link_url && (
            <button
              className="banner-button"
              onClick={handleClick}
            >
              {banner.button_text}
            </button>
          )}
        </div>
      </div>

      {/* Индикатор приоритета (для админа) */}
      {banner.priority > 50 && (
        <div className="priority-badge">
          ⭐ VIP
        </div>
      )}
    </div>
  );
}

export default PromoBanner;
