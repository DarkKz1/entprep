// ==================== TOPIC MAP: index-based topic ranges for each subject ====================
// ranges are [start, end] inclusive, 0-based indices into QUESTION_POOLS arrays

const TOPIC_MAP = {
  math: [
    { id:"arithmetic", name:"Арифметика и логика", icon:"📊", ranges:[[0,124]] },
    { id:"percent_stats", name:"Проценты и статистика", icon:"📈", ranges:[[125,149]] },
  ],
  reading: null, // passages, no topic split
  history: [
    { id:"general", name:"Общие вопросы", icon:"📋", ranges:[[0,69]] },
    { id:"ancient", name:"Древняя история", icon:"🏺", ranges:[[70,84]] },
    { id:"medieval", name:"Средневековье", icon:"⚔️", ranges:[[85,99]] },
    { id:"khanate", name:"Казахское ханство", icon:"🏰", ranges:[[100,114]] },
    { id:"colonial", name:"Колониальный период", icon:"📜", ranges:[[115,129]] },
    { id:"xx_century", name:"XX век", icon:"🏭", ranges:[[130,142]] },
    { id:"independence", name:"Независимость и культура", icon:"🇰🇿", ranges:[[143,149]] },
  ],
  geography: [
    { id:"general", name:"Общие вопросы", icon:"📋", ranges:[[0,53]] },
    { id:"rivers_lakes", name:"Реки, озёра и горы", icon:"🏔️", ranges:[[54,69]] },
    { id:"climate", name:"Климат и природные зоны", icon:"🌡️", ranges:[[70,81]] },
    { id:"resources", name:"Месторождения и экономика", icon:"⛏️", ranges:[[82,93]] },
    { id:"regions", name:"Области и города", icon:"🏙️", ranges:[[94,105]] },
    { id:"world_physical", name:"Физическая география мира", icon:"🌍", ranges:[[106,121]] },
    { id:"world_economic", name:"Экономическая география", icon:"💹", ranges:[[122,137]] },
    { id:"coordinates", name:"Координаты и карты", icon:"🗺️", ranges:[[138,149]] },
  ],
  english: [
    { id:"general", name:"Общие вопросы", icon:"📋", ranges:[[0,54]] },
    { id:"tenses", name:"Времена (Tenses)", icon:"⏰", ranges:[[55,74]] },
    { id:"grammar", name:"Грамматика", icon:"📝", ranges:[[75,102]] },
    { id:"articles_prep", name:"Артикли и предлоги", icon:"🔤", ranges:[[103,115]] },
    { id:"vocabulary", name:"Лексика", icon:"📖", ranges:[[116,132]] },
    { id:"reading_idioms", name:"Чтение и идиомы", icon:"💬", ranges:[[133,149]] },
  ],
  math_profile: [
    { id:"algebra", name:"Алгебра", icon:"🔢", ranges:[[0,14],[100,109]] },
    { id:"trigonometry", name:"Тригонометрия", icon:"📐", ranges:[[15,29],[120,127]] },
    { id:"logarithms", name:"Логарифмы", icon:"📏", ranges:[[30,41]] },
    { id:"calculus", name:"Анализ", icon:"📉", ranges:[[42,62],[110,119]] },
    { id:"sequences", name:"Последовательности", icon:"🔁", ranges:[[63,71],[128,133]] },
    { id:"combinatorics", name:"Комбинаторика", icon:"🎲", ranges:[[72,81],[142,149]] },
    { id:"geometry", name:"Геометрия", icon:"📊", ranges:[[82,99],[134,141]] },
  ],
  physics: [
    { id:"mechanics", name:"Механика", icon:"⚙️", ranges:[[0,19],[70,84]] },
    { id:"molecular", name:"Молекулярная физика", icon:"🌡️", ranges:[[20,34],[85,96]] },
    { id:"electrodynamics", name:"Электродинамика", icon:"⚡", ranges:[[35,54],[97,111]] },
    { id:"magnetism", name:"Магнетизм", icon:"🧲", ranges:[[112,121]] },
    { id:"optics", name:"Оптика", icon:"🔬", ranges:[[55,69],[122,134]] },
    { id:"waves", name:"Колебания и волны", icon:"🌊", ranges:[[135,142]] },
    { id:"nuclear", name:"Атомная физика", icon:"⚛️", ranges:[[143,149]] },
  ],
  biology: [
    { id:"cytology", name:"Цитология", icon:"🔬", ranges:[[0,24]] },
    { id:"genetics", name:"Генетика", icon:"🧬", ranges:[[25,44],[130,139]] },
    { id:"evolution", name:"Эволюция и экология", icon:"🌿", ranges:[[45,59],[140,149]] },
    { id:"anatomy", name:"Анатомия человека", icon:"🫀", ranges:[[60,74],[115,129]] },
    { id:"botany_zoo", name:"Ботаника и зоология", icon:"🌱", ranges:[[75,114]] },
  ],
  chemistry: [
    { id:"theory", name:"Теоретические основы", icon:"⚗️", ranges:[[0,24]] },
    { id:"inorganic", name:"Неорганическая химия", icon:"🧪", ranges:[[25,49]] },
    { id:"organic", name:"Органическая химия", icon:"🔗", ranges:[[50,69]] },
    { id:"solutions", name:"Растворы и электролиты", icon:"💧", ranges:[[70,84]] },
    { id:"redox", name:"ОВР", icon:"🔄", ranges:[[85,99]] },
    { id:"mixed", name:"Смешанные вопросы", icon:"📋", ranges:[[100,149]] },
  ],
  world_history: [
    { id:"ancient", name:"Древний мир", icon:"🏛️", ranges:[[0,11],[70,81]] },
    { id:"medieval", name:"Средние века", icon:"⚔️", ranges:[[12,23],[82,95]] },
    { id:"early_modern", name:"Новое время", icon:"🚢", ranges:[[24,41],[96,111]] },
    { id:"modern", name:"XIX-XX века", icon:"🏭", ranges:[[42,61],[112,127]] },
    { id:"contemporary", name:"XX век и современность", icon:"🌐", ranges:[[128,141],[142,149]] },
    { id:"culture", name:"История культуры", icon:"🎨", ranges:[[62,69]] },
  ],
  informatics: [
    { id:"number_systems", name:"Системы счисления", icon:"🔢", ranges:[[0,19],[90,99]] },
    { id:"encoding", name:"Информация и кодирование", icon:"📡", ranges:[[20,34],[135,139]] },
    { id:"algorithms", name:"Алгоритмизация", icon:"🔀", ranges:[[35,54],[100,109]] },
    { id:"programming", name:"Программирование", icon:"💻", ranges:[[55,74],[110,124]] },
    { id:"logic", name:"Логика", icon:"🧠", ranges:[[75,89],[125,134]] },
    { id:"networks", name:"Сети, БД, архитектура", icon:"🌐", ranges:[[140,149]] },
  ],
  law: [
    { id:"theory", name:"Теория государства", icon:"📜", ranges:[[0,11],[70,79]] },
    { id:"constitutional", name:"Конституционное право", icon:"🏛️", ranges:[[12,23],[80,89]] },
    { id:"civil", name:"Гражданское право", icon:"📄", ranges:[[24,33],[90,99]] },
    { id:"criminal", name:"Уголовное право", icon:"⚖️", ranges:[[34,43],[100,109]] },
    { id:"labor", name:"Трудовое право", icon:"👷", ranges:[[44,51],[110,119]] },
    { id:"administrative", name:"Административное право", icon:"🏢", ranges:[[52,59],[120,127]] },
    { id:"family", name:"Семейное право", icon:"👨‍👩‍👧", ranges:[[60,64],[128,137]] },
    { id:"international", name:"Международное право", icon:"🌍", ranges:[[65,69],[138,149]] },
  ],
  literature: [
    { id:"kazakh", name:"Казахская литература", icon:"📕", ranges:[[0,19],[70,85]] },
    { id:"russian", name:"Русская литература", icon:"📗", ranges:[[20,44],[86,109]] },
    { id:"world", name:"Мировая литература", icon:"📘", ranges:[[45,54],[110,129]] },
    { id:"theory", name:"Теория литературы", icon:"📝", ranges:[[55,69],[130,141]] },
    { id:"folklore", name:"Фольклор", icon:"🎭", ranges:[[142,149]] },
  ],
};

function getTopicQuestions(pool, ranges) {
  const result = [];
  for (const [start, end] of ranges) {
    for (let i = start; i <= end && i < pool.length; i++) {
      result.push(pool[i]);
    }
  }
  return result;
}

function getTopicCount(ranges) {
  let count = 0;
  for (const [start, end] of ranges) {
    count += end - start + 1;
  }
  return count;
}

export { TOPIC_MAP, getTopicQuestions, getTopicCount };
