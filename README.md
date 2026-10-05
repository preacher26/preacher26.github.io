# Preacher26 Blog

基于 [Astro](https://astro.build/) 与 [Fuwari](https://github.com/saicaca/fuwari) 的个人博客。

## 本地开发

需要 Node.js 22。项目固定使用 pnpm 9.14.4；如果系统里没有全局 `pnpm`，直接通过 Corepack 运行：

```powershell
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

常用命令：

```powershell
corepack pnpm check
corepack pnpm test
corepack pnpm build
corepack pnpm preview
```

文章位于 `src/content/posts/`，静态资源位于 `public/`。带有 `draft: true` 的文章仅在开发模式显示，不会进入正式构建。

文章封面可以同时填写署名；没有来源链接时省略 `imageCreditUrl`：

```yaml
image: /images/example/cover.jpg
imageCredit: 画师：作者名
# imageCreditUrl: https://example.com/source
```

## 发布文章

1. 创建一篇默认处于草稿状态的文章：

   ```powershell
   corepack pnpm new-post -- my-post
   ```

2. 编辑 `src/content/posts/my-post.md`，在本地预览：

   ```powershell
   corepack pnpm dev
   ```

3. 如果文章包含刚粘贴到文章目录的图片，先预演并整理：

   ```powershell
   corepack pnpm post:images -- src/content/posts/my-post.md
   corepack pnpm post:images -- src/content/posts/my-post.md --write
   ```

4. 发布前将文章头部的 `draft: true` 改为 `draft: false`，再执行检查：

   ```powershell
   corepack pnpm test
   corepack pnpm check
   corepack pnpm build
   corepack pnpm preview
   ```

5. 提交并推送到 `main`。GitHub Actions 会构建并发布 `dist/`；首次使用新仓库时，需要在 GitHub 的 **Settings → Pages → Source** 中选择 **GitHub Actions**。

## 整理文章图片

先预演，确认文件名和目标位置，再写入：

```powershell
corepack pnpm post:images -- src/content/posts/example.md
corepack pnpm post:images -- src/content/posts/example.md --write
```

脚本识别 Markdown 图片、引用式图片和 HTML `<img>`，以 alt 文本生成安全文件名，将图片移动到 `public/images/<文章名>/` 并更新文章链接。远程图片与代码块中的示例不会改动。

## 富内容

- GitHub 仓库卡片：单独一行粘贴仓库 URL，或使用 `::github{repo="owner/repo"}`。
- Bilibili 播放器：单独一行粘贴视频 URL，或使用 `{% bilibili BV号 可选标题 %}`。播放器明确设置 `autoplay=0`。
- 提示框：支持 `> [!WARNING]` 等 GitHub 风格语法，也支持 Fuwari 的 `:::warning` 指令。
- 数学公式：行内使用 `$...$`，块级使用 `$$...$$`。
- 图片说明：单独成段的 Markdown 图片会把 alt 文本显示为小字说明。

## 迁移存档

`legacy/hexo/` 保存迁移前的 Hexo 配置、渲染脚本和样式，仅用于参考，不参与 Astro 构建。旧代码块样式也只在这里备份，Fuwari 使用其原生 Expressive Code 样式。
