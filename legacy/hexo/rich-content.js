/* global hexo */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const markedKatex = require('marked-katex-extension');
const { escapeHTML } = require('hexo-util');

const BILIBILI_VIDEO = /https?:\/\/(?:www\.)?bilibili\.com\/video\/(BV[0-9A-Za-z]+)/i;
const GITHUB_REPOSITORY = /^https?:\/\/(?:www\.)?github\.com\/([^/?#]+)\/([^/?#]+?)(?:\.git)?\/?(?:[?#].*)?$/i;

function bilibiliEmbed(bvid, title = '') {
  const safeId = escapeHTML(bvid);
  const safeTitle = escapeHTML(title || `Bilibili 视频 ${bvid}`);
  const videoUrl = `https://www.bilibili.com/video/${safeId}/`;
  const playerUrl = `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(bvid)}&amp;p=1&amp;poster=1&amp;autoplay=0&amp;high_quality=1&amp;danmaku=0`;
  return `<figure class="rich-embed rich-embed-bilibili">
  <div class="video-container"><iframe src="${playerUrl}" title="${safeTitle}" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
  <figcaption><a href="${videoUrl}" target="_blank" rel="noopener noreferrer">${safeTitle}</a></figcaption>
</figure>`;
}

function githubCard(url, owner, repository) {
  const safeUrl = escapeHTML(url);
  const safeOwner = escapeHTML(owner);
  const safeRepository = escapeHTML(repository);
  return `<a class="rich-link-card github-card" href="${safeUrl}" target="_blank" rel="noopener noreferrer">
  <span class="rich-link-card-brand" aria-hidden="true">GitHub</span>
  <span class="rich-link-card-content"><strong>${safeOwner} / ${safeRepository}</strong><small>在 GitHub 上查看仓库</small></span>
  <span class="rich-link-card-arrow" aria-hidden="true">↗</span>
</a>`;
}

function transformParagraphs(html) {
  return html.replace(/<p>([\s\S]*?)<\/p>/g, (paragraph, inner) => {
    const links = [...inner.matchAll(/<a\b[^>]*href=(?:"([^"]+)"|'([^']+)')[^>]*>[\s\S]*?<\/a>/gi)];
    if (links.length !== 1) return paragraph;
    const href = (links[0][1] || links[0][2]).replace(/&amp;/g, '&');
    const remainder = inner.replace(links[0][0], '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').trim();

    const bilibili = BILIBILI_VIDEO.exec(href);
    if (bilibili && remainder.length <= 200) {
      const title = remainder.replace(/^[【\[（(]\s*|\s*[】\]）)]$/g, '').trim();
      return bilibiliEmbed(bilibili[1], title);
    }

    const github = GITHUB_REPOSITORY.exec(href);
    if (github && remainder === '') return githubCard(href, github[1], github[2]);
    return paragraph;
  });
}

const CALLOUT_LABELS = {
  NOTE: '提示', TIP: '技巧', IMPORTANT: '重要', WARNING: '注意', CAUTION: '警告'
};

const CALLOUT_ICONS = {
  NOTE: '<circle cx="12" cy="12" r="9"></circle><path d="M12 11v5"></path><path d="M12 8h.01"></path>',
  TIP: '<path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M8.5 14.5a6 6 0 1 1 7 0c-.9.7-1.5 1.5-1.5 2.5h-4c0-1-.6-1.8-1.5-2.5Z"></path>',
  IMPORTANT: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v6"></path><path d="M12 17h.01"></path>',
  WARNING: '<path d="M10.3 3.7 2.4 18a2 2 0 0 0 1.8 3h15.6a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path>',
  CAUTION: '<path d="M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9Z"></path><path d="M12 7v6"></path><path d="M12 17h.01"></path>'
};

function transformCallouts(html) {
  return html.replace(
    /<blockquote>\s*<p>\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:<br\s*\/?>)?([\s\S]*?)<\/p>/gi,
    (_, rawType, firstParagraph) => {
      const type = rawType.toUpperCase();
      const icon = `<svg class="callout-icon" viewBox="0 0 24 24" aria-hidden="true">${CALLOUT_ICONS[type]}</svg>`;
      const title = `<p class="callout-title">${icon}<span>${CALLOUT_LABELS[type]}</span></p>`;
      const content = firstParagraph.trim() ? `<p>${firstParagraph.trim()}</p>` : '';
      return `<blockquote class="callout callout-${type.toLowerCase()}">${title}${content}`;
    }
  );
}

hexo.extend.filter.register('marked:use', function (markedUse) {
  markedUse(markedKatex({ throwOnError: false, strict: 'warn' }));
});

hexo.extend.tag.register('bilibili', function (args) {
  const bvid = args.shift();
  if (!bvid || !/^BV[0-9A-Za-z]+$/i.test(bvid)) return '<p class="rich-embed-error">无效的 Bilibili BV 号</p>';
  return bilibiliEmbed(bvid, args.join(' '));
});

hexo.extend.filter.register('after_post_render', function (data) {
  data.content = transformCallouts(transformParagraphs(data.content));
  return data;
});

const katexRoot = path.dirname(require.resolve('katex/package.json'));
hexo.extend.generator.register('local-katex-assets', function () {
  const assets = [{
    path: 'vendor/katex/katex.min.css',
    data: () => fs.createReadStream(path.join(katexRoot, 'dist', 'katex.min.css'))
  }];
  for (const filename of fs.readdirSync(path.join(katexRoot, 'dist', 'fonts'))) {
    assets.push({
      path: `vendor/katex/fonts/${filename}`,
      data: () => fs.createReadStream(path.join(katexRoot, 'dist', 'fonts', filename))
    });
  }
  return assets;
});

hexo.extend.filter.register('after_render:html', function (html) {
  if (!html.includes('class="katex') || html.includes('/vendor/katex/katex.min.css')) return html;
  return html.replace('</head>', '<link rel="stylesheet" href="/vendor/katex/katex.min.css">\n</head>');
});
