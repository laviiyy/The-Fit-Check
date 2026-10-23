/*
 * DaFitMatch — Page 3: Aesthetic Discovery & Personal Style Profiling
 * -------------------------------------------------------------------------
 * Controller for aesthetic.html.
 *
 *  - Renders each interactive step (aesthetic cards, colour palettes, fit,
 *    formality, priorities, exclusions, optional refinement, review).
 *  - Keeps the structured aesthetic profile in DaFitMatchStore, which persists
 *    it to localStorage per signed-in user (and merges guest drafts on login).
 *  - Validates only genuinely required fields.
 *  - Passes the profile to the downstream recommendation stage via
 *    window.DaFitMatchProfile + a 'dafitmatch:profile-complete' event.
 *
 * No external dependencies. No fabricated AI / product data: every option is a
 * UI choice only.
 */
(function () {
  'use strict';

  var Store = window.DaFitMatchStore;

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
    { id: 'depends', label: 'Depends on the outfit', desc: 'Mix and match per look.' },
    { id: 'not-sure', label: 'Not Sure', desc: 'Let us guide you.' }
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
    layering: {
      field: 'layering_preference',
      items: [{ id: 'minimal-layers', label: 'Minimal layering' }, { id: 'balanced', label: 'Balanced' }, { id: 'layered', label: 'Layered & textured' }]
    },
    trend: {
      field: 'trend_preference',
      items: [{ id: 'timeless', label: 'Timeless' }, { id: 'balanced', label: 'Balanced' }, { id: 'trendy', label: 'Trendy' }]
    },
    care: {
      field: 'ease_of_care',
      items: [{ id: 'low-maintenance', label: 'Low-maintenance' }, { id: 'balanced', label: 'Balanced' }, { id: 'any', label: 'I don\'t mind' }]
    },
    wardrobe: {
      field: 'reuse_wardrobe',
      items: [{ id: 'yes', label: 'Yes, reuse my wardrobe' }, { id: 'maybe', label: 'Maybe' }, { id: 'no', label: 'No, show me new things' }]
    }
  };

  var FORMALITY_LABELS = {
    1: 'Comfortable & Casual',
    2: 'Relaxed',
    3: 'Regular / Balanced',
    4: 'Refined',
    5: 'Refined & Formal'
  };

  /* Three grouped steps: every question from the original eight-step flow is
   * still asked, but related topics now share one screen to shorten the
   * journey without weakening the profile. */
  var STEPS = [
    { key: 'style', title: 'Style & Colour' },
    { key: 'fit', title: 'Fit & Formality' },
    { key: 'priorities', title: 'Priorities & Boundaries' }
  ];

  /* =====================================================================
   * 2. STATE + HELPERS
   * ===================================================================== */

  var currentStep = 0;

  function aes() { return Store.getAesthetic(); }
  function $(id) { return document.getElementById(id); }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
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

  /* =====================================================================
   * 3. RENDERERS
   * ===================================================================== */

  function renderStyles() {
    $('grid-styles').innerHTML = AESTHETICS.map(function (s) {
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
    $('styles-count').textContent = n === 0 ? '' : (n <= 4 ? n + ' selected' : n + ' selected — four is usually plenty');
  }

  function renderColours() {
    $('grid-colours').innerHTML = COLOUR_PALETTES.map(function (p) {
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

  function chipMarkup(group, value, label, selected, hex) {
    var dot = hex ? '<span class="w-3 h-3 rounded-full border border-slate-300" style="background:' + hex + '"></span>' : '';
    return '<button type="button" class="chip' + (selected ? ' is-selected' : '') + '" data-group="' + group + '" data-value="' + esc(value) + '" aria-pressed="' + selected + '">' + dot + esc(label) + '</button>';
  }

  function renderAvoidColours() {
    $('grid-avoid').innerHTML = AVOID_COLOURS.map(function (c) {
      return chipMarkup('avoid', c.id, c.label, aes().avoided_colours.indexOf(c.id) > -1, c.hex);
    }).join('');
  }

  function renderPattern() {
    $('grid-pattern').innerHTML = PATTERNS.map(function (p) {
      return chipMarkup('pattern', p.id, p.label, aes().pattern_preference === p.id);
    }).join('');
  }

  function renderFit() {
    $('grid-fit').innerHTML = FITS.map(function (f) {
      var on = aes().preferred_fit === f.id;
      return '<button type="button" class="opt-card' + (on ? ' is-selected' : '') + ' p-4" data-group="fit" data-value="' + f.id + '" aria-pressed="' + on + '">' + checkIcon() +
        '<span class="block text-sm font-bold text-slate-900 tracking-tight">' + esc(f.label) + '</span>' +
        '<span class="block text-[11px] text-slate-500 mt-1 leading-snug">' + esc(f.desc) + '</span></button>';
    }).join('');
  }

  function renderSilhouette() {
    $('grid-silhouette').innerHTML = SILHOUETTES.map(function (s) {
      var on = aes().preferred_silhouette === s.id;
      return '<button type="button" class="opt-card' + (on ? ' is-selected' : '') + ' p-4" data-group="silhouette" data-value="' + s.id + '" aria-pressed="' + on + '">' + checkIcon() +
        '<span class="block text-sm font-bold text-slate-900 tracking-tight">' + esc(s.label) + '</span>' +
        '<span class="block text-[11px] text-slate-500 mt-1 leading-snug">' + esc(s.desc) + '</span></button>';
    }).join('');
  }

  function renderExperiment() {
    $('grid-experiment').innerHTML = EXPERIMENT.map(function (x) {
      var on = aes().experimentation_level === x.id;
      return '<button type="button" class="opt-card' + (on ? ' is-selected' : '') + ' p-4" data-group="experiment" data-value="' + x.id + '" aria-pressed="' + on + '">' + checkIcon() +
        '<span class="block text-sm font-bold text-slate-900 tracking-tight">' + esc(x.label) + '</span>' +
        '<span class="block text-[11px] text-slate-500 mt-1 leading-snug">' + esc(x.desc) + '</span></button>';
    }).join('');
  }

  function renderPriorities() {
    $('grid-priorities').innerHTML = PRIORITIES.map(function (p) {
      return chipMarkup('priorities', p, p, aes().styling_priorities.indexOf(p) > -1);
    }).join('');
  }

  function renderExclusions() {
    var flags = aes().exclusion_flags || [];
    $('grid-exclusions').innerHTML = EXCLUSIONS.map(function (e) {
      return chipMarkup('exclusions', e.id, e.label, flags.indexOf(e.id) > -1);
    }).join('');
  }

  function renderExclusionDetails() {
    $('grid-ex-colours').innerHTML = AVOID_COLOURS.map(function (c) {
      return chipMarkup('ex-colours', c.id, c.label, aes().avoided_colours.indexOf(c.id) > -1, c.hex);
    }).join('');
    $('grid-ex-garments').innerHTML = EXCLUSION_GARMENTS.map(function (g) {
      return chipMarkup('ex-garments', g, g, aes().excluded_garments.indexOf(g) > -1);
    }).join('');
    $('grid-ex-fabrics').innerHTML = EXCLUSION_FABRICS.map(function (f) {
      return chipMarkup('ex-fabrics', f, f, aes().excluded_fabrics.indexOf(f) > -1);
    }).join('');
  }

  function renderFootwear() {
    $('grid-footwear').innerHTML = FOOTWEAR.map(function (f) {
      return chipMarkup('footwear', f, f, aes().preferred_footwear.indexOf(f) > -1);
    }).join('');
  }

  function renderRefinement() {
    Object.keys(REFINEMENT_GROUPS).forEach(function (group) {
      var cfg = REFINEMENT_GROUPS[group];
      var current = (aes().refinement || {})[cfg.field];
      $(('grid-' + group)).innerHTML = cfg.items.map(function (item) {
        return chipMarkup(group, item.id, item.label, current === item.id);
      }).join('');
    });
    $('optional-notes').value = aes().optional_notes || '';
  }

  function renderFormality() {
    var label = aes().formality_preference;
    if (label) {
      Object.keys(FORMALITY_LABELS).forEach(function (k) {
        if (FORMALITY_LABELS[k] === label) $('formality-range').value = k;
      });
    } else {
      $('formality-range').value = 3;
    }
    updateFormalityLabel();
  }

  function updateFormalityLabel() {
    $('formality-label').textContent = FORMALITY_LABELS[$('formality-range').value];
  }

  function renderStepContent(index) {
    if (index === 0) {
      renderStyles();
      renderColours();
      renderAvoidColours();
      renderPattern();
    } else if (index === 1) {
      renderFit();
      renderSilhouette();
      renderFormality();
      renderExperiment();
    } else if (index === 2) {
      renderPriorities();
      renderExclusions();
      renderExclusionDetails();
      renderRefinement();
      renderFootwear();
      renderReview();
    }
  }

  /* =====================================================================
   * 4. SELECTION
   * ===================================================================== */

  var SELECT = {
    styles: { multi: true, field: 'preferred_styles', special: 'styles' },
    colours: { multi: true, field: 'preferred_colours' },
    avoid: { multi: true, field: 'avoided_colours' },
    pattern: { field: 'pattern_preference' },
    fit: { field: 'preferred_fit' },
    silhouette: { field: 'preferred_silhouette' },
    experiment: { field: 'experimentation_level' },
    priorities: { multi: true, field: 'styling_priorities' },
    exclusions: { special: 'exclusions' },
    'ex-colours': { multi: true, field: 'avoided_colours' },
    'ex-garments': { multi: true, field: 'excluded_garments' },
    'ex-fabrics': { multi: true, field: 'excluded_fabrics' },
    footwear: { multi: true, field: 'preferred_footwear' },
    statement: { refinement: 'statement_style' },
    layering: { refinement: 'layering_preference' },
    trend: { refinement: 'trend_preference' },
    care: { refinement: 'ease_of_care' },
    wardrobe: { refinement: 'reuse_wardrobe' }
  };

  function handleSelect(group, value) {
    var cfg = SELECT[group];
    if (!cfg) return;

    if (cfg.special === 'styles') return handleStyleSelect(value);
    if (cfg.special === 'exclusions') return handleExclusionSelect(value);

    if (cfg.refinement) {
      var ref = Object.assign({}, aes().refinement);
      ref[cfg.refinement] = ref[cfg.refinement] === value ? null : value;
      Store.setAesthetic({ refinement: ref });
    } else if (cfg.multi) {
      var arr = (aes()[cfg.field] || []).slice();
      toggle(arr, value);
      var patch = {}; patch[cfg.field] = arr;
      Store.setAesthetic(patch);
    } else {
      var patch2 = {}; patch2[cfg.field] = aes()[cfg.field] === value ? null : value;
      Store.setAesthetic(patch2);
    }
    renderStepContent(currentStep);
    renderSummary();
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
    Store.setAesthetic({ preferred_styles: styles });
    renderStepContent(0);
    renderSummary();
    updateNavHint();
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
    Store.setAesthetic({ exclusion_flags: flags });
    renderStepContent(currentStep);
    renderSummary();
    updateNavHint();
  }

  /* =====================================================================
   * 4b. LABEL HELPERS
   * ===================================================================== */

  function labelOf(list, id) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i].label || list[i].title || id;
    }
    return id;
  }

  function exclusionLabels() {
    var flags = aes().exclusion_flags || [];
    return flags.map(function (id) {
      var e = EXCLUSIONS.filter(function (x) { return x.id === id; })[0];
      return e ? e.label : id;
    });
  }

  /* =====================================================================
   * 5. SUMMARY PANEL
   * ===================================================================== */

  function renderSummary() {
    var ex = aes();
    var parts = [];

    function group(title, values) {
      if (!values || !values.length) return;
      parts.push(
        '<div><p class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">' + esc(title) + '</p>' +
        '<div class="flex flex-wrap gap-1.5">' +
        values.map(function (v) { return '<span class="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/80 border border-slate-200 text-slate-700">' + esc(v) + '</span>'; }).join('') +
        '</div></div>'
      );
    }

    group('Aesthetics', (ex.preferred_styles || []).map(function (id) { return labelOf(AESTHETICS, id); }));
    group('Colours', (ex.preferred_colours || []).map(function (id) { return labelOf(COLOUR_PALETTES, id); }));
    if (ex.preferred_fit) group('Fit', [labelOf(FITS, ex.preferred_fit)]);
    if (ex.preferred_silhouette) group('Silhouette', [labelOf(SILHOUETTES, ex.preferred_silhouette)]);
    if (ex.formality_preference) group('Formality', [ex.formality_preference]);
    if (ex.experimentation_level) group('Experimentation', [labelOf(EXPERIMENT, ex.experimentation_level)]);
    group('Priorities', ex.styling_priorities || []);
    group('Exclusions', exclusionLabels());
    if ((ex.avoided_colours || []).length) group('Colours to avoid', ex.avoided_colours.map(function (id) { return labelOf(AVOID_COLOURS, id); }));
    if ((ex.excluded_garments || []).length) group('Garments to avoid', ex.excluded_garments);

    $('summary-body').innerHTML = parts.length
      ? parts.join('')
      : '<div class="flex items-center justify-center py-8 text-slate-400 text-sm">Your selections will appear here as you go.</div>';

    updateUserBadge();
  }

  /* =====================================================================
   * 6. REVIEW
   * ===================================================================== */

  function renderReview() {
    var ex = aes();
    var rows = [];

    function group(title, values) {
      if (!values || !values.length) return;
      rows.push(
        '<div class="glass-card rounded-2xl p-5">' +
        '<p class="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-3">' + esc(title) + '</p>' +
        '<div class="flex flex-wrap gap-2">' +
        values.map(function (v) { return '<span class="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/90 border border-slate-200 text-slate-700">' + esc(v) + '</span>'; }).join('') +
        '</div></div>'
      );
    }

    group('Preferred aesthetics', (ex.preferred_styles || []).map(function (id) { return labelOf(AESTHETICS, id); }));
    group('Preferred colours', (ex.preferred_colours || []).map(function (id) { return labelOf(COLOUR_PALETTES, id); }));
    if (ex.pattern_preference) group('Pattern preference', [labelOf(PATTERNS, ex.pattern_preference)]);
    if (ex.avoided_colours.length) group('Colours to avoid', ex.avoided_colours.map(function (id) { return labelOf(AVOID_COLOURS, id); }));
    if (ex.preferred_fit) group('Preferred fit', [labelOf(FITS, ex.preferred_fit)]);
    if (ex.preferred_silhouette) group('Preferred silhouette', [labelOf(SILHOUETTES, ex.preferred_silhouette)]);
    if (ex.formality_preference) group('Formality', [ex.formality_preference]);
    if (ex.experimentation_level) group('Experimentation', [labelOf(EXPERIMENT, ex.experimentation_level)]);
    if ((ex.styling_priorities || []).length) group('Styling priorities', ex.styling_priorities);
    if (exclusionLabels().length) group('Exclusions', exclusionLabels());
    if ((ex.excluded_garments || []).length) group('Specific garments to avoid', ex.excluded_garments);
    if ((ex.excluded_fabrics || []).length) group('Specific fabrics to avoid', ex.excluded_fabrics);
    if ((ex.preferred_footwear || []).length) group('Preferred footwear', ex.preferred_footwear);

    var ref = ex.refinement || {};
    if (ref.statement_style) group('Statement vs simple', [labelOf(REFINEMENT_GROUPS.statement.items, ref.statement_style)]);
    if (ref.layering_preference) group('Layering', [labelOf(REFINEMENT_GROUPS.layering.items, ref.layering_preference)]);
    if (ref.trend_preference) group('Trendy vs timeless', [labelOf(REFINEMENT_GROUPS.trend.items, ref.trend_preference)]);
    if (ref.ease_of_care) group('Ease of care', [labelOf(REFINEMENT_GROUPS.care.items, ref.ease_of_care)]);
    if (ref.reuse_wardrobe) group('Wardrobe reuse', [labelOf(REFINEMENT_GROUPS.wardrobe.items, ref.reuse_wardrobe)]);
    if (ex.optional_notes) group('Notes', [ex.optional_notes]);

    $('review-profile').innerHTML = rows.join('');
    $('review-empty').classList.toggle('hidden', rows.length > 0);
  }

  /* =====================================================================
   * 7. NAVIGATION
   * ===================================================================== */

  function updateProgress() {
    var percent = Math.round(((currentStep + 1) / STEPS.length) * 100);
    $('progress-eyebrow').textContent = 'Step ' + (currentStep + 1) + ' of ' + STEPS.length;
    $('progress-title').textContent = STEPS[currentStep].title;
    $('progress-percent').innerHTML = percent + '<span class="text-lg align-top">%</span>';
    $('progress-bar').style.width = percent + '%';
    renderStepper();
  }

  function renderStepper() {
    $('stepper').innerHTML = STEPS.map(function (s, i) {
      var cls = 'step-dot' + (i < currentStep ? ' is-done' : '') + (i === currentStep ? ' is-active' : '');
      var content = i < currentStep
        ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>'
        : (i + 1);
      return '<button type="button" class="' + cls + '" data-step-nav="' + i + '" title="' + esc(s.title) + '" aria-label="Go to ' + esc(s.title) + '">' + content + '</button>';
    }).join('');
  }

  function updateNavHint() {
    var hint = $('nav-hint');
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
    $('btn-continue-label').textContent = currentStep === STEPS.length - 1 ? 'Save Profile' : 'Continue';
    $('btn-back').innerHTML = currentStep === 0
      ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg> Home'
      : '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg> Back';
    $('btn-continue').disabled = false;
  }

  function validateStep(index) {
    if (index === 0 && (aes().preferred_styles || []).length === 0) {
      var hint = $('nav-hint');
      hint.textContent = 'Please select at least one aesthetic — or choose “Not Sure Yet”.';
      hint.classList.remove('hidden');
      hint.classList.add('text-red-500');
      return false;
    }
    $('nav-hint').classList.remove('text-red-500');
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
    var host = $('step-host');
    var top = host.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
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
    window.DaFitMatchProfile = Store.toJSON();
    try {
      window.dispatchEvent(new CustomEvent('dafitmatch:profile-complete', { detail: window.DaFitMatchProfile }));
    } catch (e) { /* older browsers */ }
    var overlay = $('completion');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
  }

  /* =====================================================================
   * 8. AUTH / SAVE STATUS
   * ===================================================================== */

  function updateUserBadge() {
    var badge = $('summary-user-badge');
    var note = $('summary-save-note');
    var signedIn = Store.isSignedIn();
    if (signedIn && window.AuthState && window.AuthState.user) {
      badge.textContent = window.AuthState.user.name.split(' ')[0];
      badge.className = 'text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200';
      if (note) note.textContent = 'Saved to your account automatically.';
    } else {
      badge.textContent = 'Guest';
      badge.className = 'text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 border border-sky-200';
      if (note) note.textContent = 'Answers are saved on this device. Sign in to keep them.';
    }
  }

  /* =====================================================================
   * 9. EVENTS
   * ===================================================================== */

  function bindEvents() {
    document.addEventListener('click', function (e) {
      var sel = e.target.closest('[data-group]');
      if (sel) { handleSelect(sel.getAttribute('data-group'), sel.getAttribute('data-value')); return; }
      var nav = e.target.closest('[data-step-nav]');
      if (nav) { goToStep(parseInt(nav.getAttribute('data-step-nav'), 10)); return; }
    });

    $('styles-clear').addEventListener('click', function () {
      Store.setAesthetic({ preferred_styles: [] });
      renderStepContent(0);
      renderSummary();
      updateNavHint();
    });

    $('formality-range').addEventListener('input', function () {
      updateFormalityLabel();
      Store.setAesthetic({ formality_preference: FORMALITY_LABELS[this.value] });
      renderSummary();
    });

    var notesTimer = null;
    $('optional-notes').addEventListener('input', function () {
      var value = this.value;
      clearTimeout(notesTimer);
      notesTimer = setTimeout(function () {
        Store.setAesthetic({ optional_notes: value.trim() ? value : null });
        renderSummary();
      }, 350);
    });

    $('btn-continue').addEventListener('click', function () {
      if (currentStep === STEPS.length - 1) { if (validateStep(currentStep)) completeProfile(); }
      else nextStep();
    });

    $('btn-back').addEventListener('click', function () {
      if (currentStep === 0) { window.location.href = 'index.html'; return; }
      goToStep(currentStep - 1);
    });

    $('btn-reset').addEventListener('click', function () {
      if (!window.confirm('Clear all your aesthetic answers? This cannot be undone.')) return;
      Store.resetAesthetic();
      goToStep(0);
      renderSummary();
    });
  }

  /* =====================================================================
   * 10. INIT
   * ===================================================================== */

  function init() {
    bindEvents();

    var savedStep = Store.get().aestheticStep;
    currentStep = typeof savedStep === 'number'
      ? Math.max(0, Math.min(STEPS.length - 1, savedStep))
      : 0;

    try {
      var params = new URLSearchParams(window.location.search);
      if (params.has('step')) {
        var deep = parseInt(params.get('step'), 10);
        if (!isNaN(deep)) currentStep = Math.max(0, Math.min(STEPS.length - 1, deep));
      }
    } catch (e) { /* URLSearchParams unavailable */ }

    document.querySelectorAll('.step-section').forEach(function (section) {
      section.classList.toggle('is-active', Number(section.getAttribute('data-step')) === currentStep);
    });

    updateProgress();
    updateFooterButtons();
    updateNavHint();
    renderStepContent(currentStep);
    renderSummary();

    Store.on(function (_, event) {
      if (event === 'load' || event === 'reset') updateUserBadge();
    });
    updateUserBadge();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
