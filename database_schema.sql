-- database_schema.sql
-- Schema for Tarot Daily Card Telegram Mini App
-- This schema supports daily AI-generated Tarot readings with Expert knowledge base

-- Drop existing tables for clean installation
DROP TABLE IF EXISTS generations CASCADE;
DROP TABLE IF EXISTS expert_context CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- =====================================================
-- TABLE: users
-- Stores Telegram users who use the app
-- =====================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    telegram_username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_subscribed_to_notifications BOOLEAN DEFAULT true,
    total_generations INTEGER DEFAULT 0
);

-- =====================================================
-- TABLE: generations
-- Stores daily card generations for each user
-- The core table for the "one card per day" logic
-- =====================================================
CREATE TABLE generations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

    -- Card information
    card_name VARCHAR(255) NOT NULL,
    card_number INTEGER NOT NULL, -- 0-77 for the 78 Tarot cards
    card_arcana VARCHAR(50) NOT NULL, -- 'major' or 'minor'
    card_suit VARCHAR(50), -- NULL for major arcana, 'wands', 'cups', 'swords', 'pentacles' for minor

    -- AI Generated content
    image_url TEXT, -- URL of the DALL-E generated image
    image_prompt TEXT, -- The prompt used for image generation (for debugging/audit)

    -- Text interpretation (stored as JSONB for flexibility)
    text_content JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Structure: {
    --   "general_energy": "...",
    --   "love_relationships": "...",
    --   "career_finance": "...",
    --   "expert_advice": "..."
    -- }

    -- Generation metadata
    expert_context_used BOOLEAN DEFAULT false,
    generation_model VARCHAR(100), -- e.g., 'gpt-4', 'gpt-4-turbo'
    image_model VARCHAR(100), -- e.g., 'dall-e-3'

    -- Moscow timezone reset tracking
    -- The "astronomical day" resets at 9:00 AM MSK (UTC+3)
    msk_date DATE NOT NULL, -- The Moscow date for this generation
    date_generated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Admin edits
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP,
    edited_by VARCHAR(255),

    -- Sharing
    share_image_url TEXT, -- Combined image for story sharing
    times_shared INTEGER DEFAULT 0,

    -- Ensure one card per user per MSK day
    UNIQUE(user_id, msk_date)
);

-- =====================================================
-- TABLE: expert_context
-- Knowledge Base for AI generation
-- Stores transcripts from Expert's YouTube videos
-- =====================================================
CREATE TABLE expert_context (
    id SERIAL PRIMARY KEY,

    -- Content
    title VARCHAR(500), -- Video title or context name
    content_text TEXT NOT NULL, -- The transcript text
    source_url TEXT, -- YouTube URL or other source

    -- Categorization for better context retrieval
    category VARCHAR(100), -- e.g., 'general', 'love', 'career', 'spiritual'
    tags TEXT[], -- Array of tags for filtering

    -- Metadata
    is_active BOOLEAN DEFAULT true, -- Whether to include in AI context
    priority INTEGER DEFAULT 0, -- Higher priority = more likely to be used

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(255)
);

-- =====================================================
-- TABLE: admin_users
-- For administration access
-- =====================================================
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin', -- admin, super_admin

    -- Permissions
    can_manage_users BOOLEAN DEFAULT true,
    can_manage_generations BOOLEAN DEFAULT true,
    can_manage_expert_context BOOLEAN DEFAULT true,
    can_view_statistics BOOLEAN DEFAULT true,

    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- =====================================================
