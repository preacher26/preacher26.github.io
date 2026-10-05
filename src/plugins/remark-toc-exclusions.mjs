/** Record the indexes of headings nested in blockquotes so the page TOC can omit them. */
export function remarkTocExclusions() {
	return (tree, file) => {
		const excluded = [];
		let headingIndex = 0;

		function walk(node, insideBlockquote = false) {
			const inQuote = insideBlockquote || node.type === "blockquote";
			if (node.type === "heading") {
				if (inQuote) excluded.push(headingIndex);
				headingIndex += 1;
			}
			for (const child of node.children || []) walk(child, inQuote);
		}

		walk(tree);
		file.data.astro.frontmatter.tocExcludedHeadingIndexes = excluded;
	};
}
