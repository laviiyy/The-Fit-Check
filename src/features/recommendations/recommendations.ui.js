/*
 * DaFitMatch — Recommendations UI
 * -------------------------------------------------------------------------
 * Page controller for recommendations.html. Loads the catalogue, reads the
 * saved aesthetic profile from DaFitMatchStore (or window.DaFitMatchProfile),
 * runs the deterministic ranking engine and renders explainable results.
 *
 * Exposes: window.DaFitMatchRecUI
 */
(function (global) {
  'use strict';

  var Engine = global.DaFitMatchRecommendations;
  var Store = global.DaFitMatchStore;

  var CATALOGUE_URL = 'src/data/catalogue.json';
  var STATE = { catalogue: null, gender: 'all', category: 'all', maxPrice: null, person: 'p1' };

  function $(id) { return document.getElementById(id); }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function formatPrice(value) {
    if (typeof value !== 'number') return '';
    return '\u20B9' + value.toLocaleString('en-IN');
  }

  function getProfile() {
    var base = (global.DaFitMatchProfile && global.DaFitMatchProfile.aesthetic)
      ? global.DaFitMatchProfile
      : (Store ? Store.get() : { aesthetic: {}, mode: null });
    if (Store && Store.isCouple && Store.isCouple()) {
      var isP2 = STATE.person === 'p2';
      return Object.assign({}, base, {
        fit: isP2 ? Store.getPartner2Fit() : Store.getFit(),
        _person: isP2 ? 'Person 2' : 'Person 1'
      });
    }
    return base;
  }

  /* --- data load --------------------------------------------------------- */
  function loadCatalogue() {
    return fetch(CATALOGUE_URL + '?v=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }

  /* --- filters ----------------------------------------------------------- */
  function initFilters() {
    var catSelect = $('filter-category');
    if (catSelect) {
      var opts = ['<option value="all">All occasions</option>'];
      STATE.catalogue.catalogues.forEach(function (c) {
        opts.push('<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>');
      });
      catSelect.innerHTML = opts.join('');
      catSelect.addEventListener('change', function () { STATE.category = catSelect.value; render(); });
    }

    var genderSelect = $('filter-gender');
    if (genderSelect) {
      var storedGender = (getProfile().fit || {}).gender;
      if (storedGender === 'men' || storedGender === 'women') {
        STATE.gender = storedGender;
        genderSelect.value = storedGender;
      }
      genderSelect.addEventListener('change', function () { STATE.gender = genderSelect.value; render(); });
    }

    /* Couple mode: score for each partner against their own fit profile. */
    var coupleWrap = $('filter-couple-wrap');
    var coupleSelect = $('filter-couple');
    if (coupleSelect && Store && Store.isCouple && Store.isCouple()) {
      if (coupleWrap) coupleWrap.classList.remove('hidden');
      STATE.person = coupleSelect.value || 'p1';
      coupleSelect.addEventListener('change', function () { STATE.person = coupleSelect.value; render(); });
    } else if (coupleWrap) {
      coupleWrap.classList.add('hidden');
    }

    var budget = $('filter-budget');
    if (budget) {
      var max = 0;
      STATE.catalogue.catalogues.forEach(function (c) {
        (c.outfits || []).forEach(function (o) { if (typeof o.price === 'number' && o.price > max) max = o.price; });
      });
      max = Math.ceil(max / 500) * 500;
      budget.max = max;
      budget.value = max;
      budget.addEventListener('input', function () {
        var v = Number(budget.value);
        STATE.maxPrice = v >= max ? null : v;
        var label = $('filter-budget-label');
        if (label) label.textContent = STATE.maxPrice ? ('Up to ' + formatPrice(v)) : 'Any budget';
        render();
      });
    }
  }

  /* --- profile summary --------------------------------------------------- */
  function renderProfileSummary(profile) {
    var host = $('rec-profile');
    if (!host) return;
    var a = profile.aesthetic || {};
    var f = profile.fit || {};
    var chips = [];
    function chip(text) { return '<span class="inline-flex items-center px-3 py-1 rounded-full bg-white/80 border border-slate-200 text-xs font-semibold text-slate-700">' + esc(text) + '</span>'; }
    function fitChip(text) { return '<span class="inline-flex items-center px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-xs font-semibold text-sky-700">' + esc(text) + '</span>'; }

    if (profile._person) chips.push(chip('For ' + profile._person));
    if (f.full_name) chips.push(chip(f.full_name));
    if (f.gender && f.gender !== 'prefer-not-to-say') chips.push(chip(idLabel(f.gender)));

    (a.preferred_styles || []).forEach(function (id) { chips.push(chip(labelOf('aesthetic', id))); });
    (a.preferred_colours || []).forEach(function (id) { chips.push(chip(labelOf('colour', id))); });
    if (a.formality_preference) chips.push(chip(a.formality_preference));

    var fitValue = f.general_fit || a.preferred_fit;
    if (fitValue) chips.push(chip('Fit: ' + idLabel(fitValue)));
    (f.preferred_silhouettes || []).forEach(function (id) { chips.push(fitChip(idLabel(id))); });
    (f.comfort_preferences || []).slice(0, 2).forEach(function (id) { chips.push(fitChip(idLabel(id))); });

    host.innerHTML = chips.length
      ? chips.join('')
      : '<span class="text-sm text-slate-500">You haven\'t set preferences yet. ' +
        '<a class="font-semibold text-sky-600 hover:text-sky-700" href="profile.html">Take the 2-minute style quiz</a>.</span>';
  }

  var LABELS = {
    aesthetic: {
      minimalist: 'Minimalist', classic: 'Classic / Timeless', 'old-money': 'Old Money Inspired',
      'smart-casual': 'Smart Casual', streetwear: 'Streetwear / Urban', 'soft-romantic': 'Soft / Romantic',
      bold: 'Bold / Experimental', glamorous: 'Glamorous / Partywear', traditional: 'Traditional / Ethnic',
      'indo-western': 'Indo-Western', vintage: 'Vintage / Retro', y2k: 'Y2K Inspired',
      'dark-academia': 'Dark Academia', sporty: 'Sporty / Athleisure', bohemian: 'Bohemian',
      casual: 'Casual Everyday', 'formal-contemporary': 'Contemporary Formal', modest: 'Modest Fashion',
      'not-sure': 'Not Sure Yet'
    },
    colour: {
      neutrals: 'Neutrals', earth: 'Earth Tones', pastel: 'Soft / Pastel', deep: 'Deep / Rich',
      bright: 'Bright / Vibrant', monochrome: 'Monochrome', mixed: 'Mixed / Colourful', surprise: 'Surprise Me'
    }
  };

  function labelOf(group, id) { return (LABELS[group] && LABELS[group][id]) || id; }
  function idLabel(id) { return String(id).replace(/-/g, ' ').replace(/\b\w/g, function (m) { return m.toUpperCase(); }); }

  /* --- cards ------------------------------------------------------------- */
  function scoreRingClass(score) {
    if (score >= 85) return 'from-emerald-500 to-teal-500';
    if (score >= 70) return 'from-sky-500 to-indigo-500';
    if (score >= 55) return 'from-amber-500 to-orange-500';
    return 'from-slate-400 to-slate-500';
  }

  function renderCard(result, rank) {
    var o = result.outfit;
    var reasons = result.reasons.slice(0, 3).map(function (r) {
      return '<span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>' + esc(r) + '</span>';
    }).join('');
    var warnings = result.warnings.map(function (w) {
      return '<span class="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded-full">' + esc(w) + '</span>';
    }).join('');

    var breakdown = result.breakdown.map(function (p) {
      var pct = Math.round(p.score * 100);
      return '<div class="flex items-center gap-2">' +
        '<span class="w-24 text-[11px] text-slate-500 font-medium">' + esc(p.label) + '</span>' +
        '<span class="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden"><span class="block h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500" style="width:' + pct + '%"></span></span>' +
        '<span class="w-8 text-right text-[11px] font-bold text-slate-600">' + pct + '</span>' +
        '</div>';
    }).join('');

    return '<article class="group glass rounded-3xl overflow-hidden border border-white/60 shadow-lg hover:shadow-2xl transition-all duration-300">' +
      '<div class="relative aspect-[4/5] overflow-hidden bg-slate-100">' +
        '<img loading="lazy" src="' + esc(o.image) + '" alt="' + esc(o.name) + '" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" onerror="this.style.display=\'none\'"/>' +
        '<div class="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/10 to-transparent"></div>' +
        '<div class="absolute top-3 left-3 flex items-center gap-2">' +
          '<span class="px-2.5 py-1 rounded-full text-[11px] font-bold text-white bg-slate-900/70 backdrop-blur">#' + (rank + 1) + '</span>' +
          '<span class="px-2.5 py-1 rounded-full text-[11px] font-bold text-white bg-slate-900/70 backdrop-blur">' + esc(o.categoryName) + '</span>' +
        '</div>' +
        '<div class="absolute top-3 right-3 w-14 h-14 rounded-full p-[3px] bg-gradient-to-tr ' + scoreRingClass(result.score) + ' shadow-lg">' +
          '<div class="w-full h-full rounded-full bg-white flex flex-col items-center justify-center">' +
            '<span class="text-sm font-black text-slate-900 leading-none">' + result.score + '</span>' +
            '<span class="text-[8px] font-bold text-slate-400 uppercase tracking-wide">match</span>' +
          '</div>' +
        '</div>' +
        '<div class="absolute bottom-3 left-3 right-3">' +
          '<h3 class="text-white font-bold text-lg leading-tight drop-shadow">' + esc(o.name) + '</h3>' +
          '<p class="text-white/80 text-xs font-medium mt-0.5">' + esc(o.style || '') + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="p-5">' +
        '<div class="flex items-center justify-between mb-3">' +
          '<span class="text-base font-extrabold text-slate-900">' + esc(formatPrice(o.price)) + '</span>' +
          '<span class="text-xs font-semibold text-slate-500">' + esc(o.platform || '') + '</span>' +
        '</div>' +
        (reasons ? '<div class="flex flex-wrap gap-1.5 mb-3">' + reasons + '</div>' : '') +
        (warnings ? '<div class="flex flex-wrap gap-1.5 mb-3">' + warnings + '</div>' : '') +
        '<details class="mt-1 group/det">' +
          '<summary class="cursor-pointer text-xs font-bold text-slate-500 hover:text-slate-800 select-none">Why this match</summary>' +
          '<div class="mt-3 space-y-2">' + breakdown + '</div>' +
        '</details>' +
        '<a href="ai-fit-studio.html?outfit=' + encodeURIComponent(o.id) + '" class="mt-4 w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-slate-800 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm">' +
          '<svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>' +
          'Try this look on my photo' +
        '</a>' +
      '</div>' +
    '</article>';
  }

  /* --- render ------------------------------------------------------------ */
  function render() {
    if (!STATE.catalogue) return;
    var profile = getProfile();
    var report = Engine.recommend(profile, STATE.catalogue, {
      gender: STATE.gender,
      maxPrice: STATE.maxPrice,
      person: STATE.person
    });

    var results = report.results;
    if (STATE.category !== 'all') {
      results = results.filter(function (r) { return r.outfit.categoryId === STATE.category; });
    }

    renderProfileSummary(profile);

    var note = $('rec-note');
    if (note) note.textContent = report.meta.note;

    var count = $('rec-count');
    if (count) count.textContent = results.length + (results.length === 1 ? ' look' : ' looks');

    var grid = $('rec-grid');
    var empty = $('rec-empty');
    if (grid) {
      if (!results.length) {
        grid.innerHTML = '';
        if (empty) empty.classList.remove('hidden');
      } else {
        if (empty) empty.classList.add('hidden');
        grid.innerHTML = results.map(function (r, i) { return renderCard(r, i); }).join('');
      }
    }

    /* excluded transparency */
    var exWrap = $('rec-excluded-wrap');
    var exHost = $('rec-excluded');
    if (exWrap && exHost) {
      if (report.excluded.length) {
        exWrap.classList.remove('hidden');
        exHost.innerHTML = report.excluded.map(function (r) {
          return '<li class="flex items-start gap-3 py-2">' +
            '<span class="mt-1 w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0"></span>' +
            '<span class="text-sm text-slate-600"><span class="font-semibold text-slate-800">' + esc(r.outfit.name) + '</span> — ' + esc(r.reason) + '</span>' +
            '</li>';
        }).join('');
      } else {
        exWrap.classList.add('hidden');
      }
    }
  }

  function init() {
    if (!Engine) { console.error('[DaFitMatch Recommendations] engine missing'); return; }
    loadCatalogue().then(function (json) {
      STATE.catalogue = json;
      initFilters();
      render();
      if (Store) Store.on(function () { render(); });
    }).catch(function (e) {
      console.error('[DaFitMatch Recommendations] failed to load recommendations', e);
      var grid = $('rec-grid');
      if (grid) grid.innerHTML = '<p class="col-span-full text-center text-slate-500 py-12">We couldn\'t load your recommendations right now. Please refresh.</p>';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.DaFitMatchRecUI = { render: render, state: STATE };
})(window);
