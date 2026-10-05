import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { applyPlan, buildPlan, safeName } from './organize-post-images.mjs';

test('safeName keeps readable Unicode while removing unsafe characters', () => {
  assert.equal(safeName('租卡好贵……'), '租卡好贵');
  assert.equal(safeName('CON'), 'image');
  assert.equal(safeName('  a/b: c  '), 'a-b-c');
});

test('buildPlan handles Markdown, reference and HTML images but skips code and remote URLs', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'astro-images-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const posts = path.join(root, 'src', 'content', 'posts');
  await fs.mkdir(posts, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(posts, 'image.png'), 'one'),
    fs.writeFile(path.join(posts, 'second.PNG'), 'two'),
    fs.writeFile(path.join(posts, 'third.jpg'), 'three')
  ]);
  const markdown = `---
title: Test
cover: "![do-not-touch](second.PNG)"
---

![First / image](image.png)
![Reference][hero]
<img class="wide" alt="HTML 图" src="third.jpg">
![Remote](https://example.com/a.png)

\`![Inline code](second.PNG)\`

\`\`\`md
![Fence](second.PNG)
\`\`\`

[hero]: second.PNG "title"
`;
  const postPath = path.join(posts, 'Hello World.md');
  await fs.writeFile(postPath, markdown);

  const plan = await buildPlan(path.relative(root, postPath), root);
  assert.equal(plan.moves.length, 3);
  assert.match(plan.updatedMarkdown, /!\[First \/ image\]\(\/images\/hello-world\/first-image\.png\)/);
  assert.match(plan.updatedMarkdown, /!\[Reference\]\(\/images\/hello-world\/reference\.png\)/);
  assert.match(plan.updatedMarkdown, /alt="HTML 图" src="\/images\/hello-world\/html-图\.jpg"/);
  assert.match(plan.updatedMarkdown, /`!\[Inline code\]\(second\.PNG\)`/);
  assert.match(plan.updatedMarkdown, /!\[Fence\]\(second\.PNG\)/);

  await applyPlan(plan);
  await assert.rejects(fs.access(path.join(posts, 'image.png')));
  assert.equal(await fs.readFile(path.join(root, 'public', 'images', 'hello-world', 'first-image.png'), 'utf8'), 'one');
});
