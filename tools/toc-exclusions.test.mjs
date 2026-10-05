import assert from "node:assert/strict";
import test from "node:test";

import { remarkTocExclusions } from "../src/plugins/remark-toc-exclusions.mjs";

test("headings nested in blockquotes are excluded from the article TOC", () => {
	const tree = {
		type: "root",
		children: [
			{ type: "heading", depth: 2, children: [{ type: "text", value: "正文标题" }] },
			{
				type: "blockquote",
				children: [
					{ type: "heading", depth: 2, children: [{ type: "text", value: "引用标题" }] },
					{
						type: "blockquote",
						children: [{ type: "heading", depth: 3, children: [{ type: "text", value: "嵌套引用标题" }] }],
					},
				],
			},
			{ type: "heading", depth: 3, children: [{ type: "text", value: "另一个正文标题" }] },
		],
	};
	const file = { data: { astro: { frontmatter: {} } } };
	remarkTocExclusions()(tree, file);
	assert.deepEqual(file.data.astro.frontmatter.tocExcludedHeadingIndexes, [1, 2]);
});
