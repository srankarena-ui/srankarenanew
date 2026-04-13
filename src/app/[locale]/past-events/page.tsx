import { createClient } from "@/core/supabase/server";
import { getPastEventsConfig } from "@/modules/admin/actions";
import { ImageCarousel } from "@/modules/landing/components/ImageCarousel";

const STATUS_LABEL_ES: Record<string, string> = {
  completed: "Completado",
  active: "Activo",
  upcoming: "Próximamente",
};
const STATUS_LABEL_EN: Record<string, string> = {
  completed: "Completed",
  active: "Active",
  upcoming: "Upcoming",
};

export default async function PastEventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = (locale === "en" ? "en" : "es") as "es" | "en";
  const STATUS_LABEL = lang === "en" ? STATUS_LABEL_EN : STATUS_LABEL_ES;
  const supabase = await createClient();
  const pastEventsConfig = await getPastEventsConfig();

  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, title, game, mode, start_date, max_participants, banner_url, status, reward_points")
    .in("status", ["completed", "active"])
    .order("start_date", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      {/* Heading */}
      <div className="mb-12 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-700/30 bg-purple-900/20 px-4 py-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-purple-500" />
          <span className="text-[9px] font-black uppercase tracking-widest text-purple-400">
            Track Record
          </span>
        </div>
        <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">
          {lang === "en" ? "Past Events" : "Eventos Realizados"}
        </h1>
        <div className="mx-auto mt-3 h-1 w-20 rounded-full bg-purple-600" />
        <p className="mx-auto mt-6 max-w-xl text-sm text-gray-400">
          {lang === "en"
            ? "Tournaments and events successfully completed by S-Rank Arena."
            : "Torneos y eventos completados exitosamente por S-Rank Arena."}
        </p>
      </div>

      {/* Photo carousel */}
      {pastEventsConfig.images.length > 0 && (
        <div className="mb-14">
          <ImageCarousel images={pastEventsConfig.images} />
        </div>
      )}

      {/* Counter */}
      {tournaments && tournaments.length > 0 && (
        <div className="mb-10 flex justify-center gap-10">
          <div className="text-center">
            <p className="text-4xl font-black text-purple-400">{tournaments.length}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">{lang === "en" ? "Events" : "Eventos"}</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-black text-purple-400">
              {tournaments.reduce((acc, t) => acc + (t.max_participants ?? 0), 0)}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">{lang === "en" ? "Participants" : "Participantes"}</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-black text-purple-400">
              {[...new Set(tournaments.map((t) => t.game))].length}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500">{lang === "en" ? "Games" : "Juegos"}</p>
          </div>
        </div>
      )}

      {/* Events grid */}
      {tournaments && tournaments.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <a
              key={t.id}
              href={`./tournaments/${t.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-gray-800/60 bg-[#121620] transition-all hover:border-purple-800/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.1)]"
            >
              {/* Banner */}
              {t.banner_url ? (
                <img
                  src={t.banner_url}
                  alt={t.title}
                  className="h-36 w-full object-cover"
                />
              ) : (
                <div className="flex h-36 items-center justify-center bg-gradient-to-br from-purple-900/30 to-[#0b0e14]">
                  <span className="text-4xl">🏆</span>
                </div>
              )}

              <div className="flex flex-1 flex-col gap-2 p-5">
                {/* Status badge */}
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-0.5 text-[8px] font-black uppercase tracking-widest ${
                    t.status === "completed"
                      ? "bg-green-900/40 text-green-400"
                      : "bg-purple-900/40 text-purple-400"
                  }`}>
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                  {t.start_date && (
                    <span className="text-[9px] text-gray-600">
                      {new Date(t.start_date).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>

                <h3 className="font-black uppercase tracking-tight text-white group-hover:text-purple-300 transition-colors">
                  {t.title}
                </h3>

                <div className="mt-auto flex items-center gap-3 pt-2">
                  <span className="rounded-lg bg-gray-800 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                    {t.game}
                  </span>
                  {t.mode && (
                    <span className="rounded-lg bg-gray-800 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      {t.mode}
                    </span>
                  )}
                  <span className="ml-auto text-[9px] font-bold text-gray-600">
                    {t.max_participants} {lang === "en" ? "players" : "jugadores"}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-800 bg-[#121620] p-16 text-center">
          <p className="text-gray-500">{lang === "en" ? "No events registered yet." : "No hay eventos registrados aún."}</p>
        </div>
      )}
    </div>
  );
}
