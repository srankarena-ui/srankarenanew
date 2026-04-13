import type { FooterConfig } from "@/core/types/footer";

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  sections: [
    {
      title: "S-Rank Arena",
      links: [
        { label: "About", href: "#" },
        { label: "Contact", href: "#" },
      ],
    },
    {
      title: "Legal & Privacy",
      links: [
        { label: "Terms of Service", href: "#" },
        { label: "Privacy Policy", href: "#" },
        { label: "Cookie Policy", href: "#" },
      ],
    },
  ],
  social: [
    { platform: "discord", href: "#" },
    { platform: "twitter", href: "#" },
    { platform: "instagram", href: "#" },
    { platform: "twitch", href: "#" },
    { platform: "youtube", href: "#" },
  ],
  copyright: "© 2026 S-Rank Arena. All rights reserved.",
};
