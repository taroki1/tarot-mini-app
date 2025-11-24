// public/src/components/BlogSection.jsx
// Компонент для отображения блога с образовательными статьями
import React, { useState, useEffect } from 'react';
import './BlogSection.css';

function BlogSection() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Загружаем статьи при монтировании компонента
  useEffect(() => {
    loadBlogPosts();
  }, []);

  // Функция загрузки статей с сервера
  const loadBlogPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/blog-posts');

      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Ошибка при загрузке статей:', error);
      setLoading(false);

      // Показываем уведомление об ошибке
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showAlert('Не удалось загрузить статьи блога');
      }
    }
  };

  // Функция для форматирования даты
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('ru-RU', options);
  };

  // Функция для подсчета времени чтения
  const calculateReadingTime = (content) => {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} мин чтения`;
  };

  // Фильтрация статей
  const getFilteredPosts = () => {
    let filtered = [...posts];

    // Фильтр по категории
    if (filter !== 'all') {
      filtered = filtered.filter(post =>
        post.category?.toLowerCase() === filter.toLowerCase()
      );
    }

    // Поиск по заголовку и контенту
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.excerpt?.toLowerCase().includes(query) ||
        post.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Показываем только опубликованные статьи
    filtered = filtered.filter(post => post.status === 'published');

    // Сортируем по дате публикации (новые первыми)
    filtered.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

    return filtered;
  };

  // Открытие статьи для чтения
  const openPost = (post) => {
    setSelectedPost(post);

    // Увеличиваем счетчик просмотров
    incrementPostViews(post.id);

    // Показываем кнопку "Назад" в Telegram
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.BackButton.show();
      window.Telegram.WebApp.BackButton.onClick(() => {
        setSelectedPost(null);
        window.Telegram.WebApp.BackButton.hide();
      });
    }
  };

  // Увеличение счетчика просмотров
  const incrementPostViews = async (postId) => {
    try {
      await fetch(`/api/blog-posts/${postId}/view`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Ошибка при отправке просмотра:', error);
    }
  };

  // Компонент карточки статьи
  const BlogPostCard = ({ post }) => (
    <div className="blog-post-card" onClick={() => openPost(post)}>
      {post.featured_image_url && (
        <div
          className="post-image"
          style={{ backgroundImage: `url(${post.featured_image_url})` }}
        />
      )}

      <div className="post-content">
        <div className="post-meta">
          <span className="post-category">{post.category || 'Общее'}</span>
          <span className="post-date">{formatDate(post.published_at)}</span>
        </div>

        <h3 className="post-title">{post.title}</h3>

        {post.excerpt && (
          <p className="post-excerpt">{post.excerpt}</p>
        )}

        <div className="post-footer">
          <div className="post-stats">
            <span className="views-count">👁️ {post.views_count || 0}</span>
            <span className="likes-count">💜 {post.likes_count || 0}</span>
          </div>
          <span className="reading-time">
            {calculateReadingTime(post.content)}
          </span>
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="post-tags">
            {post.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="tag">#{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Если открыта конкретная статья, показываем её
  if (selectedPost) {
    return (
      <div className="blog-post-view">
        <button
          className="back-button"
          onClick={() => setSelectedPost(null)}
        >
          ← Назад к статьям
        </button>

        {selectedPost.featured_image_url && (
          <img
            src={selectedPost.featured_image_url}
            alt={selectedPost.title}
            className="post-full-image"
          />
        )}

        <article className="post-article">
          <div className="post-header">
            <span className="post-category">{selectedPost.category}</span>
            <h1 className="post-full-title">{selectedPost.title}</h1>

            <div className="post-meta-info">
              <span className="author-name">
                ✍️ {selectedPost.author_name || 'Школа Таро'}
              </span>
              <span className="publish-date">
                📅 {formatDate(selectedPost.published_at)}
              </span>
              <span className="reading-time">
                ⏱️ {calculateReadingTime(selectedPost.content)}
              </span>
            </div>
          </div>

          <div
            className="post-body"
            dangerouslySetInnerHTML={{ __html: selectedPost.content }}
          />

          {selectedPost.tags && selectedPost.tags.length > 0 && (
            <div className="post-full-tags">
              <strong>Теги:</strong>
              {selectedPost.tags.map((tag, index) => (
                <span key={index} className="tag">#{tag}</span>
              ))}
            </div>
          )}
        </article>
      </div>
    );
  }

  // Показываем список статей
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">⏳</div>
        <p>Загружаем статьи...</p>
      </div>
    );
  }

  const filteredPosts = getFilteredPosts();

  return (
    <div className="blog-section">
      <div className="blog-header">
        <h1>📚 Блог о Таро</h1>
        <p className="blog-subtitle">
          Полезные статьи, советы и истории от наших экспертов
        </p>
      </div>

      {/* Панель поиска и фильтров */}
      <div className="blog-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Поиск статей..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="category-filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Все статьи
          </button>
          <button
            className={`filter-btn ${filter === 'обучение' ? 'active' : ''}`}
            onClick={() => setFilter('обучение')}
          >
            📖 Обучение
          </button>
          <button
            className={`filter-btn ${filter === 'практика' ? 'active' : ''}`}
            onClick={() => setFilter('практика')}
          >
            🔮 Практика
          </button>
          <button
            className={`filter-btn ${filter === 'истории' ? 'active' : ''}`}
            onClick={() => setFilter('истории')}
          >
            ✨ Истории
          </button>
        </div>
      </div>

      {/* Счетчик найденных статей */}
      <div className="results-count">
        Найдено статей: <strong>{filteredPosts.length}</strong>
      </div>

      {/* Сетка статей */}
      {filteredPosts.length > 0 ? (
        <div className="blog-posts-grid">
          {filteredPosts.map(post => (
            <BlogPostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="no-posts">
          <p>😔 Статьи не найдены</p>
          <button
            onClick={() => {
              setFilter('all');
              setSearchQuery('');
            }}
            className="reset-btn"
          >
            Сбросить фильтры
          </button>
        </div>
      )}
    </div>
  );
}

export default BlogSection;
