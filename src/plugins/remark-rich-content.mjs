import { toString } from "mdast-util-to-string";
import { visit } from "unist-util-visit";

const BILIBILI_URL = /https?:\/\/(?:www\.)?bilibili\.com\/video\/(BV[0-9A-Za-z]+)/i;
const BILIBILI_TAG = /^\s*\{%\s*bilibili\s+(BV[0-9A-Za-z]+)(?:\s+(.+?))?\s*%\}\s*$/i;
const GITHUB_REPOSITORY = /^https?:\/\/(?:www\.)?github\.com\/([^/?#]+)\/([^/?#]+?)(?:\.git)?\/?(?:[?#].*)?$/i;

function escapeHtml(value) {
	return String(value)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function cleanTitle(value) {
	return value
		.replace(/[\/\s]+$/, "")
		.replace(/^\s*[【\[（(]\s*/, "")
		.replace(/\s*[】\]）)]\s*$/, "")
		.trim();
}

function bilibiliEmbed(bvid, title = "") {
	const safeId = escapeHtml(bvid);
	const safeTitle = escapeHtml(title || `Bilibili 视频 ${bvid}`);
	const player = `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(bvid)}&amp;p=1&amp;poster=1&amp;autoplay=0&amp;high_quality=1&amp;danmaku=0`;
	return `<figure class="rich-embed rich-embed-bilibili">
<div class="rich-embed-frame"><iframe src="${player}" title="${safeTitle}" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
<figcaption><a href="https://www.bilibili.com/video/${safeId}/" target="_blank" rel="noopener noreferrer">${safeTitle}</a></figcaption>
</figure>`;
}

/** Preserve the convenient rich-link behavior used by the former Hexo site. */
export function remarkRichContent() {
	return (tree) => {
		visit(tree, "paragraph", (node, index, parent) => {
			if (index === undefined || !parent) return;
			const text = toString(node).trim();
			const tag = BILIBILI_TAG.exec(text);
			if (tag) {
				parent.children[index] = { type: "html", value: bilibiliEmbed(tag[1], tag[2] || "") };
				return;
			}

			const bilibili = BILIBILI_URL.exec(text);
			if (bilibili) {
				const remainder = text.replace(bilibili[0], "").trim();
				if (remainder.length <= 200) {
					parent.children[index] = {
						type: "html",
						value: bilibiliEmbed(bilibili[1], cleanTitle(remainder)),
					};
				}
				return;
			}

			const github = GITHUB_REPOSITORY.exec(text);
			if (github) {
				parent.children[index] = {
					type: "leafDirective",
					name: "github",
					attributes: { repo: `${github[1]}/${github[2]}` },
					children: [],
				};
			}
		});
	};
}
