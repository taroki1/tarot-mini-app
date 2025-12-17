// URL изображений карт Таро Уэйта (Rider-Waite-Smith, 1909)
// Оригинальные карты Памелы Колман Смит в общественном достоянии

const BASE_URL = 'https://upload.wikimedia.org/wikipedia/commons';

// Старшие Арканы
const MAJOR_ARCANA_IMAGES = {
  0: `${BASE_URL}/9/90/RWS_Tarot_00_Fool.jpg`,           // Шут
  1: `${BASE_URL}/d/de/RWS_Tarot_01_Magician.jpg`,      // Маг
  2: `${BASE_URL}/8/88/RWS_Tarot_02_High_Priestess.jpg`, // Верховная Жрица
  3: `${BASE_URL}/d/d2/RWS_Tarot_03_Empress.jpg`,       // Императрица
  4: `${BASE_URL}/c/c3/RWS_Tarot_04_Emperor.jpg`,       // Император
  5: `${BASE_URL}/8/8d/RWS_Tarot_05_Hierophant.jpg`,    // Иерофант
  6: `${BASE_URL}/3/3a/RWS_Tarot_06_Lovers.jpg`,        // Влюблённые
  7: `${BASE_URL}/9/9b/RWS_Tarot_07_Chariot.jpg`,       // Колесница
  8: `${BASE_URL}/f/f5/RWS_Tarot_08_Strength.jpg`,      // Сила
  9: `${BASE_URL}/4/4d/RWS_Tarot_09_Hermit.jpg`,        // Отшельник
  10: `${BASE_URL}/3/3c/RWS_Tarot_10_Wheel_of_Fortune.jpg`, // Колесо Фортуны
  11: `${BASE_URL}/e/e0/RWS_Tarot_11_Justice.jpg`,      // Справедливость
  12: `${BASE_URL}/2/2b/RWS_Tarot_12_Hanged_Man.jpg`,   // Повешенный
  13: `${BASE_URL}/d/d7/RWS_Tarot_13_Death.jpg`,        // Смерть
  14: `${BASE_URL}/f/f8/RWS_Tarot_14_Temperance.jpg`,   // Умеренность
  15: `${BASE_URL}/5/55/RWS_Tarot_15_Devil.jpg`,        // Дьявол
  16: `${BASE_URL}/5/53/RWS_Tarot_16_Tower.jpg`,        // Башня
  17: `${BASE_URL}/d/db/RWS_Tarot_17_Star.jpg`,         // Звезда
  18: `${BASE_URL}/7/7f/RWS_Tarot_18_Moon.jpg`,         // Луна
  19: `${BASE_URL}/1/17/RWS_Tarot_19_Sun.jpg`,          // Солнце
  20: `${BASE_URL}/d/dd/RWS_Tarot_20_Judgement.jpg`,    // Суд
  21: `${BASE_URL}/f/ff/RWS_Tarot_21_World.jpg`,        // Мир
};

// Жезлы (Wands)
const WANDS_IMAGES = {
  22: `${BASE_URL}/1/11/Wands01.jpg`,  // Туз Жезлов
  23: `${BASE_URL}/0/0f/Wands02.jpg`,  // Двойка Жезлов
  24: `${BASE_URL}/f/ff/Wands03.jpg`,  // Тройка Жезлов
  25: `${BASE_URL}/a/a4/Wands04.jpg`,  // Четвёрка Жезлов
  26: `${BASE_URL}/9/9d/Wands05.jpg`,  // Пятёрка Жезлов
  27: `${BASE_URL}/3/3b/Wands06.jpg`,  // Шестёрка Жезлов
  28: `${BASE_URL}/e/e4/Wands07.jpg`,  // Семёрка Жезлов
  29: `${BASE_URL}/6/6b/Wands08.jpg`,  // Восьмёрка Жезлов
  30: `${BASE_URL}/4/4d/Wands09.jpg`,  // Девятка Жезлов
  31: `${BASE_URL}/0/0b/Wands10.jpg`,  // Десятка Жезлов
  32: `${BASE_URL}/6/6a/Wands11.jpg`,  // Паж Жезлов
  33: `${BASE_URL}/1/16/Wands12.jpg`,  // Рыцарь Жезлов
  34: `${BASE_URL}/0/0d/Wands13.jpg`,  // Королева Жезлов
  35: `${BASE_URL}/c/ce/Wands14.jpg`,  // Король Жезлов
};

