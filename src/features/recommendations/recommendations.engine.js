/*
 * DaFitMatch — Recommendation Engine
 * -------------------------------------------------------------------------
 * A deterministic, explainable scoring engine. Given a structured aesthetic
 * profile (produced by the Page 3 wizard and held in DaFitMatchStore) and the
 * catalogue, it ranks outfits and returns the reasons / warnings behind every
 * score.
 *
 * Pure functions only: no network, no AI, no side effects. The UI layer
 * (recommendations.ui.js) is responsible for fetching data and rendering.
 *
 * Exposes: window.DaFitMatchRecommendations
 */
(function (global) {
  'use strict';

  var RULES = global.DaFitMatchRecRules;
  if (!RULES) throw new Error('[DaFitMatch Recommendations] rules module must load first.');

  /* --- small helpers ----------------------------------------------------- */
  function arr(value) { return Array.isArray(value) ? value : []; }

  function hits(words, haystack) {
    var n = 0;
    for (var i = 0; i < words.length; i++) {
      if (haystack.indexOf(words[i]) > -1) n++;
    }
    return n;
  }

  function keywordScore(haystack, words) {
    if (!words || !words.length) return 0.5; // neutral when undefined
    return Math.min(1, hits(words, haystack) / 2);
  }

  function matchedWords(words, haystack) {
    return words.filter(function (w) { return haystack.indexOf(w) > -1; });
  }

  function clamp01(n) { return Math.max(0, Math.min(1, n)); }

  function isProfileEmpty(profile) {
    var a = (profile && profile.aesthetic) ? profile.aesthetic : (profile || {});
    var ref = a.refinement || {};
    return (
      arr(a.preferred_styles).length === 0 &&
      arr(a.preferred_colours).length === 0 &&
      arr(a.avoided_colours).length === 0 &&
      arr(a.styling_priorities).length === 0 &&
      arr(a.excluded_garments).length === 0 &&
      arr(a.excluded_fabrics).length === 0 &&
      arr(a.preferred_footwear).length === 0 &&
      !a.preferred_fit && !a.preferred_silhouette && !a.formality_preference &&
      !a.pattern_preference && !a.experimentation_level &&
      !ref.statement_style && !ref.layering_preference && !ref.trend_preference &&
      !ref.ease_of_care && !ref.reuse_wardrobe
    );
  }

  function isFitEmpty(fit) {
    if (!fit) return true;
    return (
      !fit.general_fit &&
      Object.keys(fit.garment_specific_fit || {}).length === 0 &&
      arr(fit.preferred_silhouettes).length === 0 &&
      arr(fit.comfort_preferences).length === 0 &&
      arr(fit.mobility_requirements).length === 0 &&
      arr(fit.preferred_fabrics).length === 0 &&
      !fit.layering_preference &&
      !fit.accessory_preference &&
      !fit.wardrobe_strategy &&
      !fit.existing_wardrobe_notes &&
      !fit.photo_selected
    );
  }

  /* --- catalogue flattening ---------------------------------------------
   * Couple outfits store their pieces under `person1` / `person2` and their
   * colours under `palette` instead of `items` / `colors`. Normalise both
   * shapes so every outfit is scored from real catalogue data, and keep a
   * per-person scope so couple mode can rank against one partner's fit
   * profile without mixing in the other partner's garments. */
  function flatten(catalogue) {
    var out = [];
    arr(catalogue && catalogue.catalogues).forEach(function (cat) {
      var meta = RULES.CATEGORY_META[cat.id] || { name: cat.name || cat.id, formality: 3 };
      arr(cat.outfits).forEach(function (o) {
        var style = o.style || o.occasion || o.coordination || '';
        var items = arr(o.items);
        var colors = arr(o.colors || o.palette);

        function scopeOf(person) {
          if (!person) return null;
          var pItems = arr(person.items);
          var pColors = arr(person.colors || person.palette);
          if (!pColors.length) pColors = arr(o.colors || o.palette);
          return {
            items: pItems,
            colors: pColors,
            corpus: [o.name, style, cat.name, meta.name].concat(pItems, pColors).join(' ').toLowerCase(),
            itemsText: pItems.join(' ').toLowerCase(),
            colorsText: pColors.join(' ').toLowerCase()
          };
        }

        var p1 = scopeOf(o.person1);
        var p2 = scopeOf(o.person2);
        if (p1 || p2) {
          items = (p1 ? p1.items : []).concat(p2 ? p2.items : []);
          if (!colors.length) colors = arr(o.colors || o.palette);
        }

        var corpus = [o.name, style, cat.name, meta.name]
          .concat(items, colors)
          .join(' ')
          .toLowerCase();
        out.push({
          id: o.id,
          name: o.name,
          gender: o.gender,
          categoryId: cat.id,
          categoryName: meta.name,
          formality: meta.formality,
          items: items,
          colors: colors,
          style: style,
          price: typeof o.price === 'number' ? o.price : null,
          platform: o.platform,
          matchScore: typeof o.matchScore === 'number' ? o.matchScore : 0,
          image: o.image,
          model3D: o.model3D,
          tryOnImage: o.tryOnImage,
          personVariants: (p1 || p2) ? { p1: p1, p2: p2 } : null,
          corpus: corpus,
          itemsText: items.join(' ').toLowerCase(),
          colorsText: colors.join(' ').toLowerCase()
        });
      });
    });
    return out;
  }

  /* --- criterion scorers ------------------------------------------------- */
  function scoreAesthetic(corpus, a) {
    var selected = arr(a.preferred_styles).filter(function (id) { return id !== 'not-sure'; });
    if (!selected.length) return { score: 0.5, detail: 'No aesthetic selected' };
    var best = 0, bestId = null;
    selected.forEach(function (id) {
      var words = RULES.STYLE_KEYWORDS[id];
      if (!words) return;
      var s = keywordScore(corpus, words);
      if (s > best) { best = s; bestId = id; }
    });
    return { score: clamp01(best), detail: bestId ? 'Closest to "' + bestId + '"' : 'Broad match' };
  }

  function scoreColour(o, a) {
    var selected = arr(a.preferred_colours).filter(function (id) { return id !== 'surprise'; });
    if (!selected.length) return { score: 0.5, detail: 'No colour preference', matched: [] };
    var best = 0, matched = [];
    selected.forEach(function (id) {
      var words = RULES.COLOUR_KEYWORDS[id];
      if (!words) return;
      var m = matchedWords(words, o.colorsText);
      var s = clamp01(m.length / 2);
      if (s > best) { best = s; matched = m; }
    });
    return { score: best, detail: matched.length ? 'Matches your palette' : 'Colour is secondary here', matched: matched };
  }

  function scoreFormality(o, a) {
    var label = a.formality_preference;
    var target = label ? RULES.FORMALITY_VALUES[label] : null;
    if (!target) return { score: 0.5, detail: 'No formality preference' };
    var score = clamp01(1 - Math.abs(target - o.formality) / 4);
    return { score: score, detail: label };
  }

  function scoreFit(corpus, a, fit) {
    var parts = [];
    var fitWords = RULES.FIT_KEYWORDS[a.preferred_fit];
    if (fitWords && fitWords.length) parts.push(keywordScore(corpus, fitWords));

    var genWords = fit && RULES.FIT_KEYWORDS[fit.general_fit];
    if (genWords && genWords.length && fit.general_fit !== a.preferred_fit) {
      parts.push(keywordScore(corpus, genWords));
    }

    var silIds = a.preferred_silhouette ? [a.preferred_silhouette] : [];
    arr(fit.preferred_silhouettes).forEach(function (id) {
      if (silIds.indexOf(id) === -1) silIds.push(id);
    });
    var silScores = [];
    silIds.forEach(function (id) {
      var w = RULES.SILHOUETTE_KEYWORDS[id];
      if (w && w.length) silScores.push(keywordScore(corpus, w));
    });
    if (silScores.length) {
      parts.push(silScores.reduce(function (s, n) { return s + n; }, 0) / silScores.length);
    }

    if (!parts.length) return { score: 0.5, detail: 'No fit preference' };
    var avg = parts.reduce(function (s, n) { return s + n; }, 0) / parts.length;
    var hasFit = !!(a.preferred_fit || fit.general_fit);
    return { score: clamp01(avg), detail: hasFit ? 'Fits your shape preference' : 'Silhouette considered' };
  }

  function scoreComfort(corpus, fit) {
    var words = [];
    arr(fit.comfort_preferences).forEach(function (id) {
      var w = RULES.COMFORT_KEYWORDS[id];
      if (w) words = words.concat(w);
    });
    arr(fit.mobility_requirements).forEach(function (id) {
      var w = RULES.MOBILITY_KEYWORDS[id];
      if (w) words = words.concat(w);
    });
    var lay = { minimal: ['minimal', 'clean', 'simple'], layered: ['layered', 'jacket', 'overshirt', 'textured'] }[fit.layering_preference];
    var acc = { minimal: ['minimal', 'clean', 'simple'], statement: ['statement', 'bold', 'gold'] }[fit.accessory_preference];
    words = words.concat(lay || [], acc || []);

    var fabWords = [];
    arr(fit.preferred_fabrics).forEach(function (label) {
      var key = String(label).toLowerCase().split(/[^a-z]+/)[0];
      var enrich = RULES.FABRIC_ENRICH[key];
      if (enrich) fabWords = fabWords.concat(enrich);
      else if (key) fabWords.push(key);
    });

    if (fit.wardrobe_strategy === 'reuse') {
      var reuse = RULES.PRIORITY_RULES['Reusing existing wardrobe'];
      if (reuse && reuse.words) words = words.concat(reuse.words);
    }

    var parts = [];
    if (words.length) parts.push(keywordScore(corpus, words));
    if (fabWords.length) parts.push(keywordScore(corpus, fabWords));
    if (!parts.length) return { score: 0.5, detail: 'No comfort preference' };
    var avg = parts.reduce(function (s, n) { return s + n; }, 0) / parts.length;
    return { score: clamp01(avg), detail: 'Comfort & practicality considered' };
  }

  /* --- catalogue flattening --------------------------------------------- */

  function scorePattern(corpus, a) {
    var words = RULES.PATTERN_KEYWORDS[a.pattern_preference];
    if (!words) return { score: 0.5, detail: 'No pattern preference' };
    if (!words.length) return { score: 0.5, detail: 'Balanced patterns' };
    return { score: keywordScore(corpus, words), detail: 'Pattern preference' };
  }

  function evalPriority(key, corpus, o, formScore, price) {
    var rule = RULES.PRIORITY_RULES[key];
    if (!rule) return null;
    if (rule.type === 'keywords') return keywordScore(corpus, rule.words);
    if (rule.type === 'category') return rule.ids.indexOf(o.categoryId) > -1 ? 1 : 0;
    if (rule.type === 'formality') return formScore;
    if (rule.type === 'budget') return price;
    return null;
  }

  function scorePriorities(corpus, o, a, formScore, price) {
    var selected = arr(a.styling_priorities);
    if (!selected.length) return { score: 0.5, detail: 'No priorities set' };
    var subs = [];
    selected.forEach(function (key) {
      var s = evalPriority(key, corpus, o, formScore, price);
      if (s !== null && s !== undefined) subs.push(s);
    });
    if (!subs.length) return { score: 0.5, detail: 'Priorities noted' };
    var avg = subs.reduce(function (s, n) { return s + n; }, 0) / subs.length;
    return { score: clamp01(avg), detail: selected.slice(0, 2).join(', ') };
  }

  function scoreExperimentation(corpus, a) {
    var level = a.experimentation_level;
    var words = RULES.EXPERIMENTATION_KEYWORDS[level];
    if (!level || level === 'balanced' || !words) return { score: 0.5, detail: 'Balanced novelty' };
    return { score: keywordScore(corpus, words), detail: level };
  }

  function scoreRefinement(corpus, a) {
    var ref = a.refinement || {};
    var parts = [];
    function add(words) {
      if (words && words.length) parts.push(keywordScore(corpus, words));
    }

    var groups = RULES.REFINEMENT_KEYWORDS;
    add(groups.statement_style[ref.statement_style]);
    add(groups.layering_preference[ref.layering_preference]);
    add(groups.trend_preference[ref.trend_preference]);
    add(groups.ease_of_care[ref.ease_of_care]);
    if (ref.reuse_wardrobe === 'yes') {
      var reuse = RULES.PRIORITY_RULES['Reusing existing wardrobe'];
      if (reuse && reuse.words) add(reuse.words);
    }

    if (!parts.length) return { score: 0.5, detail: 'No refinement preference' };
    var avg = parts.reduce(function (s, n) { return s + n; }, 0) / parts.length;
    return { score: clamp01(avg), detail: 'Finishing touches applied' };
  }

  function scoreFootwear(corpus, a) {
    var selected = arr(a.preferred_footwear);
    if (!selected.length) return { score: 0.5, detail: 'No footwear preference' };
    var words = [];
    selected.forEach(function (label) {
      var w = RULES.FOOTWEAR_KEYWORDS[label];
      if (w) words = words.concat(w);
    });
    if (!words.length) return { score: 0.5, detail: 'Footwear noted' };
    return {
      score: clamp01(hits(words, corpus)),
      detail: selected.slice(0, 2).join(', ')
    };
  }

  /* --- exclusions & penalties ------------------------------------------- */
  function hardExclusion(scope, a) {
    var flags = arr(a.exclusion_flags);
    if (flags.indexOf('no-restrictions') > -1) return null;

    var g = arr(a.excluded_garments);
    for (var i = 0; i < g.length; i++) {
      var gw = RULES.GARMENT_KEYWORDS[g[i]];
      if (gw && matchedWords(gw, scope.itemsText).length) {
        return 'You excluded ' + g[i] + '.';
      }
    }
    var f = arr(a.excluded_fabrics);
    for (var j = 0; j < f.length; j++) {
      var fw = RULES.FABRIC_KEYWORDS[f[j]];
      if (fw && matchedWords(fw, scope.corpus).length) {
        return 'Made with ' + f[j] + ', which you excluded.';
      }
    }
    for (var k = 0; k < flags.length; k++) {
      var rule = RULES.FLAG_RULES[flags[k]];
      if (rule && rule.mode === 'exclude' && rule.words && matchedWords(rule.words, scope.corpus).length) {
        return 'Matches an exclusion: ' + flags[k].replace(/-/g, ' ') + '.';
      }
    }
    return null;
  }

  function penalties(scope, a) {
    var flags = arr(a.exclusion_flags);
    var warningList = [];
    var total = 0;

    if (flags.indexOf('no-restrictions') === -1) {
      /* avoided colours */
      var avoidText = [];
      arr(a.avoided_colours).forEach(function (id) {
        var words = RULES.AVOID_COLOUR_KEYWORDS[id];
        if (!words) return;
        var m = matchedWords(words, scope.colorsText);
        if (m.length) avoidText = avoidText.concat(m);
      });
      if (avoidText.length) {
        total += Math.min(avoidText.length * 12, 24);
        warningList.push('Uses colours you avoid: ' + unique(avoidText).join(', ') + '.');
      }

      /* flag-based penalties */
      flags.forEach(function (flag) {
        var rule = RULES.FLAG_RULES[flag];
        if (!rule || rule.mode !== 'penalty') return;
        if (rule.words && matchedWords(rule.words, scope.corpus).length) {
          total += rule.points || 8;
          warningList.push(rule.message || ('Conflicts with: ' + flag.replace(/-/g, ' ')));
        }
      });
    }
    return { total: total, warnings: warningList };
  }

  function unique(list) {
    return list.filter(function (v, i) { return list.indexOf(v) === i; });
  }

  /* --- one outfit ------------------------------------------------------- */
  function score(o, a, fit, ctx) {
    /* Couple outfits carry a scope per partner; score only the active
     * partner's pieces when one is selected. */
    var scope = (o.personVariants && ctx.person && o.personVariants[ctx.person]) || o;

    var hard = hardExclusion(scope, a);
    if (hard) {
      return { outfit: o, score: 0, excluded: true, reason: hard, breakdown: [], reasons: [], warnings: [hard] };
    }

    var W = RULES.WEIGHTS;
    var aesthetic = scoreAesthetic(scope.corpus, a);
    var colour = scoreColour(scope, a);
    var formality = scoreFormality(o, a);
    var fitResult = scoreFit(scope.corpus, a, fit);
    var pattern = scorePattern(scope.corpus, a);
    var priorities = scorePriorities(scope.corpus, o, a, formality.score, ctx.price);
    var experimentation = scoreExperimentation(scope.corpus, a);
    var comfort = scoreComfort(scope.corpus, fit);
    var refinement = scoreRefinement(scope.corpus, a);
    var footwear = scoreFootwear(scope.corpus, a);

    var parts = [
      { key: 'aesthetic', label: 'Aesthetic', weight: W.aesthetic, score: aesthetic.score, detail: aesthetic.detail },
      { key: 'colour', label: 'Colour', weight: W.colour, score: colour.score, detail: colour.detail },
      { key: 'formality', label: 'Formality', weight: W.formality, score: formality.score, detail: formality.detail },
      { key: 'fit', label: 'Fit & silhouette', weight: W.fit, score: fitResult.score, detail: fitResult.detail },
      { key: 'pattern', label: 'Pattern', weight: W.pattern, score: pattern.score, detail: pattern.detail },
      { key: 'priorities', label: 'Priorities', weight: W.priorities, score: priorities.score, detail: priorities.detail },
      { key: 'experimentation', label: 'Variety', weight: W.experimentation, score: experimentation.score, detail: experimentation.detail },
      { key: 'comfort', label: 'Comfort & practicality', weight: W.comfort, score: comfort.score, detail: comfort.detail },
      { key: 'refinement', label: 'Finishing touches', weight: W.refinement, score: refinement.score, detail: refinement.detail },
      { key: 'footwear', label: 'Footwear', weight: W.footwear, score: footwear.score, detail: footwear.detail }
    ];

    var totalWeight = parts.reduce(function (s, p) { return s + p.weight; }, 0);
    var weighted = parts.reduce(function (s, p) { return s + p.weight * p.score; }, 0) / totalWeight;
    var raw = weighted * 100;

    var pen = penalties(scope, a);
    var finalScore = Math.max(0, Math.min(100, Math.round(raw - pen.total)));

    parts.forEach(function (p) { p.points = Math.round(p.weight * p.score); p.max = p.weight; });

    var reasons = [];
    var ranked = parts.slice().sort(function (x, y) { return (y.weight * y.score) - (x.weight * x.score); });
    ranked.forEach(function (p) {
      if (reasons.length >= 4) return;
      if (p.score >= 0.6) reasons.push(reasonFor(p, colour, aesthetic, o));
    });
    if (ctx.emptyProfile) reasons = ['Popular in the catalogue — complete your profile for sharper picks.'];

    return {
      outfit: o,
      score: finalScore,
      excluded: false,
      breakdown: parts,
      reasons: unique(reasons),
      warnings: pen.warnings,
      matchedColours: colour.matched
    };
  }

  var REASON_TEXT = {
    aesthetic: 'Aligns with your chosen aesthetic',
    colour: 'Uses a palette you like',
    formality: 'Right level of formality',
    fit: 'Suits your fit and silhouette preference',
    pattern: 'Pattern you tend to like',
    priorities: 'Honours your styling priorities',
    experimentation: 'Matches how adventurous you feel',
    comfort: 'Comfortable and practical for how you wear it',
    refinement: 'Matches your finishing-touch preferences',
    footwear: 'Works with the footwear you prefer'
  };

  function reasonFor(part, colour, aesthetic, o) {
    if (part.key === 'colour' && colour.matched.length) {
      return 'Uses ' + unique(colour.matched).slice(0, 3).join(', ') + ' — a palette you like';
    }
    return REASON_TEXT[part.key] || part.label;
  }

  /* --- public API ------------------------------------------------------- */
  function recommend(profile, catalogue, options) {
    options = options || {};
    var aesthetic = (profile && profile.aesthetic) ? profile.aesthetic : (profile || {});
    var fit = (profile && profile.fit) ? profile.fit : {};

    var all = flatten(catalogue);
    var gender = options.gender && options.gender !== 'all' ? options.gender : null;
    var pool = all.filter(function (o) {
      if (options.maxPrice && o.price !== null && o.price > options.maxPrice) return false;
      if (gender === 'couple') return o.gender === 'couple';
      if (gender && o.gender !== gender && o.gender !== 'unisex') return false;
      return true;
    });

    var prices = pool.map(function (o) { return o.price; }).filter(function (n) { return typeof n === 'number'; });
    var priceMin = prices.length ? Math.min.apply(null, prices) : 0;
    var priceMax = prices.length ? Math.max.apply(null, prices) : 0;
    var emptyAesthetic = isProfileEmpty(aesthetic);
    var emptyFit = isFitEmpty(fit);
    var emptyProfile = emptyAesthetic && emptyFit;

    function priceNorm(p) {
      if (p === null || priceMax === priceMin) return 0.5;
      return clamp01(1 - (p - priceMin) / (priceMax - priceMin));
    }

    var results = pool.map(function (o) {
      return score(o, aesthetic, fit, {
        price: priceNorm(o.price),
        emptyProfile: emptyProfile,
        person: options.person || null
      });
    });

    var recommended = results.filter(function (r) { return !r.excluded; });
    var excluded = results.filter(function (r) { return r.excluded; });

    recommended.sort(function (x, y) {
      if (y.score !== x.score) return y.score - x.score;
      return y.outfit.matchScore - x.outfit.matchScore;
    });

    var limit = typeof options.limit === 'number' ? options.limit : null;

    return {
      results: limit ? recommended.slice(0, limit) : recommended,
      excluded: excluded,
      meta: {
        considered: recommended.length,
        excludedCount: excluded.length,
        profileComplete: !emptyProfile,
        note: emptyProfile
          ? 'Your profile is empty, so these are general highlights. Complete the wizard for personalised picks.'
          : 'Ranked against your saved style and fit profile.'
      }
    };
  }

  global.DaFitMatchRecommendations = {
    version: '1.1.0',
    recommend: recommend,
    isProfileEmpty: isProfileEmpty,
    isFitEmpty: isFitEmpty,
    flatten: flatten
  };
})(window);
