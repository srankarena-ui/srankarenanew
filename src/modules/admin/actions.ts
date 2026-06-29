"use server";

import { createClient } from "@/core/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database } from "@/core/types/database";
import type { FooterConfig } from "@/core/types/footer";
import { DEFAULT_FOOTER_CONFIG } from "@/core/config/footer-defaults";
import type { AboutConfig, ProductionConfig, ContactConfig, PastEventsConfig, FeaturedEventsConfig, HelpConfig, VerificationConfig } from "@/core/types/site-content";

export async function createTournament(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const raw = Object.fromEntries(formData.entries());

  const { data: created, error } = await supabase.from("tournaments").insert({
    title: raw.title as string,
    description: (raw.description as string) || null,
    game: raw.game as string,
    mode: (raw.mode as string) || null,
    series_format: (raw.series_format as string) || "bo1",
    max_participants: Number(raw.max_participants) || 16,
    start_date: (raw.start_date as string) || null,
    start_time: (raw.start_time as string) || null,
    rules: (raw.rules as string) || null,
    prizes: (raw.prizes as string) || null,
    region: (raw.region as string) || null,
    map: (raw.map as string) || null,
    banner_url: (raw.banner_url as string) || null,
    contact_method: (raw.contact_method as string) || null,
    reward_points: Number(raw.reward_points) || 0,
    tournament_format: (raw.tournament_format as string) || "single_elimination",
    team_size: Number(raw.team_size) || 1,
    ...(raw.trials_config
      ? { trials_config: JSON.parse(raw.trials_config as string) }
      : {}),
    created_by: user.id,
  }).select("id").single();

  if (error) return { error: error.message };

  // Link selected vault items as prizes for this tournament.
  const prizeIds = raw.prize_item_ids
    ? (JSON.parse(raw.prize_item_ids as string) as string[])
    : [];
  if (prizeIds.length) {
    await supabase.from("vault_items")
      .update({ tournament_id: created.id, status: "assigned" })
      .in("asset_id", prizeIds);
  }

  revalidatePath("/admin");
  revalidatePath("/tournaments");
  return { success: true };
}

export async function updateTournament(id: string, updates: Database["public"]["Tables"]["tournaments"]["Update"]) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tournaments")
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath(`/tournaments/${id}`);
  return { success: true };
}

// Sync which vault items are assigned as prizes for a tournament.
// Releases items no longer selected (keeping any already 'delivered').
export async function setTournamentPrizes(tournamentId: string, assetIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  let release = supabase.from("vault_items")
    .update({ tournament_id: null, status: "available" })
    .eq("tournament_id", tournamentId)
    .eq("status", "assigned");
  if (assetIds.length) release = release.not("asset_id", "in", `(${assetIds.join(",")})`);
  const { error: relErr } = await release;
  if (relErr) return { error: relErr.message };

  if (assetIds.length) {
    const { error: assignErr } = await supabase.from("vault_items")
      .update({ tournament_id: tournamentId, status: "assigned" })
      .in("asset_id", assetIds);
    if (assignErr) return { error: assignErr.message };
  }

  revalidatePath(`/tournaments/${tournamentId}`);
  return { success: true };
}

export async function deleteTournament(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tournaments").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/tournaments");
  return { success: true };
}

export async function updateUserRole(userId: string, role: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { success: true };
}

export async function createGame(formData: FormData) {
  const supabase = await createClient();

  const raw = Object.fromEntries(formData.entries());

  const { error } = await supabase.from("games").insert({
    name: raw.name as string,
    slug: (raw.slug as string).toLowerCase(),
    modes: (raw.modes as string).split(",").map((m: string) => m.trim()),
    active: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { success: true };
}

export async function deleteGame(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("games").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  return { success: true };
}

// ─── Footer config ─────────────────────────────────────────────────────────
// Run this SQL in Supabase SQL editor first (once):
//   CREATE TABLE IF NOT EXISTS public.site_config (
//     key TEXT PRIMARY KEY,
//     value JSONB NOT NULL,
//     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
//   );
//   ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY "Public read" ON public.site_config FOR SELECT USING (true);
//   CREATE POLICY "Admin write" ON public.site_config FOR ALL
//     USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','organizador')));

export async function getAdminFooterConfig(): Promise<FooterConfig> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("site_config")
      .select("value")
      .eq("key", "footer")
      .single() as { data: { value: FooterConfig } | null; error: unknown };

    if (error || !data?.value) return DEFAULT_FOOTER_CONFIG;
    return { ...DEFAULT_FOOTER_CONFIG, ...(data.value as FooterConfig) };
  } catch {
    return DEFAULT_FOOTER_CONFIG;
  }
}

