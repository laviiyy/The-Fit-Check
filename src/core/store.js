/*
 * DaFitMatch — Shared onboarding store
 * -------------------------------------------------------------------------
 * A single, framework-free state container shared by every onboarding page
 * (Page 1 landing, Page 2 occasion, Page 3 aesthetic discovery, ...).
 *
 * Responsibilities
 *   - Hold the multi-step styling journey state (mode, occasion, aesthetic).
 *   - Persist it to localStorage, namespaced PER USER (Google sub) so that a
 *     signed-in user's saved filters persist, while guests keep their own draft.
 *   - Merge a guest draft into the signed-in user's profile on first sign-in.
 *   - Emit change events so any page can react.
 *
 * It depends on `window.AuthState` (auth.js) but degrades gracefully if auth
 * is not present. It never fabricates a backend; storage is local only.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY =
    (global.ENV && global.ENV.STORAGE_NAMESPACE) || 'dafitmatch_profiles_v1';

  /* auth.js declares `const AuthState` at the top level of a classic script,
   * which creates a global *lexical* binding but NOT a `window.AuthState`
   * property. Resolve it either way and expose it on window so the auth
   * bridge below (and any other script) can patch it additively. */
  function getAuth() {
    if (global.AuthState) return global.AuthState;
    if (typeof AuthState !== 'undefined' && AuthState) {
      global.AuthState = AuthState;
      return AuthState;
    }
    return null;
  }

  /* --- Canonical profile shapes (Page 3 contract) ------------------------
   * Unanswered fields stay null / empty — answers are never invented. */
  function blankRefinement() {
    return {
      statement_style: null,      // simple | statement | balanced
      layering_preference: null,  // minimal-layers | balanced-layers | layered
      fabric_notes: null,         // free text
      trend_preference: null,     // timeless | balanced | trendy
      ease_of_care: null,         // low-maintenance | balanced | any
      reuse_wardrobe: null        // yes | maybe | no
    };
  }

  function blankAesthetic() {
    return {
      preferred_styles: [],
      preferred_colours: [],
      avoided_colours: [],
      pattern_preference: null,
      preferred_fit: null,
      preferred_silhouette: null,
      formality_preference: null,
      experimentation_level: null,
      styling_priorities: [],
      excluded_garments: [],
      excluded_fabrics: [],
      exclusion_flags: [],
      preferred_footwear: [],
      wardrobe_reuse: null,
      optional_notes: null,
      refinement: blankRefinement()
    };
  }

  /* --- Page 4 fit / practical profile -----------------------------------
   * Complements Page 3: garment exclusions, avoided fabrics, footwear,
   * wardrobe reuse and free notes live on the aesthetic profile and are
   * reused here rather than duplicated. Photo image data is NEVER stored:
   * only local metadata + an explicit processing-consent flag. */
  function blankFit() {
    return {
      full_name: null,              // optional display name
      gender: null,                 // women | men | non-binary | prefer-not-to-say
      general_fit: null,            // slim | regular | relaxed | oversized | depends | no-pref
      garment_specific_fit: {},     // { tops, bottoms, outerwear, footwear } -> fit id
      preferred_silhouettes: [],    // structured | flowing | layered | streamlined | statement | no-pref
      clothing_sizes: {},           // optional, informational only (never used for ranking)
      sizing_region: null,          // optional
      comfort_preferences: [],      // all-day-comfort | easy-movement | breathable ...
      mobility_requirements: [],    // sit-walk | dance | travel | ...
      preferred_fabrics: [],        // informational preferences
      layering_preference: null,    // minimal | balanced | layered
      accessory_preference: null,   // minimal | balanced | statement | none
      wardrobe_strategy: null,      // reuse | mix | new | no-pref
      existing_wardrobe_notes: null,
      photo_selected: false,
      photo_name: null,
      photo_type: null,
      photo_size: null,
      photo_processing_consent: false
    };
  }

  function blankCouple() {
    return {
      enabled: false,
      /* Each partner keeps a SEPARATE fit/practical profile so sizes, comfort
       * and movement needs are never mixed. Partner 1 uses `fit`, partner 2
       * uses `partner2Fit`. The aesthetic profile (style direction, colours,
       * coordination intent) stays shared, which is what makes couple looks
       * coordinated rather than identical. */
      partner2Fit: null
    };
  }

  function blankState() {
    return {
      version: 1,
      userKey: null,
      updatedAt: null,
      mode: null,          // 'solo' | 'couple'
      occasion: {},        // Page 2 occasion context
      aesthetic: blankAesthetic(),  // Page 3 structured profile
      aestheticStep: 0,
      aestheticComplete: false,
      fit: blankFit(),     // Page 4 fit / comfort / practical profile (partner 1)
      fitStep: 0,
      fitComplete: false,
      couple: blankCouple() // couple-mode partner context
    };
  }

  /* --- Persistence helpers ---------------------------------------------- */
  function readAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function writeAll(all) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      return true;
    } catch (e) {
      console.warn('[DaFitMatch Store] Could not persist profile:', e);
      return false;
    }
  }

  function currentUserKey() {
    var auth = getAuth();
    var user = auth && auth.user;
    return user && user.sub ? 'user:' + user.sub : 'guest';
  }

  function normalizeFit(raw) {
    var f = raw && typeof raw === 'object' ? raw : {};
    f = Object.assign(blankFit(), f);
    [
      'preferred_silhouettes',
      'comfort_preferences',
      'mobility_requirements',
      'preferred_fabrics'
    ].forEach(function (key) {
      if (!Array.isArray(f[key])) f[key] = [];
    });
    ['garment_specific_fit', 'clothing_sizes'].forEach(function (key) {
      if (!f[key] || typeof f[key] !== 'object') f[key] = {};
    });
    f.photo_selected = !!f.photo_selected;
    f.photo_processing_consent = !!f.photo_processing_consent;
    return f;
  }

  function normalize(raw) {
    var state = blankState();
    if (raw && typeof raw === 'object') {
      Object.keys(raw).forEach(function (k) {
        state[k] = raw[k];
      });
    }
    var a = state.aesthetic || {};
    state.aesthetic = Object.assign(blankAesthetic(), a);
    state.aesthetic.refinement = Object.assign(
      blankRefinement(),
      a && a.refinement ? a.refinement : {}
    );
    [
      'preferred_styles',
      'preferred_colours',
      'avoided_colours',
      'styling_priorities',
      'excluded_garments',
      'excluded_fabrics',
      'exclusion_flags',
      'preferred_footwear'
    ].forEach(function (key) {
      if (!Array.isArray(state.aesthetic[key])) state.aesthetic[key] = [];
    });
    state.fit = normalizeFit(state.fit);
    state.aestheticStep = typeof state.aestheticStep === 'number' ? state.aestheticStep : 0;
    state.aestheticComplete = !!state.aestheticComplete;
    if (typeof state.fitStep !== 'number') state.fitStep = 0;
    state.fitComplete = !!state.fitComplete;
    var c = state.couple && typeof state.couple === 'object' ? state.couple : {};
    state.couple = {
      enabled: !!c.enabled,
      partner2Fit: c.partner2Fit ? normalizeFit(c.partner2Fit) : null
    };
    return state;
  }

  function isAestheticEmpty(aesthetic) {
    if (!aesthetic) return true;
    var a = normalize({ aesthetic: aesthetic }).aesthetic;
    return (
      a.preferred_styles.length === 0 &&
      a.preferred_colours.length === 0 &&
      a.avoided_colours.length === 0 &&
      !a.preferred_fit &&
      !a.preferred_silhouette &&
      !a.formality_preference &&
      !a.experimentation_level &&
      a.styling_priorities.length === 0 &&
      a.excluded_garments.length === 0 &&
      a.excluded_fabrics.length === 0 &&
      !a.optional_notes
    );
  }

  function isFitEmpty(fit) {
    if (!fit) return true;
    var f = normalize({ fit: fit }).fit;
    return (
      !f.general_fit &&
      Object.keys(f.garment_specific_fit).length === 0 &&
      f.preferred_silhouettes.length === 0 &&
      Object.keys(f.clothing_sizes).length === 0 &&
      !f.sizing_region &&
      f.comfort_preferences.length === 0 &&
      f.mobility_requirements.length === 0 &&
      f.preferred_fabrics.length === 0 &&
      !f.layering_preference &&
      !f.accessory_preference &&
      !f.wardrobe_strategy &&
      !f.existing_wardrobe_notes &&
      !f.photo_selected
    );
  }

  var listeners = [];
  var loadedKey = null;
  var state = blankState();

  function emit(event) {
    listeners.slice().forEach(function (fn) {
      try {
        fn(state, event || 'change');
      } catch (e) {
        console.error('[DaFitMatch Store] listener error', e);
      }
    });
  }

  function load() {
    loadedKey = currentUserKey();
    var all = readAll();
    state = normalize(all[loadedKey]);
    state.userKey = loadedKey;
    emit('load');
    return state;
  }

  function save() {
    state.userKey = currentUserKey();
    state.updatedAt = new Date().toISOString();
    var all = readAll();
    all[state.userKey] = state;
    writeAll(all);
    emit('change');
  }

  /* Keep the active profile aligned with the signed-in user. On first
   * sign-in a guest draft is adopted so nothing the user entered is lost. */
  function syncUser() {
    var key = currentUserKey();
    if (key === loadedKey) return state;

    if (key !== 'guest') {
      var all = readAll();
      var guest = all['guest'];
      var existing = all[key];
      if (guest && !existing && !isAestheticEmpty(guest.aesthetic)) {
        all[key] = guest;
        writeAll(all);
      }
    }
    return load();
  }

  var store = {
    BLANK_AESTHETIC: blankAesthetic,
    BLANK_FIT: blankFit,

    init: function () {
      var result = load();
      syncUser();
      return result;
    },

    syncUser: syncUser,

    get: function () {
      return state;
    },

    getUserKey: function () {
      return currentUserKey();
    },

    isSignedIn: function () {
      return currentUserKey() !== 'guest';
    },

    set: function (patch, silent) {
      if (patch && typeof patch === 'object') state = Object.assign(state, patch);
      if (!silent) save();
      return state;
    },

    setMode: function (mode) {
      state.mode = mode;
      state.couple.enabled = mode === 'couple';
      if (!state.couple.enabled) state.couple.partner2Fit = null;
      save();
      return state.mode;
    },

    isCouple: function () {
      return state.mode === 'couple' || !!state.couple.enabled;
    },

    setOccasion: function (occasion) {
      state.occasion = Object.assign(state.occasion || {}, occasion || {});
      save();
      return state.occasion;
    },

    getAesthetic: function () {
      return state.aesthetic;
    },

    setAesthetic: function (patch, silent) {
      if (patch && typeof patch === 'object') {
        state.aesthetic = Object.assign(state.aesthetic, patch);
      }
      if (!silent) save();
      return state.aesthetic;
    },

    setAestheticStep: function (index) {
      state.aestheticStep = index;
      save();
      return state.aestheticStep;
    },

    markAestheticComplete: function (complete) {
      state.aestheticComplete = !!complete;
      save();
      return state.aestheticComplete;
    },

    getFit: function () {
      return state.fit;
    },

    setFit: function (patch, silent) {
      if (patch && typeof patch === 'object') {
        state.fit = Object.assign(state.fit, patch);
      }
      if (!silent) save();
      return state.fit;
    },

    setFitStep: function (index) {
      state.fitStep = index;
      save();
      return state.fitStep;
    },

    markFitComplete: function (complete) {
      state.fitComplete = !!complete;
      save();
      return state.fitComplete;
    },

    resetFit: function () {
      state.fit = blankFit();
      state.fitStep = 0;
      state.fitComplete = false;
      save();
      return state.fit;
    },

    /* --- Couple mode: partner 2 fit/practical profile ------------------- */
    getPartner2Fit: function () {
      if (!state.couple || !state.couple.partner2Fit) {
        state.couple = state.couple || { enabled: state.mode === 'couple', partner2Fit: null };
        state.couple.partner2Fit = blankFit();
      }
      return state.couple.partner2Fit;
    },

    setPartner2Fit: function (patch, silent) {
      state.couple = state.couple || { enabled: state.mode === 'couple', partner2Fit: null };
      if (!state.couple.partner2Fit) state.couple.partner2Fit = blankFit();
      if (patch && typeof patch === 'object') {
        state.couple.partner2Fit = Object.assign(state.couple.partner2Fit, patch);
      }
      if (!silent) save();
      return state.couple.partner2Fit;
    },

    resetPartner2Fit: function () {
      state.couple = state.couple || { enabled: state.mode === 'couple', partner2Fit: null };
      state.couple.partner2Fit = blankFit();
      save();
      return state.couple.partner2Fit;
    },

    reset: function () {
      var key = currentUserKey();
      var all = readAll();
      delete all[key];
      writeAll(all);
      state = blankState();
      state.userKey = key;
      emit('reset');
      return state;
    },

    resetAesthetic: function () {
      state.aesthetic = blankAesthetic();
      state.aestheticStep = 0;
      state.aestheticComplete = false;
      save();
      return state.aesthetic;
    },

    toJSON: function () {
      return JSON.parse(JSON.stringify(state));
    },

    on: function (fn) {
      if (typeof fn === 'function') listeners.push(fn);
      return function () {
        var i = listeners.indexOf(fn);
        if (i > -1) listeners.splice(i, 1);
      };
    }
  };

  /* --- Auth bridging -----------------------------------------------------
   * Keep the active profile in sync on sign-in / sign-out. We patch the
   * existing AuthState methods additively (never editing auth.js) so all
   * existing behaviour is preserved. */
  function attachAuthBridge() {
    var Auth = getAuth();
    if (!Auth || Auth.__dafitmatchBridged) return;
    Auth.__dafitmatchBridged = true;

    var originalSignIn = Auth.signIn;
    var originalSignOut = Auth.signOut;

    Auth.signIn = function () {
      var r = originalSignIn.apply(this, arguments);
      syncUser();
      return r;
    };
    Auth.signOut = function () {
      var r = originalSignOut.apply(this, arguments);
      load();
      return r;
    };
  }

  function boot() {
    attachAuthBridge();
    store.init();
    /* auth.js initialises the session on DOMContentLoaded; re-sync once the
     * page has fully loaded so a returning signed-in user gets their profile
     * (and the bridge re-syncs on focus / explicit sign-in). */
    global.addEventListener('load', syncUser);
    global.addEventListener('focus', syncUser);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  global.DaFitMatchStore = store;
})(window);
