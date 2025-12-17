import React from 'react';
import { createRoot } from 'react-dom/client';
import TarotApp from './App';
import './App.css';

// Инициализация Telegram Web App
if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
    <React.StrictMode>
        <TarotApp />
    </React.StrictMode>
);
