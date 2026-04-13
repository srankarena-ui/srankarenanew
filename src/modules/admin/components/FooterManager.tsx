"use client";

import { useState } from "react";
import { Button } from "@/core/ui/Button";
import { Input } from "@/core/ui/Input";
import { Card } from "@/core/ui/Card";
import { useToast } from "@/core/ui/Toast";
import { updateFooterConfig } from "@/modules/admin/actions";
import type { FooterConfig, FooterSection, FooterLink, SocialLink, SocialPlatform } from "@/core/types/footer";

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  "discord",
  "twitter",
  "instagram",
  "twitch",
  "youtube",
  "facebook",
  "tiktok",
];

interface FooterManagerProps {
  initialConfig: FooterConfig;
}

export function FooterManager({ initialConfig }: FooterManagerProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<FooterConfig>(initialConfig);
  const [saving, setSaving] = useState(false);

  // ─── Sections ───────────────────────────────────────────────────────────────
  function updateSectionTitle(idx: number, title: string) {
    const sections = config.sections.map((s, i) =>
      i === idx ? { ...s, title } : s
    );
    setConfig({ ...config, sections });
  }

  function addSection() {
    setConfig({
      ...config,
      sections: [...config.sections, { title: "New Section", links: [] }],
    });
  }

  function removeSection(idx: number) {
    setConfig({ ...config, sections: config.sections.filter((_, i) => i !== idx) });
  }

  // ─── Links ──────────────────────────────────────────────────────────────────
  function updateLink(sectionIdx: number, linkIdx: number, field: keyof FooterLink, value: string) {
    const sections = config.sections.map((s, si) => {
      if (si !== sectionIdx) return s;
      const links = s.links.map((l, li) =>
        li === linkIdx ? { ...l, [field]: value } : l
      );
      return { ...s, links };
    });
    setConfig({ ...config, sections });
  }

  function addLink(sectionIdx: number) {
    const sections = config.sections.map((s, si) => {
      if (si !== sectionIdx) return s;
      return { ...s, links: [...s.links, { label: "", href: "" }] };
    });
    setConfig({ ...config, sections });
  }

  function removeLink(sectionIdx: number, linkIdx: number) {
    const sections = config.sections.map((s, si) => {
      if (si !== sectionIdx) return s;
      return { ...s, links: s.links.filter((_, li) => li !== linkIdx) };
    });
    setConfig({ ...config, sections });
  }

  // ─── Social ──────────────────────────────────────────────────────────────────
  function updateSocialHref(platform: SocialPlatform, href: string) {
    const social = config.social.map((s) =>
      s.platform === platform ? { ...s, href } : s
    );
    // Add if not present
    if (!social.find((s) => s.platform === platform)) {
      social.push({ platform, href });
    }
    setConfig({ ...config, social });
  }

  function getSocialHref(platform: SocialPlatform) {
    return config.social.find((s) => s.platform === platform)?.href ?? "";
  }

  // ─── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    const result = await updateFooterConfig(config);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Footer saved successfully", "success");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black uppercase italic tracking-tighter text-white">
            Footer Configuration
          </h2>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Manage footer links and social media
          </p>
        </div>
        <Button onClick={handleSave} isLoading={saving}>
          Save Footer
        </Button>
      </div>

      {/* Link Sections */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">
            Link Sections
          </h3>
          <button
            type="button"
            onClick={addSection}
            className="rounded-lg border border-dashed border-purple-700 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-purple-400 transition-colors hover:bg-purple-900/20"
          >
            + Add Section
          </button>
        </div>

        <div className="space-y-5">
          {config.sections.map((section, si) => (
            <div
              key={si}
              className="rounded-xl border border-gray-800 bg-[#0b0e14] p-4"
            >
              <div className="mb-3 flex items-center gap-3">
                <input
                  value={section.title}
                  onChange={(e) => updateSectionTitle(si, e.target.value)}
                  placeholder="Section title"
                  className="flex-1 rounded-lg border border-gray-700 bg-transparent px-3 py-1.5 text-sm font-bold text-white outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => removeSection(si)}
                  className="text-[9px] font-bold uppercase tracking-widest text-red-500 hover:text-red-400"
                >
                  Remove
                </button>
              </div>

              <div className="space-y-2">
                {section.links.map((link, li) => (
                  <div key={li} className="flex items-center gap-2">
                    <input
                      value={link.label}
                      onChange={(e) => updateLink(si, li, "label", e.target.value)}
                      placeholder="Label"
                      className="w-32 rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-[11px] text-gray-200 outline-none focus:border-purple-500"
                    />
                    <input
                      value={link.href}
                      onChange={(e) => updateLink(si, li, "href", e.target.value)}
                      placeholder="https://..."
                      className="flex-1 rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-[11px] text-gray-200 outline-none focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeLink(si, li)}
                      className="text-gray-600 hover:text-red-400"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addLink(si)}
                  className="mt-1 text-[9px] font-bold uppercase tracking-widest text-gray-600 hover:text-purple-400"
                >
                  + Add Link
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Social Media */}
      <Card>
        <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-white">
          Social Media Links
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {SOCIAL_PLATFORMS.map((platform) => (
            <div key={platform} className="flex items-center gap-3">
              <span className="w-20 text-[9px] font-bold uppercase tracking-widest text-gray-400 capitalize">
                {platform}
              </span>
              <input
                value={getSocialHref(platform)}
                onChange={(e) => updateSocialHref(platform, e.target.value)}
                placeholder={`https://${platform}.com/...`}
                className="flex-1 rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-[11px] text-gray-200 outline-none focus:border-purple-500"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Copyright */}
      <Card>
        <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-white">
          Copyright Text
        </h3>
        <input
          value={config.copyright}
          onChange={(e) => setConfig({ ...config, copyright: e.target.value })}
          placeholder="© 2026 S-Rank Arena. All rights reserved."
          className="w-full rounded-lg border border-gray-800 bg-gray-900 px-4 py-2.5 text-sm text-gray-200 outline-none focus:border-purple-500"
        />
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} isLoading={saving}>
          Save Footer
        </Button>
      </div>
    </div>
  );
}
