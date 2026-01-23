// public/src/components/AdminPanel.jsx
// Admin Panel for managing users, generations, and expert context

import React, { useState, useEffect } from 'react';

function AdminPanel({ onBack }) {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState(localStorage.getItem('adminToken'));

  // Login form state
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // Admin data state
  const [activeTab, setActiveTab] = useState('statistics');
  const [statistics, setStatistics] = useState(null);
  const [users, setUsers] = useState([]);
  const [generations, setGenerations] = useState([]);
  const [expertContexts, setExpertContexts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Edit modal state
  const [editModal, setEditModal] = useState({ open: false, generation: null });
  const [editForm, setEditForm] = useState({});

  // Add context modal
  const [addContextModal, setAddContextModal] = useState(false);
  const [newContext, setNewContext] = useState({
    title: '',
    content_text: '',
    category: 'general',
    source_url: ''
  });

  // Check authentication on mount
  useEffect(() => {
    if (authToken) {
      verifyToken();
    }
  }, []);

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, activeTab]);

  // Verify token
  const verifyToken = async () => {
    try {
      const response = await fetch('/api/admin/verify', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('adminToken');
        setAuthToken(null);
      }
    } catch (err) {
      console.error('Token verification failed:', err);
    }
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('adminToken', data.token);
        setAuthToken(data.token);
        setIsAuthenticated(true);
      } else {
        setLoginError(data.error || 'Login failed');
      }
    } catch (err) {
      setLoginError('Connection error');
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setAuthToken(null);
    setIsAuthenticated(false);
  };

  // Load data based on active tab
  const loadData = async () => {
    setIsLoading(true);
    try {
      switch (activeTab) {
        case 'statistics':
          await loadStatistics();
          break;
        case 'users':
          await loadUsers();
          break;
        case 'generations':
          await loadGenerations();
          break;
        case 'expert':
          await loadExpertContexts();
          break;
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load statistics
  const loadStatistics = async () => {
    const response = await fetch('/api/admin/statistics', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (response.ok) {
      const data = await response.json();
      setStatistics(data);
    }
  };

  // Load users
  const loadUsers = async () => {
    const response = await fetch('/api/admin/users', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (response.ok) {
      const data = await response.json();
      setUsers(data);
    }
  };

  // Load generations
  const loadGenerations = async () => {
    const response = await fetch('/api/admin/generations', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (response.ok) {
      const data = await response.json();
      setGenerations(data);
    }
  };

  // Load expert contexts
  const loadExpertContexts = async () => {
    const response = await fetch('/api/admin/expert-context', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (response.ok) {
      const data = await response.json();
      setExpertContexts(data);
    }
  };

  // Edit generation
  const handleEditGeneration = (generation) => {
    setEditForm({
      general_energy: generation.text_content?.general_energy || '',
      love_relationships: generation.text_content?.love_relationships || '',
      career_finance: generation.text_content?.career_finance || '',
      expert_advice: generation.text_content?.expert_advice || '',
      image_url: generation.image_url || ''
    });
    setEditModal({ open: true, generation });
  };

  // Save generation edit
  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`/api/admin/generations/${editModal.generation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          text_content: {
            general_energy: editForm.general_energy,
            love_relationships: editForm.love_relationships,
            career_finance: editForm.career_finance,
            expert_advice: editForm.expert_advice
          },
          image_url: editForm.image_url
        })
      });

      if (response.ok) {
        setEditModal({ open: false, generation: null });
        loadGenerations();
      }
    } catch (err) {
      console.error('Failed to save edit:', err);
    }
  };

  // Add expert context
  const handleAddContext = async () => {
    try {
      const response = await fetch('/api/admin/expert-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(newContext)
      });

      if (response.ok) {
        setAddContextModal(false);
        setNewContext({ title: '', content_text: '', category: 'general', source_url: '' });
        loadExpertContexts();
      }
    } catch (err) {
      console.error('Failed to add context:', err);
    }
  };

  // Delete expert context
  const handleDeleteContext = async (id) => {
    if (!confirm('Are you sure you want to delete this context?')) return;

    try {
      const response = await fetch(`/api/admin/expert-context/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        loadExpertContexts();
      }
    } catch (err) {
      console.error('Failed to delete context:', err);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Render login form
  if (!isAuthenticated) {
    return (
      <div className="login-form">
        <h2>Admin Login</h2>
        {loginError && <div className="error-message">{loginError}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={loginForm.username}
              onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="login-button">Login</button>
        </form>
      </div>
    );
  }

  // Render admin panel
  return (
    <div className="admin-panel">
      {/* Header */}
      <div className="admin-header">
        <h2>Admin Dashboard</h2>
        <button onClick={handleLogout} style={{
          background: 'none',
          border: '1px solid #ccc',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          cursor: 'pointer'
        }}>
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('statistics')}
        >
          Statistics
        </button>
        <button
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={`admin-tab ${activeTab === 'generations' ? 'active' : ''}`}
          onClick={() => setActiveTab('generations')}
        >
          Generations
        </button>
        <button
          className={`admin-tab ${activeTab === 'expert' ? 'active' : ''}`}
          onClick={() => setActiveTab('expert')}
        >
          Expert Context
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="button-spinner" style={{ width: 30, height: 30, margin: '0 auto' }}></div>
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'statistics' && !isLoading && statistics && (
        <div className="admin-section">
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="value">{statistics.total_users || 0}</div>
              <div className="label">Total Users</div>
            </div>
            <div className="admin-stat-card">
              <div className="value">{statistics.total_generations || 0}</div>
              <div className="label">Total Generations</div>
            </div>
            <div className="admin-stat-card">
              <div className="value">{statistics.today_generations || 0}</div>
              <div className="label">Today's Generations</div>
            </div>
            <div className="admin-stat-card">
              <div className="value">{statistics.total_shares || 0}</div>
              <div className="label">Total Shares</div>
            </div>
          </div>

          <h3 style={{ marginBottom: '1rem', color: '#666' }}>Top Cards Today</h3>
          {statistics.top_cards?.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Card</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {statistics.top_cards.map((card, idx) => (
                  <tr key={idx}>
                    <td>{card.card_name}</td>
                    <td>{card.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#999' }}>No data available</p>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && !isLoading && (
        <div className="admin-section">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Telegram ID</th>
                <th>Generations</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.first_name} {user.last_name}</td>
                  <td>{user.telegram_id}</td>
                  <td>{user.total_generations}</td>
                  <td>{formatDate(user.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p style={{ textAlign: 'center', color: '#999', padding: '1rem' }}>No users found</p>
          )}
        </div>
      )}

      {/* Generations Tab */}
      {activeTab === 'generations' && !isLoading && (
        <div className="admin-section">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Card</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {generations.map(gen => (
                <tr key={gen.id}>
                  <td>{gen.first_name || 'Unknown'}</td>
                  <td>
                    {gen.card_name}
                    {gen.is_edited && <span style={{ color: '#999', marginLeft: '4px' }}>(edited)</span>}
                  </td>
                  <td>{formatDate(gen.date_generated)}</td>
                  <td>
                    <button
                      onClick={() => handleEditGeneration(gen)}
                      style={{
                        background: 'var(--gradient-gold)',
                        border: 'none',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {generations.length === 0 && (
            <p style={{ textAlign: 'center', color: '#999', padding: '1rem' }}>No generations found</p>
          )}
        </div>
      )}

      {/* Expert Context Tab */}
      {activeTab === 'expert' && !isLoading && (
        <div className="admin-section">
          <button
            onClick={() => setAddContextModal(true)}
            style={{
              background: 'var(--gradient-gold)',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '10px',
              marginBottom: '1rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            + Add Context
          </button>

          {expertContexts.map(ctx => (
            <div key={ctx.id} style={{
              background: '#f9f9f9',
              padding: '1rem',
              borderRadius: '10px',
              marginBottom: '0.75rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: 0, color: '#333' }}>{ctx.title}</h4>
                  <span className={`badge ${ctx.category}`} style={{ marginTop: '0.25rem' }}>
                    {ctx.category}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteContext(ctx.id)}
                  style={{
                    background: '#fee',
                    border: '1px solid #fcc',
                    color: '#c00',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              </div>
              <p style={{
                marginTop: '0.5rem',
                fontSize: '0.85rem',
                color: '#666',
                maxHeight: '60px',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {ctx.content_text.substring(0, 200)}...
              </p>
            </div>
          ))}

          {expertContexts.length === 0 && (
            <p style={{ textAlign: 'center', color: '#999', padding: '1rem' }}>
              No expert context added yet. Add transcripts to personalize AI interpretations.
            </p>
          )}
        </div>
      )}

      {/* Edit Generation Modal */}
      {editModal.open && (
        <div className="modal-overlay" onClick={() => setEditModal({ open: false, generation: null })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Generation: {editModal.generation?.card_name}</h3>
              <button className="modal-close" onClick={() => setEditModal({ open: false, generation: null })}>
                &times;
              </button>
            </div>

            <div className="form-group">
              <label>Image URL</label>
              <input
                type="text"
                value={editForm.image_url}
                onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>General Energy</label>
              <textarea
                value={editForm.general_energy}
                onChange={(e) => setEditForm({ ...editForm, general_energy: e.target.value })}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Love & Relationships</label>
              <textarea
                value={editForm.love_relationships}
                onChange={(e) => setEditForm({ ...editForm, love_relationships: e.target.value })}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Career & Finance</label>
              <textarea
                value={editForm.career_finance}
                onChange={(e) => setEditForm({ ...editForm, career_finance: e.target.value })}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Expert's Advice</label>
              <textarea
                value={editForm.expert_advice}
                onChange={(e) => setEditForm({ ...editForm, expert_advice: e.target.value })}
                rows={3}
              />
            </div>

            <button className="submit-button" onClick={handleSaveEdit}>
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Add Context Modal */}
      {addContextModal && (
        <div className="modal-overlay" onClick={() => setAddContextModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Expert Context</h3>
              <button className="modal-close" onClick={() => setAddContextModal(false)}>
                &times;
              </button>
            </div>

            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={newContext.title}
                onChange={(e) => setNewContext({ ...newContext, title: e.target.value })}
                placeholder="e.g., Video: Understanding The Fool"
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                value={newContext.category}
                onChange={(e) => setNewContext({ ...newContext, category: e.target.value })}
              >
                <option value="general">General</option>
                <option value="love">Love & Relationships</option>
                <option value="career">Career & Finance</option>
                <option value="spiritual">Spiritual Growth</option>
              </select>
            </div>

            <div className="form-group">
              <label>Source URL (optional)</label>
              <input
                type="text"
                value={newContext.source_url}
                onChange={(e) => setNewContext({ ...newContext, source_url: e.target.value })}
                placeholder="YouTube URL or other source"
              />
            </div>

            <div className="form-group">
              <label>Content (Transcript)</label>
              <textarea
                value={newContext.content_text}
                onChange={(e) => setNewContext({ ...newContext, content_text: e.target.value })}
                rows={8}
                placeholder="Paste the transcript or content here..."
              />
            </div>

            <button className="submit-button" onClick={handleAddContext}>
              Add Context
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
