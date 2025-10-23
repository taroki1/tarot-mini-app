// public/src/components/TarotReadersList.jsx
// Компонент для отображения списка всех тарологов с возможностью фильтрации
import React, { useState, useEffect } from 'react';
import './TarotReadersList.css';

function TarotReadersList({ onSelectTarotReader, userData }) {
  // Состояния компонента - это его "память" о текущей ситуации
  const [tarotReaders, setTarotReaders] = useState([]);
  const [filteredReaders, setFilteredReaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, relationships, career, spiritual
  const [sortBy, setSortBy] = useState('rating'); // rating, price-low, price-high
  const [featuredReader, setFeaturedReader] = useState(null);
  
  // Загружаем список тарологов при монтировании компонента
  useEffect(() => {
    loadTarotReaders();
  }, []);
  
  // Применяем фильтры при изменении списка или параметров фильтрации
  useEffect(() => {
    applyFilters();
  }, [tarotReaders, filter, sortBy]);
  
  // Функция загрузки тарологов с сервера
  const loadTarotReaders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tarot-readers');
      const data = await response.json();
      
      // Выделяем "Таролога недели" если он есть
      const featured = data.find(reader => reader.is_featured);
      if (featured) {
        setFeaturedReader(featured);
      }
      
      setTarotReaders(data);
      setLoading(false);
    } catch (error) {
      console.error('Ошибка при загрузке тарологов:', error);
      setLoading(false);
      
      // Показываем уведомление об ошибке
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showAlert('Не удалось загрузить список специалистов. Попробуйте позже.');
      }
    }
  };
  
  // Применение фильтров и сортировки
  const applyFilters = () => {
    let filtered = [...tarotReaders];
    
    // Фильтрация по специализации
    if (filter !== 'all') {
      filtered = filtered.filter(reader => {
        const specialization = reader.specialization?.toLowerCase();
        switch (filter) {
          case 'relationships':
            return specialization?.includes('отношения');
          case 'career':
            return specialization?.includes('карьера') || specialization?.includes('работа');
          case 'spiritual':
            return specialization?.includes('духов') || specialization?.includes('развитие');
          default:
            return true;
        }
      });
    }
    
    // Сортировка
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          // Сначала показываем тарологов с высоким рейтингом
          return (b.average_rating || 0) - (a.average_rating || 0);
          
        case 'price-low':
          // Сортировка по цене (от меньшей к большей)
          const priceA = extractMinPrice(a.price_range);
          const priceB = extractMinPrice(b.price_range);
          return priceA - priceB;
          
        case 'price-high':
          // Сортировка по цене (от большей к меньшей)
          const priceA2 = extractMaxPrice(a.price_range);
          const priceB2 = extractMaxPrice(b.price_range);
          return priceB2 - priceA2;
          
        default:
          return 0;
      }
    });
    
    setFilteredReaders(filtered);
  };
  
  // Вспомогательные функции для извлечения цен из строки
  const extractMinPrice = (priceRange) => {
    if (!priceRange) return 0;
    const match = priceRange.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  };
  
  const extractMaxPrice = (priceRange) => {
    if (!priceRange) return 0;
    const matches = priceRange.match(/\d+/g);
    return matches ? parseInt(matches[matches.length - 1]) : 0;
  };
  
  // Функция для форматирования рейтинга звездами
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);
    const hasHalfStar = (rating % 1) >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push('⭐');
    }
    if (hasHalfStar && fullStars < 5) {
      stars.push('✨');
    }
    
    return stars.join('') || 'Новый специалист';
  };
  
  // Функция для отображения карточки таролога
  const TarotReaderCard = ({ reader, isFeatured = false }) => (
    <div 
      className={`tarot-reader-card ${isFeatured ? 'featured' : ''}`}
      onClick={() => onSelectTarotReader(reader)}
    >
      {isFeatured && (
        <div className="featured-badge">
          🌟 Таролог недели
        </div>
      )}
      
      <div className="reader-header">
        {reader.photo_url ? (
          <img 
            src={reader.photo_url} 
            alt={reader.name}
            className="reader-photo"
          />
        ) : (
          <div className="reader-photo-placeholder">
            {reader.name.charAt(0).toUpperCase()}
          </div>
        )}
        
        <div className="reader-info">
          <h3 className="reader-name">{reader.name}</h3>
          <p className="reader-specialization">{reader.specialization}</p>
          
          <div className="reader-stats">
            <span className="reader-rating">
              {renderStars(reader.average_rating)}
            </span>
            {reader.total_consultations > 0 && (
              <span className="consultations-count">
                {reader.total_consultations} консультаций
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="reader-body">
        <p className="reader-description">
          {reader.description?.length > 150 
            ? reader.description.substring(0, 150) + '...'
            : reader.description
          }
        </p>
        
        {reader.courses_completed && reader.courses_completed.length > 0 && (
          <div className="courses-badges">
            {reader.courses_completed.slice(0, 3).map((course, index) => (
              <span key={index} className="course-badge">
                🎓 {course}
              </span>
            ))}
            {reader.courses_completed.length > 3 && (
              <span className="course-badge more">
                +{reader.courses_completed.length - 3}
              </span>
            )}
          </div>
        )}
        
        <div className="reader-footer">
          <span className="reader-price">
            💰 {reader.price_range || 'Цена по запросу'}
          </span>
          <button className="select-button">
            Выбрать →
          </button>
        </div>
      </div>
    </div>
  );
  
  // Если идет загрузка, показываем индикатор
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">⏳</div>
        <p>Загружаем экспертов...</p>
      </div>
    );
  }
  
  return (
    <div className="tarot-readers-list">
      {/* Блок с "Тарологом недели" если есть */}
      {featuredReader && (
        <div className="featured-section">
          <h2>✨ Рекомендуем</h2>
          <TarotReaderCard reader={featuredReader} isFeatured={true} />
        </div>
      )}
      
      {/* Панель фильтров */}
      <div className="filters-panel">
        <div className="filter-group">
          <label>Специализация:</label>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Все направления</option>
            <option value="relationships">❤️ Отношения</option>
            <option value="career">💼 Карьера и финансы</option>
            <option value="spiritual">🔮 Духовное развитие</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Сортировка:</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="rating">⭐ По рейтингу</option>
            <option value="price-low">💰 Сначала недорогие</option>
            <option value="price-high">💎 Сначала премиум</option>
          </select>
        </div>
      </div>
      
      {/* Статистика */}
      <div className="readers-stats">
        <p>
          Найдено специалистов: <strong>{filteredReaders.length}</strong>
        </p>
      </div>
      
      {/* Список тарологов */}
      <div className="readers-grid">
        {filteredReaders.length > 0 ? (
          filteredReaders
            .filter(reader => reader.id !== featuredReader?.id) // Исключаем featured из общего списка
            .map(reader => (
              <TarotReaderCard key={reader.id} reader={reader} />
            ))
        ) : (
          <div className="no-results">
            <p>😔 Не найдено специалистов по выбранным критериям</p>
            <button onClick={() => setFilter('all')} className="reset-filters-btn">
              Сбросить фильтры
            </button>
          </div>
        )}
      </div>
      
      {/* Информационный блок внизу */}
      <div className="info-block">
        <h3>💜 Почему наши тарологи особенные?</h3>
        <p>
          Все специалисты прошли обучение в нашей школе и регулярно повышают квалификацию. 
          Мы гарантируем профессиональный подход и этичную работу с вашими запросами.
        </p>
      </div>
    </div>
  );
}

export default TarotReadersList;