-- TABLE: tarot_cards
-- Reference table for the 78 Rider-Waite Tarot cards
-- =====================================================
CREATE TABLE tarot_cards (
    id SERIAL PRIMARY KEY,
    number INTEGER UNIQUE NOT NULL, -- 0-77
    name VARCHAR(255) NOT NULL,
    name_ru VARCHAR(255) NOT NULL, -- Russian name
    arcana VARCHAR(50) NOT NULL, -- 'major' or 'minor'
    suit VARCHAR(50), -- NULL for major, 'wands', 'cups', 'swords', 'pentacles' for minor
    keywords TEXT[], -- Key meanings
    description TEXT, -- Brief traditional meaning
    image_description TEXT -- Description for DALL-E prompt generation
);

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_generations_user_id ON generations(user_id);
CREATE INDEX idx_generations_msk_date ON generations(msk_date);
CREATE INDEX idx_generations_user_date ON generations(user_id, msk_date);
CREATE INDEX idx_expert_context_active ON expert_context(is_active);
CREATE INDEX idx_expert_context_category ON expert_context(category);
CREATE INDEX idx_tarot_cards_number ON tarot_cards(number);

-- =====================================================
-- TRIGGERS for automatic updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_expert_context_updated_at
    BEFORE UPDATE ON expert_context
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INSERT: Default admin user
-- Password: admin123 (should be hashed with bcrypt in production)
-- =====================================================
INSERT INTO admin_users (username, password_hash, full_name, role)
VALUES ('admin', '$2b$10$YourHashedPasswordHere', 'Administrator', 'super_admin');

-- =====================================================
-- INSERT: All 78 Rider-Waite Tarot Cards
-- =====================================================

