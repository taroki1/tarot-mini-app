// public/src/App.jsx
// Tarot Daily Card - Main App Component
// Provides daily AI-generated Tarot readings

import React, { useState, useEffect } from 'react';
import './App.css';

// Components
import DailyCard from './components/DailyCard';
import AdminPanel from './components/AdminPanel';

// Main App Component
function App() {
  // Application State
  const [currentPage, setCurrentPage] = useState('home');
  const [userData, setUserData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [todayGeneration, setTodayGeneration] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize Telegram Web App on mount
  useEffect(() => {
    initTelegramWebApp();
  }, []);

  // Initialize Telegram Web App
  const initTelegramWebApp = async () => {
    try {
      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;

        // Expand to full screen
        tg.expand();

        // Set theme colors - Gold theme
        tg.setHeaderColor('#C9A227');
        tg.setBackgroundColor('#FDF8F0');

        // Get user data from Telegram
        const user = tg.initDataUnsafe?.user;
        if (user) {
          const userInfo = {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            username: user.username
          };
          setUserData(userInfo);

          // Register/update user and check for existing generation
          await registerUser(userInfo);
          await checkTodayGeneration(user.id);

          // Check admin status
          checkAdminStatus(user.id);
        } else {
          // Development mode - use test user
          const testUser = {
            id: 123456789,
            firstName: 'Test',
            lastName: 'User',
            username: 'testuser'
          };
          setUserData(testUser);
          await checkTodayGeneration(testUser.id);
        }

        // Setup back button handler
        tg.BackButton.onClick(() => handleBackButton());
      } else {
        // Development mode without Telegram
        const testUser = {
          id: 123456789,
          firstName: 'Test',
          lastName: 'User',
          username: 'testuser'
        };
        setUserData(testUser);
        await checkTodayGeneration(testUser.id);
      }
    } catch (err) {
      console.error('Initialization error:', err);
      setError('Failed to initialize app');
    } finally {
      setIsLoading(false);
    }
  };

  // Register user in database
  const registerUser = async (user) => {
    try {
      await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: user.id,
          first_name: user.firstName,
          last_name: user.lastName,
          username: user.username
        })
      });
    } catch (err) {
      console.error('Failed to register user:', err);
    }
  };

  // Check if user already has a generation for today
  const checkTodayGeneration = async (telegramId) => {
    try {
      const response = await fetch(`/api/generations/today/${telegramId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.generation) {
          setTodayGeneration(data.generation);
        }
      }
    } catch (err) {
      console.error('Failed to check today generation:', err);
    }
  };

  // Check if user is admin
  const checkAdminStatus = async (telegramId) => {
    try {
      const response = await fetch(`/api/admin/check/${telegramId}`);
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.isAdmin);
      }
    } catch (err) {
      console.error('Failed to check admin status:', err);
    }
  };

  // Handle back button
  const handleBackButton = () => {
    if (currentPage !== 'home') {
      setCurrentPage('home');
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.BackButton.hide();
      }
    }
  };

  // Navigate to page
  const navigateTo = (page) => {
    setCurrentPage(page);
    if (page !== 'home' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.BackButton.show();
    }
  };

  // Handle new generation
  const handleNewGeneration = (generation) => {
    setTodayGeneration(generation);

    // Haptic feedback
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
  };

  // Render page content
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="loading-container">
          <div className="loading-card">
            <div className="button-spinner" style={{ width: 40, height: 40 }}></div>
          </div>
          <div className="loading-text">
            Loading your destiny...
            <span>Please wait</span>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error-message">
          {error}
        </div>
      );
    }

    switch (currentPage) {
      case 'home':
        return (
          <DailyCard
            userData={userData}
            todayGeneration={todayGeneration}
            onNewGeneration={handleNewGeneration}
          />
        );

      case 'admin':
        return isAdmin ? (
          <AdminPanel onBack={() => navigateTo('home')} />
        ) : (
          <div className="error-message">
            Access denied. Admin privileges required.
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <h1>Tarot Card of the Day</h1>
        {userData && (
          <p className="welcome-text">
            Hello, {userData.firstName}!
          </p>
        )}
      </header>

      {/* Navigation (only show if admin) */}
      {isAdmin && (
        <div className="navigation-tabs">
          <button
            className={`tab-button ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => navigateTo('home')}
          >
            Daily Card
          </button>
          <button
            className={`tab-button ${currentPage === 'admin' ? 'active' : ''}`}
            onClick={() => navigateTo('admin')}
          >
            Admin
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="app-content">
        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>Tarot Daily Card</p>
        <p className="footer-tagline">
          Discover your path each day
        </p>
      </footer>
    </div>
  );
}

export default App;
