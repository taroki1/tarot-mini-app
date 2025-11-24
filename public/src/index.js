// public/src/index.js
// Точка входа в React приложение
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

// Инициализируем React приложение
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Если вы хотите отслеживать производительность приложения,
// передайте функцию для логирования результатов
// Например: reportWebVitals(console.log)
// или отправьте на аналитический endpoint
// Узнать больше: https://bit.ly/CRA-vitals
