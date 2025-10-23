// public/src/components/AdminPanel.jsx
// Админ-панель - командный центр вашего приложения
import React, { useState, useEffect } from 'react';
import './AdminPanel.css';

function AdminPanel({ onBack }) {
  // Состояния для управления различными разделами админки
  const [activeSection, setActiveSection] = useState('dashboard');
  const [statistics, setStatistics] = useState(null);
  const [tarotReaders, setTarotReaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [authToken, setAuthToken] = useState(localStorage.getItem('adminToken'));
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  
  // Состояние для формы добавления нового таролога
  const [newTarotReader, setNewTarotReader] = useState({
    name: '',
    description: '',
    specialization: '',
    price_range: '',
    telegram_username: '',
    telegram_id: '',
    photo_url: '',
    courses_completed: '',
    personal_philosophy: '',
    is_featured: false
  });
  
  // Проверяем авторизацию при загрузке компонента
  useEffect(() => {
    if (authToken) {
      loadStatistics();
      loadTarotReaders();
    }
  }, [authToken]);
  
  // Функция авторизации администратора
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginForm)
      });
      
      if (response.ok) {
        const { token } = await response.json();
        localStorage.setItem('adminToken', token);
        setAuthToken(token);
        
        // Показываем уведомление об успешном входе
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.showAlert('Вы успешно вошли в админ-панель!');
        }
      } else {
        throw new Error('Неверные учетные данные');
      }
    } catch (error) {
      console.error('Ошибка авторизации:', error);
      alert('Ошибка входа. Проверьте логин и пароль.');
    }
  };
  
  // Загрузка статистики
  const loadStatistics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/statistics', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
      setLoading(false);
    }
  };
  
  // Загрузка списка тарологов
  const loadTarotReaders = async () => {
    try {
      const response = await fetch('/api/tarot-readers');
      if (response.ok) {
        const data = await response.json();
        setTarotReaders(data);
      }
    } catch (error) {
      console.error('Ошибка загрузки тарологов:', error);
    }
  };
  
  // Добавление нового таролога
  const handleAddTarotReader = async (e) => {
    e.preventDefault();
    try {
      // Преобразуем строку с курсами в массив
      const coursesArray = newTarotReader.courses_completed
        .split(',')
        .map(course => course.trim())
        .filter(course => course);
      
      const tarotReaderData = {
        ...newTarotReader,
        courses_completed: coursesArray,
        telegram_id: newTarotReader.telegram_id ? parseInt(newTarotReader.telegram_id) : null
      };
      
      const response = await fetch('/api/admin/tarot-readers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(tarotReaderData)
      });
      
      if (response.ok) {
        alert('Таролог успешно добавлен!');
        setNewTarotReader({
          name: '',
          description: '',
          specialization: '',
          price_range: '',
          telegram_username: '',
          telegram_id: '',
          photo_url: '',
          courses_completed: '',
          personal_philosophy: '',
          is_featured: false
        });
        loadTarotReaders();
        setActiveSection('dashboard');
      } else {
        throw new Error('Ошибка при добавлении таролога');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Не удалось добавить таролога. Проверьте данные и попробуйте снова.');
    }
  };
  
  // Переключение статуса "Таролог недели"
  const toggleFeaturedStatus = async (tarotReaderId, currentStatus) => {
    try {
      const response = await fetch(`/api/admin/tarot-readers/${tarotReaderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ is_featured: !currentStatus })
      });
      
      if (response.ok) {
        loadTarotReaders();
        alert(currentStatus ? 'Статус "Таролог недели" снят' : 'Назначен "Тарологом недели"!');
      }
    } catch (error) {
      console.error('Ошибка изменения статуса:', error);
    }
  };
  
  // Выход из админ-панели
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setAuthToken(null);
    setStatistics(null);
    setTarotReaders([]);
  };
  
  // Если не авторизован, показываем форму входа
  if (!authToken) {
    return (
      <div className="admin-login">
        <button className="back-button" onClick={onBack}>
          ← Назад
        </button>
        
        <div className="login-container">
          <h2>Вход в админ-панель</h2>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Логин:</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Пароль:</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                required
              />
            </div>
            
            <button type="submit" className="login-button">
              Войти
            </button>
          </form>
        </div>
      </div>
    );
  }
  
  // Рендер различных разделов админ-панели
  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="dashboard">
            <h2>📊 Статистика приложения</h2>
            
            {statistics ? (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{statistics.general.total_readers}</div>
                    <div className="stat-label">Активных тарологов</div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-value">{statistics.general.total_consultations}</div>
                    <div className="stat-label">Всего консультаций</div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-value">{statistics.general.weekly_consultations}</div>
                    <div className="stat-label">Консультаций за неделю</div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-value">
                      {statistics.general.average_rating 
                        ? statistics.general.average_rating.toFixed(1) 
                        : '—'}
                    </div>
                    <div className="stat-label">Средний рейтинг</div>
                  </div>
                </div>
                
                <div className="top-readers">
                  <h3>🏆 Топ тарологов по количеству консультаций</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Имя</th>
                        <th>Консультаций</th>
                        <th>Рейтинг</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statistics.top_readers.map((reader, index) => (
                        <tr key={index}>
                          <td>{reader.name}</td>
                          <td>{reader.consultations_count}</td>
                          <td>
                            {reader.average_rating 
                              ? `⭐ ${reader.average_rating.toFixed(1)}` 
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="loading">Загрузка статистики...</div>
            )}
          </div>
        );
        
      case 'tarot-readers':
        return (
          <div className="tarot-readers-management">
            <h2>👥 Управление тарологами</h2>
            
            <div className="readers-list">
              {tarotReaders.map(reader => (
                <div key={reader.id} className="reader-admin-card">
                  <div className="reader-info">
                    <h3>{reader.name}</h3>
                    <p>{reader.specialization}</p>
                    <p>Консультаций: {reader.total_consultations}</p>
                    <p>Рейтинг: {reader.average_rating?.toFixed(1) || '—'}</p>
                  </div>
                  
                  <div className="reader-actions">
                    <button
                      className={`featured-toggle ${reader.is_featured ? 'active' : ''}`}
                      onClick={() => toggleFeaturedStatus(reader.id, reader.is_featured)}
                    >
                      {reader.is_featured ? '⭐ Таролог недели' : '☆ Назначить'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
        
      case 'add-reader':
        return (
          <div className="add-reader-form">
            <h2>➕ Добавить нового таролога</h2>
            
            <form onSubmit={handleAddTarotReader}>
              <div className="form-group">
                <label>Имя *</label>
                <input
                  type="text"
                  value={newTarotReader.name}
                  onChange={(e) => setNewTarotReader({...newTarotReader, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Описание *</label>
                <textarea
                  value={newTarotReader.description}
                  onChange={(e) => setNewTarotReader({...newTarotReader, description: e.target.value})}
                  rows="4"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Специализация *</label>
                <select
                  value={newTarotReader.specialization}
                  onChange={(e) => setNewTarotReader({...newTarotReader, specialization: e.target.value})}
                  required
                >
                  <option value="">Выберите специализацию</option>
                  <option value="Отношения и любовь">Отношения и любовь</option>
                  <option value="Карьера и финансы">Карьера и финансы</option>
                  <option value="Духовное развитие">Духовное развитие</option>
                  <option value="Общая практика">Общая практика</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Ценовой диапазон *</label>
                <input
                  type="text"
                  value={newTarotReader.price_range}
                  onChange={(e) => setNewTarotReader({...newTarotReader, price_range: e.target.value})}
                  placeholder="Например: 1500-3000 руб"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Telegram username (без @)</label>
                <input
                  type="text"
                  value={newTarotReader.telegram_username}
                  onChange={(e) => setNewTarotReader({...newTarotReader, telegram_username: e.target.value})}
                  placeholder="username"
                />
              </div>
              
              <div className="form-group">
                <label>Telegram ID (для уведомлений)</label>
                <input
                  type="text"
                  value={newTarotReader.telegram_id}
                  onChange={(e) => setNewTarotReader({...newTarotReader, telegram_id: e.target.value})}
                  placeholder="123456789"
                />
              </div>
              
              <div className="form-group">
                <label>URL фотографии</label>
                <input
                  type="text"
                  value={newTarotReader.photo_url}
                  onChange={(e) => setNewTarotReader({...newTarotReader, photo_url: e.target.value})}
                  placeholder="https://..."
                />
              </div>
              
              <div className="form-group">
                <label>Пройденные курсы (через запятую)</label>
                <input
                  type="text"
                  value={newTarotReader.courses_completed}
                  onChange={(e) => setNewTarotReader({...newTarotReader, courses_completed: e.target.value})}
                  placeholder="Базовый курс Таро, Расклады на отношения"
                />
              </div>
              
              <div className="form-group">
                <label>Философия работы</label>
                <textarea
                  value={newTarotReader.personal_philosophy}
                  onChange={(e) => setNewTarotReader({...newTarotReader, personal_philosophy: e.target.value})}
                  rows="3"
                />
              </div>
              
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={newTarotReader.is_featured}
                    onChange={(e) => setNewTarotReader({...newTarotReader, is_featured: e.target.checked})}
                  />
                  Назначить "Тарологом недели"
                </label>
              </div>
              
              <button type="submit" className="submit-button">
                Добавить таролога
              </button>
            </form>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="admin-panel">
      <div className="admin-header">
        <button className="back-button" onClick={onBack}>
          ← Назад
        </button>
        <h1>Админ-панель</h1>
        <button className="logout-button" onClick={handleLogout}>
          Выйти
        </button>
      </div>
      
      <div className="admin-navigation">
        <button
          className={activeSection === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveSection('dashboard')}
        >
          📊 Статистика
        </button>
        <button
          className={activeSection === 'tarot-readers' ? 'active' : ''}
          onClick={() => setActiveSection('tarot-readers')}
        >
          👥 Тарологи
        </button>
        <button
          className={activeSection === 'add-reader' ? 'active' : ''}
          onClick={() => setActiveSection('add-reader')}
        >
          ➕ Добавить
        </button>
      </div>
      
      <div className="admin-content">
        {renderContent()}
      </div>
    </div>
  );
}

export default AdminPanel;