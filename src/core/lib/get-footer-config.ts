import { unstable_cache } from "next/cache";
import { createClient } from "@/core/supabase/server";
import { DEFAULT_FOOTER_CONFIG } from "@/core/config/footer-defaults";
import type { FooterConfig } from "@/core/types/footer";

async function fetchFooterConfig(): Promise<FooterConfig> {
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

// Cache for 5 minutes — revalidated when admin saves footer via the tag "footer-config"
export const getFooterConfig = unstable_cache(
  fetchFooterConfig,
  ["footer-config"],
  { revalidate: 300, tags: ["footer-config"] }
);
