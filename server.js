// server.js - Tarot Daily Card API Server
// Handles AI generation, Moscow timezone logic, and all API endpoints

const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/tarot_app',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Admin Telegram IDs (for quick admin check without password)
const ADMIN_TELEGRAM_IDS = process.env.ADMIN_TELEGRAM_IDS
  ? process.env.ADMIN_TELEGRAM_IDS.split(',').map(id => parseInt(id.trim()))
  : [];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get current Moscow Date considering 9:00 AM reset
 * Returns the "astronomical day" for generation tracking
 */
function getMoscowAstronomicalDate() {
  const now = new Date();

  // Get current time in Moscow (UTC+3)
  const moscowOffset = 3 * 60; // minutes
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const moscowTime = new Date(utcTime + (moscowOffset * 60000));

  // If before 9:00 AM Moscow time, use previous day
  const moscowHours = moscowTime.getHours();
  if (moscowHours < 9) {
    moscowTime.setDate(moscowTime.getDate() - 1);
  }

  // Return date string in YYYY-MM-DD format
  return moscowTime.toISOString().split('T')[0];
}

/**
 * Verify JWT token middleware
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}

/**
 * Generate AI interpretation using OpenAI
 */
async function generateInterpretation(card, expertContext) {
  // If OpenAI API key is not configured, return mock data
  if (!process.env.OPENAI_API_KEY) {
    console.log('OpenAI API key not configured, using mock interpretation');
    return {
      general_energy: `Today, ${card.name} brings powerful energy into your life. This card speaks of ${card.keywords.join(', ')}. ${card.description}`,
      love_relationships: `In matters of the heart, ${card.name} suggests a time of ${card.keywords[0]}. Be open to new connections and trust your intuition in romantic matters.`,
      career_finance: `For your career and finances, this card indicates ${card.keywords[1] || 'positive changes'}. Focus on your goals and take calculated risks when opportunities arise.`,
      expert_advice: `Remember: ${card.description} Trust the journey and embrace the wisdom that ${card.name} offers you today.`
    };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert Tarot reader providing daily card interpretations.
${expertContext ? `Use this expert knowledge to shape your interpretation style:\n${expertContext}\n\n` : ''}
Provide warm, insightful, and actionable guidance. Be specific but not alarming.
Always maintain a positive and empowering tone while being authentic to the card's meaning.
Respond in JSON format with these exact keys: general_energy, love_relationships, career_finance, expert_advice`
          },
          {
            role: 'user',
            content: `Provide a daily Tarot reading for the card: ${card.name}
Card meaning: ${card.description}
Keywords: ${card.keywords.join(', ')}

Create an interpretation with:
1. general_energy: 1-2 sentences about today's overall energy
2. love_relationships: Specific advice for love and relationships
3. career_finance: Specific advice for career and finances
4. expert_advice: A concluding wisdom snippet

Respond only with valid JSON.`
          }
        ],
        temperature: 0.8,
        max_tokens: 1000
      })
    });

    const data = await response.json();

    if (data.choices && data.choices[0]) {
      const content = data.choices[0].message.content;
      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }

    throw new Error('Invalid OpenAI response');
  } catch (error) {
    console.error('OpenAI interpretation error:', error);
    // Fallback to basic interpretation
    return {
      general_energy: `${card.name} brings energy of ${card.keywords.join(' and ')} into your day.`,
      love_relationships: `In love, embrace the qualities of ${card.keywords[0]}.`,
      career_finance: `For career matters, focus on ${card.keywords[1] || 'your strengths'}.`,
      expert_advice: card.description
    };
  }
}

/**
 * Generate card image using DALL-E
 */
async function generateCardImage(card) {
  // If OpenAI API key is not configured, return null
  if (!process.env.OPENAI_API_KEY) {
    console.log('OpenAI API key not configured, skipping image generation');
    return null;
  }

  try {
    const prompt = `A beautiful, modern mystical Tarot card illustration of ${card.name}. ${card.image_description}. Style: Golden luxury aesthetic, soft lighting, detailed mystical artwork, elegant gold accents and borders. High quality digital art, clean composition.`;

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1792',
        quality: 'standard'
      })
    });

    const data = await response.json();

    if (data.data && data.data[0]) {
      return {
        url: data.data[0].url,
        prompt: prompt
      };
    }

    return null;
  } catch (error) {
    console.error('DALL-E image generation error:', error);
    return null;
  }
}

// =============================================================================
// USER API ROUTES
// =============================================================================

/**
 * Register or update user
 */
app.post('/api/users/register', async (req, res) => {
  try {
    const { telegram_id, first_name, last_name, username } = req.body;

    if (!telegram_id) {
      return res.status(400).json({ error: 'telegram_id is required' });
    }

    const query = `
      INSERT INTO users (telegram_id, first_name, last_name, telegram_username, last_active_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (telegram_id)
      DO UPDATE SET
        first_name = COALESCE($2, users.first_name),
        last_name = COALESCE($3, users.last_name),
        telegram_username = COALESCE($4, users.telegram_username),
        last_active_at = NOW()
      RETURNING *
    `;

    const result = await pool.query(query, [telegram_id, first_name, last_name, username]);
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('User registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

/**
 * Check if user has generation for today
 */
app.get('/api/generations/today/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const mskDate = getMoscowAstronomicalDate();

    const query = `
      SELECT g.*, u.first_name
      FROM generations g
      JOIN users u ON g.user_id = u.id
      WHERE u.telegram_id = $1 AND g.msk_date = $2
    `;

    const result = await pool.query(query, [telegramId, mskDate]);

    if (result.rows.length > 0) {
      res.json({
        generation: result.rows[0],
        hasGeneration: true,
        mskDate: mskDate
      });
    } else {
      res.json({
        generation: null,
        hasGeneration: false,
        mskDate: mskDate
      });
    }
  } catch (error) {
    console.error('Check generation error:', error);
    res.status(500).json({ error: 'Failed to check generation' });
  }
});

/**
 * Generate daily card
 */
app.post('/api/generations/generate', async (req, res) => {
  try {
    const { telegram_id } = req.body;

    if (!telegram_id) {
      return res.status(400).json({ error: 'telegram_id is required' });
    }

    const mskDate = getMoscowAstronomicalDate();

    // Get user
    const userResult = await pool.query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [telegram_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found. Please register first.' });
    }

    const user = userResult.rows[0];

    // Check if already generated today
    const existingResult = await pool.query(
      'SELECT * FROM generations WHERE user_id = $1 AND msk_date = $2',
      [user.id, mskDate]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        error: 'You have already received your card for today',
        generation: existingResult.rows[0]
      });
    }

    // Select random card
    const cardResult = await pool.query(
      'SELECT * FROM tarot_cards ORDER BY RANDOM() LIMIT 1'
    );

    if (cardResult.rows.length === 0) {
      return res.status(500).json({ error: 'No tarot cards found in database' });
    }

    const card = cardResult.rows[0];

    // Get expert context
    const contextResult = await pool.query(
      'SELECT content_text FROM expert_context WHERE is_active = true ORDER BY priority DESC LIMIT 5'
    );

    const expertContext = contextResult.rows.map(r => r.content_text).join('\n\n');
    const hasExpertContext = contextResult.rows.length > 0;

    // Generate interpretation
    const interpretation = await generateInterpretation(card, expertContext);

    // Generate image (optional)
    const imageData = await generateCardImage(card);

    // Save generation
    const insertQuery = `
      INSERT INTO generations (
        user_id, card_name, card_number, card_arcana, card_suit,
        image_url, image_prompt, text_content, expert_context_used,
        generation_model, image_model, msk_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const insertResult = await pool.query(insertQuery, [
      user.id,
      card.name_ru || card.name,
      card.number,
      card.arcana,
      card.suit,
      imageData?.url || null,
      imageData?.prompt || null,
      JSON.stringify(interpretation),
      hasExpertContext,
      process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      imageData ? 'dall-e-3' : null,
      mskDate
    ]);

    // Update user's total generations
    await pool.query(
      'UPDATE users SET total_generations = total_generations + 1 WHERE id = $1',
      [user.id]
    );

    res.json({
      generation: insertResult.rows[0],
      card: {
        name: card.name,
        name_ru: card.name_ru,
        arcana: card.arcana,
        suit: card.suit
      }
    });
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: 'Failed to generate card' });
  }
});