-- Major Arcana (22 cards: 0-21)
INSERT INTO tarot_cards (number, name, name_ru, arcana, suit, keywords, description, image_description) VALUES
(0, 'The Fool', 'Шут', 'major', NULL, ARRAY['beginnings', 'innocence', 'spontaneity', 'free spirit'], 'New beginnings, taking a leap of faith, innocence, and spontaneity.', 'A young traveler in colorful clothes standing at the edge of a cliff, looking up at the sky with a white rose in hand, a small white dog at their feet, mountains in the background'),
(1, 'The Magician', 'Маг', 'major', NULL, ARRAY['manifestation', 'power', 'action', 'resourcefulness'], 'Willpower, creation, and manifesting desires into reality.', 'A robed figure standing at a table with the four suit symbols (cup, sword, wand, pentacle), one hand pointing to the sky, infinity symbol above their head'),
(2, 'The High Priestess', 'Верховная Жрица', 'major', NULL, ARRAY['intuition', 'mystery', 'subconscious', 'wisdom'], 'Inner knowledge, intuition, and the subconscious mind.', 'A serene woman in blue robes seated between two pillars (B and J), a crescent moon at her feet, holding a scroll'),
(3, 'The Empress', 'Императрица', 'major', NULL, ARRAY['abundance', 'nurturing', 'nature', 'fertility'], 'Abundance, fertility, mother nature, and creative expression.', 'A beautiful woman in flowing robes seated in a lush garden, wearing a crown of stars, surrounded by wheat and pomegranates'),
(4, 'The Emperor', 'Император', 'major', NULL, ARRAY['authority', 'structure', 'leadership', 'stability'], 'Authority, structure, control, and fatherly protection.', 'A stern figure seated on a stone throne decorated with ram heads, holding an ankh and orb, mountains behind'),
(5, 'The Hierophant', 'Иерофант', 'major', NULL, ARRAY['tradition', 'conformity', 'spirituality', 'guidance'], 'Spiritual wisdom, religious beliefs, and traditional values.', 'A religious figure in ornate robes seated between two pillars, two acolytes before them, holding a triple cross'),
(6, 'The Lovers', 'Влюбленные', 'major', NULL, ARRAY['love', 'harmony', 'relationships', 'choices'], 'Love, harmony, relationships, and important choices.', 'A man and woman standing beneath an angel with outstretched wings, a tree of knowledge and tree of life behind them'),
(7, 'The Chariot', 'Колесница', 'major', NULL, ARRAY['determination', 'willpower', 'success', 'control'], 'Victory through determination, willpower, and control.', 'A warrior in armor standing in a chariot pulled by two sphinxes (one black, one white), a city behind them'),
(8, 'Strength', 'Сила', 'major', NULL, ARRAY['courage', 'patience', 'inner strength', 'compassion'], 'Inner strength, courage, patience, and gentle control.', 'A woman gently closing the jaws of a lion, infinity symbol above her head, flowers around them'),
(9, 'The Hermit', 'Отшельник', 'major', NULL, ARRAY['introspection', 'solitude', 'guidance', 'wisdom'], 'Soul-searching, introspection, and inner guidance.', 'An old wise figure in a grey cloak standing on a mountain peak, holding a lantern with a six-pointed star'),
(10, 'Wheel of Fortune', 'Колесо Фортуны', 'major', NULL, ARRAY['change', 'cycles', 'fate', 'luck'], 'Destiny, turning points, cycles of life, and luck.', 'A great wheel with mystical symbols, creatures at each corner (angel, eagle, lion, bull), sphinx atop the wheel'),
(11, 'Justice', 'Справедливость', 'major', NULL, ARRAY['fairness', 'truth', 'law', 'karma'], 'Fairness, truth, cause and effect, and karmic justice.', 'A robed figure seated on a throne, holding a sword upright in one hand and balanced scales in the other'),
(12, 'The Hanged Man', 'Повешенный', 'major', NULL, ARRAY['surrender', 'perspective', 'sacrifice', 'release'], 'Surrender, new perspective, letting go, and sacrifice.', 'A figure suspended upside down from a T-shaped cross by one foot, a halo around their head, serene expression'),
(13, 'Death', 'Смерть', 'major', NULL, ARRAY['transformation', 'endings', 'change', 'transition'], 'Transformation, endings, and new beginnings through change.', 'A skeleton knight on a white horse, carrying a black flag with white rose, figures of all ages before them'),
(14, 'Temperance', 'Умеренность', 'major', NULL, ARRAY['balance', 'moderation', 'patience', 'harmony'], 'Balance, moderation, patience, and finding middle ground.', 'An angel with one foot on land and one in water, pouring liquid between two cups, mountains and sun in background'),
(15, 'The Devil', 'Дьявол', 'major', NULL, ARRAY['bondage', 'materialism', 'shadow self', 'addiction'], 'Shadow self, attachment, addiction, and materialism.', 'A horned devil figure on a pedestal, two chained figures below, inverted pentagram above'),
(16, 'The Tower', 'Башня', 'major', NULL, ARRAY['upheaval', 'revelation', 'awakening', 'chaos'], 'Sudden change, upheaval, chaos, and revelation.', 'A tall tower struck by lightning, crown falling from top, two figures falling, flames and debris'),
(17, 'The Star', 'Звезда', 'major', NULL, ARRAY['hope', 'faith', 'renewal', 'inspiration'], 'Hope, faith, purpose, renewal, and inspiration.', 'A naked woman kneeling by water, pouring water from two jugs, one large star and seven smaller stars above'),
(18, 'The Moon', 'Луна', 'major', NULL, ARRAY['illusion', 'fear', 'anxiety', 'intuition'], 'Illusion, fear, anxiety, and the subconscious mind.', 'A full moon with a face, a dog and wolf howling, a crayfish emerging from water, path between two towers'),
(19, 'The Sun', 'Солнце', 'major', NULL, ARRAY['joy', 'success', 'vitality', 'positivity'], 'Joy, success, celebration, and positivity.', 'A bright sun with a face, a happy child on a white horse, sunflowers behind a wall'),
(20, 'Judgement', 'Суд', 'major', NULL, ARRAY['rebirth', 'reflection', 'reckoning', 'awakening'], 'Reflection, reckoning, awakening, and inner calling.', 'An angel blowing a trumpet from clouds, figures rising from coffins below, arms raised'),
(21, 'The World', 'Мир', 'major', NULL, ARRAY['completion', 'achievement', 'fulfillment', 'wholeness'], 'Completion, integration, accomplishment, and fulfillment.', 'A dancing figure wrapped in purple cloth within a large wreath, four creatures in corners (angel, eagle, lion, bull)');