export async function updateFooterConfig(config: FooterConfig): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "organizador") {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("site_config")
    .upsert({
      key: "footer",
      value: config as unknown as Database["public"]["Tables"]["site_config"]["Row"]["value"],
      updated_at: new Date().toISOString(),
    });

  if (error) {
    const msg = (error as { message?: string }).message ?? "Unknown error";
    return { error: msg };
  }

  revalidatePath("/", "layout");
  return {};
}

// ─── Generic site_config helper ───────────────────────────────────────────────
async function getSiteConfig<T>(key: string, fallback: T): Promise<T> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("site_config")
      .select("value")
      .eq("key", key)
      .single() as { data: { value: T } | null; error: unknown };
    if (error || !data?.value) return fallback;
    return { ...fallback as object, ...(data.value as object) } as T;
  } catch {
    return fallback;
  }
}

async function setSiteConfig<T>(key: string, value: T, revalidateUrl = "/"): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "organizador") return { error: "Unauthorized" };
  const { error } = await supabase
    .from("site_config")
    .upsert({
      key,
      value: value as unknown as Database["public"]["Tables"]["site_config"]["Row"]["value"],
      updated_at: new Date().toISOString(),
    });
  if (error) return { error: (error as { message?: string }).message ?? "Unknown error" };
  revalidatePath(revalidateUrl, "layout");
  return {};
}

// ─── About / Nosotros ─────────────────────────────────────────────────────────
const DEFAULT_ABOUT: AboutConfig = {
  paragraphs: [
    {
      es: "S-Rank Arena es una organización dedicada a la organización de eventos de esports en línea y presenciales, con amplia experiencia en producción y desarrollo de competencias.",
      en: "S-Rank Arena is an organization dedicated to organizing online and in-person esports events, with extensive experience in production and competitive development.",
    },
    {
      es: "Nos caracterizamos por ser una organización seria, entusiasta y profesional, ofreciendo a nuestra comunidad las mejores experiencias en materia de esports.",
      en: "We are defined by being a serious, enthusiastic, and professional organization, offering our community the best esports experiences.",
    },
  ],
  members: [],
};

export async function getAboutConfig(): Promise<AboutConfig> {
  return getSiteConfig("about", DEFAULT_ABOUT);
}

export async function updateAboutConfig(config: AboutConfig): Promise<{ error?: string }> {
  return setSiteConfig("about", config, "/about-us");
}

// ─── Production / Producción ──────────────────────────────────────────────────
const DEFAULT_PRODUCTION: ProductionConfig = {
  heading: { es: "Producción Profesional", en: "Professional Production" },
  subheading: {
    es: "Ofrecemos servicios de producción de alto nivel para eventos de esports, transmisiones en vivo y más.",
    en: "We offer high-level production services for esports events, live broadcasts, and more.",
  },
  services: [
    { id: "1", title: { es: "Transmisión en Vivo", en: "Live Broadcasting" }, description: { es: "Producción y dirección de transmisiones en vivo con calidad profesional.", en: "Production and direction of live broadcasts with professional quality." }, icon: "🎬" },
    { id: "2", title: { es: "Organización de Eventos", en: "Event Organization" }, description: { es: "Planificación y ejecución integral de torneos y eventos de esports.", en: "Comprehensive planning and execution of tournaments and esports events." }, icon: "🏆" },
    { id: "3", title: { es: "Diseño Gráfico", en: "Graphic Design" }, description: { es: "Creación de identidad visual, overlays, y materiales para tus eventos.", en: "Creation of visual identity, overlays, and materials for your events." }, icon: "🎨" },
    { id: "4", title: { es: "Community Management", en: "Community Management" }, description: { es: "Gestión de comunidades y redes sociales para organizaciones de esports.", en: "Community and social media management for esports organizations." }, icon: "📣" },
  ],
};

export async function getProductionConfig(): Promise<ProductionConfig> {
  return getSiteConfig("production", DEFAULT_PRODUCTION);
}

export async function updateProductionConfig(config: ProductionConfig): Promise<{ error?: string }> {
  return setSiteConfig("production", config, "/production");
}

