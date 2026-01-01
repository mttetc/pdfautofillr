export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "PDF AutoFillr",
  description: "AI-powered PDF Autofill tool",
  navItems: [
    {
      label: "Home",
      href: "/",
    },
    {
      label: "History",
      href: "/history",
    },
    {
      label: "Settings",
      href: "/settings",
    },
  ],
  navMenuItems: [
    {
      label: "Home",
      href: "/",
    },
    {
      label: "History",
      href: "/history",
    },
    {
      label: "Settings",
      href: "/settings",
    },
    {
      label: "Logout",
      href: "/logout",
    },
  ],
  links: {
    github: "https://github.com/heroui-inc/heroui", // Keep as placeholder or update if user provides repo
    twitter: "https://twitter.com/hero_ui", // Keep as placeholder
    docs: "https://heroui.com", // Keep as placeholder
    discord: "https://discord.gg/9b6yyZKmH4", // Keep as placeholder
    sponsor: "https://patreon.com/jrgarciadev", // Keep as placeholder
  },
};
