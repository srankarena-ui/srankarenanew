export interface LocalizedString {
  es: string;
  en: string;
}

export interface TeamMember {
  id: string;
  name: string;
  nickname: string;
  role: string;
  photo_url: string;
}

export interface AboutConfig {
  paragraphs: LocalizedString[];
  members: TeamMember[];
}

export interface ProductionService {
  id: string;
  title: LocalizedString;
  description: LocalizedString;
  icon: string; // emoji or icon name
}

export interface ProductionConfig {
  heading: LocalizedString;
  subheading: LocalizedString;
  services: ProductionService[];
}

export interface ContactConfig {
  heading: LocalizedString;
  description: LocalizedString;
  email: string;
  discord: string;
  instagram: string;
  twitter: string;
  phone: string;
}

export interface PastEventsImage {
  id: string;
  url: string;
  caption?: string;
}

export interface PastEventsConfig {
  images: PastEventsImage[];
}

export interface FeaturedEventsConfig {
  tournament_ids: string[];
}

export interface VerificationConfig {
  require_riot_verification: boolean;
  require_clash_royale_verification: boolean;
}

export interface HelpFaqItem {
  id: string;
  question: LocalizedString;
  answer: LocalizedString;
}

export interface HelpCategory {
  id: string;
  title: LocalizedString;
  icon: string; // emoji
  items: HelpFaqItem[];
}

export interface HelpConfig {
  heading: LocalizedString;
  subheading: LocalizedString;
  categories: HelpCategory[];
}
