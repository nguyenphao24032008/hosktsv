(function () {
  'use strict';

  /*
   * HOSKT dynamic logo target fix v23-safe
   *
   * The HOSKT React sidebar already renders the configured mobile header logo
   * through .hoskt-mobile-top-panel-logo. Older revisions of this helper tried
   * to locate a header title by scanning every body div/span and then replaced
   * the chosen node with innerHTML. On a scrolled server tool page that broad
   * scan could select a Classic Colors control, Rainbow preset, or Placeholder
   * category and replace its text with the HOSKT logo.
   *
   * This revision never searches tool content and never injects logo markup.
   * It only normalizes known, native HOSKT logo elements and cleans up legacy
   * targets left by the old helper. Sidebar layout, hamburger, navigation,
   * account footer, and the React-rendered logo remain untouched.
   */

  var HEADER_LOGO_CLASS = 'hoskt-header-logo-normalized';
  var OCEAN_HIDDEN_CLASS = 'hoskt-ocean-badge-hidden';
  var LEGACY_TARGETS = '.hoskt-server-title-logo, .hoskt-server-top-title-logo';
  var KNOWN_LOGOS = [
    '.hoskt-mobile-top-panel-logo',
    '.admin-panel-logo img',
    '.main-header .logo img',
    '#logo > a img',
    'header a.logo img'
  ].join(', ');

  window.__HOSKT_LOGO_TARGET_FIX__ = 'v23-safe';

  function visible(el) {
    if (!el || el.nodeType !== 1) return false;
    var style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    var rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function ownText(el) {
    return String((el && (el.innerText || el.textContent)) || '').trim().replace(/\s+/g, ' ');
  }

  function cleanupLegacyInjectedTargets() {
    document.querySelectorAll(LEGACY_TARGETS).forEach(function (el) {
      var original = el.getAttribute('data-hoskt-original-title') || '';
      if (original) {
        el.textContent = original;
      } else {
        el.querySelectorAll('img.hoskt-server-top-logo-img').forEach(function (img) {
          img.remove();
        });
      }

      el.classList.remove('hoskt-server-title-logo');
      el.classList.remove('hoskt-server-top-title-logo');
      el.removeAttribute('data-hoskt-original-title');
    });
  }

  function normalizeKnownLogoImages() {
    document.querySelectorAll(KNOWN_LOGOS).forEach(function (img) {
      if (!visible(img)) return;
      img.classList.add(HEADER_LOGO_CLASS);
    });
  }

  function hideOceanTextBadges() {
    var roots = document.querySelectorAll('.main-header .logo, .admin-panel-logo, header');
    roots.forEach(function (root) {
      root.querySelectorAll('span, div').forEach(function (el) {
        if (!visible(el) || el.querySelector('img,svg,button,input,textarea,select')) return;
        var text = ownText(el);
        if (/^OCEAN$/i.test(text)) {
          el.classList.add(OCEAN_HIDDEN_CLASS);
          el.setAttribute('aria-hidden', 'true');
        } else if (/^(HOSKT|HOSTKT)\s+OCEAN$/i.test(text)) {
          el.textContent = text.replace(/\s+OCEAN$/i, '');
        }
      });
    });
  }

  function applyAll() {
    cleanupLegacyInjectedTargets();
    normalizeKnownLogoImages();
    hideOceanTextBadges();
  }

  function scheduleApply() {
    window.clearTimeout(scheduleApply._timer);
    scheduleApply._timer = window.setTimeout(applyAll, 60);
  }

  ['pushState', 'replaceState'].forEach(function (name) {
    var original = history[name];
    if (typeof original !== 'function') return;
    history[name] = function () {
      var result = original.apply(this, arguments);
      scheduleApply();
      return result;
    };
  });

  window.addEventListener('popstate', scheduleApply);
  window.addEventListener('load', scheduleApply);
  document.addEventListener('DOMContentLoaded', scheduleApply);

  var observer = new MutationObserver(scheduleApply);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-theme', 'src']
  });

  scheduleApply();
})();