-- Minor Arcana: Wands (14 cards: 22-35)
INSERT INTO tarot_cards (number, name, name_ru, arcana, suit, keywords, description, image_description) VALUES
(22, 'Ace of Wands', 'Туз Жезлов', 'minor', 'wands', ARRAY['inspiration', 'new opportunities', 'growth', 'potential'], 'New beginnings, inspiration, and creative potential.', 'A hand emerging from clouds holding a sprouting wooden wand, leaves floating around, landscape below'),
(23, 'Two of Wands', 'Двойка Жезлов', 'minor', 'wands', ARRAY['planning', 'decisions', 'discovery', 'progress'], 'Future planning, progress, and making decisions.', 'A figure holding a globe standing between two wands, looking out over the sea and mountains'),
(24, 'Three of Wands', 'Тройка Жезлов', 'minor', 'wands', ARRAY['expansion', 'foresight', 'leadership', 'progress'], 'Expansion, foresight, and overseas opportunities.', 'A figure with back turned, holding one wand, two others planted nearby, watching ships at sea'),
(25, 'Four of Wands', 'Четверка Жезлов', 'minor', 'wands', ARRAY['celebration', 'harmony', 'homecoming', 'community'], 'Celebration, harmony, and homecoming.', 'Four wands forming a canopy decorated with flowers and garlands, figures celebrating below, castle in background'),
(26, 'Five of Wands', 'Пятерка Жезлов', 'minor', 'wands', ARRAY['conflict', 'competition', 'tension', 'diversity'], 'Conflict, competition, and disagreements.', 'Five figures each holding a wand, appearing to battle or compete with each other'),
(27, 'Six of Wands', 'Шестерка Жезлов', 'minor', 'wands', ARRAY['victory', 'success', 'recognition', 'acclaim'], 'Victory, success, and public recognition.', 'A figure on horseback wearing a laurel wreath, holding a wand with another wreath, crowd with wands below'),
(28, 'Seven of Wands', 'Семерка Жезлов', 'minor', 'wands', ARRAY['challenge', 'perseverance', 'defense', 'determination'], 'Challenge, perseverance, and standing your ground.', 'A figure on higher ground defending against six wands from below, determined expression'),
(29, 'Eight of Wands', 'Восьмерка Жезлов', 'minor', 'wands', ARRAY['speed', 'movement', 'swift action', 'progress'], 'Rapid action, movement, and swift changes.', 'Eight wands flying through the air at high speed over a river landscape'),
(30, 'Nine of Wands', 'Девятка Жезлов', 'minor', 'wands', ARRAY['resilience', 'courage', 'persistence', 'boundaries'], 'Resilience, courage, and last stand.', 'A bandaged figure leaning on a wand, eight more wands standing behind like a fence, wary expression'),
(31, 'Ten of Wands', 'Десятка Жезлов', 'minor', 'wands', ARRAY['burden', 'responsibility', 'hard work', 'stress'], 'Burden, extra responsibility, and hard work.', 'A figure carrying ten heavy wands, struggling toward a distant town'),
(32, 'Page of Wands', 'Паж Жезлов', 'minor', 'wands', ARRAY['enthusiasm', 'exploration', 'discovery', 'free spirit'], 'Enthusiasm, exploration, and new ideas.', 'A young figure in colorful clothes holding a wand, looking at it with curiosity, desert landscape'),
(33, 'Knight of Wands', 'Рыцарь Жезлов', 'minor', 'wands', ARRAY['energy', 'passion', 'adventure', 'action'], 'Energy, passion, adventure, and impulsiveness.', 'An armored knight on a rearing horse, holding a wand, wearing a salamander-decorated tunic'),
(34, 'Queen of Wands', 'Королева Жезлов', 'minor', 'wands', ARRAY['confidence', 'courage', 'independence', 'warmth'], 'Confidence, independence, and warm determination.', 'A queen on a throne decorated with lions and sunflowers, holding a wand and sunflower, black cat at feet'),
(35, 'King of Wands', 'Король Жезлов', 'minor', 'wands', ARRAY['leadership', 'vision', 'entrepreneur', 'honor'], 'Leadership, vision, and entrepreneurial spirit.', 'A king on a throne with salamander and lion decorations, holding a flowering wand, looking forward');

