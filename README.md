# Preacher's Blog

基于 Hexo 与 Vivia 主题的个人博客。

## 本地使用

```bash
pnpm install
pnpm dev
```

生产构建：

```bash
pnpm build
```

文章放在 `source/_posts/`，也可以运行：

```bash
pnpm exec hexo new "文章标题"
```

推送到 `main` 后，`.github/workflows/pages.yml` 会构建并发布 GitHub Pages。
