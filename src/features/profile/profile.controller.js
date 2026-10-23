/*
 * DaFitMatch — Unified Profile Controller (3 steps)
 * -------------------------------------------------------------------------
 * Drives profile.html. This is the single onboarding flow: identity, aesthetic
 * and fit/comfort preferences are collected across three grouped steps while
 * staying in the same structured store contract used by the recommendation
 * engine.
 *
 * Sections (all optional except choosing at least one aesthetic):
 *   1. About you & style — name, gender, aesthetics, colours, patterns
 *   2. Fit, sizes & comfort — fit, garment fit, silhouettes, formality,
 *      experimentation, sizes, comfort, mobility, fabrics
 *   3. Priorities, wardrobe & review — priorities, exclusions, finishing
 *      touches, wardrobe, notes, optional local photo, review
 *
 * Couple mode keeps a separate fit profile per partner (the aesthetic profile
 * stays shared), exactly as before. The photo is never persisted.
 */
(function (global) {
  'use strict';

  var Store = global.DaFitMatchStore;

  /* =====================================================================
   * 1. OPTION DATA
   * ===================================================================== */

  var AESTHETICS = [
    { id: 'minimalist', title: 'Minimalist', desc: 'Clean lines, neutral colours, simple silhouettes.', mono: 'Mn', from: '#64748b', to: '#cbd5e1' },
    { id: 'classic', title: 'Classic / Timeless', desc: 'Refined, versatile, enduring styles.', mono: 'Cl', from: '#1e3a5f', to: '#7c93a8' },
    { id: 'old-money', title: 'Old Money Inspired', desc: 'Understated luxury, tailoring, elegant basics.', mono: 'Om', from: '#0b3d2e', to: '#c9a227' },
    { id: 'smart-casual', title: 'Smart Casual', desc: 'Polished but relaxed combinations.', mono: 'Sc', from: '#475569', to: '#94a3b8' },
    { id: 'streetwear', title: 'Streetwear / Urban', desc: 'Relaxed silhouettes, layering, statement pieces.', mono: 'St', from: '#111827', to: '#7c3aed' },
    { id: 'soft-romantic', title: 'Soft / Romantic', desc: 'Flowing fabrics, delicate details, gentle colours.', mono: 'Ro', from: '#f472b6', to: '#fbcfe8' },
    { id: 'bold', title: 'Bold / Experimental', desc: 'Expressive combinations, unusual cuts, statement colours.', mono: 'Bd', from: '#7c3aed', to: '#ec4899' },
    { id: 'glamorous', title: 'Glamorous / Partywear', desc: 'Striking evening looks and elevated details.', mono: 'Gl', from: '#111827', to: '#d4af37' },
    { id: 'traditional', title: 'Traditional / Ethnic', desc: 'Culturally rooted garments and traditional styling.', mono: 'Et', from: '#b45309', to: '#f59e0b' },
    { id: 'indo-western', title: 'Indo-Western / Fusion', desc: 'Modern blends of ethnic and Western elements.', mono: 'Iw', from: '#be185d', to: '#f59e0b' },
    { id: 'vintage', title: 'Vintage / Retro', desc: 'Styles inspired by earlier fashion eras.', mono: 'Vt', from: '#92400e', to: '#d6bfa3' },
    { id: 'y2k', title: 'Y2K Inspired', desc: 'Playful, trend-driven, early-2000s styling.', mono: 'Y2', from: '#22d3ee', to: '#a855f7' },
    { id: 'dark-academia', title: 'Dark Academia', desc: 'Muted, scholarly, layered, structured styling.', mono: 'Da', from: '#292524', to: '#78716c' },
    { id: 'sporty', title: 'Sporty / Athleisure', desc: 'Athletic influences and comfort-oriented clothing.', mono: 'Sp', from: '#0ea5e9', to: '#22c55e' },
    { id: 'bohemian', title: 'Bohemian', desc: 'Relaxed, expressive, textured styling.', mono: 'Bo', from: '#c2410c', to: '#eab308' },
    { id: 'casual', title: 'Casual Everyday', desc: 'Practical, comfortable daily outfits.', mono: 'Ce', from: '#0ea5e9', to: '#bae6fd' },
    { id: 'formal-contemporary', title: 'Contemporary Formal', desc: 'Modern, refined, occasion-appropriate outfits.', mono: 'Cf', from: '#0f172a', to: '#64748b' },
    { id: 'modest', title: 'Modest Fashion', desc: 'Coverage preferences expressed by you.', mono: 'Mf', from: '#7c6f64', to: '#d6cdc4' },
    { id: 'not-sure', title: 'Not Sure Yet', desc: 'Help me discover what I like.', mono: '?', from: '#38bdf8', to: '#fbbf24' }
  ];

  var COLOUR_PALETTES = [
    { id: 'neutrals', title: 'Neutrals', desc: 'black, white, beige, taupe, grey', swatches: ['#000000', '#ffffff', '#d6c9b0', '#8a8175', '#9ca3af'] },
    { id: 'earth', title: 'Earth Tones', desc: 'brown, olive, rust, terracotta, sand', swatches: ['#6b4423', '#556b2f', '#b7410e', '#e2725b', '#e5c9a0'] },
    { id: 'pastel', title: 'Soft / Pastel', desc: 'blush, sage, lavender, powder blue', swatches: ['#f4c2c2', '#b2c9ab', '#c7b8ea', '#b0d4e3'] },
    { id: 'deep', title: 'Deep / Rich', desc: 'burgundy, emerald, navy, wine', swatches: ['#722f37', '#046307', '#0b1f3a', '#5b2333'] },
    { id: 'bright', title: 'Bright / Vibrant', desc: 'bold colours and vivid accents', swatches: ['#ff2d55', '#ff9500', '#ffcc00', '#34c759', '#007aff', '#af52de'] },
    { id: 'monochrome', title: 'Monochrome', desc: 'variations of one colour', swatches: ['#111827', '#374151', '#6b7280', '#9ca3af', '#e5e7eb'] },
    { id: 'mixed', title: 'Mixed / Colourful', desc: 'multiple coordinated colours', swatches: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'] },
    { id: 'surprise', title: 'No Preference / Surprise Me', desc: 'let DaFitMatch decide', swatches: ['#feda75', '#fa7e1e', '#d62976', '#962fbf', '#4f5bd5'] }
  ];

  var AVOID_COLOURS = [
    { id: 'black', label: 'Black', hex: '#111827' },
    { id: 'white', label: 'White', hex: '#ffffff' },
    { id: 'beige', label: 'Beige', hex: '#d6c9b0' },
    { id: 'brown', label: 'Brown', hex: '#6b4423' },
    { id: 'olive', label: 'Olive', hex: '#556b2f' },
    { id: 'rust', label: 'Rust', hex: '#b7410e' },
    { id: 'pink', label: 'Pastel Pink', hex: '#f4c2c2' },
    { id: 'lavender', label: 'Lavender', hex: '#c7b8ea' },
    { id: 'sage', label: 'Sage', hex: '#b2c9ab' },
    { id: 'navy', label: 'Navy', hex: '#0b1f3a' },
    { id: 'burgundy', label: 'Burgundy', hex: '#722f37' },
    { id: 'emerald', label: 'Emerald', hex: '#046307' },
    { id: 'red', label: 'Red', hex: '#dc2626' },
    { id: 'orange', label: 'Orange', hex: '#f97316' },
    { id: 'yellow', label: 'Yellow', hex: '#facc15' },
    { id: 'purple', label: 'Purple', hex: '#7c3aed' },
    { id: 'neon', label: 'Bright / Neon', hex: '#39ff14' },
    { id: 'gold', label: 'Gold', hex: '#d4af37' }
  ];

  var PATTERNS = [
    { id: 'plain', label: 'Plain' },
    { id: 'subtle', label: 'Subtle patterns' },
    { id: 'balanced', label: 'Balanced mix' },
    { id: 'bold', label: 'Love patterns' }
  ];

  var FITS = [
    { id: 'slim', label: 'Slim / Fitted', desc: 'Close to the body, sharp lines.' },
    { id: 'regular', label: 'Regular / Balanced', desc: 'Classic, comfortable ease.' },
    { id: 'relaxed', label: 'Relaxed', desc: 'Easy, roomy but not oversized.' },
    { id: 'oversized', label: 'Oversized', desc: 'Deliberately loose and boxy.' },
    { id: 'depends', label: 'Depends on the item', desc: 'Mix and match per look.' },
    { id: 'no-pref', label: 'Not Sure / No Preference', desc: 'Open to anything.' }
  ];

  var SILHOUETTES = [
    { id: 'structured', label: 'Structured & tailored', desc: 'Defined shoulders, crisp shapes, polished.' },
    { id: 'flowing', label: 'Soft & flowing', desc: 'Draped, fluid, gentle movement.' },
    { id: 'layered', label: 'Layered & textured', desc: 'Depth through layering and fabrics.' },
    { id: 'streamlined', label: 'Simple & streamlined', desc: 'Clean, uncluttered, minimal.' },
    { id: 'statement', label: 'Statement-making', desc: 'Bold silhouettes that stand out.' },
    { id: 'no-pref', label: 'No Preference', desc: 'Open to anything.' }
  ];

  var EXPERIMENT = [
    { id: 'familiar', label: 'Familiar', desc: 'Stay close to my current style.' },
    { id: 'balanced', label: 'Balanced', desc: 'Combine familiar elements with new ideas.' },
    { id: 'experimental', label: 'Experimental', desc: 'Explore new combinations.' },
    { id: 'surprise', label: 'Surprise Me', desc: 'Creative options within my restrictions.' }
  ];

  var PRIORITIES = [
    'Elegance', 'Comfort', 'Trendiness', 'Understated styling', 'Standing out',
    'Couple coordination', 'Occasion appropriateness', 'Budget', 'Rewearability',
    'Sustainability-conscious', 'Reusing existing wardrobe'
  ];

  var EXCLUSIONS = [
    { id: 'bright-colours', label: 'Bright colours' },
    { id: 'disliked-colours', label: 'Specific disliked colours' },
    { id: 'tight', label: 'Tight clothing' },
    { id: 'oversized', label: 'Oversized clothing' },
    { id: 'garment-categories', label: 'Specific garment categories' },
    { id: 'heavy-layering', label: 'Heavy layering' },
    { id: 'bold-prints', label: 'Bold prints' },
    { id: 'high-heels', label: 'High heels' },
    { id: 'traditional', label: 'Traditional clothing' },
    { id: 'fabrics', label: 'Specific fabrics' },
    { id: 'accessories', label: 'Particular accessories' },
    { id: 'other', label: 'Other' },
    { id: 'no-restrictions', label: 'No Restrictions' },
    { id: 'surprise-within', label: 'Surprise Me Within My Preferences' }
  ];

  var EXCLUSION_GARMENTS = ['Dresses', 'Skirts', 'Suits / Blazers', 'Trousers', 'Jeans', 'Shorts', 'Crop tops', 'Sarees', 'Kurtas', 'Sherwanis', 'Lehenga', 'Heels'];
  var EXCLUSION_FABRICS = ['Leather', 'Denim', 'Velvet', 'Silk / Satin', 'Wool', 'Linen', 'Sequins', 'Lace', 'Polyester'];
  var FOOTWEAR = ['Sneakers', 'Loafers', 'Heels', 'Flats / Sandals', 'Boots', 'Derby / Oxford', 'Mojari', 'Chunky / Platform'];

  var REFINEMENT_GROUPS = {
    statement: {
      field: 'statement_style',
      items: [{ id: 'simple', label: 'Simple outfits' }, { id: 'balanced', label: 'A balanced mix' }, { id: 'statement', label: 'Statement pieces' }]
    },
    trend: {
      field: 'trend_preference',
      items: [{ id: 'timeless', label: 'Timeless' }, { id: 'balanced', label: 'Balanced' }, { id: 'trendy', label: 'Trendy' }]
    },
    care: {
      field: 'ease_of_care',
      items: [{ id: 'low-maintenance', label: 'Low-maintenance' }, { id: 'balanced', label: 'Balanced' }, { id: 'any', label: "I don't mind" }]
    }
  };

  var FORMALITY_LABELS = {
    1: 'Comfortable & Casual',
    2: 'Relaxed',
    3: 'Regular / Balanced',
    4: 'Refined',
    5: 'Refined & Formal'
  };

  var GENDER_LABELS = {
    women: 'Women',
    men: 'Men',
    'non-binary': 'Non-binary'
  };

  var GARMENT_AREAS = [
    { key: 'tops', label: 'Tops & shirts' },
    { key: 'bottoms', label: 'Bottoms' },
    { key: 'outerwear', label: 'Outerwear' },
    { key: 'footwear', label: 'Footwear' }
  ];

  var COMFORT = [
    { id: 'all-day-comfort', label: 'All-day comfort' },
    { id: 'easy-movement', label: 'Easy movement' },
    { id: 'breathable', label: 'Breathable fabrics' },
    { id: 'lightweight', label: 'Lightweight' },
    { id: 'weather-layering', label: 'Weather layering' },
    { id: 'low-maintenance', label: 'Low maintenance' },
    { id: 'minimal-accessories', label: 'Few accessories' },
    { id: 'comfortable-footwear', label: 'Comfortable footwear' },
    { id: 'modest-covering', label: 'Coverage I prefer' },
    { id: 'avoid-restrictive', label: 'Nothing restrictive' },
    { id: 'easy-sit-walk', label: 'Easy to sit, stand & walk' }
  ];

  var MOBILITY = [
    { id: 'sit-stand-walk', label: 'Sit / stand / short walks' },
    { id: 'long-hours', label: 'Long hours on my feet' },
    { id: 'dance', label: 'Dancing' },
    { id: 'travel', label: 'Travel & commuting' }
  ];

  var FABRICS = ['Linen', 'Cotton', 'Silk / Satin', 'Wool', 'Denim', 'Leather', 'Velvet', 'Chiffon', 'Knitwear', 'Blends'];

  var LAYERING = [
    { id: 'minimal', label: 'Minimal layering' },
    { id: 'balanced', label: 'Balanced' },
    { id: 'layered', label: 'Layered & textured' }
  ];

  var ACCESSORY = [
    { id: 'minimal', label: 'Minimal' },
    { id: 'balanced', label: 'Balanced' },
    { id: 'statement', label: 'Statement' },
    { id: 'none', label: 'None / not for me' }
  ];

  var WARDROBE_STRATEGY = [
    { id: 'reuse', label: 'Mostly reuse what I own' },
    { id: 'mix', label: 'Mix old and new' },
    { id: 'new', label: 'Show me new pieces' },
    { id: 'no-pref', label: 'No preference' }
  ];

  var STEPS = [
    { key: 'style', title: 'About You & Style' },
    { key: 'fit', title: 'Fit, Sizes & Comfort' },
    { key: 'priorities', title: 'Priorities & Wardrobe' }
  ];

  /* =====================================================================
   * 2. STATE + HELPERS
   * ===================================================================== */

  var currentStep = 0;
  var activePartner = 'p1';
  var photoObjectUrl = null;
  var MAX_PHOTO_BYTES = 5 * 1024 * 1024;

  function $id(id) { return document.getElementById(id); }

  function aes() { return Store.getAesthetic(); }

  function isPartner2() {
    return !!(Store && Store.isCouple && Store.isCouple() && activePartner === 'p2');
  }

  function fits() {
    return isPartner2() ? Store.getPartner2Fit() : Store.getFit();
  }

  function saveAes(patch) { return Store.setAesthetic(patch); }

  function saveFit(patch) { return isPartner2() ? Store.setPartner2Fit(patch) : Store.setFit(patch); }

  function partnerLabel() { return isPartner2() ? 'Person 2' : 'Person 1'; }

  function authState() {
    try { if (typeof AuthState !== 'undefined') return AuthState; } catch (e) { /* not global yet */ }
    return global.AuthState || null;
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toggle(arr, value) {
    var i = arr.indexOf(value);
    if (i > -1) arr.splice(i, 1); else arr.push(value);
    return arr;
  }

  function checkIcon() {
    return '<span class="opt-check"><svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></span>';
  }

  function chipMarkup(group, value, label, selected, hex, area) {
    var dot = hex ? '<span class="w-3 h-3 rounded-full border border-slate-300" style="background:' + hex + '"></span>' : '';
    return '<button type="button" class="chip' + (selected ? ' is-selected' : '') + '" data-group="' + group + '"' +
      (area ? ' data-area="' + esc(area) + '"' : '') +
      ' data-value="' + esc(value) + '" aria-pressed="' + selected + '">' + dot + esc(label) + '</button>';
  }

  function labelOf(list, id) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i].label || list[i].title || id;
    }
    return id;
  }

  function setInputValue(el, value) {
    if (el && document.activeElement !== el) el.value = value;
  }

  /* =====================================================================
   * 3. RENDERERS
   * ===================================================================== */

  function renderIdentity() {
    var f = fits();
    var nameInput = $id('full-name');
    var user = authState() && authState().user;
    var name = f.full_name || (user && user.name) || '';
    setInputValue(nameInput, name);
    var gender = $id('gender-select');
    if (gender && document.activeElement !== gender) gender.value = f.gender || '';
  }

  function renderStyles() {
    $id('grid-styles').innerHTML = AESTHETICS.map(function (s) {
      var on = aes().preferred_styles.indexOf(s.id) > -1;
      return '<button type="button" class="opt-card' + (on ? ' is-selected' : '') + '" data-group="styles" data-value="' + s.id + '" aria-pressed="' + on + '">' +
        checkIcon() +
        '<span class="style-visual" style="background: linear-gradient(135deg,' + s.from + ',' + s.to + ');"><span class="style-monogram">' + s.mono + '</span></span>' +
        '<span class="block p-3.5">' +
          '<span class="block text-sm font-bold text-slate-900 tracking-tight leading-snug">' + esc(s.title) + '</span>' +
          '<span class="block text-[11px] text-slate-500 mt-1 leading-snug">' + esc(s.desc) + '</span>' +
        '</span></button>';
    }).join('');
    var n = aes().preferred_styles.length;
    $id('styles-count').textContent = n === 0 ? '' : (n <= 4 ? n + ' selected' : n + ' selected — four is usually plenty');
  }

  function renderColours() {
    $id('grid-colours').innerHTML = COLOUR_PALETTES.map(function (p) {
      var on = aes().preferred_colours.indexOf(p.id) > -1;
      return '<button type="button" class="opt-card' + (on ? ' is-selected' : '') + ' p-4 flex items-center gap-4" data-group="colours" data-value="' + p.id + '" aria-pressed="' + on + '">' +
        checkIcon() +
        '<span class="swatch-row flex-shrink-0">' + p.swatches.map(function (c) { return '<span class="swatch" style="background:' + c + '"></span>'; }).join('') + '</span>' +
        '<span class="min-w-0 text-left">' +
          '<span class="block text-sm font-bold text-slate-900 tracking-tight">' + esc(p.title) + '</span>' +
          '<span class="block text-[11px] text-slate-500 mt-0.5 truncate">' + esc(p.desc) + '</span>' +
        '</span></button>';
    }).join('');
  }

  function renderAvoidColours() {
    $id('grid-avoid').innerHTML = AVOID_COLOURS.map(function (c) {
      return chipMarkup('avoid', c.id, c.label, aes().avoided_colours.indexOf(c.id) > -1, c.hex);
    }).join('');
  }

  function renderPattern() {
    $id('grid-pattern').innerHTML = PATTERNS.map(function (p) {
      return chipMarkup('pattern', p.id, p.label, aes().pattern_preference === p.id);
    }).join('');
  }

  function selectedOverallFit() {
    var f = fits();
    if (f.general_fit) return f.general_fit;
    var aesthetic = aes().preferred_fit;
    if (aesthetic === 'not-sure') return 'no-pref';
    return aesthetic || null;
  }

  function renderFit() {
    var current = selectedOverallFit();
    $id('grid-fit').innerHTML = FITS.map(function (f) {
      var on = current === f.id;
      return '<button type="button" class="opt-card' + (on ? ' is-selected' : '') + ' p-4" data-group="fit" data-value="' + f.id + '" aria-pressed="' + on + '">' + checkIcon() +
        '<span class="block text-sm font-bold text-slate-900 tracking-tight">' + esc(f.label) + '</span>' +
        '<span class="block text-[11px] text-slate-500 mt-1 leading-snug">' + esc(f.desc) + '</span></button>';
    }).join('');
  }

  function renderGarmentFit() {
    var g = fits().garment_specific_fit || {};
    $id('grid-garment-fit').innerHTML = GARMENT_AREAS.map(function (area) {
      return '<div><p class="text-xs font-semibold text-slate-600 mb-2">' + esc(area.label) + '</p>' +
        '<div class="flex flex-wrap gap-2">' +
        FITS.map(function (f) { return chipMarkup('garment', f.id, f.label, g[area.key] === f.id, null, area.key); }).join('') +
        '</div></div>';
    }).join('');
  }

  function renderSilhouette() {
    var list = fits().preferred_silhouettes || [];
    var single = aes().preferred_silhouette;
    $id('grid-silhouette').innerHTML = SILHOUETTES.map(function (s) {
      var on = list.indexOf(s.id) > -1 || (!list.length && single === s.id);
      return '<button type="button" class="opt-card' + (on ? ' is-selected' : '') + ' p-4" data-group="silhouette" data-value="' + s.id + '" aria-pressed="' + on + '">' + checkIcon() +
        '<span class="block text-sm font-bold text-slate-900 tracking-tight">' + esc(s.label) + '</span>' +
        '<span class="block text-[11px] text-slate-500 mt-1 leading-snug">' + esc(s.desc) + '</span></button>';
    }).join('');
  }

  function renderFormality() {
    var label = aes().formality_preference;
    if (label) {
      Object.keys(FORMALITY_LABELS).forEach(function (k) {
        if (FORMALITY_LABELS[k] === label) $id('formality-range').value = k;
      });
    } else {
      $id('formality-range').value = 3;
    }
    updateFormalityLabel();
  }

  function updateFormalityLabel() {
    $id('formality-label').textContent = FORMALITY_LABELS[$id('formality-range').value];
  }

  function renderExperiment() {
    $id('grid-experiment').innerHTML = EXPERIMENT.map(function (x) {
      var on = aes().experimentation_level === x.id;
      return '<button type="button" class="opt-card' + (on ? ' is-selected' : '') + ' p-4" data-group="experiment" data-value="' + x.id + '" aria-pressed="' + on + '">' + checkIcon() +
        '<span class="block text-sm font-bold text-slate-900 tracking-tight">' + esc(x.label) + '</span>' +
        '<span class="block text-[11px] text-slate-500 mt-1 leading-snug">' + esc(x.desc) + '</span></button>';
    }).join('');
  }

  function renderSizes() {
    var sizes = fits().clothing_sizes || {};
    document.querySelectorAll('[data-size]').forEach(function (input) {
      setInputValue(input, sizes[input.getAttribute('data-size')] || '');
    });
    var region = $id('sizing-region');
    if (region && document.activeElement !== region) region.value = fits().sizing_region || '';
  }

  function renderComfort() {
    $id('grid-comfort').innerHTML = COMFORT.map(function (o) {
      return chipMarkup('comfort', o.id, o.label, fits().comfort_preferences.indexOf(o.id) > -1);
    }).join('');
    $id('grid-mobility').innerHTML = MOBILITY.map(function (o) {
      return chipMarkup('mobility', o.id, o.label, fits().mobility_requirements.indexOf(o.id) > -1);
    }).join('');
    $id('grid-fabrics').innerHTML = FABRICS.map(function (fab) {
      return chipMarkup('fabrics', fab, fab, fits().preferred_fabrics.indexOf(fab) > -1);
    }).join('');
  }

  function renderPriorities() {
    $id('grid-priorities').innerHTML = PRIORITIES.map(function (p) {
      return chipMarkup('priorities', p, p, aes().styling_priorities.indexOf(p) > -1);
    }).join('');
  }

  function renderExclusions() {
    var flags = aes().exclusion_flags || [];
    $id('grid-exclusions').innerHTML = EXCLUSIONS.map(function (e) {
      return chipMarkup('exclusions', e.id, e.label, flags.indexOf(e.id) > -1);
    }).join('');
  }

  function renderExclusionDetails() {
    $id('grid-ex-colours').innerHTML = AVOID_COLOURS.map(function (c) {
      return chipMarkup('ex-colours', c.id, c.label, aes().avoided_colours.indexOf(c.id) > -1, c.hex);
    }).join('');
    $id('grid-ex-garments').innerHTML = EXCLUSION_GARMENTS.map(function (g) {
      return chipMarkup('ex-garments', g, g, aes().excluded_garments.indexOf(g) > -1);
    }).join('');
    $id('grid-ex-fabrics').innerHTML = EXCLUSION_FABRICS.map(function (f) {
      return chipMarkup('ex-fabrics', f, f, aes().excluded_fabrics.indexOf(f) > -1);
    }).join('');
  }

  function renderRefinement() {
    Object.keys(REFINEMENT_GROUPS).forEach(function (group) {
      var cfg = REFINEMENT_GROUPS[group];
      var current = (aes().refinement || {})[cfg.field];
      $id('grid-' + group).innerHTML = cfg.items.map(function (item) {
        return chipMarkup(group, item.id, item.label, current === item.id);
      }).join('');
    });
  }

  function renderFootwear() {
    $id('grid-footwear').innerHTML = FOOTWEAR.map(function (f) {
      return chipMarkup('footwear', f, f, aes().preferred_footwear.indexOf(f) > -1);
    }).join('');
  }

  function mappedLayering() {
    var f = fits().layering_preference;
    if (f) return f;
    var a = (aes().refinement || {}).layering_preference;
    if (a === 'minimal-layers') return 'minimal';
    return a || null;
  }

  function renderLayering() {
    var current = mappedLayering();
    $id('grid-layering').innerHTML = LAYERING.map(function (o) {
      return chipMarkup('layering', o.id, o.label, current === o.id);
    }).join('');
  }

  function renderAccessory() {
    $id('grid-accessory').innerHTML = ACCESSORY.map(function (o) {
      return chipMarkup('accessory', o.id, o.label, fits().accessory_preference === o.id);
    }).join('');
  }

  function mappedWardrobe() {
    var f = fits().wardrobe_strategy;
    if (f) return f;
    var a = (aes().refinement || {}).reuse_wardrobe;
    if (a === 'yes') return 'reuse';
    if (a === 'maybe') return 'mix';
    if (a === 'no') return 'new';
    return null;
  }

  function renderWardrobeStrategy() {
    var current = mappedWardrobe();
    $id('grid-wardrobe-strategy').innerHTML = WARDROBE_STRATEGY.map(function (o) {
      return chipMarkup('wardrobe-strategy', o.id, o.label, current === o.id);
    }).join('');
  }

  function renderNotes() {
    setInputValue($id('wardrobe-notes'), fits().existing_wardrobe_notes || '');
    setInputValue($id('optional-notes'), aes().optional_notes || '');
  }

  function renderPhoto() {
    var consent = $id('photo-consent');
    if (consent) consent.checked = !!fits().photo_processing_consent;
    var clear = $id('photo-clear');
    if (clear) clear.classList.toggle('hidden', !fits().photo_selected);
    if (fits().photo_selected) {
      setPhotoStatus('A photo was selected earlier. Choose it again if you want a preview in this tab.', 'ok');
    } else {
      setPhotoStatus('No photo selected — this section is completely optional.', 'muted');
    }
  }

  function renderReview() {
    var f = fits();
    var a = aes();
    var rows = [];

    if (Store.isCouple && Store.isCouple()) {
      rows.push(
        '<div class="glass-card rounded-2xl p-5 bg-indigo-50/60 border-indigo-100"><p class="text-[11px] font-bold uppercase tracking-wider text-indigo-500 mb-1">Showing profile</p>' +
        '<p class="text-sm font-bold text-slate-900">' + esc(partnerLabel()) + (f.full_name ? ' · ' + esc(f.full_name) : '') + '</p>' +
        '<p class="text-[11px] text-slate-500 mt-1">Use the partner switch above. Sizes, comfort and movement needs are kept separate.</p></div>'
      );
    }

    function group(title, values) {
      if (!values) return;
      values = values.filter(function (v) { return v !== null && v !== undefined && v !== ''; });
      if (!values.length) return;
      rows.push(
        '<div class="glass-card rounded-2xl p-5"><p class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">' + esc(title) + '</p>' +
        '<div class="flex flex-wrap gap-1.5">' +
        values.map(function (v) { return '<span class="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/80 border border-slate-200 text-slate-700">' + esc(v) + '</span>'; }).join('') +
        '</div></div>'
      );
    }

    group('About you', [f.full_name, GENDER_LABELS[f.gender]].filter(Boolean));
    group('Preferred aesthetics', (a.preferred_styles || []).map(function (id) { return labelOf(AESTHETICS, id); }));
    group('Preferred colours', (a.preferred_colours || []).map(function (id) { return labelOf(COLOUR_PALETTES, id); }));
    if (a.pattern_preference) group('Pattern preference', [labelOf(PATTERNS, a.pattern_preference)]);
    if (a.avoided_colours.length) group('Colours to avoid', a.avoided_colours.map(function (id) { return labelOf(AVOID_COLOURS, id); }));
    if (a.formality_preference) group('Formality', [a.formality_preference]);
    if (a.experimentation_level) group('Experimentation', [labelOf(EXPERIMENT, a.experimentation_level)]);

    if (selectedOverallFit()) group('Overall fit', [labelOf(FITS, selectedOverallFit())]);
    group('Garment-specific fit', garmentFitLabels());
    group('Preferred silhouettes', silhouetteLabels());
    var sizeEntries = Object.keys(f.clothing_sizes || {}).map(function (key) {
      return key.charAt(0).toUpperCase() + key.slice(1) + ': ' + f.clothing_sizes[key];
    });
    if (f.sizing_region) sizeEntries.push('Region: ' + f.sizing_region);
    group('Sizes (optional)', sizeEntries);
    group('Comfort priorities', (f.comfort_preferences || []).map(function (id) { return labelOf(COMFORT, id); }));
    group('Movement needs', (f.mobility_requirements || []).map(function (id) { return labelOf(MOBILITY, id); }));
    group('Preferred fabrics', f.preferred_fabrics || []);

    if ((a.styling_priorities || []).length) group('Styling priorities', a.styling_priorities);
    if (exclusionLabels().length) group('Exclusions', exclusionLabels());
    if ((a.excluded_garments || []).length) group('Garments to avoid', a.excluded_garments);
    if ((a.excluded_fabrics || []).length) group('Fabrics to avoid', a.excluded_fabrics);
    if ((a.preferred_footwear || []).length) group('Preferred footwear', a.preferred_footwear);

    var ref = a.refinement || {};
    if (ref.statement_style) group('Statement vs simple', [labelOf(REFINEMENT_GROUPS.statement.items, ref.statement_style)]);
    if (ref.trend_preference) group('Trendy vs timeless', [labelOf(REFINEMENT_GROUPS.trend.items, ref.trend_preference)]);
    if (ref.ease_of_care) group('Ease of care', [labelOf(REFINEMENT_GROUPS.care.items, ref.ease_of_care)]);
    if (mappedLayering()) group('Layering', [labelOf(LAYERING, mappedLayering())]);
    if (f.accessory_preference) group('Accessories', [labelOf(ACCESSORY, f.accessory_preference)]);
    if (mappedWardrobe()) group('Wardrobe strategy', [labelOf(WARDROBE_STRATEGY, mappedWardrobe())]);
    if (f.existing_wardrobe_notes) group('Wardrobe notes', [f.existing_wardrobe_notes]);
    if (a.optional_notes) group('Notes', [a.optional_notes]);
    if (f.photo_selected) group('Photo', ['Local preview only', f.photo_processing_consent ? 'Consent given' : 'No consent given']);

    $id('review-profile').innerHTML = rows.join('');
    $id('review-empty').classList.toggle('hidden', rows.length > 0);
  }

  function renderSummary() {
    var f = fits();
    var a = aes();
    var parts = [];

    function group(title, values) {
      if (!values) return;
      values = values.filter(function (v) { return v !== null && v !== undefined && v !== ''; });
      if (!values.length) return;
      parts.push(
        '<div><p class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">' + esc(title) + '</p>' +
        '<div class="flex flex-wrap gap-1.5">' +
        values.map(function (v) { return '<span class="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/80 border border-slate-200 text-slate-700">' + esc(v) + '</span>'; }).join('') +
        '</div></div>'
      );
    }

    if (Store.isCouple && Store.isCouple()) {
      parts.push('<p class="text-[11px] font-bold uppercase tracking-wider text-indigo-500 mb-2">For ' + esc(partnerLabel()) + '</p>');
    }

    group('Name', [f.full_name]);
    group('Gender', [GENDER_LABELS[f.gender]]);
    group('Aesthetics', (a.preferred_styles || []).map(function (id) { return labelOf(AESTHETICS, id); }));
    group('Colours', (a.preferred_colours || []).map(function (id) { return labelOf(COLOUR_PALETTES, id); }));
    if (a.formality_preference) group('Formality', [a.formality_preference]);
    if (selectedOverallFit()) group('Fit', [labelOf(FITS, selectedOverallFit())]);
    group('Silhouettes', silhouetteLabels());
    group('Comfort', (f.comfort_preferences || []).slice(0, 3).map(function (id) { return labelOf(COMFORT, id); }));
    group('Priorities', (a.styling_priorities || []).slice(0, 3));
    group('Exclusions', exclusionLabels());
    if (f.photo_selected) group('Photo', ['Local preview only']);

    $id('summary-body').innerHTML = parts.length ? parts.join('') :
      '<div class="flex items-center justify-center py-8 text-slate-400 text-sm">Your selections will appear here as you go.</div>';
  }

  function silhouetteLabels() {
    var list = fits().preferred_silhouettes || [];
    if (!list.length && aes().preferred_silhouette) list = [aes().preferred_silhouette];
    return list.map(function (id) { return labelOf(SILHOUETTES, id); });
  }

  function garmentFitLabels() {
    var g = fits().garment_specific_fit || {};
    return GARMENT_AREAS
      .filter(function (a) { return g[a.key]; })
      .map(function (a) { return a.label + ': ' + labelOf(FITS, g[a.key]); });
  }

  function exclusionLabels() {
    var flags = aes().exclusion_flags || [];
    return flags.map(function (id) {
      var e = EXCLUSIONS.filter(function (x) { return x.id === id; })[0];
      return e ? e.label : id;
    });
  }

  function renderStepContent(index) {
    if (index === 0) {
      renderIdentity();
      renderStyles();
      renderColours();
      renderAvoidColours();
      renderPattern();
    } else if (index === 1) {
      renderFit();
      renderGarmentFit();
      renderSilhouette();
      renderFormality();
      renderExperiment();
      renderSizes();
      renderComfort();
    } else if (index === 2) {
      renderPriorities();
      renderExclusions();
      renderExclusionDetails();
      renderRefinement();
      renderFootwear();
      renderLayering();
      renderAccessory();
      renderWardrobeStrategy();
      renderNotes();
      renderPhoto();
      renderReview();
    }
  }

  /* =====================================================================
   * 4. SELECTION
   * ===================================================================== */

  function rerender() {
    renderStepContent(currentStep);
    renderSummary();
    renderPartnerToggle();
    updateNavHint();
  }

  function handleSelect(group, value, area) {
    if (!value) return;

    if (group === 'styles') return handleStyleSelect(value);
    if (group === 'exclusions') return handleExclusionSelect(value);
    if (group === 'garment') return handleGarmentFit(area, value);

    if (group === 'colours' || group === 'avoid' || group === 'priorities' ||
        group === 'ex-colours' || group === 'ex-garments' || group === 'ex-fabrics' ||
        group === 'footwear' || group === 'comfort' || group === 'mobility' || group === 'fabrics') {
      var fields = {
        colours: 'preferred_colours', avoid: 'avoided_colours', priorities: 'styling_priorities',
        'ex-colours': 'avoided_colours', 'ex-garments': 'excluded_garments',
        'ex-fabrics': 'excluded_fabrics', footwear: 'preferred_footwear'
      };
      if (fields[group]) {
        var list = (aes()[fields[group]] || []).slice();
        toggle(list, value);
        var patch = {}; patch[fields[group]] = list;
        saveAes(patch);
      } else {
        var fitFields = { comfort: 'comfort_preferences', mobility: 'mobility_requirements', fabrics: 'preferred_fabrics' };
        var fitList = (fits()[fitFields[group]] || []).slice();
        toggle(fitList, value);
        var fitPatch = {}; fitPatch[fitFields[group]] = fitList;
        saveFit(fitPatch);
      }
    } else if (group === 'pattern') {
      saveAes({ pattern_preference: aes().pattern_preference === value ? null : value });
    } else if (group === 'experiment') {
      saveAes({ experimentation_level: aes().experimentation_level === value ? null : value });
    } else if (group === 'statement' || group === 'trend' || group === 'care') {
      var cfg = REFINEMENT_GROUPS[group];
      var ref = Object.assign({}, aes().refinement);
      ref[cfg.field] = ref[cfg.field] === value ? null : value;
      saveAes({ refinement: ref });
    } else if (group === 'fit') {
      var next = selectedOverallFit() === value ? null : value;
      saveFit({ general_fit: next });
      saveAes({ preferred_fit: next });
    } else if (group === 'silhouette') {
      var sil = (fits().preferred_silhouettes || []).slice();
      toggle(sil, value);
      saveFit({ preferred_silhouettes: sil });
      saveAes({ preferred_silhouette: sil[0] || null });
    } else if (group === 'layering') {
      var nextLayer = mappedLayering() === value ? null : value;
      saveFit({ layering_preference: nextLayer });
      var refLayer = Object.assign({}, aes().refinement);
      refLayer.layering_preference = nextLayer === 'minimal' ? 'minimal-layers' : nextLayer;
      saveAes({ refinement: refLayer });
    } else if (group === 'accessory') {
      saveFit({ accessory_preference: fits().accessory_preference === value ? null : value });
    } else if (group === 'wardrobe-strategy') {
      var nextWardrobe = mappedWardrobe() === value ? null : value;
      saveFit({ wardrobe_strategy: nextWardrobe });
      var refWardrobe = Object.assign({}, aes().refinement);
      refWardrobe.reuse_wardrobe = nextWardrobe === 'reuse' ? 'yes' : nextWardrobe === 'mix' ? 'maybe' : nextWardrobe === 'new' ? 'no' : null;
      saveAes({ refinement: refWardrobe });
    }

    rerender();
  }

  function handleStyleSelect(id) {
    var styles = (aes().preferred_styles || []).slice();
    if (id === 'not-sure') {
      styles = styles.indexOf('not-sure') > -1 ? [] : ['not-sure'];
    } else {
      var ns = styles.indexOf('not-sure');
      if (ns > -1) styles.splice(ns, 1);
      toggle(styles, id);
    }
    saveAes({ preferred_styles: styles });
    rerender();
  }

  function handleExclusionSelect(id) {
    var flags = (aes().exclusion_flags || []).slice();
    if (id === 'no-restrictions') {
      flags = flags.indexOf('no-restrictions') > -1 ? [] : ['no-restrictions'];
    } else {
      var nr = flags.indexOf('no-restrictions');
      if (nr > -1) flags.splice(nr, 1);
      toggle(flags, id);
    }
    saveAes({ exclusion_flags: flags });
    rerender();
  }

  function handleGarmentFit(area, value) {
    if (!area) return;
    var g = Object.assign({}, fits().garment_specific_fit || {});
    if (g[area] === value) delete g[area]; else g[area] = value;
    saveFit({ garment_specific_fit: g });
    rerender();
  }

  /* =====================================================================
   * 5. PHOTO
   * ===================================================================== */

  function setPhotoStatus(text, tone) {
    var el = $id('photo-status');
    if (!el) return;
    el.textContent = text;
    el.className = 'mt-3 text-xs ' + (tone === 'error' ? 'text-red-500' : tone === 'ok' ? 'text-emerald-600' : 'text-slate-400');
  }

  function revokePhoto() {
    if (photoObjectUrl) {
      try { URL.revokeObjectURL(photoObjectUrl); } catch (e) { /* ignore */ }
      photoObjectUrl = null;
    }
  }

  function hidePhotoPreview() {
    var preview = $id('photo-preview');
    if (preview) preview.removeAttribute('src');
    var wrap = $id('photo-preview-wrap');
    if (wrap) wrap.classList.add('hidden');
    var clear = $id('photo-clear');
    if (clear) clear.classList.add('hidden');
  }

  function handlePhotoFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setPhotoStatus('That file type is not supported. Please choose an image.', 'error');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoStatus('That image is larger than 5 MB. Please choose a smaller file.', 'error');
      return;
    }
    revokePhoto();
    photoObjectUrl = URL.createObjectURL(file);
    var preview = $id('photo-preview');
    var wrap = $id('photo-preview-wrap');
    if (preview) preview.src = photoObjectUrl;
    if (wrap) wrap.classList.remove('hidden');
    var clear = $id('photo-clear');
    if (clear) clear.classList.remove('hidden');
    saveFit({
      photo_selected: true,
      photo_name: file.name,
      photo_type: file.type,
      photo_size: file.size
    });
    setPhotoStatus('Local preview ready: ' + file.name + ' (stays in this tab only).', 'ok');
    renderSummary();
  }

  function clearPhoto() {
    revokePhoto();
    hidePhotoPreview();
    var consent = $id('photo-consent');
    if (consent) consent.checked = false;
    saveFit({
      photo_selected: false, photo_name: null, photo_type: null, photo_size: null,
      photo_processing_consent: false
    });
    setPhotoStatus('No photo selected — this section is completely optional.', 'muted');
    renderSummary();
  }

  /* =====================================================================
   * 6. NAVIGATION
   * ===================================================================== */

  function updateProgress() {
    var percent = Math.round(((currentStep + 1) / STEPS.length) * 100);
    $id('progress-eyebrow').textContent = 'Step ' + (currentStep + 1) + ' of ' + STEPS.length;
    $id('progress-title').textContent = STEPS[currentStep].title;
    $id('progress-percent').innerHTML = percent + '<span class="text-lg align-top">%</span>';
    $id('progress-bar').style.width = percent + '%';
    renderStepper();
  }

  function renderStepper() {
    $id('stepper').innerHTML = STEPS.map(function (s, i) {
      var cls = 'step-dot' + (i < currentStep ? ' is-done' : '') + (i === currentStep ? ' is-active' : '');
      var content = i < currentStep
        ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>'
        : (i + 1);
      return '<button type="button" class="' + cls + '" data-step-nav="' + i + '" title="' + esc(s.title) + '" aria-label="Go to ' + esc(s.title) + '">' + content + '</button>';
    }).join('');
  }

  function updateNavHint() {
    var hint = $id('nav-hint');
    hint.classList.remove('text-red-500');
    if (currentStep === 0 && (aes().preferred_styles || []).length === 0) {
      hint.textContent = 'Select at least one aesthetic to continue.';
      hint.classList.remove('hidden');
    } else if (currentStep === STEPS.length - 1) {
      hint.textContent = 'Your answers are saved automatically.';
      hint.classList.remove('hidden');
    } else {
      hint.classList.add('hidden');
    }
  }

  function updateFooterButtons() {
    $id('btn-continue-label').textContent = currentStep === STEPS.length - 1 ? 'Save Profile' : 'Continue';
    $id('btn-back').innerHTML = currentStep === 0
      ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg> Home'
      : '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg> Back';
  }