-- Minor Arcana: Cups (14 cards: 36-49)
INSERT INTO tarot_cards (number, name, name_ru, arcana, suit, keywords, description, image_description) VALUES
(36, 'Ace of Cups', 'Туз Кубков', 'minor', 'cups', ARRAY['love', 'new feelings', 'intuition', 'compassion'], 'New love, compassion, and emotional beginnings.', 'A hand from clouds holding an overflowing cup, dove descending, water lilies and lotus below'),
(37, 'Two of Cups', 'Двойка Кубков', 'minor', 'cups', ARRAY['partnership', 'unity', 'attraction', 'connection'], 'Unified love, partnership, and mutual attraction.', 'A man and woman exchanging cups, caduceus with lion head floating above, pledging to each other'),
(38, 'Three of Cups', 'Тройка Кубков', 'minor', 'cups', ARRAY['celebration', 'friendship', 'community', 'joy'], 'Celebration, friendship, and creative collaboration.', 'Three women dancing in a circle, raising cups in celebration, harvest fruits at their feet'),
(39, 'Four of Cups', 'Четверка Кубков', 'minor', 'cups', ARRAY['contemplation', 'apathy', 'meditation', 'reevaluation'], 'Contemplation, apathy, and reevaluation.', 'A figure sitting under a tree, arms crossed, three cups before them, hand from cloud offering fourth cup'),
(40, 'Five of Cups', 'Пятерка Кубков', 'minor', 'cups', ARRAY['loss', 'grief', 'disappointment', 'regret'], 'Loss, grief, and focusing on the negative.', 'A cloaked figure looking down at three spilled cups, two upright cups behind, bridge and river in distance'),
(41, 'Six of Cups', 'Шестерка Кубков', 'minor', 'cups', ARRAY['nostalgia', 'memories', 'innocence', 'reunion'], 'Nostalgia, childhood memories, and innocence.', 'A child offering a cup with flowers to another child in a garden, six cups filled with flowers around them'),
(42, 'Seven of Cups', 'Семерка Кубков', 'minor', 'cups', ARRAY['choices', 'fantasy', 'illusion', 'wishful thinking'], 'Fantasy, illusion, and wishful thinking.', 'A figure in silhouette facing seven cups in clouds, each containing different visions (castle, jewels, wreath, dragon, snake, shrouded figure, glowing figure)'),
(43, 'Eight of Cups', 'Восьмерка Кубков', 'minor', 'cups', ARRAY['departure', 'withdrawal', 'searching', 'disappointment'], 'Walking away, seeking deeper meaning.', 'A cloaked figure walking away from eight stacked cups toward mountains under a moon'),
(44, 'Nine of Cups', 'Девятка Кубков', 'minor', 'cups', ARRAY['satisfaction', 'wishes fulfilled', 'contentment', 'luxury'], 'Wishes fulfilled, satisfaction, and contentment.', 'A smiling figure seated with arms crossed, nine cups arranged on a curved shelf behind them'),
(45, 'Ten of Cups', 'Десятка Кубков', 'minor', 'cups', ARRAY['happiness', 'family', 'harmony', 'alignment'], 'Divine love, family harmony, and lasting happiness.', 'A couple with arms raised toward a rainbow of ten cups, two children playing nearby, house in pastoral setting'),
(46, 'Page of Cups', 'Паж Кубков', 'minor', 'cups', ARRAY['creativity', 'intuition', 'curiosity', 'possibility'], 'Creative opportunity, intuition, and curiosity.', 'A young figure in floral tunic holding a cup, surprised by a fish emerging from it, standing by the sea'),
(47, 'Knight of Cups', 'Рыцарь Кубков', 'minor', 'cups', ARRAY['romance', 'charm', 'creativity', 'imagination'], 'Romance, charm, and following the heart.', 'A knight on a calm horse, holding a cup, wearing a cloak with fish designs, peaceful landscape'),
(48, 'Queen of Cups', 'Королева Кубков', 'minor', 'cups', ARRAY['compassion', 'intuition', 'nurturing', 'sensitivity'], 'Compassion, calm, intuitive, and nurturing.', 'A queen on a throne at waters edge, holding an ornate cup, angels and shells decorating her throne'),
(49, 'King of Cups', 'Король Кубков', 'minor', 'cups', ARRAY['emotional balance', 'diplomacy', 'wisdom', 'calm'], 'Emotional balance, compassion, and diplomacy.', 'A king on a throne amid turbulent sea, holding cup and scepter, fish amulet around neck, ship in background');

