"use client";

import { useState, useEffect } from "react";
import { getHelpConfig } from "@/modules/admin/actions";
import type { HelpConfig, HelpCategory } from "@/core/types/site-content";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-800/60 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-bold text-white">{question}</span>
        <span className="shrink-0 text-purple-400">
          <ChevronIcon open={open} />
        </span>
      </button>
      {open && (
        <p className="pb-4 text-sm leading-relaxed text-gray-400">{answer}</p>
      )}
    </div>
  );
}

function CategorySection({ category, lang }: { category: HelpCategory; lang: "es" | "en" }) {
  return (
    <div className="rounded-2xl border border-gray-800/50 bg-[#121620] p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-2xl">{category.icon}</span>
        <h2 className="text-base font-black uppercase tracking-widest text-white">
          {category.title[lang]}
        </h2>
      </div>
      <div>
        {category.items.map((item) => (
          <FaqItem
            key={item.id}
            question={item.question[lang]}
            answer={item.answer[lang]}
          />
        ))}
        {category.items.length === 0 && (
          <p className="py-2 text-sm text-gray-600">
            {lang === "en" ? "No articles yet." : "Sin artículos aún."}
          </p>
        )}
      </div>
    </div>
  );
}

export default function HelpPage({ params }: { params: Promise<{ locale: string }> }) {
  const [config, setConfig] = useState<HelpConfig | null>(null);
  const [lang, setLang] = useState<"es" | "en">("es");
  const [search, setSearch] = useState("");

  useEffect(() => {
    params.then(({ locale }) => setLang(locale === "en" ? "en" : "es"));
  }, [params]);

  useEffect(() => {
    getHelpConfig().then(setConfig);
  }, []);

  if (!config) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
          {lang === "en" ? "Loading..." : "Cargando..."}
        </p>
      </div>
    );
  }

  const filtered = config.categories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.question[lang].toLowerCase().includes(search.toLowerCase()) ||
          item.answer[lang].toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((cat) => search === "" || cat.items.length > 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">
          {config.heading[lang]}
        </h1>
        <div className="mx-auto mt-3 h-1 w-20 rounded-full bg-purple-600" />
        <p className="mx-auto mt-4 max-w-xl text-sm text-gray-400">
          {config.subheading[lang]}
        </p>
      </div>

      {/* Search */}
      <div className="mb-10">
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === "en" ? "Search for answers…" : "Buscar respuestas…"}
            className="w-full rounded-2xl border border-gray-800 bg-[#121620] py-3 pl-11 pr-4 text-sm text-gray-200 outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-6">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-gray-800/50 bg-[#121620] p-12 text-center">
            <p className="text-sm text-gray-600">
              {lang === "en" ? "No results found." : "Sin resultados."}
            </p>
          </div>
        ) : (
          filtered.map((cat) => (
            <CategorySection key={cat.id} category={cat} lang={lang} />
          ))
        )}
      </div>

      {/* Contact CTA */}
      <div className="mt-12 rounded-2xl border border-purple-800/30 bg-purple-900/10 p-8 text-center">
        <p className="text-sm font-bold text-white">
          {lang === "en" ? "Still have questions?" : "¿Todavía tienes preguntas?"}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          {lang === "en"
            ? "Reach out to us through our contact page or Discord."
            : "Contáctanos a través de nuestra página de contacto o Discord."}
        </p>
        <a
          href={`/${lang}/contact`}
          className="mt-4 inline-block rounded-xl bg-purple-600 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:bg-purple-500 transition-colors"
        >
          {lang === "en" ? "Contact Us" : "Contáctanos"}
        </a>
      </div>
    </div>
  );
}
