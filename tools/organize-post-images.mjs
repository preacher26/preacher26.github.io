#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const IMAGE_EXTENSIONS = new Set([
  '.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp'
]);

function usage() {
  console.log(`用法：
  pnpm post:images -- src/content/posts/<文章>.md          # 只预演
  pnpm post:images -- src/content/posts/<文章>.md --write  # 移动并改写

脚本会把本地图片整理到 public/images/<文章名>/，远程图片和代码块不处理。`);
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function stripMarkup(value) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/[`*_~\[\]{}()<>]/g, ' ')
    .replace(/&(?:[a-z]+|#\d+|#x[\da-f]+);/gi, ' ');
}

export function safeName(value, fallback = 'image', maxLength = 64) {
  let result = stripMarkup(value || '')
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, ' ')
    .replace(/[\p{P}\p{S}]+/gu, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.\s-]+|[.\s-]+$/g, '')
    .toLowerCase();

  result = Array.from(result).slice(0, maxLength).join('').replace(/[.\s-]+$/g, '');
  if (!result || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(result)) return fallback;
  return result;
}

function protectedRanges(markdown) {
  const ranges = [];
  const frontMatter = /^---\s*\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/.exec(markdown);
  if (frontMatter) ranges.push([0, frontMatter[0].length]);

  const fence = /^( {0,3})(`{3,}|~{3,})[^\n]*(?:\n|$)/gm;
  let opening;
  while ((opening = fence.exec(markdown))) {
    const marker = opening[2][0];
    const count = opening[2].length;
    const close = new RegExp(`^ {0,3}${marker}{${count},}\\s*$`, 'gm');
    close.lastIndex = fence.lastIndex;
    const closing = close.exec(markdown);
    const end = closing ? closing.index + closing[0].length : markdown.length;
    ranges.push([opening.index, end]);
    fence.lastIndex = end;
  }

  for (const regex of [
    /<!--[^]*?-->/g,
    /<pre\b[^>]*>[^]*?<\/pre\s*>/gi,
    /<code\b[^>]*>[^]*?<\/code\s*>/gi,
    /(`+)(?!`)[\s\S]*?\1(?!`)/g
  ]) {
    let match;
    while ((match = regex.exec(markdown))) ranges.push([match.index, match.index + match[0].length]);
  }

  return ranges.sort((a, b) => a[0] - b[0]);
}

function parseReferenceDefinitions(markdown) {
  const definitions = new Map();
  const regex = /^ {0,3}\[([^\]]+)\]:\s*(?:<([^>\n]+)>|(\S+))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*$/gm;
  let match;
  while ((match = regex.exec(markdown))) {
    definitions.set(match[1].trim().toLowerCase(), match[2] || match[3]);
  }
  return definitions;
}

function imageReferences(markdown) {
  const protectedArea = protectedRanges(markdown);
  const isProtected = index => protectedArea.some(([start, end]) => index >= start && index < end);
  const definitions = parseReferenceDefinitions(markdown);
  const found = [];

  const collect = (regex, toReference) => {
    let match;
    while ((match = regex.exec(markdown))) {
      if (!isProtected(match.index)) found.push(toReference(match));
    }
  };

  collect(/!\[([^\]]*)\]\(\s*(?:<([^>\n]+)>|((?:\\.|[^)\s])+))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g,
    match => ({ start: match.index, end: match.index + match[0].length, raw: match[0], alt: match[1], url: match[2] || match[3], kind: 'markdown' }));

  collect(/!\[([^\]]*)\]\[([^\]]*)\]/g, match => {
    const label = (match[2] || match[1]).trim().toLowerCase();
    return { start: match.index, end: match.index + match[0].length, raw: match[0], alt: match[1], url: definitions.get(label), kind: 'markdown-reference' };
  });

  collect(/<img\b[^>]*>/gi, match => {
    const attributes = new Map();
    for (const attribute of match[0].matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attributes.set(attribute[1].toLowerCase(), attribute[2] ?? attribute[3] ?? attribute[4] ?? '');
    }
    return { start: match.index, end: match.index + match[0].length, raw: match[0], alt: attributes.get('alt') || '', url: attributes.get('src'), kind: 'html' };
  });

  return found.filter(item => item.url).sort((a, b) => a.start - b.start);
}

function replaceUrl(reference, publicUrl) {
  if (reference.kind === 'markdown-reference') return `![${reference.alt}](${publicUrl})`;
  if (reference.kind === 'html') {
    return reference.raw.replace(/(\bsrc\s*=\s*)(?:"[^"]*"|'[^']*'|[^\s>]+)/i, `$1"${publicUrl}"`);
  }
  const prefixLength = reference.raw.indexOf(reference.url);
  return reference.raw.slice(0, prefixLength) + publicUrl + reference.raw.slice(prefixLength + reference.url.length);
}

async function nextDestination(directory, stem, extension, sourcePath, reserved) {
  for (let index = 1; ; index += 1) {
    const suffix = index === 1 ? '' : `-${index}`;
    const candidate = path.join(directory, `${stem}${suffix}${extension}`);
    const key = candidate.toLowerCase();
    if (reserved.has(key) && reserved.get(key) !== sourcePath) continue;
    try {
      await fs.access(candidate);
      if (path.resolve(candidate) !== path.resolve(sourcePath)) continue;
    } catch {
      // The candidate is available.
    }
    reserved.set(key, sourcePath);
    return candidate;
  }
}

export async function buildPlan(markdownPath, cwd = process.cwd()) {
  const projectRoot = path.resolve(cwd);
  const postsRoot = path.join(projectRoot, 'src', 'content', 'posts');
  const publicRoot = path.join(projectRoot, 'public');
  const postPath = path.resolve(projectRoot, markdownPath);
  if (!isInside(postsRoot, postPath) || path.extname(postPath).toLowerCase() !== '.md') {
    throw new Error('文章必须是 src/content/posts/ 下的 Markdown 文件。');
  }

  const markdown = await fs.readFile(postPath, 'utf8');
  const postSlug = safeName(path.basename(postPath, path.extname(postPath)), 'post');
  const destinationDirectory = path.join(publicRoot, 'images', postSlug);
  const movesBySource = new Map();
  const reserved = new Map();
  const replacements = [];
  const skipped = [];

  for (const reference of imageReferences(markdown)) {
    const rawUrl = reference.url.trim().replace(/\\([() ])/g, '$1');
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(rawUrl)) {
      skipped.push({ url: rawUrl, reason: '远程地址或锚点' });
      continue;
    }

    const cleanUrl = rawUrl.split(/[?#]/, 1)[0];
    let decodedUrl;
    try { decodedUrl = decodeURIComponent(cleanUrl); } catch { decodedUrl = cleanUrl; }
    const sourcePath = path.resolve(rawUrl.startsWith('/') ? publicRoot : path.dirname(postPath), decodedUrl.replace(/^\/+/, ''));
    if (!isInside(postsRoot, sourcePath) && !isInside(publicRoot, sourcePath)) {
      skipped.push({ url: rawUrl, reason: '路径超出文章目录或 public/' });
      continue;
    }

    const extension = path.extname(sourcePath).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(extension)) {
      skipped.push({ url: rawUrl, reason: '不是支持的图片格式' });
      continue;
    }

    try {
      const stat = await fs.stat(sourcePath);
      if (!stat.isFile()) throw new Error('not a file');
    } catch {
      skipped.push({ url: rawUrl, reason: '本地文件不存在' });
      continue;
    }

    let move = movesBySource.get(sourcePath);
    if (!move) {
      const fallback = safeName(path.basename(sourcePath, extension), 'image');
      const stem = safeName(reference.alt, fallback);
      const destinationPath = await nextDestination(destinationDirectory, stem, extension, sourcePath, reserved);
      const publicUrl = '/' + path.relative(publicRoot, destinationPath).split(path.sep).join('/');
      move = { sourcePath, destinationPath, publicUrl };
      movesBySource.set(sourcePath, move);
    }
    replacements.push({ ...reference, replacement: replaceUrl(reference, move.publicUrl) });
  }

  let updatedMarkdown = markdown;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    updatedMarkdown = updatedMarkdown.slice(0, replacement.start) + replacement.replacement + updatedMarkdown.slice(replacement.end);
  }

  return { postPath, destinationDirectory, moves: [...movesBySource.values()], replacements, skipped, markdown, updatedMarkdown };
}

export async function applyPlan(plan) {
  if (plan.updatedMarkdown === plan.markdown) return;
  await fs.mkdir(plan.destinationDirectory, { recursive: true });
  const completed = [];
  try {
    for (const move of plan.moves) {
      if (path.resolve(move.sourcePath) === path.resolve(move.destinationPath)) continue;
      await fs.rename(move.sourcePath, move.destinationPath);
      completed.push(move);
    }
    await fs.writeFile(plan.postPath, plan.updatedMarkdown, 'utf8');
  } catch (error) {
    for (const move of completed.reverse()) {
      try { await fs.rename(move.destinationPath, move.sourcePath); } catch { /* best-effort rollback */ }
    }
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    usage();
    process.exitCode = args.length === 0 ? 1 : 0;
    return;
  }
  const write = args.includes('--write');
  const unknownOptions = args.filter(arg => arg.startsWith('-') && arg !== '--write');
  const files = args.filter(arg => !arg.startsWith('-'));
  if (unknownOptions.length || files.length !== 1) throw new Error('请指定一篇 Markdown 文章；可选参数只有 --write。');

  const plan = await buildPlan(files[0]);
  if (plan.moves.length === 0) {
    console.log('没有找到可整理的本地图片。');
  } else {
    console.log(write ? '正在执行：' : '预演（尚未改动文件）：');
    for (const move of plan.moves) {
      console.log(`  ${path.relative(process.cwd(), move.sourcePath)} -> ${path.relative(process.cwd(), move.destinationPath)}`);
    }
    console.log(`  更新 ${path.relative(process.cwd(), plan.postPath)} 中的 ${plan.replacements.length} 处引用`);
    if (write) {
      await applyPlan(plan);
      console.log('\n完成。运行 pnpm dev，然后打开终端显示的本地地址预览。');
    } else {
      console.log('\n确认无误后，在命令末尾加 --write；完成后运行 pnpm dev 预览。');
    }
  }
  for (const item of plan.skipped) console.log(`  跳过 ${item.url}（${item.reason}）`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`错误：${error.message}`);
    process.exitCode = 1;
  });
}