-- Minor Arcana: Swords (14 cards: 50-63)
INSERT INTO tarot_cards (number, name, name_ru, arcana, suit, keywords, description, image_description) VALUES
(50, 'Ace of Swords', 'Туз Мечей', 'minor', 'swords', ARRAY['clarity', 'breakthrough', 'truth', 'new ideas'], 'Mental clarity, breakthrough, and new ideas.', 'A hand from clouds grasping an upright sword crowned with a wreath, mountains below'),
(51, 'Two of Swords', 'Двойка Мечей', 'minor', 'swords', ARRAY['difficult choices', 'stalemate', 'avoidance', 'blocked emotions'], 'Difficult choices, stalemate, and blocked emotions.', 'A blindfolded figure seated, holding two crossed swords, crescent moon and water behind'),
(52, 'Three of Swords', 'Тройка Мечей', 'minor', 'swords', ARRAY['heartbreak', 'grief', 'sorrow', 'painful truth'], 'Heartbreak, grief, and painful truth.', 'A heart pierced by three swords, storm clouds and rain in background'),
(53, 'Four of Swords', 'Четверка Мечей', 'minor', 'swords', ARRAY['rest', 'recovery', 'contemplation', 'solitude'], 'Rest, recovery, and contemplation.', 'A figure lying on a tomb in prayer position, three swords on wall, one beneath, stained glass window'),
(54, 'Five of Swords', 'Пятерка Мечей', 'minor', 'swords', ARRAY['conflict', 'defeat', 'winning at all costs', 'hostility'], 'Conflict, defeat, and hollow victory.', 'A smirking figure holding three swords, two more on ground, two dejected figures walking away'),
(55, 'Six of Swords', 'Шестерка Мечей', 'minor', 'swords', ARRAY['transition', 'moving on', 'change', 'journey'], 'Transition, moving on, and rite of passage.', 'A ferryman guiding a boat with a cloaked figure and child, six swords in the boat, calm waters ahead'),
(56, 'Seven of Swords', 'Семерка Мечей', 'minor', 'swords', ARRAY['deception', 'strategy', 'stealth', 'cunning'], 'Strategy, deception, and getting away with something.', 'A figure sneaking away from a camp carrying five swords, two left behind, tents in background'),
(57, 'Eight of Swords', 'Восьмерка Мечей', 'minor', 'swords', ARRAY['restriction', 'helplessness', 'self-imposed limitations', 'victim mentality'], 'Restriction, self-imposed limitations, and feeling trapped.', 'A blindfolded bound figure surrounded by eight swords, water and castle in background'),
(58, 'Nine of Swords', 'Девятка Мечей', 'minor', 'swords', ARRAY['anxiety', 'worry', 'fear', 'nightmares'], 'Anxiety, worry, and sleepless nights.', 'A figure sitting up in bed, head in hands, nine swords on the wall behind, dark room'),
(59, 'Ten of Swords', 'Десятка Мечей', 'minor', 'swords', ARRAY['painful endings', 'rock bottom', 'betrayal', 'crisis'], 'Painful endings, betrayal, and hitting rock bottom.', 'A figure lying face down with ten swords in their back, dark sky, dawn breaking on horizon'),
(60, 'Page of Swords', 'Паж Мечей', 'minor', 'swords', ARRAY['curiosity', 'vigilance', 'new ideas', 'communication'], 'Curiosity, new ways of communicating, and vigilance.', 'A young figure holding a sword upright, standing on rocky ground, birds and clouds in sky'),
(61, 'Knight of Swords', 'Рыцарь Мечей', 'minor', 'swords', ARRAY['action', 'ambition', 'determination', 'speed'], 'Ambitious, action-oriented, and charging ahead.', 'A knight charging forward on horse at full gallop, sword raised, stormy sky, trees bending'),
(62, 'Queen of Swords', 'Королева Мечей', 'minor', 'swords', ARRAY['perception', 'clear thinking', 'independence', 'direct communication'], 'Clear-thinking, independent, and direct communicator.', 'A queen on a throne with butterflies and clouds, holding upraised sword, one hand extended, stern expression'),
(63, 'King of Swords', 'Король Мечей', 'minor', 'swords', ARRAY['intellectual power', 'authority', 'truth', 'ethics'], 'Intellectual power, authority, and ethical judgment.', 'A king on throne with butterfly and angel decorations, holding upright sword, clouds behind');

