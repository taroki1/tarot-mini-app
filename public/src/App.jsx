// public/src/App.jsx
// Главный компонент нашего приложения - это как каркас здания
import React, { useState, useEffect } from 'react';
import './App.css';

// Компоненты для разных страниц приложения
import TarotReadersList from './components/TarotReadersList';
import TarotReaderProfile from './components/TarotReaderProfile';
import AdminPanel from './components/AdminPanel';
import BlogSection from './components/BlogSection';
import PromoBanner from './components/PromoBanner';

// Главный компонент приложения
function App() {
  // State - это память нашего приложения, здесь мы храним текущее состояние
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedTarotReader, setSelectedTarotReader] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [promoBanners, setPromoBanners] = useState([]);
  
  // useEffect - это код, который выполняется при загрузке приложения
  useEffect(() => {
    // Инициализация Telegram Web App
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      // Расширяем приложение на весь экран
      tg.expand();
      
      // Настраиваем цвета интерфейса под тему Telegram
      tg.setHeaderColor('#6B46C1'); // Фиолетовый цвет для шапки
      tg.setBackgroundColor('#F7F4FF'); // Светлый фон
      
      // Получаем данные пользователя из Telegram
      const user = tg.initDataUnsafe?.user;
      if (user) {
        setUserData({
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username
        });
        
        // Проверяем, является ли пользователь администратором
        checkAdminStatus(user.id);
      }
      
      // Настраиваем кнопку "Назад" в Telegram
      tg.BackButton.onClick(() => handleBackButton());
    }
    
    // Загружаем промо-баннеры
    loadPromoBanners();
  }, []);
  
  // Функция для проверки админских прав
  const checkAdminStatus = async (telegramId) => {
    try {
      // В реальном приложении здесь будет проверка через API
      // Для демо просто проверяем ID
      const adminIds = [123456789]; // Замените на реальные ID админов
      setIsAdmin(adminIds.includes(telegramId));
    } catch (error) {
      console.error('Ошибка при проверке статуса админа:', error);
    }
  };
  
  // Загрузка промо-баннеров с сервера
  const loadPromoBanners = async () => {
    try {
      const response = await fetch('/api/promo-banners');
      const banners = await response.json();
      setPromoBanners(banners);
    } catch (error) {
      console.error('Ошибка при загрузке баннеров:', error);
    }
  };
  
  // Обработка кнопки "Назад"
  const handleBackButton = () => {
    if (currentPage === 'tarot-reader-profile') {
      setCurrentPage('home');
      setSelectedTarotReader(null);
    } else if (currentPage === 'blog') {
      setCurrentPage('home');
    }
    
    // Скрываем кнопку "Назад" на главной странице
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      if (currentPage === 'home') {
        tg.BackButton.hide();
      }
    }
  };
  
  // Функция для перехода на страницу профиля таролога
  const openTarotReaderProfile = (tarotReader) => {
    setSelectedTarotReader(tarotReader);
    setCurrentPage('tarot-reader-profile');
    
    // Показываем кнопку "Назад" в Telegram
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.BackButton.show();
    }
  };
  
  // Рендерим разный контент в зависимости от текущей страницы
  const renderContent = () => {
    switch (currentPage) {
      case 'home':
        return (
          <>
            {/* Промо-баннер вверху страницы */}
            {promoBanners.length > 0 && (
              <PromoBanner banner={promoBanners[0]} />
            )}
            
            {/* Навигационные вкладки */}
            <div className="navigation-tabs">
              <button 
                className="tab-button active"
                onClick={() => setCurrentPage('home')}
              >
                🔮 Тарологи
              </button>
              <button 
                className="tab-button"
                onClick={() => setCurrentPage('blog')}
              >
                📚 Блог
              </button>
              {isAdmin && (
                <button 
                  className="tab-button"
                  onClick={() => setCurrentPage('admin')}
                >
                  ⚙️ Админ
                </button>
              )}
            </div>
            
            {/* Список тарологов */}
            <TarotReadersList 
              onSelectTarotReader={openTarotReaderProfile}
              userData={userData}
            />
          </>
        );
        
      case 'tarot-reader-profile':
        return (
          <TarotReaderProfile 
            tarotReader={selectedTarotReader}
            userData={userData}
            onBack={() => setCurrentPage('home')}
          />
        );
        
      case 'blog':
        return (
          <>
            <div className="navigation-tabs">
              <button 
                className="tab-button"
                onClick={() => setCurrentPage('home')}
              >
                🔮 Тарологи
              </button>
              <button 
                className="tab-button active"
                onClick={() => setCurrentPage('blog')}
              >
                📚 Блог
              </button>
              {isAdmin && (
                <button 
                  className="tab-button"
                  onClick={() => setCurrentPage('admin')}
                >
                  ⚙️ Админ
                </button>
              )}
            </div>
            <BlogSection />
          </>
        );
        
      case 'admin':
        return isAdmin ? (
          <AdminPanel onBack={() => setCurrentPage('home')} />
        ) : (
          <div className="access-denied">
            <h2>Доступ запрещен</h2>
            <p>У вас нет прав для просмотра этой страницы</p>
            <button onClick={() => setCurrentPage('home')}>
              Вернуться на главную
            </button>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="app">
      {/* Шапка приложения */}
      <header className="app-header">
        <h1>✨ Эксперты Таро нашей школы</h1>
        {userData && (
          <p className="welcome-text">
            Добро пожаловать, {userData.firstName}!
          </p>
        )}
      </header>
      
      {/* Основной контент */}
      <main className="app-content">
        {renderContent()}
      </main>
      
      {/* Футер с информацией о школе */}
      <footer className="app-footer">
        <p>© 2024 Ваша Школа Таро</p>
        <p className="footer-tagline">
          Обучаем • Поддерживаем • Продвигаем
        </p>
      </footer>
    </div>
  );
}

export default App;
