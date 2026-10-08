import type {
	ExpressiveCodeConfig,
	FriendLinksConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "Preacher26",
	subtitle: "",
	lang: "zh_CN", // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
	themeColor: {
		hue: 250, // Vivia 原先使用的浅蓝色。
		fixed: true,
	},
	banner: {
		enable: true,
		src: "/images/banner.jpg", // Relative to the /public directory.
		position: "center", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
		credit: {
			enable: false,
			text: "",
			url: "",
		},
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	favicon: [{ src: "/images/favicon.png" }],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		LinkPreset.About,
		{
			name: "友链",
			url: "/friends/",
		},
	],
};

export const friendLinksConfig: FriendLinksConfig = {
	links: [
		{
			name: "信号",
			url: "https://krgm.moe/",
		},
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "/images/avatar.webp",
	name: "Preacher26",
	bio: "",
	links: [
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/preacher26",
		},
		{
			name: "Bilibili",
			icon: "fa6-brands:bilibili",
			url: "https://space.bilibili.com/340224618",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: false,
	name: "",
	url: "",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};