-- Minor Arcana: Pentacles (14 cards: 64-77)
INSERT INTO tarot_cards (number, name, name_ru, arcana, suit, keywords, description, image_description) VALUES
(64, 'Ace of Pentacles', 'Туз Пентаклей', 'minor', 'pentacles', ARRAY['opportunity', 'prosperity', 'new venture', 'manifestation'], 'New financial opportunity, manifestation, and abundance.', 'A hand from clouds holding a golden pentacle, garden path leading to archway below, lush greenery'),
(65, 'Two of Pentacles', 'Двойка Пентаклей', 'minor', 'pentacles', ARRAY['balance', 'adaptability', 'time management', 'priorities'], 'Balance, adaptability, and time management.', 'A figure juggling two pentacles connected by infinity symbol, ships on rolling waves behind'),
(66, 'Three of Pentacles', 'Тройка Пентаклей', 'minor', 'pentacles', ARRAY['teamwork', 'skill', 'collaboration', 'learning'], 'Teamwork, collaboration, and skilled work.', 'A craftsman working on cathedral arch while two figures (monk and noble) review plans'),
(67, 'Four of Pentacles', 'Четверка Пентаклей', 'minor', 'pentacles', ARRAY['security', 'conservation', 'control', 'stability'], 'Security, conservation, and holding onto resources.', 'A figure seated on a stool, one pentacle on head, one clutched to chest, two under feet, city behind'),
(68, 'Five of Pentacles', 'Пятерка Пентаклей', 'minor', 'pentacles', ARRAY['hardship', 'isolation', 'worry', 'financial loss'], 'Financial hardship, isolation, and worry.', 'Two impoverished figures passing a lit church window with five pentacles in the glass, snow falling'),
(69, 'Six of Pentacles', 'Шестерка Пентаклей', 'minor', 'pentacles', ARRAY['generosity', 'charity', 'giving', 'sharing'], 'Generosity, charity, and sharing wealth.', 'A wealthy merchant with scales giving coins to two kneeling beggars, six pentacles around'),
(70, 'Seven of Pentacles', 'Семерка Пентаклей', 'minor', 'pentacles', ARRAY['patience', 'investment', 'assessment', 'long-term view'], 'Long-term view, sustainable results, and patience.', 'A gardener leaning on a hoe, contemplating seven pentacles growing on a bush'),
(71, 'Eight of Pentacles', 'Восьмерка Пентаклей', 'minor', 'pentacles', ARRAY['craftsmanship', 'skill development', 'dedication', 'mastery'], 'Apprenticeship, dedication, and skill development.', 'A craftsman at workbench carving a pentacle, six completed pentacles displayed, one in progress'),
(72, 'Nine of Pentacles', 'Девятка Пентаклей', 'minor', 'pentacles', ARRAY['abundance', 'luxury', 'self-sufficiency', 'discipline'], 'Luxury, self-sufficiency, and financial independence.', 'An elegant figure in vineyard with falcon on gloved hand, nine pentacles in abundant grape vines'),
(73, 'Ten of Pentacles', 'Десятка Пентаклей', 'minor', 'pentacles', ARRAY['legacy', 'inheritance', 'family', 'establishment'], 'Wealth, inheritance, and family establishment.', 'An elderly figure with dogs at archway, family in background, ten pentacles arranged in Tree of Life pattern'),
(74, 'Page of Pentacles', 'Паж Пентаклей', 'minor', 'pentacles', ARRAY['ambition', 'desire', 'diligence', 'new beginnings'], 'Manifestation, financial opportunity, and new skill.', 'A young figure holding and studying a pentacle, standing in green field, mountains in distance'),
(75, 'Knight of Pentacles', 'Рыцарь Пентаклей', 'minor', 'pentacles', ARRAY['efficiency', 'routine', 'conservatism', 'methodical'], 'Hard work, routine, and methodical approach.', 'A knight on a heavy draft horse, holding a pentacle, overlooking plowed field, patient expression'),
(76, 'Queen of Pentacles', 'Королева Пентаклей', 'minor', 'pentacles', ARRAY['nurturing', 'practical', 'security', 'abundance'], 'Practical, homebody, and nurturing provider.', 'A queen on a throne with goats and angels, holding a pentacle in lap, surrounded by fruits and flowers'),
(77, 'King of Pentacles', 'Король Пентаклей', 'minor', 'pentacles', ARRAY['abundance', 'security', 'control', 'discipline'], 'Abundance, security, and business leadership.', 'A king on a throne with bull decorations, robe with grapes and vines, holding pentacle and scepter, castle behind');