function validateStep(index) {
    var hint = $id('nav-hint');
    hint.classList.remove('text-red-500');

    if (index === 0) {
      if ((aes().preferred_styles || []).length === 0) {
        hint.textContent = 'Please select at least one aesthetic — or choose "Not Sure Yet".';
        hint.classList.remove('hidden');
        hint.classList.add('text-red-500');
        return false;
      }
    } else if (index === 1) {
      if (!selectedOverallFit()) {
        hint.textContent = 'Please select your overall fit preference.';
        hint.classList.remove('hidden');
        hint.classList.add('text-red-500');
        return false;
      }
    } else if (index === 2) {
      if ((aes().styling_priorities || []).length === 0) {
        hint.textContent = 'Please select at least one styling priority.';
        hint.classList.remove('hidden');
        hint.classList.add('text-red-500');
        return false;
      }
    }

    if (index === 0 && (aes().preferred_styles || []).length === 0) {
      hint.textContent = 'Select at least one aesthetic to continue.';
    } else if (index === STEPS.length - 1) {
      hint.textContent = 'Your answers are saved automatically.';
    } else {
      hint.classList.add('hidden');
    }
    return true;
  }

  function goToStep(index) {
    currentStep = Math.max(0, Math.min(STEPS.length - 1, index));
    document.querySelectorAll('.step-section').forEach(function (section) {
      section.classList.toggle('is-active', Number(section.getAttribute('data-step')) === currentStep);
    });
    updateProgress();
    updateFooterButtons();
    updateNavHint();
    renderStepContent(currentStep);
    renderSummary();
    Store.setAestheticStep(currentStep);
    Store.setFitStep(currentStep);
    var host = $id('step-host');
    if (host) {
      var top = host.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
  }

  function nextStep() {
    if (!validateStep(currentStep)) return;
    if (currentStep === STEPS.length - 1) return completeProfile();
    goToStep(currentStep + 1);
  }

  function prevStep() {
    if (currentStep === 0) {
      window.location.href = 'index.html';
      return;
    }
    goToStep(currentStep - 1);
  }

  function completeProfile() {
    Store.markAestheticComplete(true);
    Store.markFitComplete(true);
    window.DaFitMatchProfile = Store.toJSON();
    try {
      window.dispatchEvent(new CustomEvent('dafitmatch:profile-complete', { detail: window.DaFitMatchProfile }));
      window.dispatchEvent(new CustomEvent('dafitmatch:fit-complete', { detail: window.DaFitMatchProfile }));
    } catch (e) { /* older browsers */ }
    var overlay = $id('completion');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
  }

  /* =====================================================================
   * 7. AUTH / PARTNER / EVENTS
   * ===================================================================== */

  function updateUserBadge() {
    var badge = $id('summary-user-badge');
    var note = $id('summary-save-note');
    var Auth = authState();
    var signedIn = Store.isSignedIn();
    if (signedIn && Auth && Auth.user) {
      badge.textContent = String(Auth.user.name || 'You').split(' ')[0];
      badge.className = 'text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200';
      if (note) note.textContent = 'Saved to your account automatically.';
    } else {
      badge.textContent = 'Guest';
      badge.className = 'text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 border border-sky-200';
      if (note) note.textContent = 'Answers are saved on this device. Sign in to keep them.';
    }
  }

  function isFitEmpty(f) {
    if (!f) return true;
    return !Object.keys(f).some(function (k) {
      var v = f[k];
      if (k === 'photo_selected' && v) return v;
      if (typeof v === 'string') return !!v;
      if (Array.isArray(v)) return v.length > 0;
      if (v && typeof v === 'object') return Object.keys(v).length > 0;
      return false;
    });
  }

  function renderPartnerToggle() {
    var mount = $id('partner-toggle');
    if (!mount) return;
    if (!Store.isCouple || !Store.isCouple()) {
      mount.classList.add('hidden');
      mount.innerHTML = '';
      return;
    }
    mount.classList.remove('hidden');
    var p2Empty = isFitEmpty(Store.get().couple.partner2Fit);
    mount.innerHTML =
      '<div class="glass-card rounded-xl px-4 py-3">' +
        '<div class="flex flex-wrap items-center justify-between gap-3">' +
          '<div class="flex items-center gap-2">' +
            '<p class="text-[12px] font-bold text-slate-700">Styling for</p>' +
            '<div class="flex rounded-full bg-slate-100 border border-slate-200 p-0.5">' +
              '<button type="button" class="text-[11px] font-bold px-3 py-1.5 rounded-full ' + (activePartner === 'p1' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700') + '" data-partner="p1">Person 1</button>' +
              '<button type="button" class="text-[11px] font-bold px-3 py-1.5 rounded-full ' + (activePartner === 'p2' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700') + '" data-partner="p2">Person 2</button>' +
            '</div>' +
          '</div>' +
          (p2Empty
            ? '<p class="text-[11px] text-slate-500">Person 2 not started yet — their fit &amp; comfort profile is kept separate.</p>'
            : '<p class="text-[11px] text-emerald-600">Person 2 profile saved separately.</p>') +
        '</div>' +
      '</div>';
  }

  function switchPartner(partner) {
    if (partner === activePartner) return;
    activePartner = partner;
    revokePhoto();
    hidePhotoPreview();
    goToStep(currentStep);
    renderPartnerToggle();
    updateUserBadge();
  }

  function bindEvents() {
    document.addEventListener('click', function (e) {
      var partner = e.target.closest('[data-partner]');
      if (partner) { switchPartner(partner.getAttribute('data-partner')); return; }

      var sel = e.target.closest('[data-group]');
      if (sel) {
        handleSelect(sel.getAttribute('data-group'), sel.getAttribute('data-value'), sel.getAttribute('data-area'));
        return;
      }

      var nav = e.target.closest('[data-step-nav]');
      if (nav) goToStep(parseInt(nav.getAttribute('data-step-nav'), 10));
    });

    $id('styles-clear').addEventListener('click', function () {
      saveAes({ preferred_styles: [] });
      rerender();
    });

    $id('formality-range').addEventListener('input', function () {
      updateFormalityLabel();
      saveAes({ formality_preference: FORMALITY_LABELS[this.value] });
      renderSummary();
    });

    var nameTimer = null;
    $id('full-name').addEventListener('input', function () {
      var value = this.value;
      clearTimeout(nameTimer);
      nameTimer = setTimeout(function () {
        saveFit({ full_name: value.trim() ? value.trim() : null });
        renderSummary();
      }, 300);
    });

    $id('gender-select').addEventListener('change', function () {
      saveFit({ gender: this.value || null });
      renderSummary();
    });

    $id('sizes-clear').addEventListener('click', function () {
      document.querySelectorAll('[data-size]').forEach(function (input) { input.value = ''; });
      var region = $id('sizing-region');
      if (region) region.value = '';
      saveFit({ clothing_sizes: {}, sizing_region: null });
      renderSummary();
    });

    var regionSelect = $id('sizing-region');
    if (regionSelect) {
      regionSelect.addEventListener('change', function () {
        saveFit({ sizing_region: this.value || null });
        renderSummary();
      });
    }

    var sizeTimer = null;
    document.querySelectorAll('[data-size]').forEach(function (input) {
      input.addEventListener('input', function () {
        var sizes = Object.assign({}, fits().clothing_sizes);
        var key = this.getAttribute('data-size');
        var value = this.value.trim();
        if (value) sizes[key] = value; else delete sizes[key];
        clearTimeout(sizeTimer);
        sizeTimer = setTimeout(function () {
          saveFit({ clothing_sizes: sizes });
          renderSummary();
        }, 300);
      });
    });

    var wardrobeTimer = null;
    $id('wardrobe-notes').addEventListener('input', function () {
      var value = this.value;
      clearTimeout(wardrobeTimer);
      wardrobeTimer = setTimeout(function () {
        saveFit({ existing_wardrobe_notes: value.trim() ? value : null });
        renderSummary();
      }, 350);
    });

    var notesTimer = null;
    $id('optional-notes').addEventListener('input', function () {
      var value = this.value;
      clearTimeout(notesTimer);
      notesTimer = setTimeout(function () {
        saveAes({ optional_notes: value.trim() ? value : null });
        renderSummary();
      }, 350);
    });

    var photoInput = $id('photo-input');
    if (photoInput) {
      photoInput.addEventListener('change', function () {
        if (this.files && this.files[0]) handlePhotoFile(this.files[0]);
      });
    }
    var photoClear = $id('photo-clear');
    if (photoClear) photoClear.addEventListener('click', clearPhoto);

    var consent = $id('photo-consent');
    if (consent) {
      consent.addEventListener('change', function () {
        saveFit({ photo_processing_consent: this.checked });
      });
    }

    $id('btn-continue').addEventListener('click', nextStep);

    $id('btn-back').addEventListener('click', prevStep);

    $id('btn-reset').addEventListener('click', function () {
      if (!window.confirm('Clear your entire style, fit and comfort profile? This cannot be undone.')) return;
      Store.resetAesthetic();
      Store.resetFit();
      if (Store.isCouple && Store.isCouple()) Store.resetPartner2Fit();
      activePartner = 'p1';
      revokePhoto();
      hidePhotoPreview();
      var photoConsent = $id('photo-consent');
      if (photoConsent) photoConsent.checked = false;
      goToStep(0);
      renderPartnerToggle();
      renderSummary();
    });
  }

  /* =====================================================================
   * 8. INIT
   * ===================================================================== */

  function init() {
    if (!Store) { console.error('[DaFitMatch Profile] store module missing'); return; }
    bindEvents();

    var state = Store.get();
    var savedStep = typeof state.fitStep === 'number' ? state.fitStep : (state.aestheticStep || 0);
    currentStep = Math.max(0, Math.min(STEPS.length - 1, savedStep));

    document.querySelectorAll('.step-section').forEach(function (section) {
      section.classList.toggle('is-active', Number(section.getAttribute('data-step')) === currentStep);
    });

    updateProgress();
    updateFooterButtons();
    updateNavHint();
    renderStepContent(currentStep);
    renderSummary();
    renderPartnerToggle();
    updateUserBadge();

    if (Store.on) Store.on(function () { updateUserBadge(); });
    window.addEventListener('beforeunload', revokePhoto);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.DaFitMatchProfileController = { goToStep: goToStep, complete: completeProfile };
})(window);
