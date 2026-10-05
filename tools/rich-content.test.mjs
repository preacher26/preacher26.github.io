import assert from "node:assert/strict";
import test from "node:test";

import { rehypeImageCaptions } from "../src/plugins/rehype-image-captions.mjs";
import { remarkRichContent } from "../src/plugins/remark-rich-content.mjs";

test("Bilibili links become lazy non-autoplay players", () => {
	const tree = {
		type: "root",
		children: [{
			type: "paragraph",
			children: [{ type: "text", value: "【测试视频】 https://www.bilibili.com/video/BV1M8ar62EuV/" }],
		}],
	};
	remarkRichContent()(tree);
	const html = tree.children[0].value;
	assert.match(html, /player\.bilibili\.com/);
	assert.match(html, /autoplay=0/);
	assert.match(html, />测试视频<\/a>/);
});

test("standalone GitHub repository links become native Fuwari directives", () => {
	const tree = {
		type: "root",
		children: [{
			type: "paragraph",
			children: [{ type: "text", value: "https://github.com/preacher26/Real-ESRGAN" }],
		}],
	};
	remarkRichContent()(tree);
	assert.equal(tree.children[0].type, "leafDirective");
	assert.deepEqual(tree.children[0].attributes, { repo: "preacher26/Real-ESRGAN" });
});

test("standalone images use alt text as a visible caption", () => {
	const tree = {
		type: "root",
		children: [{
			type: "element",
			tagName: "p",
			properties: {},
			children: [{ type: "element", tagName: "img", properties: { src: "/image.png", alt: "说明文字" }, children: [] }],
		}],
	};
	rehypeImageCaptions()(tree);
	assert.equal(tree.children[0].tagName, "figure");
	assert.equal(tree.children[0].children[1].children[0].value, "说明文字");
});
