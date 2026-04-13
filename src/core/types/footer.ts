export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

export type SocialPlatform =
  | "discord"
  | "twitter"
  | "instagram"
  | "twitch"
  | "youtube"
  | "facebook"
  | "tiktok";

export interface SocialLink {
  platform: SocialPlatform;
  href: string;
}

export interface FooterConfig {
  sections: FooterSection[];
  social: SocialLink[];
  copyright: string;
}