// Кубки (Cups)
const CUPS_IMAGES = {
  36: `${BASE_URL}/3/36/Cups01.jpg`,   // Туз Кубков
  37: `${BASE_URL}/f/f8/Cups02.jpg`,   // Двойка Кубков
  38: `${BASE_URL}/7/7a/Cups03.jpg`,   // Тройка Кубков
  39: `${BASE_URL}/3/35/Cups04.jpg`,   // Четвёрка Кубков
  40: `${BASE_URL}/d/d7/Cups05.jpg`,   // Пятёрка Кубков
  41: `${BASE_URL}/1/17/Cups06.jpg`,   // Шестёрка Кубков
  42: `${BASE_URL}/a/ae/Cups07.jpg`,   // Семёрка Кубков
  43: `${BASE_URL}/6/60/Cups08.jpg`,   // Восьмёрка Кубков
  44: `${BASE_URL}/2/24/Cups09.jpg`,   // Девятка Кубков
  45: `${BASE_URL}/8/84/Cups10.jpg`,   // Десятка Кубков
  46: `${BASE_URL}/a/ad/Cups11.jpg`,   // Паж Кубков
  47: `${BASE_URL}/f/fa/Cups12.jpg`,   // Рыцарь Кубков
  48: `${BASE_URL}/6/62/Cups13.jpg`,   // Королева Кубков
  49: `${BASE_URL}/0/04/Cups14.jpg`,   // Король Кубков
};

// Мечи (Swords)
const SWORDS_IMAGES = {
  50: `${BASE_URL}/1/1a/Swords01.jpg`, // Туз Мечей
  51: `${BASE_URL}/9/9e/Swords02.jpg`, // Двойка Мечей
  52: `${BASE_URL}/0/02/Swords03.jpg`, // Тройка Мечей
  53: `${BASE_URL}/b/bf/Swords04.jpg`, // Четвёрка Мечей
  54: `${BASE_URL}/2/23/Swords05.jpg`, // Пятёрка Мечей
  55: `${BASE_URL}/2/29/Swords06.jpg`, // Шестёрка Мечей
  56: `${BASE_URL}/3/34/Swords07.jpg`, // Семёрка Мечей
  57: `${BASE_URL}/a/a7/Swords08.jpg`, // Восьмёрка Мечей
  58: `${BASE_URL}/2/2f/Swords09.jpg`, // Девятка Мечей
  59: `${BASE_URL}/d/d4/Swords10.jpg`, // Десятка Мечей
  60: `${BASE_URL}/4/4c/Swords11.jpg`, // Паж Мечей
  61: `${BASE_URL}/b/b0/Swords12.jpg`, // Рыцарь Мечей
  62: `${BASE_URL}/d/d4/Swords13.jpg`, // Королева Мечей
  63: `${BASE_URL}/3/33/Swords14.jpg`, // Король Мечей
};

// Пентакли (Pentacles)
const PENTACLES_IMAGES = {
  64: `${BASE_URL}/f/fd/Pents01.jpg`,  // Туз Пентаклей
  65: `${BASE_URL}/9/9f/Pents02.jpg`,  // Двойка Пентаклей
  66: `${BASE_URL}/4/42/Pents03.jpg`,  // Тройка Пентаклей
  67: `${BASE_URL}/3/35/Pents04.jpg`,  // Четвёрка Пентаклей
  68: `${BASE_URL}/9/96/Pents05.jpg`,  // Пятёрка Пентаклей
  69: `${BASE_URL}/a/a6/Pents06.jpg`,  // Шестёрка Пентаклей
  70: `${BASE_URL}/6/6a/Pents07.jpg`,  // Семёрка Пентаклей
  71: `${BASE_URL}/4/49/Pents08.jpg`,  // Восьмёрка Пентаклей
  72: `${BASE_URL}/f/f0/Pents09.jpg`,  // Девятка Пентаклей
  73: `${BASE_URL}/4/42/Pents10.jpg`,  // Десятка Пентаклей
  74: `${BASE_URL}/e/ec/Pents11.jpg`,  // Паж Пентаклей
  75: `${BASE_URL}/d/d5/Pents12.jpg`,  // Рыцарь Пентаклей
  76: `${BASE_URL}/8/88/Pents13.jpg`,  // Королева Пентаклей
  77: `${BASE_URL}/1/1c/Pents14.jpg`,  // Король Пентаклей
};

// Объединяем все изображения
const ALL_CARD_IMAGES = {
  ...MAJOR_ARCANA_IMAGES,
  ...WANDS_IMAGES,
  ...CUPS_IMAGES,
  ...SWORDS_IMAGES,
  ...PENTACLES_IMAGES,
};

// Получить URL изображения карты по ID
function getCardImageUrl(cardId) {
  return ALL_CARD_IMAGES[cardId] || null;
}

module.exports = {
  ALL_CARD_IMAGES,
  getCardImageUrl,
};