// ─── Contact / Contacto ───────────────────────────────────────────────────────
const DEFAULT_CONTACT: ContactConfig = {
  heading: { es: "Contáctanos", en: "Contact Us" },
  description: {
    es: "¿Tienes un proyecto en mente? Escríbenos y cuéntanos cómo podemos ayudarte.",
    en: "Have a project in mind? Write to us and tell us how we can help you.",
  },
  email: "",
  discord: "",
  instagram: "",
  twitter: "",
  phone: "",
};

export async function getContactConfig(): Promise<ContactConfig> {
  return getSiteConfig("contact", DEFAULT_CONTACT);
}

export async function updateContactConfig(config: ContactConfig): Promise<{ error?: string }> {
  return setSiteConfig("contact", config, "/contact");
}

// ─── Past Events Carousel ─────────────────────────────────────────────────────
const DEFAULT_PAST_EVENTS: PastEventsConfig = { images: [] };

export async function getPastEventsConfig(): Promise<PastEventsConfig> {
  return getSiteConfig("past_events", DEFAULT_PAST_EVENTS);
}

export async function updatePastEventsConfig(config: PastEventsConfig): Promise<{ error?: string }> {
  return setSiteConfig("past_events", config, "/past-events");
}

// ─── Featured Events ──────────────────────────────────────────────────────────
const DEFAULT_FEATURED_EVENTS: FeaturedEventsConfig = { tournament_ids: [] };

export async function getFeaturedEventsConfig(): Promise<FeaturedEventsConfig> {
  return getSiteConfig("featured_events", DEFAULT_FEATURED_EVENTS);
}

export async function updateFeaturedEventsConfig(config: FeaturedEventsConfig): Promise<{ error?: string }> {
  return setSiteConfig("featured_events", config, "/");
}

// ─── Account verification settings ──────────────────────────────────────────
const DEFAULT_VERIFICATION_SETTINGS: VerificationConfig = {
  require_riot_verification: true,
  require_clash_royale_verification: true,
};

export async function getVerificationConfig(): Promise<VerificationConfig> {
  return getSiteConfig("verification_settings", DEFAULT_VERIFICATION_SETTINGS);
}

export async function updateVerificationConfig(config: VerificationConfig): Promise<{ error?: string }> {
  return setSiteConfig("verification_settings", config, "/");
}

// ─── Help Centre ──────────────────────────────────────────────────────────────
const DEFAULT_HELP: HelpConfig = {
  heading: { es: "Centro de Ayuda", en: "Help Centre" },
  subheading: {
    es: "Encuentra respuestas a las preguntas más frecuentes sobre S-Rank Arena.",
    en: "Find answers to the most frequently asked questions about S-Rank Arena.",
  },
  categories: [
    {
      id: "getting-started",
      title: { es: "Primeros Pasos", en: "Getting Started" },
      icon: "🚀",
      items: [
        {
          id: "register",
          question: { es: "¿Cómo me registro?", en: "How do I register?" },
          answer: {
            es: "Haz clic en 'Crear Cuenta' en la barra de navegación y completa el formulario con tu correo y contraseña.",
            en: "Click 'Create Account' in the navigation bar and complete the form with your email and password.",
          },
        },
        {
          id: "link-lol",
          question: { es: "¿Cómo vinculo mi cuenta de League of Legends?", en: "How do I link my League of Legends account?" },
          answer: {
            es: "Ve a tu perfil, luego a la sección 'Cuentas Vinculadas' y busca tu invocador por nombre y región.",
            en: "Go to your profile, then to the 'Linked Accounts' section and search for your summoner by name and region.",
          },
        },
      ],
    },
    {
      id: "tournaments",
      title: { es: "Torneos", en: "Tournaments" },
      icon: "🏆",
      items: [
        {
          id: "join",
          question: { es: "¿Cómo me uno a un torneo?", en: "How do I join a tournament?" },
          answer: {
            es: "Ve a la página de Torneos, selecciona el evento y haz clic en 'Registrarse'.",
            en: "Go to the Tournaments page, select the event and click 'Register'.",
          },
        },
      ],
    },
  ],
};

export async function getHelpConfig(): Promise<HelpConfig> {
  return getSiteConfig("help", DEFAULT_HELP);
}

export async function updateHelpConfig(config: HelpConfig): Promise<{ error?: string }> {
  return setSiteConfig("help", config, "/help");
}