/**
 * Track share
 */
app.post('/api/generations/share', async (req, res) => {
  try {
    const { generation_id } = req.body;

    await pool.query(
      'UPDATE generations SET times_shared = times_shared + 1 WHERE id = $1',
      [generation_id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Share tracking error:', error);
    res.status(500).json({ error: 'Failed to track share' });
  }
});

// =============================================================================
// ADMIN API ROUTES
// =============================================================================

/**
 * Check if user is admin by Telegram ID
 */
app.get('/api/admin/check/:telegramId', (req, res) => {
  const telegramId = parseInt(req.params.telegramId);
  const isAdmin = ADMIN_TELEGRAM_IDS.includes(telegramId);
  res.json({ isAdmin });
});

/**
 * Admin login
 */
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check against environment variables
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign(
        { username, role: 'admin' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      res.json({ token });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * Verify admin token
 */
app.get('/api/admin/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, admin: req.admin });
});

/**
 * Get statistics
 */
app.get('/api/admin/statistics', authenticateToken, async (req, res) => {
  try {
    const mskDate = getMoscowAstronomicalDate();

    const statsQuery = `
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM generations) as total_generations,
        (SELECT COUNT(*) FROM generations WHERE msk_date = $1) as today_generations,
        (SELECT COALESCE(SUM(times_shared), 0) FROM generations) as total_shares
    `;

    const topCardsQuery = `
      SELECT card_name, COUNT(*) as count
      FROM generations
      WHERE msk_date = $1
      GROUP BY card_name
      ORDER BY count DESC
      LIMIT 5
    `;

    const [statsResult, topCardsResult] = await Promise.all([
      pool.query(statsQuery, [mskDate]),
      pool.query(topCardsQuery, [mskDate])
    ]);

    res.json({
      ...statsResult.rows[0],
      top_cards: topCardsResult.rows
    });
  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

/**
 * Get all users
 */
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM users
      ORDER BY created_at DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

/**
 * Get all generations
 */
app.get('/api/admin/generations', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT g.*, u.first_name, u.telegram_id
      FROM generations g
      JOIN users u ON g.user_id = u.id
      ORDER BY g.date_generated DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get generations error:', error);
    res.status(500).json({ error: 'Failed to get generations' });
  }
});

/**
 * Update generation
 */
app.put('/api/admin/generations/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { text_content, image_url } = req.body;

    const result = await pool.query(`
      UPDATE generations
      SET
        text_content = $1,
        image_url = COALESCE($2, image_url),
        is_edited = true,
        edited_at = NOW(),
        edited_by = $3
      WHERE id = $4
      RETURNING *
    `, [JSON.stringify(text_content), image_url, req.admin.username, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Generation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update generation error:', error);
    res.status(500).json({ error: 'Failed to update generation' });
  }
});

/**
 * Get expert contexts
 */
app.get('/api/admin/expert-context', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM expert_context
      ORDER BY priority DESC, created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get expert context error:', error);
    res.status(500).json({ error: 'Failed to get expert context' });
  }
});

/**
 * Add expert context
 */
app.post('/api/admin/expert-context', authenticateToken, async (req, res) => {
  try {
    const { title, content_text, category, source_url } = req.body;

    const result = await pool.query(`
      INSERT INTO expert_context (title, content_text, category, source_url, uploaded_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [title, content_text, category || 'general', source_url, req.admin.username]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Add expert context error:', error);
    res.status(500).json({ error: 'Failed to add expert context' });
  }
});

/**
 * Delete expert context
 */
app.delete('/api/admin/expert-context/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM expert_context WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete expert context error:', error);
    res.status(500).json({ error: 'Failed to delete expert context' });
  }
});

// =============================================================================
// TELEGRAM WEBHOOK (optional)
// =============================================================================

app.post('/api/telegram/webhook', async (req, res) => {
  // Handle Telegram webhook updates if needed
  res.json({ ok: true });
});

// =============================================================================
// HEALTH CHECK
// =============================================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mskDate: getMoscowAstronomicalDate()
  });
});

// =============================================================================
// SERVE FRONTEND
// =============================================================================

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Current Moscow astronomical date: ${getMoscowAstronomicalDate()}`);
  console.log(`Admin IDs configured: ${ADMIN_TELEGRAM_IDS.length}`);
});
