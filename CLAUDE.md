# CLAUDE.md - AI Assistant Guide for Tarot Mini App

**Last Updated**: 2025-11-24
**Project**: Telegram Mini App for Tarot Readers Catalog
**Language**: Russian (comments, UI, documentation)
**Tech Stack**: Node.js + Express + PostgreSQL + React 18

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Codebase Structure](#codebase-structure)
3. [Tech Stack & Dependencies](#tech-stack--dependencies)
4. [Code Conventions](#code-conventions)
5. [Development Workflows](#development-workflows)
6. [API Structure](#api-structure)
7. [Database Patterns](#database-patterns)
8. [React Component Architecture](#react-component-architecture)
9. [Common Tasks](#common-tasks)
10. [Known Gaps & Missing Files](#known-gaps--missing-files)
11. [Testing & Deployment](#testing--deployment)
12. [Best Practices](#best-practices)

---

## Project Overview

### Purpose
A Telegram Mini App that serves as a professional catalog of tarot readers for a tarot school. It connects clients with qualified specialists while providing promotional opportunities for the school's graduates.

### Key Features
- **Client-facing**: Browse tarot readers, filter by specialization, book consultations, leave reviews
- **Tarot reader-facing**: Professional profiles, automatic notifications via Telegram bot
- **Admin-facing**: Full admin panel for managing readers, reviews, statistics, and promotional content

### Architecture Pattern
**Three-tier monolithic architecture**:
- **Frontend**: React 18 SPA served as static files
- **Backend**: Single Express server file (`server.js`) with all routes and logic
- **Database**: PostgreSQL with 7 main tables

---

## Codebase Structure

### Current Directory Layout

```
tarot-mini-app/
├── server.js                          # 🔴 Main Express server (monolithic)
├── package.json                       # Dependencies and scripts
├── database_schema.sql                # PostgreSQL schema with detailed comments
├── README.md                          # Comprehensive project documentation
├── DEPLOYMENT_GUIDE.md               # Detailed deployment instructions
├── CLAUDE.md                         # This file - AI assistant guide
│
└── public/                           # Frontend static files
    └── src/
        ├── App.jsx                    # Root React component (routing & state)
        ├── App.css                    # Global styles with CSS variables
        └── components/
            ├── AdminPanel.jsx         # Admin dashboard (JWT auth)
            ├── TarotReaderProfile.jsx # Individual reader detail page
            └── TarotReadersList.jsx   # Main catalog view
```

### Missing Directories (Referenced but Not Implemented)
```
❌ services/              # Database, Telegram, Google Sheets services
❌ utils/                # Validators, helpers
❌ config/               # Configuration files
❌ tests/                # Test files
```

---

## Tech Stack & Dependencies

### Backend
```json
{
  "runtime": "Node.js",
  "framework": "Express 4.18.2",
  "database": "PostgreSQL with pg driver 8.11.3",
  "authentication": "JWT (jsonwebtoken 9.0.2) + bcrypt 5.1.1",
  "telegram": "node-telegram-bot-api 0.64.0",
  "external-apis": "googleapis 128.0.0 (not implemented yet)",
  "file-uploads": "multer 1.4.5 (not configured yet)",
  "security": "cors, crypto (for Telegram data verification)"
}
```

### Frontend
```json
{
  "framework": "React 18 (functional components + hooks)",
  "build-tools": "Webpack 5.89.0, Babel 7.23.3",
  "styling": "Vanilla CSS with CSS custom properties",
  "state-management": "React useState/useEffect (no Redux/MobX)",
  "telegram-integration": "window.Telegram.WebApp API"
}
```

### Database
- **Type**: PostgreSQL (relational)
- **7 Main Tables**: users, tarot_readers, consultations, reviews, promotional_banners, blog_posts, admin_users
- **Features**: Foreign keys, triggers, indexes, CHECK constraints, ARRAY fields

---

## Code Conventions

### Language & Comments

**Primary Language**: Russian everywhere (comments, variable names, UI text, database comments)

**Comment Philosophy**: Educational and extensive
- Comments explain "why", not just "what"
- Uses metaphors to explain concepts (e.g., "server.js - как диспетчерская в аэропорту")
- Every function and complex logic block has explanatory comments

**Example**:
```javascript
// Middleware - это как контрольно-пропускные пункты для запросов
app.use(cors()); // Разрешаем запросы с других доменов
app.use(express.json()); // Парсим JSON в теле запросов
```

### JavaScript/React Naming Conventions

```javascript
// Functions: camelCase
loadTarotReaders()
handleBackButton()
verifyTelegramWebAppData()

// Components: PascalCase
<TarotReadersList />
<AdminPanel />

// State variables: camelCase
const [currentPage, setCurrentPage] = useState('list');
const [selectedTarotReader, setSelectedTarotReader] = useState(null);

// Constants: camelCase or UPPER_CASE
const PORT = process.env.PORT || 3000;
const bot = new TelegramBot(token);
```

### File Organization Pattern

```javascript
// 1. Imports (grouped: libraries, then local files)
import React, { useState, useEffect } from 'react';
import './ComponentName.css';

// 2. Component/function definition
function ComponentName({ prop1, prop2 }) {

  // 3. State declarations (grouped together)
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 4. useEffect hooks
  useEffect(() => {
    loadData();
  }, []);

  // 5. Helper/handler functions
  const loadData = async () => { /* ... */ };
  const handleSubmit = () => { /* ... */ };

  // 6. Render helpers (optional)
  const renderItem = (item) => ( /* ... */ );

  // 7. Main JSX return
  return ( /* ... */ );
}

// 8. Export
export default ComponentName;
```

### API Call Pattern

**Always follow this structure**:
```javascript
async function loadData() {
  try {
    setLoading(true);
    setError(null); // Clear previous errors

    const response = await fetch('/api/endpoint');
    if (!response.ok) throw new Error('Request failed');

    const data = await response.json();
    setState(data);

  } catch (error) {
    console.error('Error:', error);
    setError(error.message);

    // Use Telegram WebApp API for user alerts
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.showAlert('Ошибка загрузки данных');
    }

  } finally {
    setLoading(false); // Always stop loading
  }
}
```

### CSS Conventions

**Color System** (defined in `:root` in App.css):
```css
--primary-color: #6B46C1;      /* Purple theme */
--primary-dark: #553C9A;       /* Darker purple */
--surface: #FFFFFF;            /* Card backgrounds */
--background: #F3F4F6;         /* Page background */
--text-primary: #1F2937;       /* Dark text */
--text-secondary: #6B7280;     /* Gray text */
--border: #E5E7EB;             /* Borders */
--success: #10B981;            /* Success states */
--error: #EF4444;              /* Error states */
```

**Class Naming** (BEM-like but simplified):
```css
.component-name { }              /* Container */
.component-name-element { }      /* Child element */
.component-name.modifier { }     /* State modifier */
.component-name-element.active { } /* Active state */
```

**Layout**: Mobile-first with Flexbox (no CSS Grid used)
**Responsive**: Media queries for tablet/desktop
**Animations**: Keyframes for loading, fade-in, slide-up effects

---

## Development Workflows

### Starting Development

```bash
# 1. Install dependencies
npm install

# 2. Set up PostgreSQL database
createdb tarot_app
psql -d tarot_app -f database_schema.sql

# 3. Create .env file
cp .env.example .env  # (file doesn't exist yet, see below for required vars)

# 4. Start development server
npm run dev

# Server runs on http://localhost:3000
```

### Required Environment Variables

Create `.env` file with:
```bash
# Required
TELEGRAM_BOT_TOKEN=<from @BotFather>
DATABASE_URL=postgresql://user:pass@localhost:5432/tarot_app
JWT_SECRET=<random 32+ character string>

# Optional (have defaults)
PORT=3000
NODE_ENV=development

# For future features
GOOGLE_SHEETS_API_KEY=<not implemented yet>
ADMIN_USERNAME=<not implemented yet>
ADMIN_PASSWORD=<not implemented yet>
```

### npm Scripts

```json
{
  "start": "node server.js",           // Production
  "dev": "nodemon server.js",          // Development with auto-reload
  "build": "webpack --mode production", // ⚠️ No webpack.config.js yet
  "dev-client": "webpack serve"        // ⚠️ No webpack.config.js yet
}
```

### Git Workflow

```bash
# Current branch
claude/claude-md-micyig95h41w7d9s-016sx4EVBSkdkWK2RMWTCjvt

# Commit pattern (Russian messages preferred)
git add .
git commit -m "feat: добавил новую функцию X"
git commit -m "fix: исправил ошибку в Y"
git commit -m "docs: обновил документацию"

# Push to feature branch
git push -u origin <branch-name>
```

---

## API Structure

### Public Endpoints (No Auth Required)

#### GET `/api/tarot-readers`
**Purpose**: List all active tarot readers with statistics
**Query Params**: None (filters can be added client-side)
**Returns**: Array of tarot reader objects with aggregated stats

```json
[
  {
    "id": 1,
    "name": "Анна Петрова",
    "specialization": "Отношения",
    "price_range": "1500-2500 руб",
    "average_rating": 4.85,
    "total_consultations": 127,
    "total_reviews": 89,
    "is_featured": true,
    "photo_url": "https://...",
    ...
  }
]
```

#### GET `/api/tarot-readers/:id`
**Purpose**: Get detailed profile of a single tarot reader
**Params**: `id` (integer)
**Returns**: Full reader object + array of reviews

#### POST `/api/consultations`
**Purpose**: Create new consultation booking
**Body**:
```json
{
  "tarot_reader_id": 1,
  "client_telegram_id": 123456789,
  "client_name": "Иван",
  "consultation_topic": "Карьера"
}
```
**Returns**: `{ confirmation_code: "ABC123" }`
**Side Effect**: Sends Telegram notification to tarot reader

#### POST `/api/consultations/confirm`
**Purpose**: Confirm consultation completion
**Body**: `{ confirmation_code: "ABC123" }`

#### POST `/api/reviews`
**Purpose**: Add review after completed consultation
**Body**:
```json
{
  "consultation_id": 1,
  "rating": 5,
  "comment": "Отличная консультация!"
}
```

### Admin Endpoints (JWT Auth Required)

**Authentication Header**: `Authorization: Bearer <jwt_token>`

#### POST `/api/admin/login`
**Purpose**: Admin authentication
**Body**: `{ username: "admin", password: "password" }`
**Returns**: `{ token: "<jwt_token>", user: {...} }`

#### GET `/api/admin/statistics`
**Purpose**: Dashboard statistics
**Returns**: Overall stats + top tarot readers

#### POST `/api/admin/tarot-readers`
**Purpose**: Add new tarot reader
**Body**: Full tarot reader object

#### PUT `/api/admin/tarot-readers/:id`
**Purpose**: Update tarot reader (including featured status)
**Body**: Partial update object

### Middleware

**checkAdmin**: JWT verification middleware
```javascript
function checkAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

---

## Database Patterns

### Schema Philosophy

1. **Detailed comments**: Every table and field has Russian explanation
2. **Defensive defaults**: `is_active = true`, `created_at = NOW()`
3. **Denormalized stats**: `total_consultations`, `average_rating` for performance
4. **Cascade deletes**: Maintain data integrity on deletions
5. **Array fields**: Use PostgreSQL ARRAY for multi-value fields (courses, tags)
6. **Triggers**: Auto-update `updated_at` timestamps

### Common Query Patterns

#### List with Aggregation
```sql
SELECT
  tr.*,
  COUNT(DISTINCT c.id) as total_consultations,
  AVG(r.rating) as average_rating,
  COUNT(DISTINCT r.id) as total_reviews
FROM tarot_readers tr
LEFT JOIN consultations c ON tr.id = c.tarot_reader_id
LEFT JOIN reviews r ON c.id = r.consultation_id
WHERE tr.is_active = true
GROUP BY tr.id
ORDER BY tr.is_featured DESC, average_rating DESC NULLS LAST;
```

**Pattern Notes**:
- Use `LEFT JOIN` for optional relationships
- `COUNT(DISTINCT ...)` to avoid duplicates
- `NULLS LAST` for proper sorting
- `is_featured DESC` first for priority ordering

#### Parameterized Queries (SQL Injection Safe)
```javascript
// Always use $1, $2, etc. placeholders
await pool.query(
  'SELECT * FROM tarot_readers WHERE id = $1 AND is_active = $2',
  [id, true]
);

// NEVER concatenate user input
// ❌ BAD: `SELECT * FROM users WHERE id = ${userId}`
// ✅ GOOD: Use parameterized queries
```

#### Insert with RETURNING
```sql
INSERT INTO consultations (tarot_reader_id, client_telegram_id, confirmation_code)
VALUES ($1, $2, $3)
RETURNING id, confirmation_code;
```

### Key Tables

**tarot_readers**: Core table with reader profiles
**consultations**: Booking records with confirmation codes
**reviews**: Client feedback linked to consultations
**users**: Telegram users (clients)
**admin_users**: Admin accounts (not fully implemented)
**blog_posts**: Educational content (table exists, no routes)
**promotional_banners**: Marketing content (table exists, routes missing)

---

## React Component Architecture

### Component Hierarchy

```
App.jsx (root)
├── TarotReadersList       # Main catalog page
├── TarotReaderProfile     # Detail page for single reader
├── AdminPanel             # Admin dashboard
├── BlogSection            # ❌ Not implemented
└── PromoBanner            # ❌ Not implemented
```

### State Management Pattern

**Parent (App.jsx) manages**:
- `currentPage`: Routing ('list' | 'profile' | 'admin' | 'blog')
- `selectedTarotReader`: Currently viewed reader object
- `userData`: Telegram user info from WebApp API
- `isAdmin`: Admin status (from Telegram user ID check)

**Children manage their own**:
- Loading states
- Form inputs
- Modal visibility
- Filtered/sorted data

**No global state library**: Context API, Redux, MobX not used

### Component Communication

**Parent → Child**: Props
```jsx
<TarotReadersList
  userData={userData}
  onSelectTarotReader={(reader) => setSelectedTarotReader(reader)}
/>
```

**Child → Parent**: Callbacks
```jsx
// In child component
onClick={() => props.onSelectTarotReader(reader)}

// In parent component
const handleSelectReader = (reader) => {
  setSelectedTarotReader(reader);
  setCurrentPage('profile');
};
```

### Telegram WebApp Integration

**Initialize in App.jsx**:
```javascript
useEffect(() => {
  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    // Get user data
    const user = tg.initDataUnsafe?.user;
    setUserData(user);

    // Style integration
    document.body.style.backgroundColor = tg.backgroundColor;
  }
}, []);
```

**Common WebApp Methods**:
```javascript
// Show alert
window.Telegram.WebApp.showAlert('Сообщение');

// Show confirm dialog
window.Telegram.WebApp.showConfirm('Подтвердить?', (confirmed) => {
  if (confirmed) { /* ... */ }
});

// Haptic feedback
window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');

// Back button
window.Telegram.WebApp.BackButton.show();
window.Telegram.WebApp.BackButton.onClick(() => { /* ... */ });

// Main button
window.Telegram.WebApp.MainButton.setText('Записаться');
window.Telegram.WebApp.MainButton.show();
```

---

## Common Tasks

### Adding a New API Endpoint

1. **Add route to server.js**:
```javascript
app.post('/api/new-endpoint', async (req, res) => {
  try {
    // Validate input
    const { field1, field2 } = req.body;
    if (!field1) {
      return res.status(400).json({ error: 'field1 is required' });
    }

    // Database query
    const result = await pool.query(
      'INSERT INTO table (field1, field2) VALUES ($1, $2) RETURNING *',
      [field1, field2]
    );

    // Return result
    res.json(result.rows[0]);

  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});
```

2. **Add frontend call**:
```javascript
const response = await fetch('/api/new-endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ field1: value1, field2: value2 })
});
```

### Creating a New React Component

1. **Create component file** (e.g., `NewComponent.jsx`):
```javascript
import React, { useState, useEffect } from 'react';
import './NewComponent.css';

function NewComponent({ prop1, onAction }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/data');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Ошибка:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Загрузка...</div>;

  return (
    <div className="new-component">
      {/* JSX content */}
    </div>
  );
}

export default NewComponent;
```

2. **Create CSS file** (`NewComponent.css`):
```css
.new-component {
  padding: 1rem;
  background: var(--surface);
  border-radius: 12px;
}
```

3. **Import in App.jsx**:
```javascript
import NewComponent from './components/NewComponent';
```

### Adding Database Table

1. **Add to database_schema.sql**:
```sql
CREATE TABLE new_table (
    id SERIAL PRIMARY KEY,
    field1 VARCHAR(255) NOT NULL,
    field2 TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX idx_new_table_field1 ON new_table(field1);

-- Add foreign keys if needed
ALTER TABLE new_table
  ADD CONSTRAINT fk_related_table
  FOREIGN KEY (related_id) REFERENCES related_table(id)
  ON DELETE CASCADE;
```

2. **Apply to database**:
```bash
psql -d tarot_app -f database_schema.sql
```

### Implementing Authentication Check

**For admin routes**, use `checkAdmin` middleware:
```javascript
app.get('/api/admin/protected', checkAdmin, async (req, res) => {
  // req.admin contains decoded JWT data
  res.json({ message: 'Authenticated', admin: req.admin });
});
```

**For client-side**:
```javascript
// Store JWT in localStorage after login
localStorage.setItem('adminToken', token);

// Send in requests
const response = await fetch('/api/admin/endpoint', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
  }
});
```

---

## Known Gaps & Missing Files

### Critical Missing Files

1. **index.html** - Entry point for React app
   - Should be in `public/` or `public/src/`
   - Needs `<div id="root"></div>` mount point
   - Must load Telegram WebApp script

2. **webpack.config.js** - Build configuration
   - Required for `npm run build` and `npm run dev-client`
   - Should configure Babel, CSS loaders, HtmlWebpackPlugin

3. **Component CSS files**:
   - `TarotReadersList.css`
   - `TarotReaderProfile.css`
   - `AdminPanel.css`
   - (Currently imported but don't exist)

4. **.env file** - Environment configuration
   - Create from template above
   - Add to `.gitignore`

### Partially Implemented Features

5. **Blog functionality**:
   - Table exists in database
   - No API routes in server.js
   - `BlogSection.jsx` referenced but doesn't exist

6. **Promotional banners**:
   - Table exists in database
   - Routes missing in server.js
   - `PromoBanner.jsx` referenced but doesn't exist

7. **Google Sheets integration**:
   - `googleapis` package installed
   - No implementation in code
   - Referenced in README as future feature

8. **File uploads**:
   - `multer` package installed
   - No upload routes configured
   - No storage setup (local/cloud)

### Architecture Improvements Needed

9. **Code organization**:
   - `services/` directory (database.js, telegram.js, googleSheets.js)
   - `utils/` directory (validators.js, helpers.js)
   - `routes/` directory (separate route files)
   - `middleware/` directory (auth, validation, error handling)

10. **Admin user system**:
    - `admin_users` table exists but not used
    - Currently checks hardcoded Telegram IDs
    - No password hashing implemented yet

---

## Testing & Deployment

### Testing (Not Implemented Yet)

**Recommended approach**:
```bash
# Install testing dependencies
npm install --save-dev jest supertest @testing-library/react

# Create test structure
tests/
├── unit/
│   ├── api.test.js
│   └── components.test.js
└── integration/
    └── flows.test.js
```

### Local Development Testing

```bash
# 1. Start PostgreSQL
# 2. Apply schema
psql -d tarot_app -f database_schema.sql

# 3. Start server
npm run dev

# 4. Test endpoints manually
curl http://localhost:3000/api/tarot-readers

# 5. Open in Telegram Web App Test Environment
# Use https://core.telegram.org/bots/webapps#testing-mini-apps
```

### Production Deployment

**See DEPLOYMENT_GUIDE.md for full instructions**

**Quick checklist**:
- [ ] Set up PostgreSQL database (cloud service recommended)
- [ ] Create Telegram Bot via @BotFather
- [ ] Deploy server (Railway, Render, DigitalOcean, etc.)
- [ ] Set environment variables on hosting platform
- [ ] Configure Mini App URL in BotFather
- [ ] Test end-to-end in Telegram
- [ ] Set up SSL/HTTPS (required by Telegram)
- [ ] Configure database backups

---

## Best Practices

### When Working with This Codebase

#### 1. Maintain Educational Comments
```javascript
// ✅ GOOD: Explain why, use metaphors
// Создаем middleware для проверки прав доступа
// Это как охранник, который проверяет пропуск перед входом
function checkAdmin(req, res, next) { /* ... */ }

// ❌ BAD: Just describe what
// Check if user is admin
function checkAdmin(req, res, next) { /* ... */ }
```

#### 2. Always Use try/catch with Proper Cleanup
```javascript
// ✅ GOOD
async function loadData() {
  try {
    setLoading(true);
    // ... async operations
  } catch (error) {
    console.error('Ошибка:', error);
    showUserError(); // User feedback
  } finally {
    setLoading(false); // Always cleanup
  }
}

// ❌ BAD: Missing finally
async function loadData() {
  try {
    setLoading(true);
    // ... async operations
    setLoading(false); // Won't run if error occurs
  } catch (error) {
    console.error(error);
  }
}
```

#### 3. Parameterize All SQL Queries
```javascript
// ✅ GOOD
await pool.query(
  'SELECT * FROM users WHERE telegram_id = $1',
  [telegramId]
);

// ❌ BAD: SQL injection vulnerability
await pool.query(
  `SELECT * FROM users WHERE telegram_id = ${telegramId}`
);
```

#### 4. Use Telegram WebApp API for User Feedback
```javascript
// ✅ GOOD: Native Telegram experience
if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.showAlert('Операция выполнена успешно');
  window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
}

// ❌ BAD: Browser alerts (not native)
alert('Операция выполнена успешно');
```

#### 5. Follow the Purple Theme
```css
/* ✅ GOOD: Use CSS variables */
.button {
  background: var(--primary-color);
  color: white;
}

/* ❌ BAD: Hardcoded colors */
.button {
  background: #6B46C1;
}
```

#### 6. Handle Loading States
```javascript
// ✅ GOOD: User always knows what's happening
if (loading) return <div className="loading">Загрузка...</div>;
if (error) return <div className="error">{error}</div>;
if (!data.length) return <div className="empty">Нет данных</div>;
return <div>{/* Main content */}</div>;

// ❌ BAD: No feedback during loading
return <div>{data.map(item => /* ... */)}</div>;
```

#### 7. Validate Input Data
```javascript
// ✅ GOOD: Check before processing
app.post('/api/endpoint', async (req, res) => {
  const { field1, field2 } = req.body;

  if (!field1 || !field2) {
    return res.status(400).json({
      error: 'Все поля обязательны'
    });
  }

  // Process valid data
});

// ❌ BAD: No validation
app.post('/api/endpoint', async (req, res) => {
  const { field1, field2 } = req.body;
  // Direct use without checking
});
```

#### 8. Keep Backend Logic in server.js
This project uses a **monolithic architecture**. Unless explicitly refactoring:
- Add new routes to `server.js`
- Don't create separate route files yet
- Keep it simple and centralized

#### 9. Use Russian for User-Facing Content
```javascript
// ✅ GOOD
res.status(404).json({ error: 'Таролог не найден' });
<button>Записаться на консультацию</button>

// ❌ BAD
res.status(404).json({ error: 'Tarot reader not found' });
<button>Book consultation</button>
```

#### 10. Test Telegram Integration Early
- Don't wait until production to test in Telegram
- Use Telegram's test environment for Web Apps
- Check that all WebApp API methods work correctly
- Test on both mobile and desktop Telegram

### Security Checklist

- [ ] All SQL queries use parameterized statements
- [ ] JWT secrets are in environment variables, not code
- [ ] Passwords are hashed with bcrypt (when implemented)
- [ ] Admin routes use authentication middleware
- [ ] CORS is configured properly
- [ ] Input validation on all user-submitted data
- [ ] HTTPS is enforced in production
- [ ] Rate limiting on sensitive endpoints (future)

### Performance Checklist

- [ ] Database queries use proper indexes
- [ ] Aggregated stats are denormalized where appropriate
- [ ] Images are optimized and served via CDN (future)
- [ ] API responses are paginated for large datasets (future)
- [ ] Frontend code is minified for production
- [ ] Unnecessary re-renders are avoided with React.memo (if needed)

---

## Quick Reference

### Common Commands
```bash
# Development
npm run dev                 # Start dev server with nodemon
npm start                   # Start production server

# Database
psql -d tarot_app           # Connect to database
psql -d tarot_app -f database_schema.sql  # Apply schema

# Git
git status                  # Check status
git add .                   # Stage changes
git commit -m "message"     # Commit
git push -u origin <branch> # Push to remote
```

### Key Files to Check First
1. `server.js` - All backend logic
2. `database_schema.sql` - Database structure
3. `public/src/App.jsx` - Frontend routing
4. `package.json` - Dependencies
5. `README.md` - Feature overview
6. `DEPLOYMENT_GUIDE.md` - Deployment steps

### Environment Setup
```bash
# Minimum required in .env
TELEGRAM_BOT_TOKEN=your_token_here
DATABASE_URL=postgresql://user:pass@localhost:5432/tarot_app
JWT_SECRET=your_random_secret_at_least_32_chars
```

---

## Support & Resources

### Documentation
- **README.md**: Feature overview and architecture
- **DEPLOYMENT_GUIDE.md**: Step-by-step deployment
- **This file (CLAUDE.md)**: Development guide for AI assistants

### External Resources
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Web Apps](https://core.telegram.org/bots/webapps)
- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

### Project-Specific Patterns
- **Comments**: Russian, educational, metaphor-rich
- **Architecture**: Monolithic, simple, centralized
- **Theme**: Purple (#6B46C1), modern, mobile-first
- **User Experience**: Telegram-native, haptic feedback, native alerts

---

## Version History

**v1.0.0** (2025-11-24)
- Initial CLAUDE.md creation
- Documented current codebase state
- Identified missing files and gaps
- Established development patterns and conventions

---

**This guide is maintained for AI assistants (like Claude) to effectively understand and work with this codebase. Keep it updated as the project evolves.**
