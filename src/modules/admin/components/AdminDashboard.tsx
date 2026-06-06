"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Tabs } from "@/core/ui/Tabs";
import { Button } from "@/core/ui/Button";
import { TournamentTable } from "./TournamentTable";
import { UserTable } from "./UserTable";
import { GameManager } from "./GameManager";
import { FooterManager } from "./FooterManager";
import { AboutManager } from "./AboutManager";
import { ProductionManager } from "./ProductionManager";
import { ContactManager } from "./ContactManager";
import { PastEventsManager } from "./PastEventsManager";
import { FeaturedEventsManager } from "./FeaturedEventsManager";
import { HelpManager } from "./HelpManager";
import { VerificationSettingsManager } from "./VerificationSettingsManager";
import type { Tournament, Profile, Game } from "@/core/types";
import type { FooterConfig } from "@/core/types/footer";
import type { AboutConfig, ProductionConfig, ContactConfig, PastEventsConfig, FeaturedEventsConfig, HelpConfig, VerificationConfig } from "@/core/types/site-content";
import Link from "next/link";

interface AdminDashboardProps {
  tournaments: Tournament[];
  users: Profile[];
  games: Game[];
  footerConfig: FooterConfig;
  aboutConfig: AboutConfig;
  productionConfig: ProductionConfig;
  contactConfig: ContactConfig;
  pastEventsConfig: PastEventsConfig;
  featuredEventsConfig: FeaturedEventsConfig;
  helpConfig: HelpConfig;
  verificationConfig: VerificationConfig;
}

const TABS = ["events", "users", "games", "verification", "featured-events", "past-events", "about", "production", "contact", "footer", "help"] as const;

export function AdminDashboard({ tournaments, users, games, footerConfig, aboutConfig, productionConfig, contactConfig, pastEventsConfig, featuredEventsConfig, helpConfig, verificationConfig }: AdminDashboardProps) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<string>("events");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl uppercase italic tracking-tighter text-white">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
        </div>
        <Link href={`/${locale}/admin/create-tournament`}>
          <Button>+ {t("createTournament")}</Button>
        </Link>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t("totalTournaments"), value: tournaments.length },
          { label: t("totalUsers"), value: users.length },
          { label: t("activeGames"), value: games.filter((g) => g.active !== false).length },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-gray-800/50 bg-[#121620] p-4 text-center"
          >
            <p className="text-2xl text-[var(--color-accent)]">{stat.value}</p>
            <p className="text-[9px] font-bold text-gray-500">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <Tabs
        tabs={TABS.map((tab) => ({ id: tab, label: t(tab) }))}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "events" && <TournamentTable tournaments={tournaments} />}
      {activeTab === "users" && <UserTable users={users} />}
      {activeTab === "games" && <GameManager games={games} />}
      {activeTab === "verification" && <VerificationSettingsManager initialConfig={verificationConfig} />}
      {activeTab === "featured-events" && <FeaturedEventsManager initialConfig={featuredEventsConfig} tournaments={tournaments} />}
      {activeTab === "past-events" && <PastEventsManager initialConfig={pastEventsConfig} />}
      {activeTab === "about" && <AboutManager initialConfig={aboutConfig} />}
      {activeTab === "production" && <ProductionManager initialConfig={productionConfig} />}
      {activeTab === "contact" && <ContactManager initialConfig={contactConfig} />}
      {activeTab === "footer" && <FooterManager initialConfig={footerConfig} />}
      {activeTab === "help" && <HelpManager initialConfig={helpConfig} />}
    </div>
  );
}
