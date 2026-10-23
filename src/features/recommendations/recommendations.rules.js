/*
 * DaFitMatch — Recommendation Rules
 * -------------------------------------------------------------------------
 * Declarative knowledge for the recommendation engine: weights, vocabulary and
 * heuristics that translate a structured aesthetic profile (Page 3 contract)
 * plus a catalogue outfit into explainable match signals.
 *
 * Everything here is a transparent, deterministic rule. No AI calls, no
 * fabricated product data — the vocabulary is derived from the actual values
 * present in src/data/catalogue.json and the option IDs defined by
 * src/features/aesthetic/aesthetic.controller.js.
 *
 * Exposes: window.DaFitMatchRecRules
 */
(function (global) {
  'use strict';

  /* Relative importance of each scoring criterion (normalised internally). */
  var WEIGHTS = {
    aesthetic: 30,
    colour: 18,
    formality: 12,
    fit: 10,
    pattern: 8,
    priorities: 12,
    experimentation: 10,
    comfort: 10,
    refinement: 8,
    footwear: 6
  };

  /* Catalogue category -> context. `formality` is a 1..5 pleasantness scale. */
  var CATEGORY_META = {
    casual: { name: 'Casual', formality: 2 },
    streetwear: { name: 'Streetwear', formality: 2 },
    'date-night': { name: 'Date Night', formality: 4 },
    'couple-coordinated': { name: 'Couple Coordinated', formality: 3 },
    formal: { name: 'Formal', formality: 5 },
    'wedding-festive': { name: 'Wedding & Festive', formality: 5 }
  };

  /* Aesthetic id -> keywords that should appear in an outfit's text corpus. */
  var STYLE_KEYWORDS = {
    minimalist: ['minimal', 'monochrome', 'dark minimal', 'earth tone', 'clean', 'straight'],
    classic: ['classic', 'timeless', 'tailored', 'business', 'formal'],
    'old-money': ['tailored', 'classic', 'blazer', 'loafer', 'elegant', 'luxury'],
    'smart-casual': ['smart casual', 'smart evening', 'blazer', 'shirt', 'loafer', 'trouser'],
    streetwear: ['street', 'urban', 'denim', 'oversized', 'cargo', 'sneaker', 'graphic'],
    'soft-romantic': ['soft', 'blush', 'satin', 'rose', 'flowing', 'midi dress', 'romantic'],
    bold: ['bold', 'color block', 'statement', 'graphic', 'oversized', 'contemporary'],
    glamorous: ['glamour', 'evening', 'luxury', 'satin', 'heels', 'statement'],
    traditional: ['ethnic', 'kurt', 'saree', 'lehenga', 'anarkali', 'sherwani', 'nehru', 'dupatta', 'churidar', 'mojari', 'festive'],
    'indo-western': ['ethnic', 'fusion', 'kurta', 'sherwani', 'festive', 'contemporary'],
    vintage: ['retro', 'vintage', 'denim', 'earth', 'classic'],
    y2k: ['retro', 'graphic', 'color block', 'denim', 'playful'],
    'dark-academia': ['dark', 'minimal', 'monochrome', 'tailored', 'brown', 'charcoal', 'knit'],
    sporty: ['athleisure', 'sneaker', 'oversized', 'hoodie', 'sweatshirt', 'casual', 'comfort'],
    bohemian: ['boho', 'earth', 'relaxed', 'textured', 'flowing', 'earring'],
    casual: ['casual', 'everyday', 'relaxed', 'denim', 't-shirt', 'sneaker', 'comfortable'],
    'formal-contemporary': ['formal', 'contemporary', 'tailored', 'blazer', 'suit'],
    modest: ['modest', 'kurt', 'relaxed', 'flowing', 'trouser', 'full']
  };

  /* Colour palette id -> matching colour words found in the catalogue. */
  var COLOUR_KEYWORDS = {
    neutrals: ['black', 'white', 'beige', 'cream', 'grey', 'charcoal', 'ivory', 'neutral'],
    earth: ['brown', 'olive', 'rust', 'beige', 'cream', 'sage', 'green', 'earth'],
    pastel: ['blush', 'pink', 'sage', 'lavender', 'champagne', 'pastel'],
    deep: ['burgundy', 'emerald', 'navy', 'wine', 'deep', 'green'],
    bright: ['blue', 'green', 'gold', 'pink', 'emerald', 'rose gold'],
    monochrome: ['black', 'white', 'grey', 'charcoal', 'navy', 'monochrome'],
    mixed: ['blue', 'green', 'pink', 'gold', 'burgundy'],
    surprise: []
  };

  /* Avoided-colour id -> colour words to penalise. */
  var AVOID_COLOUR_KEYWORDS = {
    black: ['black'], white: ['white'], beige: ['beige'], brown: ['brown'],
    olive: ['olive'], rust: ['rust'], pink: ['pink', 'blush'], lavender: ['lavender'],
    sage: ['sage'], navy: ['navy'], burgundy: ['burgundy'], emerald: ['emerald'],
    red: ['red'], orange: ['orange'], yellow: ['yellow'], purple: ['purple'],
    neon: ['neon'], gold: ['gold']
  };

  /* Excluded garment label -> keywords detected in an outfit's items. */
  var GARMENT_KEYWORDS = {
    Dresses: ['dress'],
    Skirts: ['skirt'],
    'Suits / Blazers': ['blazer', 'suit', 'tuxedo'],
    Trousers: ['trouser', 'pants', 'churidar'],
    Jeans: ['jeans', 'denim'],
    Shorts: ['shorts'],
    'Crop tops': ['crop'],
    Sarees: ['saree'],
    Kurtas: ['kurta'],
    Sherwanis: ['sherwani'],
    Lehenga: ['lehenga'],
    Heels: ['heel']
  };

  /* Excluded fabric label -> keywords. */
  var FABRIC_KEYWORDS = {
    Leather: ['leather'],
    Denim: ['denim'],
    Velvet: ['velvet'],
    'Silk / Satin': ['silk', 'satin'],
    Wool: ['wool'],
    Linen: ['linen'],
    Sequins: ['sequin', 'embellish'],
    Lace: ['lace'],
    Polyester: ['polyester']
  };

  /* Fit preference id -> keywords in the attire. */
  var FIT_KEYWORDS = {
    slim: ['slim', 'fitted', 'bodycon'],
    regular: ['regular', 'balanced', 'classic'],
    relaxed: ['relaxed', 'comfortable', 'soft', 'easy'],
    oversized: ['oversized', 'boxy', 'wide', 'baggy'],
    depends: [],
    'no-pref': [],
    'not-sure': []
  };

  /* Silhouette preference id -> keywords. */
  var SILHOUETTE_KEYWORDS = {
    structured: ['structured', 'tailored', 'blazer', 'shoulder', 'crisp', 'formal'],
    flowing: ['flowing', 'drape', 'satin', 'slip', 'maxi', 'midi dress', 'soft', 'romantic'],
    layered: ['layered', 'overshirt', 'jacket', 'embroider', 'textured'],
    streamlined: ['minimal', 'clean', 'monochrome', 'simple', 'straight'],
    statement: ['statement', 'bold', 'color block', 'oversized', 'graphic'],
    'no-pref': []
  };

  /* Pattern preference id -> keywords. */
  var PATTERN_KEYWORDS = {
    plain: ['plain', 'solid', 'minimal', 'monochrome', 'clean'],
    subtle: ['subtle', 'textured', 'lace', 'embroider'],
    balanced: [],
    bold: ['graphic', 'color block', 'statement', 'print', 'embellish']
  };

  /* Optional refinement answers -> catalogue keywords. Empty lists mean the
   * answer is intentionally neutral (e.g. "balanced"). */
  var REFINEMENT_KEYWORDS = {
    statement_style: {
      simple: ['minimal', 'clean', 'plain', 'simple', 'straight'],
      balanced: [],
      statement: ['statement', 'bold', 'color block', 'graphic', 'embellish']
    },
    layering_preference: {
      'minimal-layers': ['minimal', 'clean', 'simple'],
      balanced: [],
      layered: ['layered', 'jacket', 'overshirt', 'knit', 'textured']
    },
    trend_preference: {
      timeless: ['classic', 'timeless', 'tailored', 'minimal', 'straight'],
      balanced: [],
      trendy: ['trend', 'bold', 'graphic', 'color block', 'oversized', 'contemporary']
    },
    ease_of_care: {
      'low-maintenance': ['cotton', 'denim', 'plain', 'easy', 'everyday'],
      balanced: [],
      any: []
    }
  };

  /* Preferred footwear label -> keywords detected in an outfit's items. */
  var FOOTWEAR_KEYWORDS = {
    Sneakers: ['sneaker'],
    Loafers: ['loafer'],
    Heels: ['heel'],
    'Flats / Sandals': ['flat', 'sandal'],
    Boots: ['boot'],
    'Derby / Oxford': ['derby', 'oxford'],
    Mojari: ['mojari'],
    'Chunky / Platform': ['chunky', 'platform']
  };

  /* Experimentation level id -> keywords it favours. */
  var EXPERIMENTATION_KEYWORDS = {
    familiar: ['minimal', 'classic', 'basic', 'plain', 'straight'],
    balanced: [],
    experimental: ['color block', 'statement', 'oversized', 'bold', 'contemporary'],
    surprise: ['statement', 'bold', 'color block', 'oversized']
  };

  /* Page 4 — comfort / practicality option id -> keywords. */
  var COMFORT_KEYWORDS = {
    'all-day-comfort': ['comfortable', 'relaxed', 'soft', 'cotton', 'casual', 'everyday'],
    'easy-movement': ['relaxed', 'comfortable', 'easy', 'wide', 'soft'],
    breathable: ['linen', 'cotton', 'breathable', 'airy', 'lightweight'],
    lightweight: ['lightweight', 'linen', 'cotton', 'silk', 'flowing'],
    'weather-layering': ['layered', 'jacket', 'overshirt', 'knit', 'sweater'],
    'low-maintenance': ['cotton', 'denim', 'easy', 'plain', 'everyday'],
    'minimal-accessories': ['minimal', 'clean', 'simple', 'monochrome'],
    'comfortable-footwear': ['sneaker', 'loafer', 'flat', 'comfortable', 'mojari'],
    'modest-covering': ['modest', 'full', 'relaxed', 'flowing', 'long'],
    'avoid-restrictive': ['relaxed', 'comfortable', 'easy', 'soft', 'flowing'],
    'easy-sit-walk': ['relaxed', 'comfortable', 'easy', 'sneaker', 'flat'],
    'balance-comfort-style': [],
    none: []
  };

  /* Page 4 — mobility requirement id -> keywords. */
  var MOBILITY_KEYWORDS = {
    'sit-stand-walk': ['relaxed', 'comfortable', 'easy', 'flat', 'sneaker'],
    'stand-for-hours': ['comfortable', 'breathable', 'soft', 'flat'],
    dance: ['flowing', 'stretch', 'comfortable', 'easy'],
    travel: ['comfortable', 'easy', 'sneaker', 'lightweight', 'casual'],
    'long-hours': ['comfortable', 'breathable', 'soft', 'relaxed']
  };

  /* Fabric label -> extra catalogue keywords (beyond the lowercased label). */
  var FABRIC_ENRICH = {
    linen: ['linen'],
    cotton: ['cotton'],
    silk: ['silk', 'satin'],
    satin: ['satin'],
    wool: ['wool', 'knit'],
    denim: ['denim'],
    leather: ['leather'],
    velvet: ['velvet'],
    chiffon: ['chiffon', 'flowing'],
    knitwear: ['knit', 'sweater'],
    blends: []
  };

  /* Formality label (as stored by the wizard) -> 1..5 value. */
  var FORMALITY_VALUES = {
    'Comfortable & Casual': 1,
    Relaxed: 2,
    'Regular / Balanced': 3,
    Refined: 4,
    'Refined & Formal': 5
  };

  /* Styling priorities -> how the engine should reward an outfit. */
  var PRIORITY_RULES = {
    Comfort: { type: 'keywords', words: ['comfortable', 'relaxed', 'soft', 'casual', 'sneaker', 'loafer', 'cotton'] },
    Trendiness: { type: 'keywords', words: ['street', 'trend', 'bold', 'color block', 'graphic', 'oversized', 'contemporary'] },
    Elegance: { type: 'keywords', words: ['elegant', 'formal', 'evening', 'luxury', 'satin', 'blazer', 'tailored'] },
    'Understated styling': { type: 'keywords', words: ['minimal', 'monochrome', 'neutral', 'clean', 'classic'] },
    'Standing out': { type: 'keywords', words: ['bold', 'statement', 'color block', 'graphic', 'glamour'] },
    'Couple coordination': { type: 'category', ids: ['couple-coordinated'] },
    'Occasion appropriateness': { type: 'formality' },
    Budget: { type: 'budget' },
    Rewearability: { type: 'keywords', words: ['t-shirt', 'shirt', 'jeans', 'trouser', 'sneaker', 'blazer', 'loafer', 'straight'] },
    'Sustainability-conscious': { type: 'keywords', words: ['linen', 'cotton', 'earth'] },
    'Reusing existing wardrobe': { type: 'keywords', words: ['t-shirt', 'shirt', 'jeans', 'trouser', 'sneaker', 'blazer', 'loafer', 'straight'] }
  };

  /* Exclusion flag -> penalty behaviour. `mode:'exclude'` removes the outfit. */
  var FLAG_RULES = {
    'bright-colours': { mode: 'penalty', points: 12, words: ['neon', 'gold', 'rose gold', 'emerald'], message: 'Uses bright/vivid colours you excluded' },
    'bold-prints': { mode: 'penalty', points: 12, words: ['graphic', 'color block', 'embroider', 'statement'], message: 'Has bold prints/motifs you avoid' },
    tight: { mode: 'penalty', words: ['slim', 'fitted', 'bodycon'], points: 12, message: 'Fits tighter than you prefer' },
    oversized: { mode: 'penalty', words: ['oversized', 'boxy', 'baggy'], points: 12, message: 'Oversized silhouette you want to avoid' },
    'heavy-layering': { type: 'keywords', mode: 'penalty', words: ['layered', 'overshirt', 'jacket', 'sweatshirt', 'hoodie', 'nehru'], points: 10 },
    'high-heels': { mode: 'exclude', words: ['heels', 'heel', 'pointed'] },
    traditional: { mode: 'exclude', words: ['kurta', 'saree', 'lehenga', 'anarkali', 'sherwani', 'nehru', 'dupatta', 'churidar', 'mojari', 'ethnic'] },
    accessories: { mode: 'penalty', words: ['earring', 'bag', 'clutch', 'watch', 'hat', 'cap', 'accessor'], points: 8 },
    fabrics: { mode: 'flag-fabrics' },
    'garment-categories': { mode: 'flag-garments' },
    'disliked-colours': { mode: 'flag-avoided-colours' }
  };

  global.DaFitMatchRecRules = {
    WEIGHTS: WEIGHTS,
    CATEGORY_META: CATEGORY_META,
    STYLE_KEYWORDS: STYLE_KEYWORDS,
    COLOUR_KEYWORDS: COLOUR_KEYWORDS,
    AVOID_COLOUR_KEYWORDS: AVOID_COLOUR_KEYWORDS,
    GARMENT_KEYWORDS: GARMENT_KEYWORDS,
    FABRIC_KEYWORDS: FABRIC_KEYWORDS,
    FIT_KEYWORDS: FIT_KEYWORDS,
    SILHOUETTE_KEYWORDS: SILHOUETTE_KEYWORDS,
    PATTERN_KEYWORDS: PATTERN_KEYWORDS,
    REFINEMENT_KEYWORDS: REFINEMENT_KEYWORDS,
    FOOTWEAR_KEYWORDS: FOOTWEAR_KEYWORDS,
    EXPERIMENTATION_KEYWORDS: EXPERIMENTATION_KEYWORDS,
    COMFORT_KEYWORDS: COMFORT_KEYWORDS,
    MOBILITY_KEYWORDS: MOBILITY_KEYWORDS,
    FABRIC_ENRICH: FABRIC_ENRICH,
    FORMALITY_VALUES: FORMALITY_VALUES,
    PRIORITY_RULES: PRIORITY_RULES,
    FLAG_RULES: FLAG_RULES
  };
})(window);
