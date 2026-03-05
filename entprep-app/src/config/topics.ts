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
    { id: 'quantitative_reasoning', name: 'Количественные рассуждения', icon: '🔢', ranges: [[0, 44]],
      subtopics: [
        { id: 'numeric_logic', name: 'Числовые задания' },
        { id: 'equation_word_problems', name: 'Уравнения и текстовые задачи' },
        { id: 'percentages_diagrams', name: 'Проценты и диаграммы' },
      ],
    },
    { id: 'uncertainty', name: 'Неопределенность', icon: '📊', ranges: [[45, 74]],
      subtopics: [
        { id: 'mean_median_mode', name: 'Среднее, медиана, мода' },
        { id: 'statistics_combinatorics_probability', name: 'Статистика и вероятность' },
      ],
    },
    { id: 'change_dependencies', name: 'Изменение и зависимости', icon: '📈', ranges: [[75, 104]],
      subtopics: [
        { id: 'variable_dependencies', name: 'Зависимости величин' },
        { id: 'sequences_table_analysis', name: 'Последовательности и таблицы' },
      ],
    },
    { id: 'space_shape', name: 'Пространство и форма', icon: '📐', ranges: [[105, 149]],
      subtopics: [
        { id: 'geometric_logic', name: 'Геометрические задачи' },
        { id: 'area_perimeter', name: 'Площадь и периметр' },
        { id: 'surface_area_solids', name: 'Площадь поверхности тел' },
      ],
    },
  ],

  reading: null,

  history: [
    { id: 'ancient', name: 'Древний период', icon: '🏺', ranges: [[0, 5]],
      subtopics: [
        { id: 'stone_bronze_age', name: 'Каменный и бронзовый век' },
        { id: 'early_nomads', name: 'Ранние кочевники' },
      ],
    },
    { id: 'medieval', name: 'Средневековье', icon: '⚔️', ranges: [[6, 43]],
      subtopics: [
        { id: 'turkic_kaganate', name: 'Тюркский каганат' },
        { id: 'turgesh_karluk', name: 'Тюргеши и карлуки' },
        { id: 'oguz_kimak', name: 'Огузы и кимаки' },
        { id: 'karakhanids', name: 'Караханиды' },
        { id: 'naiman_kerey_kipchak', name: 'Найманы, кереиты, кыпчаки' },
        { id: 'mongol_golden_horde', name: 'Монголы и Золотая Орда' },
        { id: 'timur_nogai_abulkhair', name: 'Тимур, Ногайская Орда, Абулхаир' },
        { id: 'kazakh_ethnogenesis', name: 'Этногенез казахов' },
        { id: 'kazakh_khanate_formation', name: 'Образование Казахского ханства' },
        { id: 'kasym_khan', name: 'Касым хан' },
        { id: 'khakhnazar_khan', name: 'Хакназар хан' },
        { id: 'taukel_khan', name: 'Тауекель хан' },
        { id: 'esim_khan', name: 'Есим хан' },
        { id: 'zhangir_khan_orbulak', name: 'Жангир хан. Орбулак' },
      ],
    },
    { id: 'modern_era', name: 'Новое время', icon: '📜', ranges: [[44, 87]],
      subtopics: [
        { id: 'tauke_khan_zhety_zhargy', name: 'Тауке хан. Жеты жаргы' },
        { id: 'khanate_admin_economy', name: 'Устройство Казахского ханства' },
        { id: 'dzungar_wars', name: 'Джунгарские войны' },
        { id: 'russian_expansion_18c', name: 'Присоединение к России' },
        { id: 'ablai_khan', name: 'Аблай хан' },
        { id: 'colonial_policy', name: 'Колониальная политика' },
        { id: 'syrym_datov', name: 'Восстание Сырыма Датова' },
        { id: 'reforms_1822_1824', name: 'Реформы 1822-1824' },
        { id: 'uprisings_first_half_19c', name: 'Восстания первой пол. XIX в.' },
        { id: 'bukeev_uprising_1836', name: 'Восстание 1836-1838' },
        { id: 'kenesary_kasymov', name: 'Кенесары Касымов' },
        { id: 'zhankozha_eset_uprisings', name: 'Жанхожа и Есет' },
        { id: 'reforms_1867_1868', name: 'Реформы 1867-1868' },
        { id: 'uprisings_1860s_1870s', name: 'Восстания 1860-1870-х' },
        { id: 'economic_development_19c', name: 'Экономика XIX в.' },
        { id: 'society_transformation_19c', name: 'Общество XIX в.' },
      ],
    },
    { id: 'first_half_20th', name: 'Первая половина XX века', icon: '🏭', ranges: [[88, 114]],
      subtopics: [
        { id: 'early_20c_politics_economy', name: 'Начало XX века' },
        { id: 'uprising_1916_revolution', name: 'Восстание 1916. Революция' },
        { id: 'alash_movement', name: 'Движение «Алаш»' },
        { id: 'soviet_power_civil_war', name: 'Советская власть. Гражданская война' },
        { id: 'alash_orda_kokand', name: 'Алаш-Орда и Коканд' },
        { id: 'kazakh_assr_formation', name: 'Образование КазАССР' },
        { id: 'war_communism_nep', name: 'Военный коммунизм. НЭП' },
        { id: 'totalitarianism_collectivization', name: 'Коллективизация. Голод' },
        { id: 'repressions_1920s_1930s', name: 'Репрессии 1920-1930-х' },
        { id: 'great_patriotic_war', name: 'Великая Отечественная война' },
      ],
    },
    { id: 'second_half_20th', name: 'Вторая половина XX века', icon: '🏗️', ranges: [[115, 128]],
      subtopics: [
        { id: 'postwar_1946_1953', name: 'Послевоенные годы' },
        { id: 'khrushchev_thaw_virgin_lands', name: 'Оттепель. Целина' },
        { id: 'stagnation_1965_1985', name: 'Застой' },
        { id: 'perestroika_december_1986', name: 'Перестройка. Декабрь 1986' },
        { id: 'independence_sovereignty', name: 'Независимость' },
      ],
    },
    { id: 'culture', name: 'Развитие культуры', icon: '🎨', ranges: [[129, 142]],
      subtopics: [
        { id: 'culture_early_nomads', name: 'Культура кочевников' },
        { id: 'turkic_culture_silk_road', name: 'Тюркская культура' },
        { id: 'culture_16_18c', name: 'Культура XVI-XVIII вв.' },
        { id: 'culture_19_early_20c', name: 'Культура XIX-нач. XX вв.' },
        { id: 'soviet_culture_education', name: 'Советская культура' },
      ],
    },
    { id: 'context_tasks', name: 'Контекстные задания', icon: '📋', ranges: [[143, 149]],
      subtopics: [
        { id: 'context_documents', name: 'Документы' },
        { id: 'context_personalities', name: 'Личности' },
        { id: 'context_maps', name: 'Карты и схемы' },
      ],
    },
  ],

  // ── Profile Subjects ────────────────────────────────────────────────────
  math_profile: [
    { id: 'numbers', name: 'Числа', icon: '🔢', ranges: [[0, 31]],
      subtopics: [
        { id: 'radicals_expressions', name: 'Радикалы и выражения' },
        { id: 'powers', name: 'Степени' },
        { id: 'trigonometry', name: 'Тригонометрия' },
        { id: 'algebraic_transformations', name: 'Алгебраические преобразования' },
      ],
    },
    { id: 'equations', name: 'Уравнения', icon: '✖️', ranges: [[32, 55]],
      subtopics: [
        { id: 'linear_quadratic_equations', name: 'Линейные и квадратные' },
        { id: 'trig_irrational_equations', name: 'Тригонометрические и иррациональные' },
        { id: 'exponential_log_equations', name: 'Показательные и логарифмические' },
      ],
    },
    { id: 'equation_systems', name: 'Системы уравнений', icon: '🔀', ranges: [[56, 72]],
      subtopics: [
        { id: 'linear_nonlinear_systems', name: 'Линейные и нелинейные системы' },
        { id: 'advanced_equation_systems', name: 'Сложные системы уравнений' },
      ],
    },
    { id: 'inequalities', name: 'Неравенства', icon: '↔️', ranges: [[73, 81]],
      subtopics: [
        { id: 'inequalities', name: 'Неравенства' },
      ],
    },
    { id: 'inequality_systems', name: 'Системы неравенств', icon: '⚖️', ranges: [[82, 90]],
      subtopics: [
        { id: 'inequality_systems', name: 'Системы неравенств' },
      ],
    },
    { id: 'sequences', name: 'Последовательности', icon: '🔁', ranges: [[91, 99]],
      subtopics: [
        { id: 'arithmetic_geometric_progressions', name: 'Прогрессии' },
      ],
    },
    { id: 'math_modeling', name: 'Мат. моделирование', icon: '📉', ranges: [[100, 108]],
      subtopics: [
        { id: 'calculus_modeling', name: 'Начала анализа' },
      ],
    },
    { id: 'planimetry', name: 'Планиметрия', icon: '📐', ranges: [[109, 125]],
      subtopics: [
        { id: 'plane_figures', name: 'Геометрические фигуры' },
        { id: 'metric_relations_vectors', name: 'Метрические соотношения' },
      ],
    },
    { id: 'stereometry', name: 'Стереометрия', icon: '🔷', ranges: [[126, 142]],
      subtopics: [
        { id: 'space_figures', name: 'Фигуры в пространстве' },
        { id: 'space_metric_relations', name: 'Метрика в пространстве' },
      ],
    },
    { id: 'vectors_space', name: 'Векторы', icon: '➡️', ranges: [[143, 149]],
      subtopics: [
        { id: 'space_vectors_transformations', name: 'Векторы в пространстве' },
      ],
    },
  ],

  physics: [
    { id: 'mechanics', name: 'Механика', icon: '⚙️', ranges: [[0, 29]],
      subtopics: [
        { id: 'kinematics', name: 'Кинематика' },
        { id: 'dynamics', name: 'Динамика' },
        { id: 'statics', name: 'Статика' },
        { id: 'conservation_laws', name: 'Законы сохранения' },
        { id: 'fluid_gas_mechanics', name: 'Механика жидкостей и газов' },
      ],
    },
    { id: 'thermal_physics', name: 'Тепловая физика', icon: '🌡️', ranges: [[30, 53]],
      subtopics: [
        { id: 'molecular_kinetic_theory', name: 'МКТ газов' },
        { id: 'gas_laws', name: 'Газовые законы' },
        { id: 'thermodynamics', name: 'Термодинамика' },
        { id: 'liquids_solids', name: 'Жидкие и твердые тела' },
      ],
    },
    { id: 'electromagnetism', name: 'Электричество и магнетизм', icon: '⚡', ranges: [[54, 83]],
      subtopics: [
        { id: 'electrostatics', name: 'Электростатика' },
        { id: 'direct_current', name: 'Постоянный ток' },
        { id: 'current_in_media', name: 'Ток в различных средах' },
        { id: 'magnetic_field', name: 'Магнитное поле' },
        { id: 'electromagnetic_induction', name: 'Электромагнитная индукция' },
      ],
    },
    { id: 'em_oscillations', name: 'ЭМ колебания', icon: '〰️', ranges: [[84, 95]],
      subtopics: [
        { id: 'mechanical_oscillations', name: 'Механические колебания' },
        { id: 'em_oscillations_ac', name: 'ЭМ колебания. Переменный ток' },
      ],
    },
    { id: 'em_waves', name: 'ЭМ волны', icon: '📡', ranges: [[96, 107]],
      subtopics: [
        { id: 'wave_motion', name: 'Волновое движение' },
        { id: 'em_waves', name: 'Электромагнитные волны' },
      ],
    },
    { id: 'optics', name: 'Оптика', icon: '🔬', ranges: [[108, 119]],
      subtopics: [
        { id: 'wave_optics', name: 'Волновая оптика' },
        { id: 'geometric_optics', name: 'Геометрическая оптика' },
      ],
    },
    { id: 'relativity', name: 'Теория относительности', icon: '🚀', ranges: [[120, 125]],
      subtopics: [
        { id: 'special_relativity', name: 'Теория относительности' },
      ],
    },
    { id: 'quantum_physics', name: 'Квантовая физика', icon: '⚛️', ranges: [[126, 137]],
      subtopics: [
        { id: 'atomic_quantum', name: 'Атомная и квантовая физика' },
        { id: 'nuclear_physics', name: 'Ядерная физика' },
      ],
    },
    { id: 'nanotechnology', name: 'Нанотехнологии', icon: '🧬', ranges: [[138, 143]],
      subtopics: [
        { id: 'nanotechnology', name: 'Нанотехнологии' },
      ],
    },
    { id: 'cosmology', name: 'Космология', icon: '🌌', ranges: [[144, 149]],
      subtopics: [
        { id: 'cosmology', name: 'Космология' },
      ],
    },
  ],

  chemistry: [
    { id: 'particle_structure', name: 'Частицы вещества', icon: '⚗️', ranges: [[0, 16]],
      subtopics: [
        { id: 'atom_structure_bonding', name: 'Строение атома. Химическая связь' },
        { id: 'periodic_law', name: 'Периодический закон' },
      ],
    },
    { id: 'reaction_patterns', name: 'Закономерности реакций', icon: '🧪', ranges: [[17, 33]],
      subtopics: [
        { id: 'redox_electrolysis', name: 'ОВР. Электролиз' },
        { id: 'kinetics_equilibrium', name: 'Кинетика. Равновесие' },
      ],
    },
    { id: 'reaction_energetics', name: 'Энергетика реакций', icon: '🔥', ranges: [[34, 41]],
      subtopics: [
        { id: 'ionic_equilibria_hydrolysis', name: 'Ионные равновесия. Гидролиз' },
      ],
    },
    { id: 'chemistry_life', name: 'Химия и жизнь', icon: '💊', ranges: [[42, 95]],
      subtopics: [
        { id: 'metals_nonmetals_general', name: 'Металлы и неметаллы' },
        { id: 'group_1_2_3_elements', name: 'Элементы I-III групп' },
        { id: 'group_14_elements', name: 'Элементы IV группы' },
        { id: 'group_15_elements', name: 'Элементы V группы' },
        { id: 'group_16_sulfuric_acid', name: 'Элементы VI группы. H₂SO₄' },
        { id: 'group_17_halogens', name: 'Галогены (VII группа)' },
        { id: 'transition_metals_complexes', name: 'Переходные металлы. Комплексы' },
      ],
    },
    { id: 'organic_chemistry', name: 'Химия вокруг нас', icon: '🧴', ranges: [[96, 134]],
      subtopics: [
        { id: 'hydrocarbons', name: 'Углеводороды' },
        { id: 'oxygen_containing_organic', name: 'Кислородсодержащие ОС' },
        { id: 'carbohydrates', name: 'Углеводы' },
        { id: 'nitrogen_containing_organic', name: 'Азотсодержащие ОС' },
        { id: 'polymers_petroleum', name: 'Полимеры. Нефть' },
      ],
    },
    { id: 'calculations', name: 'Задачи', icon: '🔢', ranges: [[135, 149]],
      subtopics: [
        { id: 'calculations_kinetics_electrolysis', name: 'Задачи: кинетика и электролиз' },
        { id: 'molecular_formula_calculations', name: 'Молекулярные формулы' },
      ],
    },
  ],

  biology: [
    { id: 'diversity_structure_environment', name: 'Организмы и среда', icon: '🌿', ranges: [[0, 86]],
      subtopics: [
        { id: 'biodiversity_biosphere', name: 'Биосфера и экосистемы' },
        { id: 'nutrition', name: 'Питание' },
        { id: 'substance_transport', name: 'Транспорт веществ' },
        { id: 'respiration', name: 'Дыхание' },
        { id: 'excretion', name: 'Выделение' },
        { id: 'movement_biophysics', name: 'Движение. Биофизика' },
        { id: 'coordination_regulation', name: 'Координация и регуляция' },
      ],
    },
    { id: 'reproduction_heredity_evolution', name: 'Размножение и генетика', icon: '🧬', ranges: [[87, 124]],
      subtopics: [
        { id: 'reproduction_growth', name: 'Размножение и рост' },
        { id: 'cell_cycle_biology', name: 'Клеточный цикл' },
        { id: 'heredity_selection_evolution', name: 'Генетика. Селекция. Эволюция' },
      ],
    },
    { id: 'applied_sciences', name: 'Прикладные науки', icon: '🔬', ranges: [[125, 149]],
      subtopics: [
        { id: 'molecular_biology_biochemistry', name: 'Молекулярная биология' },
        { id: 'microbiology_biotech', name: 'Микробиология и биотехнология' },
      ],
    },
  ],

  geography: [
    { id: 'research_methods', name: 'Методы исследований', icon: '🔍', ranges: [[0, 7]],
      subtopics: [
        { id: 'research_methods', name: 'Методы исследований' },
      ],
    },
    { id: 'cartography_geoinformatics', name: 'Картография', icon: '🗺️', ranges: [[8, 22]],
      subtopics: [
        { id: 'cartography', name: 'Картография' },
        { id: 'geoinformatics', name: 'Геоинформатика' },
      ],
    },
    { id: 'physical_geography', name: 'Физическая география', icon: '🌍', ranges: [[23, 70]],
      subtopics: [
        { id: 'lithosphere', name: 'Литосфера' },
        { id: 'atmosphere', name: 'Атмосфера' },
        { id: 'hydrosphere', name: 'Гидросфера' },
        { id: 'biosphere', name: 'Биосфера' },
        { id: 'natural_territorial_complexes', name: 'ПТК' },
        { id: 'nature_management', name: 'Природопользование' },
        { id: 'geoecological_research', name: 'Геоэкология' },
      ],
    },
    { id: 'social_geography', name: 'Социальная география', icon: '👥', ranges: [[71, 78]],
      subtopics: [
        { id: 'population_geography', name: 'География населения' },
      ],
    },
    { id: 'economic_geography', name: 'Экономическая география', icon: '💹', ranges: [[79, 114]],
      subtopics: [
        { id: 'natural_resources', name: 'Природные ресурсы' },
        { id: 'socioeconomic_resources', name: 'Социально-экономические ресурсы' },
        { id: 'world_economy_structure', name: 'Структура мирового хозяйства' },
        { id: 'world_economy_trends', name: 'Тенденции мирового хозяйства' },
        { id: 'geoeconomics', name: 'Геоэкономика' },
      ],
    },
    { id: 'country_studies', name: 'Страноведение', icon: '🏳️', ranges: [[115, 143]],
      subtopics: [
        { id: 'countries_world', name: 'Страны мира' },
        { id: 'world_regions', name: 'Регионы мира' },
        { id: 'country_comparison', name: 'Сравнение стран' },
        { id: 'geopolitics', name: 'Геополитика' },
      ],
    },
    { id: 'global_problems', name: 'Глобальные проблемы', icon: '🌐', ranges: [[144, 149]],
      subtopics: [
        { id: 'global_problems_solutions', name: 'Глобальные проблемы' },
      ],
    },
  ],

  english: [
    { id: 'vocabulary_orthography', name: 'Лексика', icon: '📖', ranges: [[0, 20]],
      subtopics: [
        { id: 'vocabulary_orthography', name: 'Лексика и орфография' },
      ],
    },
    { id: 'morphology', name: 'Морфология', icon: '📝', ranges: [[21, 64]],
      subtopics: [
        { id: 'articles_prepositions_word_formation', name: 'Артикли, предлоги, словообразование' },
        { id: 'parts_of_speech', name: 'Части речи' },
      ],
    },
    { id: 'syntax', name: 'Синтаксис', icon: '✏️', ranges: [[65, 108]],
      subtopics: [
        { id: 'sentences', name: 'Предложения' },
        { id: 'constructions', name: 'Конструкции' },
      ],
    },
    { id: 'synthesis_analysis', name: 'Анализ и синтез', icon: '🔤', ranges: [[109, 129]],
      subtopics: [
        { id: 'speech_norms', name: 'Речевые нормы' },
      ],
    },
    { id: 'reading', name: 'Чтение', icon: '💬', ranges: [[130, 149]],
      subtopics: [
        { id: 'text_work', name: 'Работа с текстом' },
      ],
    },
  ],

  world_history: [
    { id: 'ancient_world', name: 'Древний мир', icon: '🏛️', ranges: [[0, 10]],
      subtopics: [
        { id: 'egypt_mesopotamia', name: 'Египет. Междуречье' },
        { id: 'china_india_ancient', name: 'Китай. Индия' },
        { id: 'greece_rome_persia', name: 'Греция. Рим. Персия' },
      ],
    },
    { id: 'medieval', name: 'Средние века', icon: '⚔️', ranges: [[11, 42]],
      subtopics: [
        { id: 'huns_fall_of_rome', name: 'Гунны. Падение Рима' },
        { id: 'byzantium_kievan_rus', name: 'Византия. Киевская Русь' },
        { id: 'feudalism_wars', name: 'Феодализм и войны' },
        { id: 'islam_crusades', name: 'Ислам. Крестовые походы' },
        { id: 'mongol_empire', name: 'Монгольская империя' },
        { id: 'western_absolutism', name: 'Абсолютизм на Западе' },
        { id: 'eastern_absolutism', name: 'Абсолютизм на Востоке' },
        { id: 'reformation', name: 'Реформация' },
      ],
    },
    { id: 'great_discoveries', name: 'Великие открытия', icon: '🚢', ranges: [[43, 46]],
      subtopics: [
        { id: 'great_discoveries', name: 'Великие географические открытия' },
      ],
    },
    { id: 'early_modern', name: 'Новое время', icon: '🏰', ranges: [[47, 82]],
      subtopics: [
        { id: 'english_revolution_industry', name: 'Английская революция' },
        { id: 'india_british_colonialism', name: 'Индия. Британский колониализм' },
        { id: 'usa_formation', name: 'Образование США' },
        { id: 'french_revolution_napoleon', name: 'Французская революция. Наполеон' },
        { id: 'empire_rivalry_19c', name: 'Соперничество империй XIX в.' },
        { id: 'ottoman_empire', name: 'Османская империя' },
        { id: 'china_european_powers', name: 'Китай и Европа XIX в.' },
        { id: 'european_revolutions_1848', name: 'Революции 1848 в Европе' },
        { id: 'russia_19c', name: 'Россия XIX в.' },
      ],
    },
    { id: 'wwi_era', name: 'Первая мировая война', icon: '💣', ranges: [[83, 86]],
      subtopics: [
        { id: 'wwi', name: 'Первая мировая война' },
      ],
    },
    { id: 'interwar_period', name: 'Межвоенный период', icon: '📰', ranges: [[87, 106]],
      subtopics: [
        { id: 'russian_revolution_turkey', name: 'Революции 1917. Турция' },
        { id: 'china_japan_india_interwar', name: 'Китай. Япония. Индия' },
        { id: 'great_depression_usa_france', name: 'Великая депрессия' },
        { id: 'ussr_totalitarianism', name: 'Тоталитаризм в СССР' },
        { id: 'fascism_germany_italy_spain', name: 'Фашизм: Германия, Италия, Испания' },
      ],
    },
    { id: 'wwii', name: 'Вторая мировая война', icon: '✈️', ranges: [[107, 114]],
      subtopics: [
        { id: 'wwii_causes_alliances', name: 'Причины и союзы' },
        { id: 'wwii_battles_outcome', name: 'Сражения и итоги' },
      ],
    },
    { id: 'second_half_20th', name: 'Вторая половина XX века', icon: '🌐', ranges: [[115, 134]],
      subtopics: [
        { id: 'cold_war', name: 'Холодная война' },
        { id: 'international_organizations', name: 'Международные организации' },
        { id: 'western_europe_postwar', name: 'Западная Европа' },
        { id: 'ussr_postwar', name: 'СССР после войны' },
        { id: 'asia_postwar', name: 'Азия после войны' },
      ],
    },
    { id: 'culture_ancient', name: 'Культура древнего мира', icon: '🎭', ranges: [[135, 137]],
      subtopics: [
        { id: 'ancient_culture', name: 'Культура древнего мира' },
      ],
    },
    { id: 'culture_medieval', name: 'Культура средневековья', icon: '📚', ranges: [[138, 140]],
      subtopics: [
        { id: 'medieval_culture', name: 'Средневековая культура' },
      ],
    },
    { id: 'culture_modern', name: 'Культура нового времени', icon: '🎨', ranges: [[141, 143]],
      subtopics: [
        { id: 'modern_culture_enlightenment', name: 'Просвещение и культура' },
      ],
    },
    { id: 'culture_contemporary', name: 'Культура XX-XXI веков', icon: '💡', ranges: [[144, 146]],
      subtopics: [
        { id: 'contemporary_science_tech', name: 'Наука и техника XX-XXI вв.' },
      ],
    },
    { id: 'context_tasks', name: 'Контекстные задания', icon: '📋', ranges: [[147, 149]],
      subtopics: [
        { id: 'context_documents_wh', name: 'Документы' },
        { id: 'context_personalities_wh', name: 'Личности' },
        { id: 'context_maps_wh', name: 'Карты и схемы' },
      ],
    },
  ],

  informatics: [
    { id: 'computer_systems', name: 'Компьютерные системы', icon: '🖥️', ranges: [[0, 22]],
      subtopics: [
        { id: 'computer_devices', name: 'Устройства компьютера' },
        { id: 'networks_security', name: 'Сети и безопасность' },
      ],
    },
    { id: 'information_processes', name: 'Информационные процессы', icon: '📡', ranges: [[23, 58]],
      subtopics: [
        { id: 'information_coding', name: 'Кодирование информации' },
        { id: 'number_systems', name: 'Системы счисления' },
        { id: 'logic_gates', name: 'Логические основы' },
      ],
    },
    { id: 'computational_thinking', name: 'Компьютерное мышление', icon: '💻', ranges: [[59, 81]],
      subtopics: [
        { id: 'python_algorithms', name: 'Python: алгоритмы' },
        { id: 'advanced_algorithms', name: 'Продвинутые алгоритмы' },
      ],
    },
    { id: 'hardware_software', name: 'ПО и оборудование', icon: '🔧', ranges: [[82, 93]],
      subtopics: [
        { id: 'hardware_software', name: 'ПО и оборудование' },
      ],
    },
    { id: 'information_systems', name: 'Информационные системы', icon: '🗄️', ranges: [[94, 128]],
      subtopics: [
        { id: 'relational_databases', name: 'Реляционные БД' },
        { id: 'database_sql', name: 'SQL и базы данных' },
        { id: 'modern_it_trends', name: 'Современные IT-тренды' },
      ],
    },
    { id: 'information_objects', name: 'Информационные объекты', icon: '🌐', ranges: [[129, 149]],
      subtopics: [
        { id: 'information_objects', name: 'Информационные объекты' },
        { id: 'web_design', name: 'Веб-проектирование' },
      ],
    },
  ],

  law: [
    { id: 'constitutional', name: 'Конституционное право', icon: '🏛️', ranges: [[0, 29]],
      subtopics: [
        { id: 'concept_of_law', name: 'Понятие права' },
        { id: 'constitutional_rights', name: 'Конституционные права' },
        { id: 'state_organs', name: 'Государственные органы' },
        { id: 'rule_of_law_civil_society', name: 'Правовое государство' },
      ],
    },
    { id: 'civil', name: 'Гражданское право', icon: '📄', ranges: [[30, 59]],
      subtopics: [
        { id: 'civil_law_concept', name: 'Понятие гражданского права' },
        { id: 'property_rights', name: 'Право собственности' },
        { id: 'civil_obligations', name: 'Обязательства' },
        { id: 'consumer_rights', name: 'Права потребителей' },
      ],
    },
    { id: 'labor', name: 'Трудовое право', icon: '👷', ranges: [[60, 82]],
      subtopics: [
        { id: 'labor_law_concept', name: 'Понятие трудового права' },
        { id: 'labor_conditions', name: 'Условия труда' },
        { id: 'labor_protection_disputes', name: 'Охрана труда. Споры' },
      ],
    },
    { id: 'family', name: 'Семейное право', icon: '👨‍👩‍👧', ranges: [[83, 97]],
      subtopics: [
        { id: 'marriage_family_law', name: 'Брак и семейное право' },
        { id: 'family_rights_obligations', name: 'Права членов семьи' },
      ],
    },
    { id: 'administrative', name: 'Административное право', icon: '🏢', ranges: [[98, 105]],
      subtopics: [
        { id: 'administrative_law', name: 'Административное право' },
      ],
    },
    { id: 'criminal', name: 'Уголовное право', icon: '⚖️', ranges: [[106, 128]],
      subtopics: [
        { id: 'criminal_law_concept', name: 'Понятие уголовного права' },
        { id: 'criminal_liability', name: 'Уголовная ответственность' },
        { id: 'punishment_humanism', name: 'Наказание и гуманизм' },
      ],
    },
    { id: 'land_procedural', name: 'Земельное и процессуальное', icon: '📜', ranges: [[129, 143]],
      subtopics: [
        { id: 'land_law', name: 'Земельное право' },
        { id: 'procedural_law', name: 'Процессуальное право' },
      ],
    },
    { id: 'international', name: 'Международное право', icon: '🌍', ranges: [[144, 149]],
      subtopics: [
        { id: 'international_law', name: 'Международное право' },
      ],
    },
  ],

  literature: [
    { id: 'heroic_epic_tales', name: 'Эпос и сказки', icon: '📕', ranges: [[0, 20]],
      subtopics: [
        { id: 'byliny_pushkin_lermontov', name: 'Былины. Пушкин. Лермонтов' },
        { id: 'fairy_tales_verse', name: 'Поэтические сказки' },
        { id: 'fairy_tales_prose', name: 'Прозаические сказки' },
        { id: 'folklore_elements', name: 'Фольклорные элементы' },
      ],
    },
    { id: 'myths_christmas_moral', name: 'Мифы и нравственность', icon: '🎭', ranges: [[21, 41]],
      subtopics: [
        { id: 'myths_world', name: 'Мифы народов мира' },
        { id: 'christmas_theme', name: 'Рождественская тема' },
        { id: 'moral_choice', name: 'Нравственный выбор' },
        { id: 'myth_fairy_elements', name: 'Мифические элементы' },
      ],
    },
    { id: 'parables_nature_satire_morals', name: 'Притчи и сатира', icon: '📖', ranges: [[42, 62]],
      subtopics: [
        { id: 'parables_legends', name: 'Притчи и легенды' },
        { id: 'man_and_nature', name: 'Человек и природа' },
        { id: 'satire_humor_fables', name: 'Сатира. Басни' },
        { id: 'morals_ethics_values', name: 'Мораль и ценности' },
      ],
    },
    { id: 'children_adults_love_dreams', name: 'Дети и взрослые', icon: '👨‍👧', ranges: [[63, 83]],
      subtopics: [
        { id: 'children_and_adults', name: 'Дети и взрослые' },
        { id: 'love_and_honor', name: 'Любовь и честь' },
        { id: 'satire_comedy', name: 'Сатира и юмор' },
        { id: 'dreams_reality', name: 'Мечты и реальность' },
      ],
    },
    { id: 'love_little_man_satire_soul', name: 'Любовь и маленький человек', icon: '❤️', ranges: [[84, 104]],
      subtopics: [
        { id: 'love_strangeness', name: 'Странности любви' },
        { id: 'little_man_theme', name: 'Маленький человек' },
        { id: 'society_satire', name: 'Сатира на общество' },
        { id: 'human_soul_secrets', name: 'Тайны души' },
      ],
    },
    { id: 'superfluous_hero_law_family', name: 'Лишние люди', icon: '🎩', ranges: [[105, 125]],
      subtopics: [
        { id: 'superfluous_people', name: 'Лишние люди' },
        { id: 'hero_of_our_time', name: 'Герой нашего времени' },
        { id: 'crime_law', name: 'Преступление и закон' },
        { id: 'family_values_lit', name: 'Семейные ценности' },
      ],
    },
    { id: 'epoch_change_war_morality', name: 'Эпоха перемен и война', icon: '📰', ranges: [[126, 146]],
      subtopics: [
        { id: 'epoch_change', name: 'Эпоха перемен' },
        { id: 'totalitarian_regime', name: 'Тоталитарный режим' },
        { id: 'war_in_lives', name: 'Война в судьбах' },
        { id: 'moral_choice_modern', name: 'Нравственный выбор (совр.)' },
      ],
    },
    { id: 'reading_text_work', name: 'Работа с текстом', icon: '📋', ranges: [[147, 149]],
      subtopics: [
        { id: 'text_work', name: 'Работа с текстом' },
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
