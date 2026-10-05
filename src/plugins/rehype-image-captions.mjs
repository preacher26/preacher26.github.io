import { visit } from "unist-util-visit";

/** Turn a standalone Markdown image's alt text into a visible caption. */
export function rehypeImageCaptions() {
	return (tree) => {
		visit(tree, "element", (node) => {
			if (node.tagName !== "p" || node.children?.length !== 1) return;
			const image = node.children[0];
			if (image.type !== "element" || image.tagName !== "img") return;
			const alt = image.properties?.alt;
			if (typeof alt !== "string" || !alt.trim()) return;

			node.tagName = "figure";
			node.properties = { className: ["post-image"] };
			node.children.push({
				type: "element",
				tagName: "figcaption",
				properties: {},
				children: [{ type: "text", value: alt.trim() }],
			});
		});
	};
}
