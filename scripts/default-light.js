/* Vivia 0.5.0 hard-codes dark mode in its root HTML element. Keep the
 * visitor-controlled switch, but make the first visit use light mode. */
hexo.extend.filter.register('after_render:html', function (html) {
  return html.replace('<html theme="dark"', '<html theme="light"');
});
