import type { Topic } from '../types/index';

/**
 * TOPIC_MAP — maps subject IDs to their official ENT specification sections.
 *
 * Section IDs match ent-specs.mjs section IDs exactly for generation/tagging alignment.
 * Each section includes `subtopics` array with IDs matching ent-specs topic IDs.
 * Ranges are proportional approximations across 150 static fallback questions.
 * For Supabase questions, `_topic` (section) and `_subtopic` fields are used directly.
 */
export const TOPIC_MAP: Record<string, Topic[] | null> = {
  // ── Mandatory Subjects ──────────────────────────────────────────────────
  math: [
    { id: 'quantitative_reasoning', name: 'Количественные рассуждения', name_kk: 'Сандық негіздеме', icon: '🔢', ranges: [[0, 44]],
      subtopics: [
        { id: 'numeric_logic', name: 'Числовые задания', name_kk: 'Сандық тапсырмалар' },
        { id: 'equation_word_problems', name: 'Уравнения и текстовые задачи', name_kk: 'Теңдеулер және сөздік есептер' },
        { id: 'percentages_diagrams', name: 'Проценты и диаграммы', name_kk: 'Пайыздар және диаграммалар' },
      ],
    },
    { id: 'uncertainty', name: 'Неопределенность', name_kk: 'Белгісіздік', icon: '📊', ranges: [[45, 74]],
      subtopics: [
        { id: 'mean_median_mode', name: 'Среднее, медиана, мода', name_kk: 'Орташа, медиана, режим' },
        { id: 'statistics_combinatorics_probability', name: 'Статистика и вероятность', name_kk: 'Статистика және ықтималдық' },
      ],
    },
    { id: 'change_dependencies', name: 'Изменение и зависимости', name_kk: 'Өзгерістер және тәуелділіктер', icon: '📈', ranges: [[75, 104]],
      subtopics: [
        { id: 'variable_dependencies', name: 'Зависимости величин', name_kk: 'Шамалардың тәуелділіктері' },
        { id: 'sequences_table_analysis', name: 'Последовательности и таблицы', name_kk: 'Тізбектер мен кестелер' },
      ],
    },
    { id: 'space_shape', name: 'Пространство и форма', name_kk: 'Кеңістік және пішін', icon: '📐', ranges: [[105, 149]],
      subtopics: [
        { id: 'geometric_logic', name: 'Геометрические задачи', name_kk: 'Геометриялық есептер' },
        { id: 'area_perimeter', name: 'Площадь и периметр', name_kk: 'Ауданы және периметрі' },
        { id: 'surface_area_solids', name: 'Площадь поверхности тел', name_kk: 'Денелердің бетінің ауданы' },
      ],
    },
  ],

  reading: null,

  history: [
    { id: 'ancient', name: 'Древний период', name_kk: 'Ежелгі кезең', icon: '🏺', ranges: [[0, 5]],
      subtopics: [
        { id: 'stone_bronze_age', name: 'Каменный и бронзовый век', name_kk: 'Тас және қола дәуірі' },
        { id: 'early_nomads', name: 'Ранние кочевники', name_kk: 'Ерте көшпелілер' },
      ],
    },
    { id: 'medieval', name: 'Средневековье', name_kk: 'Орта ғасыр', icon: '⚔️', ranges: [[6, 43]],
      subtopics: [
        { id: 'turkic_kaganate', name: 'Тюркский каганат', name_kk: 'Түрік қағанаты' },
        { id: 'turgesh_karluk', name: 'Тюргеши и карлуки', name_kk: 'Түргештер мен қарлұқтар' },
        { id: 'oguz_kimak', name: 'Огузы и кимаки', name_kk: 'Оғыздар мен қимақтар' },
        { id: 'karakhanids', name: 'Караханиды', name_kk: 'Қараханидтер' },
        { id: 'naiman_kerey_kipchak', name: 'Найманы, кереиты, кыпчаки', name_kk: 'Наймандар, керейіттер, қыпшақтар' },
        { id: 'mongol_golden_horde', name: 'Монголы и Золотая Орда', name_kk: 'Монғолдар және Алтын Орда' },
        { id: 'timur_nogai_abulkhair', name: 'Тимур, Ногайская Орда, Абулхаир', name_kk: 'Темір, Ноғай Ордасы, Әбілқайыр' },
        { id: 'kazakh_ethnogenesis', name: 'Этногенез казахов', name_kk: 'Қазақтардың этногенезі' },
        { id: 'kazakh_khanate_formation', name: 'Образование Казахского ханства', name_kk: 'Қазақ хандығының құрылуы' },
        { id: 'kasym_khan', name: 'Касым хан', name_kk: 'Қасым хан' },
        { id: 'khakhnazar_khan', name: 'Хакназар хан', name_kk: 'Хақназар хан' },
        { id: 'taukel_khan', name: 'Тауекель хан', name_kk: 'Тәуекел хан' },
        { id: 'esim_khan', name: 'Есим хан', name_kk: 'Есім хан' },
        { id: 'zhangir_khan_orbulak', name: 'Жангир хан. Орбулак', name_kk: 'Жәңгір хан. Орбұлақ' },
      ],
    },
    { id: 'modern_era', name: 'Новое время', name_kk: 'Жаңа уақыт', icon: '📜', ranges: [[44, 87]],
      subtopics: [
        { id: 'tauke_khan_zhety_zhargy', name: 'Тауке хан. Жеты жаргы', name_kk: 'Тәуке хан. Жеті жарға' },
        { id: 'khanate_admin_economy', name: 'Устройство Казахского ханства', name_kk: 'Қазақ хандығының құрылымы' },
        { id: 'dzungar_wars', name: 'Джунгарские войны', name_kk: 'Жоңғар соғыстары' },
        { id: 'russian_expansion_18c', name: 'Присоединение к России', name_kk: 'Ресейге қосылу' },
        { id: 'ablai_khan', name: 'Аблай хан', name_kk: 'Абылай хан' },
        { id: 'colonial_policy', name: 'Колониальная политика', name_kk: 'Отарлау саясаты' },
        { id: 'syrym_datov', name: 'Восстание Сырыма Датова', name_kk: 'Сырым Датов көтерілісі' },
        { id: 'reforms_1822_1824', name: 'Реформы 1822-1824', name_kk: '1822-1824 жылдардағы реформалар' },
        { id: 'uprisings_first_half_19c', name: 'Восстания первой пол. XIX в.', name_kk: 'бірінші жартысындағы көтерілістер. XIX ғ' },
        { id: 'bukeev_uprising_1836', name: 'Восстание 1836-1838', name_kk: '1836-1838 жылдардағы көтеріліс' },
        { id: 'kenesary_kasymov', name: 'Кенесары Касымов', name_kk: 'Кенесары Қасымов' },
        { id: 'zhankozha_eset_uprisings', name: 'Жанхожа и Есет', name_kk: 'Жанқожа мен Есет' },
        { id: 'reforms_1867_1868', name: 'Реформы 1867-1868', name_kk: '1867-1868 жылдардағы реформалар' },
        { id: 'uprisings_1860s_1870s', name: 'Восстания 1860-1870-х', name_kk: '1860-1870 жылдардағы көтерілістер' },
        { id: 'economic_development_19c', name: 'Экономика XIX в.', name_kk: '19 ғасырдағы экономика' },
        { id: 'society_transformation_19c', name: 'Общество XIX в.', name_kk: '19 ғасыр қоғамы' },
      ],
    },
    { id: 'first_half_20th', name: 'Первая половина XX века', name_kk: '20 ғасырдың бірінші жартысы', icon: '🏭', ranges: [[88, 114]],
      subtopics: [
        { id: 'early_20c_politics_economy', name: 'Начало XX века', name_kk: 'Ерте 20ші ғасыр' },
        { id: 'uprising_1916_revolution', name: 'Восстание 1916. Революция', name_kk: '1916 жылғы көтеріліс. Революция' },
        { id: 'alash_movement', name: 'Движение «Алаш»', name_kk: '«Алаш» қозғалысы' },
        { id: 'soviet_power_civil_war', name: 'Советская власть. Гражданская война', name_kk: 'Кеңес өкіметі. Азамат соғысы' },
        { id: 'alash_orda_kokand', name: 'Алаш-Орда и Коканд', name_kk: 'Алаш-Орда және Қоқан' },
        { id: 'kazakh_assr_formation', name: 'Образование КазАССР', name_kk: 'ҚазАССР білім' },
        { id: 'war_communism_nep', name: 'Военный коммунизм. НЭП', name_kk: 'Соғыс коммунизмі. NEP' },
        { id: 'totalitarianism_collectivization', name: 'Коллективизация. Голод', name_kk: 'Ұжымдастыру. Аштық' },
        { id: 'repressions_1920s_1930s', name: 'Репрессии 1920-1930-х', name_kk: '1920-1930 жылдардағы қуғын-сүргін' },
        { id: 'great_patriotic_war', name: 'Великая Отечественная война', name_kk: 'Ұлы Отан соғысы' },
      ],
    },
    { id: 'second_half_20th', name: 'Вторая половина XX века', name_kk: '20 ғасырдың екінші жартысы', icon: '🏗️', ranges: [[115, 128]],
      subtopics: [
        { id: 'postwar_1946_1953', name: 'Послевоенные годы', name_kk: 'Соғыстан кейінгі жылдар' },
        { id: 'khrushchev_thaw_virgin_lands', name: 'Оттепель. Целина', name_kk: 'Еріту. Тың жер' },
        { id: 'stagnation_1965_1985', name: 'Застой', name_kk: 'Тоқырау' },
        { id: 'perestroika_december_1986', name: 'Перестройка. Декабрь 1986', name_kk: 'Қайта құру. 1986 жылдың желтоқсаны' },
        { id: 'independence_sovereignty', name: 'Независимость', name_kk: 'Тәуелсіздік' },
      ],
    },
    { id: 'culture', name: 'Развитие культуры', name_kk: 'Мәдениеттің дамуы', icon: '🎨', ranges: [[129, 142]],
      subtopics: [
        { id: 'culture_early_nomads', name: 'Культура кочевников', name_kk: 'Көшпелі мәдениет' },
        { id: 'turkic_culture_silk_road', name: 'Тюркская культура', name_kk: 'Түркі мәдениеті' },
        { id: 'culture_16_18c', name: 'Культура XVI-XVIII вв.', name_kk: '16-18 ғасырлардағы мәдениет.' },
        { id: 'culture_19_early_20c', name: 'Культура XIX-нач. XX вв.', name_kk: 'Мәдениет XIX-XX ғасырдың басы' },
        { id: 'soviet_culture_education', name: 'Советская культура', name_kk: 'Кеңес мәдениеті' },
      ],
    },
    { id: 'context_tasks', name: 'Контекстные задания', name_kk: 'Мәтінмәндік тапсырмалар', icon: '📋', ranges: [[143, 149]],
      subtopics: [
        { id: 'context_documents', name: 'Документы', name_kk: 'Құжаттар' },
        { id: 'context_personalities', name: 'Личности', name_kk: 'Тұлғалар' },
        { id: 'context_maps', name: 'Карты и схемы', name_kk: 'Карталар мен диаграммалар' },
      ],
    },
  ],

  // ── Profile Subjects ────────────────────────────────────────────────────
  math_profile: [
    { id: 'numbers', name: 'Числа', name_kk: 'Сандар', icon: '🔢', ranges: [[0, 31]],
      subtopics: [
        { id: 'radicals_expressions', name: 'Радикалы и выражения', name_kk: 'Радикалдар және өрнектер' },
        { id: 'powers', name: 'Степени', name_kk: 'Дәрежелер' },
        { id: 'trigonometry', name: 'Тригонометрия', name_kk: 'Тригонометрия' },
        { id: 'algebraic_transformations', name: 'Алгебраические преобразования', name_kk: 'Алгебралық түрлендірулер' },
      ],
    },
    { id: 'equations', name: 'Уравнения', name_kk: 'Теңдеулер', icon: '✖️', ranges: [[32, 55]],
      subtopics: [
        { id: 'linear_quadratic_equations', name: 'Линейные и квадратные', name_kk: 'Сызықтық және шаршы' },
        { id: 'trig_irrational_equations', name: 'Тригонометрические и иррациональные', name_kk: 'Тригонометриялық және иррационалдық' },
        { id: 'exponential_log_equations', name: 'Показательные и логарифмические', name_kk: 'Көрсеткіштік және логарифмдік' },
      ],
    },
    { id: 'equation_systems', name: 'Системы уравнений', name_kk: 'Теңдеулер жүйесі', icon: '🔀', ranges: [[56, 72]],
      subtopics: [
        { id: 'linear_nonlinear_systems', name: 'Линейные и нелинейные системы', name_kk: 'Сызықтық және сызықты емес жүйелер' },
        { id: 'advanced_equation_systems', name: 'Сложные системы уравнений', name_kk: 'Күрделі теңдеулер жүйесі' },
      ],
    },
    { id: 'inequalities', name: 'Неравенства', name_kk: 'Теңсіздіктер', icon: '↔️', ranges: [[73, 81]],
      subtopics: [
        { id: 'inequalities', name: 'Неравенства', name_kk: 'Теңсіздіктер' },
      ],
    },
    { id: 'inequality_systems', name: 'Системы неравенств', name_kk: 'Теңсіздіктер жүйелері', icon: '⚖️', ranges: [[82, 90]],
      subtopics: [
        { id: 'inequality_systems', name: 'Системы неравенств', name_kk: 'Теңсіздіктер жүйелері' },
      ],
    },
    { id: 'sequences', name: 'Последовательности', name_kk: 'Тізбектер', icon: '🔁', ranges: [[91, 99]],
      subtopics: [
        { id: 'arithmetic_geometric_progressions', name: 'Прогрессии', name_kk: 'Прогрессия' },
      ],
    },
    { id: 'math_modeling', name: 'Мат. моделирование', name_kk: 'Мат. модельдеу', icon: '📉', ranges: [[100, 108]],
      subtopics: [
        { id: 'calculus_modeling', name: 'Начала анализа', name_kk: 'Талдаудың басталуы' },
      ],
    },
    { id: 'planimetry', name: 'Планиметрия', name_kk: 'Планиметрия', icon: '📐', ranges: [[109, 125]],
      subtopics: [
        { id: 'plane_figures', name: 'Геометрические фигуры', name_kk: 'Геометриялық пішіндер' },
        { id: 'metric_relations_vectors', name: 'Метрические соотношения', name_kk: 'Метрикалық коэффициенттер' },
      ],
    },
    { id: 'stereometry', name: 'Стереометрия', name_kk: 'Стереометрия', icon: '🔷', ranges: [[126, 142]],
      subtopics: [
        { id: 'space_figures', name: 'Фигуры в пространстве', name_kk: 'Кеңістіктегі фигуралар' },
        { id: 'space_metric_relations', name: 'Метрика в пространстве', name_kk: 'Кеңістіктегі метрика' },
      ],
    },
    { id: 'vectors_space', name: 'Векторы', name_kk: 'Векторлар', icon: '➡️', ranges: [[143, 149]],
      subtopics: [
        { id: 'space_vectors_transformations', name: 'Векторы в пространстве', name_kk: 'Кеңістіктегі векторлар' },
      ],
    },
  ],

  physics: [
    { id: 'mechanics', name: 'Механика', name_kk: 'Механика', icon: '⚙️', ranges: [[0, 29]],
      subtopics: [
        { id: 'kinematics', name: 'Кинематика', name_kk: 'Кинематика' },
        { id: 'dynamics', name: 'Динамика', name_kk: 'Динамика' },
        { id: 'statics', name: 'Статика', name_kk: 'Статика' },
        { id: 'conservation_laws', name: 'Законы сохранения', name_kk: 'Сақталу заңдары' },
        { id: 'fluid_gas_mechanics', name: 'Механика жидкостей и газов', name_kk: 'Сұйықтар мен газдардың механикасы' },
      ],
    },
    { id: 'thermal_physics', name: 'Тепловая физика', name_kk: 'Жылу физикасы', icon: '🌡️', ranges: [[30, 53]],
      subtopics: [
        { id: 'molecular_kinetic_theory', name: 'МКТ газов', name_kk: 'МКТ газдары' },
        { id: 'gas_laws', name: 'Газовые законы', name_kk: 'Газ заңдары' },
        { id: 'thermodynamics', name: 'Термодинамика', name_kk: 'Термодинамика' },
        { id: 'liquids_solids', name: 'Жидкие и твердые тела', name_kk: 'Сұйықтар мен қатты заттар' },
      ],
    },
    { id: 'electromagnetism', name: 'Электричество и магнетизм', name_kk: 'Электр және магнетизм', icon: '⚡', ranges: [[54, 83]],
      subtopics: [
        { id: 'electrostatics', name: 'Электростатика', name_kk: 'Электростатика' },
        { id: 'direct_current', name: 'Постоянный ток', name_kk: 'DC' },
        { id: 'current_in_media', name: 'Ток в различных средах', name_kk: 'Түрлі ортадағы ток' },
        { id: 'magnetic_field', name: 'Магнитное поле', name_kk: 'Магниттік өріс' },
        { id: 'electromagnetic_induction', name: 'Электромагнитная индукция', name_kk: 'Электромагниттік индукция' },
      ],
    },
    { id: 'em_oscillations', name: 'ЭМ колебания', name_kk: 'ЭМ тербелістері', icon: '〰️', ranges: [[84, 95]],
      subtopics: [
        { id: 'mechanical_oscillations', name: 'Механические колебания', name_kk: 'Механикалық тербеліс' },
        { id: 'em_oscillations_ac', name: 'ЭМ колебания. Переменный ток', name_kk: 'ЭМ тербелістері. AC' },
      ],
    },
    { id: 'em_waves', name: 'ЭМ волны', name_kk: 'ЭМ толқындары', icon: '📡', ranges: [[96, 107]],
      subtopics: [
        { id: 'wave_motion', name: 'Волновое движение', name_kk: 'Толқын қозғалысы' },
        { id: 'em_waves', name: 'Электромагнитные волны', name_kk: 'Электромагниттік толқындар' },
      ],
    },
    { id: 'optics', name: 'Оптика', name_kk: 'Оптика', icon: '🔬', ranges: [[108, 119]],
      subtopics: [
        { id: 'wave_optics', name: 'Волновая оптика', name_kk: 'Толқындық оптика' },
        { id: 'geometric_optics', name: 'Геометрическая оптика', name_kk: 'Геометриялық оптика' },
      ],
    },
    { id: 'relativity', name: 'Теория относительности', name_kk: 'Салыстырмалылық теориясы', icon: '🚀', ranges: [[120, 125]],
      subtopics: [
        { id: 'special_relativity', name: 'Теория относительности', name_kk: 'Салыстырмалылық теориясы' },
      ],
    },
    { id: 'quantum_physics', name: 'Квантовая физика', name_kk: 'Кванттық физика', icon: '⚛️', ranges: [[126, 137]],
      subtopics: [
        { id: 'atomic_quantum', name: 'Атомная и квантовая физика', name_kk: 'Атомдық және кванттық физика' },
        { id: 'nuclear_physics', name: 'Ядерная физика', name_kk: 'Ядролық физика' },
      ],
    },
    { id: 'nanotechnology', name: 'Нанотехнологии', name_kk: 'Нанотехнология', icon: '🧬', ranges: [[138, 143]],
      subtopics: [
        { id: 'nanotechnology', name: 'Нанотехнологии', name_kk: 'Нанотехнология' },
      ],
    },
    { id: 'cosmology', name: 'Космология', name_kk: 'Космология', icon: '🌌', ranges: [[144, 149]],
      subtopics: [
        { id: 'cosmology', name: 'Космология', name_kk: 'Космология' },
      ],
    },
  ],

  chemistry: [
    { id: 'particle_structure', name: 'Частицы вещества', name_kk: 'Заттың бөлшектері', icon: '⚗️', ranges: [[0, 16]],
      subtopics: [
        { id: 'atom_structure_bonding', name: 'Строение атома. Химическая связь', name_kk: 'Атомның құрылымы. Химиялық байланыс' },
        { id: 'periodic_law', name: 'Периодический закон', name_kk: 'Периодтық заң' },
      ],
    },
    { id: 'reaction_patterns', name: 'Закономерности реакций', name_kk: 'Реакциялардың үлгілері', icon: '🧪', ranges: [[17, 33]],
      subtopics: [
        { id: 'redox_electrolysis', name: 'ОВР. Электролиз', name_kk: 'OVR. Электролиз' },
        { id: 'kinetics_equilibrium', name: 'Кинетика. Равновесие', name_kk: 'Кинетика. Тепе-теңдік' },
      ],
    },
    { id: 'reaction_energetics', name: 'Энергетика реакций', name_kk: 'Реакциялардың энергиясы', icon: '🔥', ranges: [[34, 41]],
      subtopics: [
        { id: 'ionic_equilibria_hydrolysis', name: 'Ионные равновесия. Гидролиз', name_kk: 'Иондық тепе-теңдік. Гидролиз' },
      ],
    },
    { id: 'chemistry_life', name: 'Химия и жизнь', name_kk: 'Химия және өмір', icon: '💊', ranges: [[42, 95]],
      subtopics: [
        { id: 'metals_nonmetals_general', name: 'Металлы и неметаллы', name_kk: 'Металдар және бейметалдар' },
        { id: 'group_1_2_3_elements', name: 'Элементы I-III групп', name_kk: 'І-ІІІ топ элементтері' },
        { id: 'group_14_elements', name: 'Элементы IV группы', name_kk: 'IV топ элементтері' },
        { id: 'group_15_elements', name: 'Элементы V группы', name_kk: 'V топ элементтері' },
        { id: 'group_16_sulfuric_acid', name: 'Элементы VI группы. H₂SO₄', name_kk: 'VI топ элементтері. H₂SO₄' },
        { id: 'group_17_halogens', name: 'Галогены (VII группа)', name_kk: 'Галогендер (VII топ)' },
        { id: 'transition_metals_complexes', name: 'Переходные металлы. Комплексы', name_kk: 'Өтпелі металдар. Кешендер' },
      ],
    },
    { id: 'organic_chemistry', name: 'Химия вокруг нас', name_kk: 'Айналамыздағы химия', icon: '🧴', ranges: [[96, 134]],
      subtopics: [
        { id: 'hydrocarbons', name: 'Углеводороды', name_kk: 'Көмірсутектер' },
        { id: 'oxygen_containing_organic', name: 'Кислородсодержащие ОС', name_kk: 'Құрамында оттегі бар ОЖ' },
        { id: 'carbohydrates', name: 'Углеводы', name_kk: 'Көмірсулар' },
        { id: 'nitrogen_containing_organic', name: 'Азотсодержащие ОС', name_kk: 'Құрамында азот бар ОЖ' },
        { id: 'polymers_petroleum', name: 'Полимеры. Нефть', name_kk: 'Полимерлер. Мұнай' },
      ],
    },
    { id: 'calculations', name: 'Задачи', name_kk: 'Тапсырмалар', icon: '🔢', ranges: [[135, 149]],
      subtopics: [
        { id: 'calculations_kinetics_electrolysis', name: 'Задачи: кинетика и электролиз', name_kk: 'Мақсаты: кинетика және электролиз' },
        { id: 'molecular_formula_calculations', name: 'Молекулярные формулы', name_kk: 'Молекулалық формулалар' },
      ],
    },
  ],

  biology: [
    { id: 'diversity_structure_environment', name: 'Организмы и среда', name_kk: 'Организмдер және қоршаған орта', icon: '🌿', ranges: [[0, 86]],
      subtopics: [
        { id: 'biodiversity_biosphere', name: 'Биосфера и экосистемы', name_kk: 'Биосфера және экожүйелер' },
        { id: 'nutrition', name: 'Питание', name_kk: 'Тамақтану' },
        { id: 'substance_transport', name: 'Транспорт веществ', name_kk: 'Заттардың тасымалдануы' },
        { id: 'respiration', name: 'Дыхание', name_kk: 'Тыныс алу' },
        { id: 'excretion', name: 'Выделение', name_kk: 'Таңдау' },
        { id: 'movement_biophysics', name: 'Движение. Биофизика', name_kk: 'Қозғалыс. Биофизика' },
        { id: 'coordination_regulation', name: 'Координация и регуляция', name_kk: 'Үйлестіру және реттеу' },
      ],
    },
    { id: 'reproduction_heredity_evolution', name: 'Размножение и генетика', name_kk: 'Көбею және генетика', icon: '🧬', ranges: [[87, 124]],
      subtopics: [
        { id: 'reproduction_growth', name: 'Размножение и рост', name_kk: 'Көбею және өсу' },
        { id: 'cell_cycle_biology', name: 'Клеточный цикл', name_kk: 'Жасуша циклі' },
        { id: 'heredity_selection_evolution', name: 'Генетика. Селекция. Эволюция', name_kk: 'Генетика. Таңдау. Эволюция' },
      ],
    },
    { id: 'applied_sciences', name: 'Прикладные науки', name_kk: 'Қолданбалы ғылымдар', icon: '🔬', ranges: [[125, 149]],
      subtopics: [
        { id: 'molecular_biology_biochemistry', name: 'Молекулярная биология', name_kk: 'Молекулалық биология' },
        { id: 'microbiology_biotech', name: 'Микробиология и биотехнология', name_kk: 'Микробиология және биотехнология' },
      ],
    },
  ],

  geography: [
    { id: 'research_methods', name: 'Методы исследований', name_kk: 'Зерттеу әдістері', icon: '🔍', ranges: [[0, 7]],
      subtopics: [
        { id: 'research_methods', name: 'Методы исследований', name_kk: 'Зерттеу әдістері' },
      ],
    },
    { id: 'cartography_geoinformatics', name: 'Картография', name_kk: 'Картография', icon: '🗺️', ranges: [[8, 22]],
      subtopics: [
        { id: 'cartography', name: 'Картография', name_kk: 'Картография' },
        { id: 'geoinformatics', name: 'Геоинформатика', name_kk: 'Геоинформатика' },
      ],
    },
    { id: 'physical_geography', name: 'Физическая география', name_kk: 'Физикалық география', icon: '🌍', ranges: [[23, 70]],
      subtopics: [
        { id: 'lithosphere', name: 'Литосфера', name_kk: 'Литосфера' },
        { id: 'atmosphere', name: 'Атмосфера', name_kk: 'Атмосфера' },
        { id: 'hydrosphere', name: 'Гидросфера', name_kk: 'Гидросфера' },
        { id: 'biosphere', name: 'Биосфера', name_kk: 'Биосфера' },
        { id: 'natural_territorial_complexes', name: 'ПТК', name_kk: 'PTK' },
        { id: 'nature_management', name: 'Природопользование', name_kk: 'Табиғатты пайдалану' },
        { id: 'geoecological_research', name: 'Геоэкология', name_kk: 'Геоэкология' },
      ],
    },
    { id: 'social_geography', name: 'Социальная география', name_kk: 'Әлеуметтік география', icon: '👥', ranges: [[71, 78]],
      subtopics: [
        { id: 'population_geography', name: 'География населения', name_kk: 'Халықтың географиясы' },
      ],
    },
    { id: 'economic_geography', name: 'Экономическая география', name_kk: 'Экономикалық география', icon: '💹', ranges: [[79, 114]],
      subtopics: [
        { id: 'natural_resources', name: 'Природные ресурсы', name_kk: 'Табиғи ресурстар' },
        { id: 'socioeconomic_resources', name: 'Социально-экономические ресурсы', name_kk: 'Әлеуметтік-экономикалық ресурстар' },
        { id: 'world_economy_structure', name: 'Структура мирового хозяйства', name_kk: 'Дүниежүзілік шаруашылықтың құрылымы' },
        { id: 'world_economy_trends', name: 'Тенденции мирового хозяйства', name_kk: 'Әлемдік экономикадағы тенденциялар' },
        { id: 'geoeconomics', name: 'Геоэкономика', name_kk: 'Геоэкономика' },
      ],
    },
    { id: 'country_studies', name: 'Страноведение', name_kk: 'Аймақтану', icon: '🏳️', ranges: [[115, 143]],
      subtopics: [
        { id: 'countries_world', name: 'Страны мира', name_kk: 'Әлем елдері' },
        { id: 'world_regions', name: 'Регионы мира', name_kk: 'Әлемнің аймақтары' },
        { id: 'country_comparison', name: 'Сравнение стран', name_kk: 'Елдерді салыстыру' },
        { id: 'geopolitics', name: 'Геополитика', name_kk: 'Геосаясат' },
      ],
    },
    { id: 'global_problems', name: 'Глобальные проблемы', name_kk: 'Жаһандық проблемалар', icon: '🌐', ranges: [[144, 149]],
      subtopics: [
        { id: 'global_problems_solutions', name: 'Глобальные проблемы', name_kk: 'Жаһандық проблемалар' },
      ],
    },
  ],

  english: [
    { id: 'vocabulary_orthography', name: 'Лексика', name_kk: 'Сөздік', icon: '📖', ranges: [[0, 20]],
      subtopics: [
        { id: 'vocabulary_orthography', name: 'Лексика и орфография', name_kk: 'Сөздік және орфография' },
      ],
    },
    { id: 'morphology', name: 'Морфология', name_kk: 'Морфология', icon: '📝', ranges: [[21, 64]],
      subtopics: [
        { id: 'articles_prepositions_word_formation', name: 'Артикли, предлоги, словообразование', name_kk: 'Мақалалар, көсемшелер, сөзжасам' },
        { id: 'parts_of_speech', name: 'Части речи', name_kk: 'Сөйлем бөліктері' },
      ],
    },
    { id: 'syntax', name: 'Синтаксис', name_kk: 'Синтаксис', icon: '✏️', ranges: [[65, 108]],
      subtopics: [
        { id: 'sentences', name: 'Предложения', name_kk: 'Ұсыныстар' },
        { id: 'constructions', name: 'Конструкции', name_kk: 'Конструкциялар' },
      ],
    },
    { id: 'synthesis_analysis', name: 'Анализ и синтез', name_kk: 'Анализ және синтез', icon: '🔤', ranges: [[109, 129]],
      subtopics: [
        { id: 'speech_norms', name: 'Речевые нормы', name_kk: 'Сөйлеу нормалары' },
      ],
    },
    { id: 'reading', name: 'Чтение', name_kk: 'Оқу', icon: '💬', ranges: [[130, 149]],
      subtopics: [
        { id: 'text_work', name: 'Работа с текстом', name_kk: 'Мәтінмен жұмыс' },
      ],
    },
  ],

  world_history: [
    { id: 'ancient_world', name: 'Древний мир', name_kk: 'Ежелгі дүние', icon: '🏛️', ranges: [[0, 10]],
      subtopics: [
        { id: 'egypt_mesopotamia', name: 'Египет. Междуречье', name_kk: 'Египет. Месопотамия' },
        { id: 'china_india_ancient', name: 'Китай. Индия', name_kk: 'Қытай. Үндістан' },
        { id: 'greece_rome_persia', name: 'Греция. Рим. Персия', name_kk: 'Греция. Рим. Персия' },
      ],
    },
    { id: 'medieval', name: 'Средние века', name_kk: 'Орта ғасыр', icon: '⚔️', ranges: [[11, 42]],
      subtopics: [
        { id: 'huns_fall_of_rome', name: 'Гунны. Падение Рима', name_kk: 'ғұндар. Римнің құлауы' },
        { id: 'byzantium_kievan_rus', name: 'Византия. Киевская Русь', name_kk: 'Византия. Киев Русі' },
        { id: 'feudalism_wars', name: 'Феодализм и войны', name_kk: 'Феодализм және соғыстар' },
        { id: 'islam_crusades', name: 'Ислам. Крестовые походы', name_kk: 'Ислам. Крест жорықтары' },
        { id: 'mongol_empire', name: 'Монгольская империя', name_kk: 'Моңғол империясы' },
        { id: 'western_absolutism', name: 'Абсолютизм на Западе', name_kk: 'Батыстағы абсолютизм' },
        { id: 'eastern_absolutism', name: 'Абсолютизм на Востоке', name_kk: 'Шығыстағы абсолютизм' },
        { id: 'reformation', name: 'Реформация', name_kk: 'Реформация' },
      ],
    },
    { id: 'great_discoveries', name: 'Великие открытия', name_kk: 'Керемет ашылулар', icon: '🚢', ranges: [[43, 46]],
      subtopics: [
        { id: 'great_discoveries', name: 'Великие географические открытия', name_kk: 'Ұлы географиялық ашылулар' },
      ],
    },
    { id: 'early_modern', name: 'Новое время', name_kk: 'Жаңа уақыт', icon: '🏰', ranges: [[47, 82]],
      subtopics: [
        { id: 'english_revolution_industry', name: 'Английская революция', name_kk: 'Ағылшын революциясы' },
        { id: 'india_british_colonialism', name: 'Индия. Британский колониализм', name_kk: 'Үндістан. Британдық отаршылдық' },
        { id: 'usa_formation', name: 'Образование США', name_kk: 'Білім АҚШ' },
        { id: 'french_revolution_napoleon', name: 'Французская революция. Наполеон', name_kk: 'Француз революциясы. Наполеон' },
        { id: 'empire_rivalry_19c', name: 'Соперничество империй XIX в.', name_kk: '19 ғасырдағы империялар арасындағы бақталастық.' },
        { id: 'ottoman_empire', name: 'Османская империя', name_kk: 'Осман империясы' },
        { id: 'china_european_powers', name: 'Китай и Европа XIX в.', name_kk: '19 ғасырдағы Қытай мен Еуропа.' },
        { id: 'european_revolutions_1848', name: 'Революции 1848 в Европе', name_kk: 'Еуропадағы 1848 жылғы революциялар' },
        { id: 'russia_19c', name: 'Россия XIX в.', name_kk: 'Ресей 19 ғ' },
      ],
    },
    { id: 'wwi_era', name: 'Первая мировая война', name_kk: 'Бірінші дүниежүзілік соғыс', icon: '💣', ranges: [[83, 86]],
      subtopics: [
        { id: 'wwi', name: 'Первая мировая война', name_kk: 'Бірінші дүниежүзілік соғыс' },
      ],
    },
    { id: 'interwar_period', name: 'Межвоенный период', name_kk: 'Соғыстар болмаған уақыт аралығы', icon: '📰', ranges: [[87, 106]],
      subtopics: [
        { id: 'russian_revolution_turkey', name: 'Революции 1917. Турция', name_kk: '1917 жылғы революциялар. Түркия' },
        { id: 'china_japan_india_interwar', name: 'Китай. Япония. Индия', name_kk: 'Қытай. Жапония. Үндістан' },
        { id: 'great_depression_usa_france', name: 'Великая депрессия', name_kk: 'Үлкен депрессия' },
        { id: 'ussr_totalitarianism', name: 'Тоталитаризм в СССР', name_kk: 'КСРО-дағы тоталитаризм' },
        { id: 'fascism_germany_italy_spain', name: 'Фашизм: Германия, Италия, Испания', name_kk: 'Фашизм: Германия, Италия, Испания' },
      ],
    },
    { id: 'wwii', name: 'Вторая мировая война', name_kk: 'Екінші дүниежүзілік соғыс', icon: '✈️', ranges: [[107, 114]],
      subtopics: [
        { id: 'wwii_causes_alliances', name: 'Причины и союзы', name_kk: 'Себептер мен одақтар' },
        { id: 'wwii_battles_outcome', name: 'Сражения и итоги', name_kk: 'Ұрыстар мен нәтижелер' },
      ],
    },
    { id: 'second_half_20th', name: 'Вторая половина XX века', name_kk: '20 ғасырдың екінші жартысы', icon: '🌐', ranges: [[115, 134]],
      subtopics: [
        { id: 'cold_war', name: 'Холодная война', name_kk: 'Суық соғыс' },
        { id: 'international_organizations', name: 'Международные организации', name_kk: 'Халықаралық ұйымдар' },
        { id: 'western_europe_postwar', name: 'Западная Европа', name_kk: 'Батыс Еуропа' },
        { id: 'ussr_postwar', name: 'СССР после войны', name_kk: 'соғыстан кейінгі КСРО' },
        { id: 'asia_postwar', name: 'Азия после войны', name_kk: 'Соғыстан кейінгі Азия' },
      ],
    },
    { id: 'culture_ancient', name: 'Культура древнего мира', name_kk: 'Ежелгі дүние мәдениеті', icon: '🎭', ranges: [[135, 137]],
      subtopics: [
        { id: 'ancient_culture', name: 'Культура древнего мира', name_kk: 'Ежелгі дүние мәдениеті' },
      ],
    },
    { id: 'culture_medieval', name: 'Культура средневековья', name_kk: 'Ортағасырлық мәдениет', icon: '📚', ranges: [[138, 140]],
      subtopics: [
        { id: 'medieval_culture', name: 'Средневековая культура', name_kk: 'Ортағасырлық мәдениет' },
      ],
    },
    { id: 'culture_modern', name: 'Культура нового времени', name_kk: 'Жаңа уақыт мәдениеті', icon: '🎨', ranges: [[141, 143]],
      subtopics: [
        { id: 'modern_culture_enlightenment', name: 'Просвещение и культура', name_kk: 'Білім және мәдениет' },
      ],
    },
    { id: 'culture_contemporary', name: 'Культура XX-XXI веков', name_kk: 'ХХ-ХХІ ғасырлардағы мәдениет', icon: '💡', ranges: [[144, 146]],
      subtopics: [
        { id: 'contemporary_science_tech', name: 'Наука и техника XX-XXI вв.', name_kk: 'ХХ-ХХІ ғасырлардағы ғылым мен техника.' },
      ],
    },
    { id: 'context_tasks', name: 'Контекстные задания', name_kk: 'Мәтінмәндік тапсырмалар', icon: '📋', ranges: [[147, 149]],
      subtopics: [
        { id: 'context_documents_wh', name: 'Документы', name_kk: 'Құжаттар' },
        { id: 'context_personalities_wh', name: 'Личности', name_kk: 'Тұлғалар' },
        { id: 'context_maps_wh', name: 'Карты и схемы', name_kk: 'Карталар мен диаграммалар' },
      ],
    },
  ],

  informatics: [
    { id: 'computer_systems', name: 'Компьютерные системы', name_kk: 'Компьютерлік жүйелер', icon: '🖥️', ranges: [[0, 22]],
      subtopics: [
        { id: 'computer_devices', name: 'Устройства компьютера', name_kk: 'Компьютерлік құрылғылар' },
        { id: 'networks_security', name: 'Сети и безопасность', name_kk: 'Желілер және қауіпсіздік' },
      ],
    },
    { id: 'information_processes', name: 'Информационные процессы', name_kk: 'Ақпараттық процестер', icon: '📡', ranges: [[23, 58]],
      subtopics: [
        { id: 'information_coding', name: 'Кодирование информации', name_kk: 'Ақпаратты кодтау' },
        { id: 'number_systems', name: 'Системы счисления', name_kk: 'Санау жүйелері' },
        { id: 'logic_gates', name: 'Логические основы', name_kk: 'Логикалық негіздері' },
      ],
    },
    { id: 'computational_thinking', name: 'Компьютерное мышление', name_kk: 'Компьютерлік ойлау', icon: '💻', ranges: [[59, 81]],
      subtopics: [
        { id: 'python_algorithms', name: 'Python: алгоритмы', name_kk: 'Python: Алгоритмдер' },
        { id: 'advanced_algorithms', name: 'Продвинутые алгоритмы', name_kk: 'Жетілдірілген алгоритмдер' },
      ],
    },
    { id: 'hardware_software', name: 'ПО и оборудование', name_kk: 'Бағдарламалық қамтамасыз ету және аппараттық қамтамасыз ету', icon: '🔧', ranges: [[82, 93]],
      subtopics: [
        { id: 'hardware_software', name: 'ПО и оборудование', name_kk: 'Бағдарламалық қамтамасыз ету және аппараттық қамтамасыз ету' },
      ],
    },
    { id: 'information_systems', name: 'Информационные системы', name_kk: 'Ақпараттық жүйелер', icon: '🗄️', ranges: [[94, 128]],
      subtopics: [
        { id: 'relational_databases', name: 'Реляционные БД', name_kk: 'Реляциялық мәліметтер қоры' },
        { id: 'database_sql', name: 'SQL и базы данных', name_kk: 'SQL және мәліметтер базасы' },
        { id: 'modern_it_trends', name: 'Современные IT-тренды', name_kk: 'Қазіргі IT трендтері' },
      ],
    },
    { id: 'information_objects', name: 'Информационные объекты', name_kk: 'Ақпараттық объектілер', icon: '🌐', ranges: [[129, 149]],
      subtopics: [
        { id: 'information_objects', name: 'Информационные объекты', name_kk: 'Ақпараттық объектілер' },
        { id: 'web_design', name: 'Веб-проектирование', name_kk: 'Веб-дизайн' },
      ],
    },
  ],

  law: [
    { id: 'constitutional', name: 'Конституционное право', name_kk: 'Конституциялық құқық', icon: '🏛️', ranges: [[0, 29]],
      subtopics: [
        { id: 'concept_of_law', name: 'Понятие права', name_kk: 'Құқық туралы түсінік' },
        { id: 'constitutional_rights', name: 'Конституционные права', name_kk: 'Конституциялық құқықтар' },
        { id: 'state_organs', name: 'Государственные органы', name_kk: 'Мемлекеттік органдар' },
        { id: 'rule_of_law_civil_society', name: 'Правовое государство', name_kk: 'Заң үстемдігі' },
      ],
    },
    { id: 'civil', name: 'Гражданское право', name_kk: 'Азаматтық құқық', icon: '📄', ranges: [[30, 59]],
      subtopics: [
        { id: 'civil_law_concept', name: 'Понятие гражданского права', name_kk: 'Азаматтық құқық түсінігі' },
        { id: 'property_rights', name: 'Право собственности', name_kk: 'Меншік' },
        { id: 'civil_obligations', name: 'Обязательства', name_kk: 'Міндеттемелер' },
        { id: 'consumer_rights', name: 'Права потребителей', name_kk: 'Тұтынушылардың құқықтары' },
      ],
    },
    { id: 'labor', name: 'Трудовое право', name_kk: 'Еңбек құқығы', icon: '👷', ranges: [[60, 82]],
      subtopics: [
        { id: 'labor_law_concept', name: 'Понятие трудового права', name_kk: 'Еңбек құқығының түсінігі' },
        { id: 'labor_conditions', name: 'Условия труда', name_kk: 'Жұмыс жағдайлары' },
        { id: 'labor_protection_disputes', name: 'Охрана труда. Споры', name_kk: 'Еңбекті қорғау. Дау' },
      ],
    },
    { id: 'family', name: 'Семейное право', name_kk: 'Отбасы құқығы', icon: '👨‍👩‍👧', ranges: [[83, 97]],
      subtopics: [
        { id: 'marriage_family_law', name: 'Брак и семейное право', name_kk: 'Неке және отбасы құқығы' },
        { id: 'family_rights_obligations', name: 'Права членов семьи', name_kk: 'Отбасы мүшелерінің құқықтары' },
      ],
    },
    { id: 'administrative', name: 'Административное право', name_kk: 'Әкімшілік құқық', icon: '🏢', ranges: [[98, 105]],
      subtopics: [
        { id: 'administrative_law', name: 'Административное право', name_kk: 'Әкімшілік құқық' },
      ],
    },
    { id: 'criminal', name: 'Уголовное право', name_kk: 'Қылмыстық құқық', icon: '⚖️', ranges: [[106, 128]],
      subtopics: [
        { id: 'criminal_law_concept', name: 'Понятие уголовного права', name_kk: 'Қылмыстық құқық түсінігі' },
        { id: 'criminal_liability', name: 'Уголовная ответственность', name_kk: 'Қылмыстық жауапкершілік' },
        { id: 'punishment_humanism', name: 'Наказание и гуманизм', name_kk: 'Жазалау және гуманизм' },
      ],
    },
    { id: 'land_procedural', name: 'Земельное и процессуальное', name_kk: 'Жер және процессуалдық', icon: '📜', ranges: [[129, 143]],
      subtopics: [
        { id: 'land_law', name: 'Земельное право', name_kk: 'Жер құқығы' },
        { id: 'procedural_law', name: 'Процессуальное право', name_kk: 'Іс жүргізу құқығы' },
      ],
    },
    { id: 'international', name: 'Международное право', name_kk: 'Халықаралық құқық', icon: '🌍', ranges: [[144, 149]],
      subtopics: [
        { id: 'international_law', name: 'Международное право', name_kk: 'Халықаралық құқық' },
      ],
    },
  ],

  literature: [
    { id: 'heroic_epic_tales', name: 'Эпос и сказки', name_kk: 'Эпикалық және ертегілер', icon: '📕', ranges: [[0, 20]],
      subtopics: [
        { id: 'byliny_pushkin_lermontov', name: 'Былины. Пушкин. Лермонтов', name_kk: 'Дастандар. Пушкин. Лермонтов' },
        { id: 'fairy_tales_verse', name: 'Поэтические сказки', name_kk: 'Поэтикалық ертегілер' },
        { id: 'fairy_tales_prose', name: 'Прозаические сказки', name_kk: 'Прозалық ертегілер' },
        { id: 'folklore_elements', name: 'Фольклорные элементы', name_kk: 'Фольклор элементтері' },
      ],
    },
    { id: 'myths_christmas_moral', name: 'Мифы и нравственность', name_kk: 'Мифтер мен мораль', icon: '🎭', ranges: [[21, 41]],
      subtopics: [
        { id: 'myths_world', name: 'Мифы народов мира', name_kk: 'Дүние жүзі халықтарының мифтері' },
        { id: 'christmas_theme', name: 'Рождественская тема', name_kk: 'Рождество тақырыбы' },
        { id: 'moral_choice', name: 'Нравственный выбор', name_kk: 'Моральдық таңдау' },
        { id: 'myth_fairy_elements', name: 'Мифические элементы', name_kk: 'Мифтік элементтер' },
      ],
    },
    { id: 'parables_nature_satire_morals', name: 'Притчи и сатира', name_kk: 'Мақал-мәтелдер мен сатира', icon: '📖', ranges: [[42, 62]],
      subtopics: [
        { id: 'parables_legends', name: 'Притчи и легенды', name_kk: 'Мақал-мәтелдер мен аңыздар' },
        { id: 'man_and_nature', name: 'Человек и природа', name_kk: 'Адам және табиғат' },
        { id: 'satire_humor_fables', name: 'Сатира. Басни', name_kk: 'Сатира. Ертегілер' },
        { id: 'morals_ethics_values', name: 'Мораль и ценности', name_kk: 'Мораль және құндылықтар' },
      ],
    },
    { id: 'children_adults_love_dreams', name: 'Дети и взрослые', name_kk: 'Балалар мен ересектер', icon: '👨‍👧', ranges: [[63, 83]],
      subtopics: [
        { id: 'children_and_adults', name: 'Дети и взрослые', name_kk: 'Балалар мен ересектер' },
        { id: 'love_and_honor', name: 'Любовь и честь', name_kk: 'Махаббат пен Құрмет' },
        { id: 'satire_comedy', name: 'Сатира и юмор', name_kk: 'Сатира және юмор' },
        { id: 'dreams_reality', name: 'Мечты и реальность', name_kk: 'Армандар мен шындық' },
      ],
    },
    { id: 'love_little_man_satire_soul', name: 'Любовь и маленький человек', name_kk: 'Махаббат және кішкентай адам', icon: '❤️', ranges: [[84, 104]],
      subtopics: [
        { id: 'love_strangeness', name: 'Странности любви', name_kk: 'Махаббаттың оғаш құбылыстары' },
        { id: 'little_man_theme', name: 'Маленький человек', name_kk: 'Кішкентай адам' },
        { id: 'society_satire', name: 'Сатира на общество', name_kk: 'Қоғам туралы сатира' },
        { id: 'human_soul_secrets', name: 'Тайны души', name_kk: 'Жан сырлары' },
      ],
    },
    { id: 'superfluous_hero_law_family', name: 'Лишние люди', name_kk: 'Қосымша адамдар', icon: '🎩', ranges: [[105, 125]],
      subtopics: [
        { id: 'superfluous_people', name: 'Лишние люди', name_kk: 'Қосымша адамдар' },
        { id: 'hero_of_our_time', name: 'Герой нашего времени', name_kk: 'Біздің заманымыздың қаһарманы' },
        { id: 'crime_law', name: 'Преступление и закон', name_kk: 'Қылмыс және заң' },
        { id: 'family_values_lit', name: 'Семейные ценности', name_kk: 'Отбасы құндылықтары' },
      ],
    },
    { id: 'epoch_change_war_morality', name: 'Эпоха перемен и война', name_kk: 'Өзгеріс пен соғыс дәуірі', icon: '📰', ranges: [[126, 146]],
      subtopics: [
        { id: 'epoch_change', name: 'Эпоха перемен', name_kk: 'Өзгеріс жасы' },
        { id: 'totalitarian_regime', name: 'Тоталитарный режим', name_kk: 'Тоталитарлық режим' },
        { id: 'war_in_lives', name: 'Война в судьбах', name_kk: 'Тағдырлардағы соғыс' },
        { id: 'moral_choice_modern', name: 'Нравственный выбор (совр.)', name_kk: 'Моральдық таңдау (заманауи)' },
      ],
    },
    { id: 'reading_text_work', name: 'Работа с текстом', name_kk: 'Мәтінмен жұмыс', icon: '📋', ranges: [[147, 149]],
      subtopics: [
        { id: 'text_work', name: 'Работа с текстом', name_kk: 'Мәтінмен жұмыс' },
      ],
    },
  ],
};

export function getTopicQuestions<T>(pool: T[], ranges: [number, number][]): T[] {
  const result: T[] = [];
  for (const [start, end] of ranges) {
    for (let i = start; i <= end && i < pool.length; i++) {
      result.push(pool[i]);
    }
  }
  return result;
}

export function getTopicCount(ranges: [number, number][]): number {
  let count = 0;
  for (const [start, end] of ranges) {
    count += end - start + 1;
  }
  return count;
}
