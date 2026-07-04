import type { FooterConfig } from "@/core/types/footer";

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  sections: [
    {
      title: "S-Rank Arena",
      links: [
        { label: "About", href: "/about-us" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Legal & Privacy",
      links: [
        { label: "Terms of Service", href: "/terms" },
        { label: "Privacy Policy", href: "/privacy" },
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
