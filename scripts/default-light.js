/* Vivia 0.5.0 hard-codes dark mode and renders its theme control as an
 * anchor without accessible text. Replace those pieces at build time so the
 * site follows the visitor's color preference and exposes a real button. */
hexo.extend.filter.register('after_render:html', function (html) {
  return html
    .replace('<html theme="dark"', '<html theme="light"')
    .replace(
      '<script src="/js/load-settings.js" ></script>',
      '<script src="/js/site-theme.js"></script>'
    )
    .replace(
      /<a id="theme-btn" class="nav-icon">([\s\S]*?)<\/a>/,
      '<button id="theme-btn" class="nav-icon" type="button" title="切换主题" aria-label="切换主题">$1</button>'
    )
    .replace(
      /\s*<script src="\/js\/light-dark-switch\.js"><\/script>/,
      ''
    )
    .replace(
      '</head>',
      '<link rel="stylesheet" href="/css/site-overrides.css">\n</head>'
    );
});
