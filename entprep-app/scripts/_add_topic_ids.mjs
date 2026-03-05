/**
 * One-time script: inject `id` fields into all topic entries in ent-specs.mjs
 * Run: node scripts/_add_topic_ids.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const specsPath = join(__dirname, 'utils', 'ent-specs.mjs');

// ── Mapping: subject → { topicNum → id } ──────────────────────────────────

const IDS = {
  // ── Math Literacy (10 topics) ──
  math: {
    1: 'numeric_logic',
    2: 'equation_word_problems',
    3: 'percentages_diagrams',
    4: 'mean_median_mode',
    5: 'statistics_combinatorics_probability',
    6: 'variable_dependencies',
    7: 'sequences_table_analysis',
    8: 'geometric_logic',
    9: 'area_perimeter',
    10: 'surface_area_solids',
  },

  // ── Reading Literacy (14 topics) ──
  reading: {
    1: 'family_values',
    2: 'friendship_hobbies',
    3: 'profession_work',
    4: 'sports_travel',
    5: 'weather_climate',
    6: 'flora_fauna',
    7: 'education_science',
    8: 'scientists_biography',
    9: 'art',
    10: 'technology_progress',
    11: 'states_economy',
    12: 'cities_architecture',
    13: 'mass_media',
    14: 'global_problems',
  },

  // ── History of Kazakhstan (55 topics) ──
  history: {
    1: 'stone_bronze_age',
    2: 'early_nomads',
    3: 'turkic_kaganate',
    4: 'turgesh_karluk',
    5: 'oguz_kimak',
    6: 'karakhanids',
    7: 'naiman_kerey_kipchak',
    8: 'mongol_golden_horde',
    9: 'timur_nogai_abulkhair',
    10: 'kazakh_ethnogenesis',
    11: 'kazakh_khanate_formation',
    12: 'kasym_khan',
    13: 'khakhnazar_khan',
    14: 'taukel_khan',
    15: 'esim_khan',
    16: 'zhangir_khan_orbulak',
    17: 'tauke_khan_zhety_zhargy',
    18: 'khanate_admin_economy',
    19: 'dzungar_wars',
    20: 'russian_expansion_18c',
    21: 'ablai_khan',
    22: 'colonial_policy',
    23: 'syrym_datov',
    24: 'reforms_1822_1824',
    25: 'uprisings_first_half_19c',
    26: 'bukeev_uprising_1836',
    27: 'kenesary_kasymov',
    28: 'zhankozha_eset_uprisings',
    29: 'reforms_1867_1868',
    30: 'uprisings_1860s_1870s',
    31: 'economic_development_19c',
    32: 'society_transformation_19c',
    33: 'early_20c_politics_economy',
    34: 'uprising_1916_revolution',
    35: 'alash_movement',
    36: 'soviet_power_civil_war',
    37: 'alash_orda_kokand',
    38: 'kazakh_assr_formation',
    39: 'war_communism_nep',
    40: 'totalitarianism_collectivization',
    41: 'repressions_1920s_1930s',
    42: 'great_patriotic_war',
    43: 'postwar_1946_1953',
    44: 'khrushchev_thaw_virgin_lands',
    45: 'stagnation_1965_1985',
    46: 'perestroika_december_1986',
    47: 'independence_sovereignty',
    48: 'culture_early_nomads',
    49: 'turkic_culture_silk_road',
    50: 'culture_16_18c',
    51: 'culture_19_early_20c',
    52: 'soviet_culture_education',
    53: 'context_documents',
    54: 'context_personalities',
    55: 'context_maps',
  },

  // ── Russian Literature (29 topics) ──
  literature: {
    1: 'byliny_pushkin_lermontov',
    2: 'fairy_tales_verse',
    3: 'fairy_tales_prose',
    4: 'folklore_elements',
    5: 'myths_world',
    6: 'christmas_theme',
    7: 'moral_choice',
    8: 'myth_fairy_elements',
    9: 'parables_legends',
    10: 'man_and_nature',
    11: 'satire_humor_fables',
    12: 'morals_ethics_values',
    13: 'children_and_adults',
    14: 'love_and_honor',
    15: 'satire_comedy',
    16: 'dreams_reality',
    17: 'love_strangeness',
    18: 'little_man_theme',
    19: 'society_satire',
    20: 'human_soul_secrets',
    21: 'superfluous_people',
    22: 'hero_of_our_time',
    23: 'crime_law',
    24: 'family_values_lit',
    25: 'epoch_change',
    26: 'totalitarian_regime',
    27: 'war_in_lives',
    28: 'moral_choice_modern',
    29: 'text_work',
  },

  // ── Math Profile (18 topics) ──
  math_profile: {
    1: 'radicals_expressions',
    2: 'powers',
    3: 'trigonometry',
    4: 'algebraic_transformations',
    5: 'linear_quadratic_equations',
    6: 'trig_irrational_equations',
    7: 'exponential_log_equations',
    8: 'linear_nonlinear_systems',
    9: 'advanced_equation_systems',
    10: 'inequalities',
    11: 'inequality_systems',
    12: 'arithmetic_geometric_progressions',
    13: 'calculus_modeling',
    14: 'plane_figures',
    15: 'metric_relations_vectors',
    16: 'space_figures',
    17: 'space_metric_relations',
    18: 'space_vectors_transformations',
  },

  // ── Physics (25 topics) ──
  physics: {
    1: 'kinematics',
    2: 'dynamics',
    3: 'statics',
    4: 'conservation_laws',
    5: 'fluid_gas_mechanics',
    6: 'molecular_kinetic_theory',
    7: 'gas_laws',
    8: 'thermodynamics',
    9: 'liquids_solids',
    10: 'electrostatics',
    11: 'direct_current',
    12: 'current_in_media',
    13: 'magnetic_field',
    14: 'electromagnetic_induction',
    15: 'mechanical_oscillations',
    16: 'em_oscillations_ac',
    17: 'wave_motion',
    18: 'em_waves',
    19: 'wave_optics',
    20: 'geometric_optics',
    21: 'special_relativity',
    22: 'atomic_quantum',
    23: 'nuclear_physics',
    24: 'nanotechnology',
    25: 'cosmology',
  },

  // ── Chemistry (19 topics) ──
  chemistry: {
    1: 'atom_structure_bonding',
    2: 'periodic_law',
    3: 'redox_electrolysis',
    4: 'kinetics_equilibrium',
    5: 'ionic_equilibria_hydrolysis',
    6: 'metals_nonmetals_general',
    7: 'group_1_2_3_elements',
    8: 'group_14_elements',
    9: 'group_15_elements',
    10: 'group_16_sulfuric_acid',
    11: 'group_17_halogens',
    12: 'transition_metals_complexes',
    13: 'hydrocarbons',
    14: 'oxygen_containing_organic',
    15: 'carbohydrates',
    16: 'nitrogen_containing_organic',
    17: 'polymers_petroleum',
    18: 'calculations_kinetics_electrolysis',
    19: 'molecular_formula_calculations',
  },

  // ── Geography (21 topics) ──
  geography: {
    1: 'research_methods',
    2: 'cartography',
    3: 'geoinformatics',
    4: 'lithosphere',
    5: 'atmosphere',
    6: 'hydrosphere',
    7: 'biosphere',
    8: 'natural_territorial_complexes',
    9: 'nature_management',
    10: 'geoecological_research',
    11: 'population_geography',
    12: 'natural_resources',
    13: 'socioeconomic_resources',
    14: 'world_economy_structure',
    15: 'world_economy_trends',
    16: 'geoeconomics',
    17: 'countries_world',
    18: 'world_regions',
    19: 'country_comparison',
    20: 'geopolitics',
    21: 'global_problems_solutions',
  },

  // ── World History (41 topics) ──
  world_history: {
    1: 'egypt_mesopotamia',
    2: 'china_india_ancient',
    3: 'greece_rome_persia',
    4: 'huns_fall_of_rome',
    5: 'byzantium_kievan_rus',
    6: 'feudalism_wars',
    7: 'islam_crusades',
    8: 'mongol_empire',
    9: 'western_absolutism',
    10: 'eastern_absolutism',
    11: 'reformation',
    12: 'great_discoveries',
    13: 'english_revolution_industry',
    14: 'india_british_colonialism',
    15: 'usa_formation',
    16: 'french_revolution_napoleon',
    17: 'empire_rivalry_19c',
    18: 'ottoman_empire',
    19: 'china_european_powers',
    20: 'european_revolutions_1848',
    21: 'russia_19c',
    22: 'wwi',
    23: 'russian_revolution_turkey',
    24: 'china_japan_india_interwar',
    25: 'great_depression_usa_france',
    26: 'ussr_totalitarianism',
    27: 'fascism_germany_italy_spain',
    28: 'wwii_causes_alliances',
    29: 'wwii_battles_outcome',
    30: 'cold_war',
    31: 'international_organizations',
    32: 'western_europe_postwar',
    33: 'ussr_postwar',
    34: 'asia_postwar',
    35: 'ancient_culture',
    36: 'medieval_culture',
    37: 'modern_culture_enlightenment',
    38: 'contemporary_science_tech',
    39: 'context_documents_wh',
    40: 'context_personalities_wh',
    41: 'context_maps_wh',
  },

  // ── English (7 topics) ──
  english: {
    1: 'vocabulary_orthography',
    2: 'articles_prepositions_word_formation',
    3: 'parts_of_speech',
    4: 'sentences',
    5: 'constructions',
    6: 'speech_norms',
    7: 'text_work',
  },

  // ── Biology (12 topics) ──
  biology: {
    1: 'biodiversity_biosphere',
    2: 'nutrition',
    3: 'substance_transport',
    4: 'respiration',
    5: 'excretion',
    6: 'movement_biophysics',
    7: 'coordination_regulation',
    8: 'reproduction_growth',
    9: 'cell_cycle_biology',
    10: 'heredity_selection_evolution',
    11: 'molecular_biology_biochemistry',
    12: 'microbiology_biotech',
  },

  // ── Informatics (13 topics) ──
  informatics: {
    1: 'computer_devices',
    2: 'networks_security',
    3: 'information_coding',
    4: 'number_systems',
    5: 'logic_gates',
    6: 'python_algorithms',
    7: 'advanced_algorithms',
    8: 'hardware_software',
    9: 'relational_databases',
    10: 'database_sql',
    11: 'modern_it_trends',
    12: 'information_objects',
    13: 'web_design',
  },

  // ── Law (20 topics) ──
  law: {
    1: 'concept_of_law',
    2: 'constitutional_rights',
    3: 'civil_law_concept',
    4: 'labor_law_concept',
    5: 'labor_conditions',
    6: 'labor_protection_disputes',
    7: 'marriage_family_law',
    8: 'administrative_law',
    9: 'criminal_law_concept',
    10: 'criminal_liability',
    11: 'state_organs',
    12: 'property_rights',
    13: 'civil_obligations',
    14: 'family_rights_obligations',
    15: 'rule_of_law_civil_society',
    16: 'consumer_rights',
    17: 'land_law',
    18: 'procedural_law',
    19: 'international_law',
    20: 'punishment_humanism',
  },
};

// ── Inject IDs ─────────────────────────────────────────────────────────────

let src = readFileSync(specsPath, 'utf-8');

// Find all SPEC_* variable names and their subjects
const specMap = {
  SPEC_MATH_LITERACY: 'math',
  SPEC_READING: 'reading',
  SPEC_HISTORY_KZ: 'history',
  SPEC_LITERATURE: 'literature',
  SPEC_MATH_PROFILE: 'math_profile',
  SPEC_PHYSICS: 'physics',
  SPEC_CHEMISTRY: 'chemistry',
  SPEC_GEOGRAPHY: 'geography',
  SPEC_WORLD_HISTORY: 'world_history',
  SPEC_ENGLISH: 'english',
  SPEC_BIOLOGY: 'biology',
  SPEC_INFORMATICS: 'informatics',
  SPEC_LAW: 'law',
};

let replaced = 0;
let missing = [];

// Replace { num: N, name: '...' } with { num: N, id: '...', name: '...' }
// We need to match ALL topic entries. Each has format:
//   { num: <number>, name: '...' }
// We need to figure out which subject each topic belongs to.

// Strategy: parse the file to find which subject each topic num belongs to,
// then replace. Simpler: just regex replace all `{ num: N, name:` patterns
// and use context to determine subject.

// Better strategy: process the file sequentially. Track current subject.
const lines = src.split('\n');
let currentSubject = null;
const output = [];

for (const line of lines) {
  // Detect subject changes
  for (const [varName, subj] of Object.entries(specMap)) {
    if (line.includes(`export const ${varName}`)) {
      currentSubject = subj;
      break;
    }
  }

  // Try to match a topic entry: { num: N, name: '...' }
  const m = line.match(/^(\s*\{ num: )(\d+)(, name: '.+)$/);
  if (m && currentSubject && IDS[currentSubject]) {
    const num = parseInt(m[2]);
    const id = IDS[currentSubject][num];
    if (id) {
      // Check if id is already present
      if (!line.includes(', id: ')) {
        output.push(`${m[1]}${m[2]}, id: '${id}'${m[3]}`);
        replaced++;
      } else {
        output.push(line);
      }
    } else {
      missing.push(`${currentSubject}:${num}`);
      output.push(line);
    }
  } else {
    output.push(line);
  }
}

writeFileSync(specsPath, output.join('\n'), 'utf-8');

console.log(`Done! Injected ${replaced} topic IDs.`);
if (missing.length) {
  console.log(`Missing IDs for: ${missing.join(', ')}`);
}

// Verify: count total topics with ids
const verifyContent = readFileSync(specsPath, 'utf-8');
const idCount = (verifyContent.match(/, id: '/g) || []).length;
console.log(`Verification: ${idCount} topics now have IDs.`);
