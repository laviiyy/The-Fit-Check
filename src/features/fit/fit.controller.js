/*
 * DaFitMatch — Page 4: Fit, Comfort & Practical Preferences
 * -------------------------------------------------------------------------
 * Controller for fit-profile.html.
 *
 *  - Complements the Page 3 aesthetic profile by capturing how clothes fit,
 *    which silhouettes are preferred (multi), optional sizes, comfort and
 *    mobility needs, fabric preferences, wardrobe strategy and an OPTIONAL
 *    local-only photo preview.
 *  - Persists everything through DaFitMatchStore under a per-user key.
 *  - Reuses Page 3 fields (excluded garments/fabrics, footwear, wardrobe
 *    reuse, notes) instead of duplicating them.
 *  - Privacy: photo image data is NEVER written to storage or the profile.
 *    Only local metadata (name/type/size) + an explicit consent flag are kept.
 *
 * No external dependencies. No fabricated AI / product data.
 */
(function (global) {
  'use strict';

  var Store = global.DaFitMatchStore;

  /* =====================================================================
   * 1. OPTION DATA
   * ===================================================================== */

  var FITS = [
    { id: 'slim', label: 'Slim / Fitted', desc: 'Close to the body, sharp lines.' },
    { id: 'regular', label: 'Regular / Balanced', desc: 'Classic, comfortable ease.' },
    { id: 'relaxed', label: 'Relaxed', desc: 'Easy, roomy but not oversized.' },
    { id: 'oversized', label: 'Oversized', desc: 'Deliberately loose and boxy.' },
    { id: 'depends', label: 'Depends on the item', desc: 'Mix and match per look.' },
    { id: 'no-pref', label: 'No Preference', desc: 'Open to anything.' }
  ];

  var GARMENT_AREAS = [
    { key: 'tops', label: 'Tops & shirts' },
    { key: 'bottoms', label: 'Bottoms' },
    { key: 'outerwear', label: 'Outerwear' },
    { key: 'footwear', label: 'Footwear' }
  ];

  var SILHOUETTES = [
    { id: 'structured', label: 'Structured & tailored', desc: 'Defined shoulders, crisp shapes, polished.' },
    { id: 'flowing', label: 'Soft & flowing', desc: 'Draped, fluid, gentle movement.' },
    { id: 'layered', label: 'Layered & textured', desc: 'Depth through layering and fabrics.' },
    { id: 'streamlined', label: 'Simple & streamlined', desc: 'Clean, uncluttered, minimal.' },
    { id: 'statement', label: 'Statement-making', desc: 'Bold silhouettes that stand out.' },
    { id: 'no-pref', label: 'No Preference', desc: 'Open to anything.' }
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
    { title: 'Fit Preferences' },
    { title: 'Silhouettes' },
    { title: 'Your Sizes' },
    { title: 'Comfort & Practicality' },
    { title: 'Wardrobe & Styling' },
    { title: 'Optional Photo' },
    { title: 'Review Your Fit Profile' }
  ];

  /* =====================================================================
   * 2. STATE + HELPERS
   * ===================================================================== */

  var currentStep = 0;
  var photoObjectUrl = null;
  var MAX_PHOTO_BYTES = 5 * 1024 * 1024;

  /* Couple mode: keep the active partner's fit/practical profile separate.
   * 'p1' maps to the primary `fit`, 'p2' maps to `couple.partner2Fit`. */
  var activePartner = 'p1';

  function isPartner2() {
    return !!Store && Store.isCouple && Store.isCouple() && activePartner === 'p2';
  }

  function fit() {
    return isPartner2() ? Store.getPartner2Fit() : Store.getFit();
  }

  function saveFit(patch, silent) {
    return isPartner2() ? Store.setPartner2Fit(patch, silent) : Store.setFit(patch, silent);
  }

  function partnerName() {
    return isPartner2() ? 'Person 2' : 'Person 1';
  }

  function $id(id) { return document.getElementById(id); }

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

  function chip(group, value, label, selected, area) {
    return '<button type="button" class="chip' + (selected ? ' is-selected' : '') + '" data-group="' + group + '"' +
      (area ? ' data-area="' + esc(area) + '"' : '') +
      ' data-value="' + esc(value) + '" aria-pressed="' + selected + '">' + esc(label) + '</button>';
  }

  function optCard(group, id, on, title, desc) {
    return '<button type="button" class="opt-card' + (on ? ' is-selected' : '') + ' p-4" data-group="' + group + '" data-value="' + id + '" aria-pressed="' + on + '">' + checkIcon() +
      '<span class="block text-sm font-bold text-slate-900 tracking-tight">' + esc(title) + '</span>' +
      '<span class="block text-[11px] text-slate-500 mt-1 leading-snug">' + esc(desc) + '</span></button>';
  }

  function labelOf(list, id) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i].label || list[i].title || id;
    }
    return id;
  }

  function authState() {
    try { if (typeof AuthState !== 'undefined') return AuthState; } catch (e) { /* not global yet */ }
    return global.AuthState || null;
  }

  /* =====================================================================
   * 3. RENDERERS
   * ===================================================================== */

  function renderFit() {
    $id('grid-fit').innerHTML = FITS.map(function (f) {
      return optCard('fit', f.id, fit().general_fit === f.id, f.label, f.desc);
    }).join('');
  }

  function renderGarmentFit() {
    var g = fit().garment_specific_fit || {};
    $id('grid-garment-fit').innerHTML = GARMENT_AREAS.map(function (area) {
      return '<div><p class="text-xs font-semibold text-slate-600 mb-2">' + esc(area.label) + '</p>' +
        '<div class="flex flex-wrap gap-2">' +
        FITS.map(function (f) { return chip('garment', f.id, f.label, g[area.key] === f.id, area.key); }).join('') +
        '</div></div>';
    }).join('');
  }

  function renderSilhouette() {
    $id('grid-silhouette').innerHTML = SILHOUETTES.map(function (s) {
      return optCard('silhouette', s.id, fit().preferred_silhouettes.indexOf(s.id) > -1, s.label, s.desc);
    }).join('');
  }

  function renderSizes() {
    var sizes = fit().clothing_sizes || {};
    document.querySelectorAll('[data-size]').forEach(function (input) {
      input.value = sizes[input.getAttribute('data-size')] || '';
    });
    var region = $id('sizing-region');
    if (region) region.value = fit().sizing_region || '';
  }

  function renderComfort() {
    $id('grid-comfort').innerHTML = COMFORT.map(function (o) {
      return chip('comfort', o.id, o.label, fit().comfort_preferences.indexOf(o.id) > -1);
    }).join('');
    $id('grid-mobility').innerHTML = MOBILITY.map(function (o) {
      return chip('mobility', o.id, o.label, fit().mobility_requirements.indexOf(o.id) > -1);
    }).join('');
    $id('grid-fabrics').innerHTML = FABRICS.map(function (fab) {
      return chip('fabrics', fab, fab, fit().preferred_fabrics.indexOf(fab) > -1);
    }).join('');
  }

  function renderWardrobe() {
    $id('grid-layering').innerHTML = LAYERING.map(function (o) {
      return chip('layering', o.id, o.label, fit().layering_preference === o.id);
    }).join('');
    $id('grid-accessory').innerHTML = ACCESSORY.map(function (o) {
      return chip('accessory', o.id, o.label, fit().accessory_preference === o.id);
    }).join('');
    $id('grid-wardrobe-strategy').innerHTML = WARDROBE_STRATEGY.map(function (o) {
      return chip('wardrobe', o.id, o.label, fit().wardrobe_strategy === o.id);
    }).join('');
    var notes = $id('wardrobe-notes');
    if (notes) notes.value = fit().existing_wardrobe_notes || '';
  }

  function renderPhoto() {
    var consent = $id('photo-consent');
    if (consent) consent.checked = !!fit().photo_processing_consent;
    var clear = $id('photo-clear');
    if (clear) clear.classList.toggle('hidden', !fit().photo_selected);
    if (fit().photo_selected) {
      setPhotoStatus('A local preview is selected. Add consent below if you want it used for styling on this device.', 'ok');
    } else {
      setPhotoStatus('No photo selected — this step is completely optional.', 'muted');
    }
  }

  function setPhotoStatus(text, tone) {
    var el = $id('photo-status');
    if (!el) return;
    el.textContent = text;
    el.className = 'mt-3 text-xs ' + (tone === 'error' ? 'text-red-500' : tone === 'ok' ? 'text-emerald-600' : 'text-slate-400');
  }

  function renderStepContent(index) {
    if (index === 0) { renderFit(); renderGarmentFit(); }
    else if (index === 1) renderSilhouette();
    else if (index === 2) renderSizes();
    else if (index === 3) renderComfort();
    else if (index === 4) renderWardrobe();
    else if (index === 5) renderPhoto();
    else if (index === 6) renderReview();
  }

  function labelOfListId(list, id) {
    var found = list.filter(function (x) { return x.id === id; })[0];
    return found ? (found.label || o === 0 ? found.label : id) : id;
  }

  /* =====================================================================
   * 3b. LABEL HELPERS
   * ===================================================================== */

  function labelOf(list, id) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i].label || list[i].title || id;
    }
    return id;
  }

  /* =====================================================================
   * 4. SELECTION
   * ===================================================================== */

  var SELECT = {
    fit: { field: 'general_fit' },
    silhouette: { multi: true, field: 'preferred_silhouettes' },
    comfort: { multi: true, field: 'comfort_preferences' },
    mobility: { multi: true, field: 'mobility_requirements' },
    fabrics: { multi: true, field: 'preferred_fabrics' },
    layering: { field: 'layering_preference' },
    accessory: { field: 'accessory_preference' },
    wardrobe: { field: 'wardrobe_strategy' }
  };

  function handleSelect(group, value, area) {
    if (group === 'garment') return handleGarmentFit(area, value);
    var cfg = SELECT[group];
    if (!cfg) return;

    if (cfg.multi) {
      var arr = (fit()[cfg.field] || []).slice();
      toggle(arr, value);
      var mpatch = {}; mpatch[cfg.field] = arr;
      saveFit(mpatch);
    } else {
      var spatch = {}; spatch[cfg.field] = fit()[cfg.field] === value ? null : value;
      saveFit(spatch);
    }
    renderStepContent(currentStep);
    renderSummary();
  }

  function handleGarmentFit(area, value) {
    if (!area) return;
    var g = Object.assign({}, fit().garment_specific_fit || {});
    if (g[area] === value) delete g[area]; else g[area] = value;
    saveFit({ garment_specific_fit: g });
    renderStepContent(0);
    renderSummary();
  }

  /* =====================================================================
   * 5. SUMMARY + REVIEW
   * ===================================================================== */

  function groupBlock(title, values) {
    if (!values || !values.length) return '';
    return '<div><p class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">' + esc(title) + '</p>' +
      '<div class="flex flex-wrap gap-1.5">' +
      values.map(function (v) { return '<span class="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/80 border border-slate-200 text-slate-700">' + esc(v) + '</span>'; }).join('') +
      '</div></div>';
  }

  function garmentFitLabels() {
    var g = fit().garment_specific_fit || {};
    return GARMENT_AREAS
      .filter(function (a) { return g[a.key]; })
      .map(function (a) { return a.label + ': ' + labelOf(FITS, g[a.key]); });
  }

  function renderSummary() {
    var f = fit();
    var parts = [];
    if (Store.isCouple()) parts.push('<p class="text-[11px] font-bold uppercase tracking-wider text-indigo-500 mb-2">For ' + esc(partnerName()) + '</p>');
    function group(title, values) { if (values && values.length) parts.push(summaryGroup(title, values)); }

    if (f.general_fit) group('Overall fit', [labelOf(FITS, f.general_fit)]);
    group('Garment fit', garmentFitLabels());
    group('Silhouettes', (f.preferred_silhouettes || []).map(function (id) { return labelOf(SILHOUETTES, id); }));
    group('Comfort', (f.comfort_preferences || []).map(function (id) { return labelOf(COMFORT, id); }));
    group('Movement', (f.mobility_requirements || []).map(function (id) { return labelOf(MOBILITY, id); }));
    group('Fabrics', f.preferred_fabrics || []);
    if (f.layering_preference) group('Layering', [labelOf(LAYERING, f.layering_preference)]);
    if (f.accessory_preference) group('Accessories', [labelOf(ACCESSORY, f.accessory_preference)]);
    if (f.wardrobe_strategy) group('Wardrobe', [labelOf(WARDROBE_STRATEGY, f.wardrobe_strategy)]);
    if (f.photo_selected) group('Photo', ['Local preview only']);

    $id('summary-body').innerHTML = parts.length ? parts.join('') :
      '<div class="flex items-center justify-center py-6 text-slate-400 text-sm text-center">Your fit and comfort choices will appear here.</div>';
  }

  function garmentLines() {
    var g = fit().garment_specific_fit || {};
    return GARMENT_AREAS
      .filter(function (a) { return g[a.key]; })
      .map(function (a) { return a.label + ': ' + labelOf(FITS, g[a.key]); });
  }

  function summaryGroup(title, values) {
    return '<div><p class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">' + esc(title) + '</p>' +
      '<div class="flex flex-wrap gap-1.5">' +
      values.map(function (v) { return '<span class="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/80 border border-slate-200 text-slate-700">' + esc(v) + '</span>'; }).join('') +
      '</div></div>';
  }

  function renderReview() {
    var f = fit();
    var rows = [];

    if (Store.isCouple()) {
      rows.push(
        '<div class="glass-card rounded-2xl p-5 bg-indigo-50/60 border-indigo-100"><p class="text-[11px] font-bold uppercase tracking-wider text-indigo-500 mb-1">Showing profile</p>' +
        '<p class="text-sm font-bold text-slate-900">' + esc(partnerName()) + '</p>' +
        '<p class="text-[11px] text-slate-500 mt-1">Use the toggle above to review the other partner. Their sizes, comfort and movement needs are kept completely separate and applied to their own recommendations.</p></div>'
      );
    }

    function group(title, values) {
      if (!values || !values.length) return;
      rows.push(
        '<div class="glass-card rounded-2xl p-5"><p class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">' + esc(title) + '</p>' +
        '<div class="flex flex-wrap gap-1.5">' +
        values.map(function (v) { return '<span class="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/80 border border-slate-200 text-slate-700">' + esc(v) + '</span>'; }).join('') +
        '</div></div>'
      );
    }

    if (f.general_fit) group('Overall fit', [labelOf(FITS, f.general_fit)]);
    group('Garment-specific fit', garmentLines());
    group('Preferred silhouettes', (f.preferred_silhouettes || []).map(function (id) { return labelOf(SILHOUETTES, id); }));
    group('Comfort priorities', (f.comfort_preferences || []).map(function (id) { return labelOf(COMFORT, id); }));
    group('Movement needs', (f.mobility_requirements || []).map(function (id) { return labelOf(MOBILITY, id); }));
    group('Preferred fabrics', f.preferred_fabrics || []);
    if (f.layering_preference) group('Layering', [labelOf(LAYERING, f.layering_preference)]);
    if (f.accessory_preference) group('Accessories', [labelOf(ACCESSORY, f.accessory_preference)]);
    if (f.wardrobe_strategy) group('Wardrobe strategy', [labelOf(WARDROBE_STRATEGY, f.wardrobe_strategy)]);
    if (f.existing_wardrobe_notes) group('Existing wardrobe', [f.existing_wardrobe_notes]);

    var sizeEntries = Object.keys(f.clothing_sizes || {}).map(function (key) {
      return key.charAt(0).toUpperCase() + key.slice(1) + ': ' + f.clothing_sizes[key];
    });
    if (f.sizing_region) sizeEntries.push('Region: ' + f.sizing_region);
    group('Sizes (optional)', sizeEntries);

    if (f.photo_selected) group('Photo', ['Local preview only', f.photo_processing_consent ? 'Consent given' : 'No consent given']);

    $id('review-profile').innerHTML = rows.join('');
    $id('review-empty').classList.toggle('hidden', rows.length > 0);
  }

  /* =====================================================================
   * 6. PHOTO (local preview only — never persisted)
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
    var preview = $id('photo-preview');
    if (preview) preview.removeAttribute('src');
    var wrap = $id('photo-preview-wrap');
    if (wrap) wrap.classList.add('hidden');
    var clear = $id('photo-clear');
    if (clear) clear.classList.add('hidden');
    var consent = $id('photo-consent');
    if (consent) consent.checked = false;
    saveFit({
      photo_selected: false, photo_name: null, photo_type: null, photo_size: null,
      photo_processing_consent: false
    });
    setPhotoStatus('No photo selected — this step is completely optional.', 'muted');
    renderSummary();
  }

  /* =====================================================================
   * 7. NAVIGATION
   * ===================================================================== */

  function updateProgress() {
    var percent = Math.round(((currentStep + 1) / STEPS.length) * 100);
    $id('progress-eyebrow').textContent = 'Step ' + (currentStep + 1) + ' of ' + STEPS.length;
    $id('progress-title').textContent = STEPS[currentStep].title;
    $id('progress-percent').textContent = percent + '%';
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

  function renderStepContent(index) {
    if (index === 0) { renderFit(); renderGarmentFit(); }
    else if (index === 1) renderSilhouette();
    else if (index === 2) renderSizes();
    else if (index === 3) renderComfort();
    else if (index === 4) renderWardrobe();
    else if (index === 5) renderPhoto();
    else if (index === 6) renderReview();
  }

  function goToStep(index) {
    currentStep = Math.max(0, Math.min(STEPS.length - 1, index));
    document.querySelectorAll('.step-section').forEach(function (section) {
      section.classList.toggle('is-active', parseInt(section.getAttribute('data-step'), 10) === currentStep);
    });
    updateProgress();
    renderStepContent(currentStep);
    renderSummary();
    Store.setFitStep(currentStep);
  }

  function updateNavHint() {
    var hint = $id('nav-hint');
    if (!hint) return;
    hint.classList.remove('text-red-500');
    hint.textContent = 'All sections are optional — continue whenever you\'re ready.';
  }

  function complete(skip) {
    Store.markFitComplete(!skip);
    window.DaFitMatchFitProfile = Store.toJSON();
    try {
      window.dispatchEvent(new CustomEvent('dafitmatch:fit-complete', { detail: window.DaFitMatchFitProfile }));
    } catch (e) { /* older browsers */ }
    if (skip) {
      window.location.href = 'recommendations.html';
      return;
    }
    var overlay = $id('completion');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
  }

  /* =====================================================================
   * 8. AUTH / SAVE STATUS
   * ===================================================================== */

  function updateUserBadge() {
    var badge = $id('summary-user-badge');
    var note = $id('summary-save-note');
    var Auth = null;
    try { if (typeof AuthState !== 'undefined') Auth = AuthState; } catch (e) { Auth = null; }
    var signedIn = Store.isSignedIn();
    if (signedIn && Auth && Auth.user) {
      badge.textContent = String(Auth.user.name || 'You').split(' ')[0];
      badge.className = 'text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200';
      if (note) note.textContent = 'Saved to your account automatically.';
    } else {
      badge.textContent = 'Guest';
      badge.className = 'text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 border border-sky-200';
      if (note) note.textContent = 'Saved on this device. Sign in to keep it.';
    }
  }

  /* =====================================================================
   * 9. EVENTS
   * ===================================================================== */

  function bindEvents() {
    document.addEventListener('click', function (e) {
      var sel = e.target.closest('[data-group]');
      if (sel) {
        handleSelect(sel.getAttribute('data-group'), sel.getAttribute('data-value'), sel.getAttribute('data-area'));
        return;
      }
      var nav = e.target.closest('[data-step-nav]');
      if (nav) goToStep(parseInt(nav.getAttribute('data-step-nav'), 10));
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
        var sizes = Object.assign({}, fit().clothing_sizes);
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

    var notesTimer = null;
    $id('wardrobe-notes').addEventListener('input', function () {
      var value = this.value;
      clearTimeout(notesTimer);
      notesTimer = setTimeout(function () {
        saveFit({ existing_wardrobe_notes: value.trim() ? value : null });
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

    $id('btn-continue').addEventListener('click', function () {
      if (currentStep >= STEPS.length - 1) complete(false);
      else goToStep(currentStep + 1);
    });

    $id('btn-back').addEventListener('click', function () {
      if (currentStep === 0) window.location.href = 'aesthetic.html';
      else goToStep(currentStep - 1);
    });

    $id('btn-skip').addEventListener('click', function () { complete(true); });

    $id('btn-reset').addEventListener('click', function () {
      if (isPartner2()) Store.resetPartner2Fit();
      else Store.resetFit();
      revokePhoto();
      var preview = $id('photo-preview');
      if (preview) preview.removeAttribute('src');
      var wrap = $id('photo-preview-wrap');
      if (wrap) wrap.classList.add('hidden');
      goToStep(0);
      renderSummary();
      setPhotoStatus('No photo selected — this step is completely optional.', 'muted');
    });
  }

  /* =====================================================================
   * 8b. COUPLE PARTNER TOGGLE
   * ===================================================================== */

  /* In couple mode partner 1 and partner 2 each keep a separate fit profile.
   * The toggle switches the active profile so sizes, comfort and movement
   * needs are never mixed between partners. */
  function renderPartnerToggle() {
    var mount = $id('partner-toggle');
    if (!mount) return;
    if (!Store.isCouple()) {
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
              '<button type="button" class="partner-tab text-[11px] font-bold px-3 py-1.5 rounded-full' + (activePartner === 'p1' ? ' bg-white text-slate-900 shadow-sm' : ' text-slate-500 hover:text-slate-700') + '" data-partner="p1">Person 1</button>' +
              '<button type="button" class="partner-tab text-[11px] font-bold px-3 py-1.5 rounded-full' + (activePartner === 'p2' ? ' bg-white text-slate-900 shadow-sm' : ' text-slate-500 hover:text-slate-700') + '" data-partner="p2">Person 2</button>' +
            '</div>' +
          '</div>' +
          (p2Empty
            ? '<p class="text-[11px] text-slate-500">Person 2 not started yet — their fit &amp; comfort profile is kept separate.</p>'
            : '<p class="text-[11px] text-emerald-600">Person 2 profile saved separately.</p>') +
        '</div>' +
      '</div>';
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

  function bindPartnerToggle() {
    document.addEventListener('click', function (e) {
      var tab = e.target.closest('[data-partner]');
      if (!tab) return;
      var partner = tab.getAttribute('data-partner');
      if (partner === activePartner) return;
      activePartner = partner;
      document.querySelectorAll('.step-section').forEach(function (section) {
        section.classList.toggle('is-active', parseInt(section.getAttribute('data-step'), 10) === currentStep);
      });
      updateProgress();
      renderStepContent(currentStep);
      renderSummary();
      updateNavHint();
      renderPartnerToggle();
    });
  }

  /* =====================================================================
   * 10. INIT
   * ===================================================================== */

  function init() {
    if (!Store) { console.error('[DaFitMatch Fit] store module missing'); return; }
    bindEvents();
    bindPartnerToggle();
    goToStep(typeof Store.get().fitStep === 'number' ? Store.get().fitStep : 0);
    updateUserBadge();
    renderPartnerToggle();
    if (Store.on) Store.on(function () { updateUserBadge(); renderPartnerToggle(); });
    window.addEventListener('beforeunload', revokePhoto);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.DaFitMatchFitController = { goToStep: goToStep, complete: complete };
})(window);