-- =====================================================
-- Sample Expert Context (placeholder)
-- =====================================================
INSERT INTO expert_context (title, content_text, category, tags, is_active, priority)
VALUES (
    'Sample Expert Context',
    'This is a placeholder for the Expert''s YouTube transcripts. Replace this with actual transcripts to enable AI-powered interpretations in the Expert''s unique style.',
    'general',
    ARRAY['placeholder', 'sample'],
    true,
    0
);

-- =====================================================
-- Comments for Schema Understanding
-- =====================================================

/*
MOSCOW TIMEZONE LOGIC EXPLANATION:
- The app uses Moscow Time (UTC+3) for the daily reset
- Reset happens at 9:00 AM MSK every day
- The 'msk_date' column stores the "astronomical day" for each generation
- A user can only have ONE generation per msk_date
- Example: If user generates at 8:00 AM MSK on Jan 15, msk_date = Jan 14 (still previous cycle)
- Example: If user generates at 10:00 AM MSK on Jan 15, msk_date = Jan 15 (new cycle)

GENERATION FLOW:
1. User requests daily card
2. System calculates current Moscow "astronomical day" (considering 9 AM reset)
3. Check if generation exists for this user + msk_date
4. If exists: return existing generation
5. If not: generate new card with AI, save to database, return

EXPERT CONTEXT USAGE:
1. Active expert_context entries are loaded
2. Text is compiled and sent as system prompt context to GPT-4
3. This shapes the interpretation style to match the Expert's unique voice
*/
