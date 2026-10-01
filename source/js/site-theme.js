(function () {
  'use strict';

  var root = document.documentElement;
  var media = window.matchMedia('(prefers-color-scheme: dark)');
  var storageKey = 'theme';

  function storedTheme() {
    try {
      var value = window.localStorage.getItem(storageKey);
      return value === 'dark' || value === 'light' ? value : null;
    } catch (_) {
      return null;
    }
  }

  function preferredTheme() {
    return media.matches ? 'dark' : 'light';
  }

  function updateButton(theme) {
    var button = document.getElementById('theme-btn');
    if (!button) return;

    var label = theme === 'dark' ? '切换到浅色模式' : '切换到深色模式';
    button.title = label;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  }

  function applyTheme(theme, remember) {
    root.setAttribute('theme', theme);
    root.style.colorScheme = theme;
    updateButton(theme);

    if (remember) {
      try {
        window.localStorage.setItem(storageKey, theme);
      } catch (_) {
        // The selected theme still applies when storage is unavailable.
      }
    }
  }

  // This file is loaded before the page head, avoiding a light/dark flash.
  applyTheme(storedTheme() || preferredTheme(), false);

  function initializeButton() {
    var button = document.getElementById('theme-btn');
    if (!button) return;

    updateButton(root.getAttribute('theme'));
    button.addEventListener('click', function () {
      var next = root.getAttribute('theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next, true);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeButton, { once: true });
  } else {
    initializeButton();
  }

  function followSystem(event) {
    if (!storedTheme()) applyTheme(event.matches ? 'dark' : 'light', false);
  }

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', followSystem);
  } else if (typeof media.addListener === 'function') {
    media.addListener(followSystem);
  }
})();
