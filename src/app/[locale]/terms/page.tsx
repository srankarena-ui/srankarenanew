import { LegalDoc } from "@/modules/legal/LegalDoc";

export const metadata = { title: "Términos de Servicio · S-Rank Arena" };

const CONTACT = "srankarena@gmail.com";

const ES = {
  title: "Términos de Servicio",
  updated: "Última actualización: 4 de julio de 2026",
  sections: [
    { heading: "1. Aceptación", body: [
      "Al crear una cuenta o usar S-Rank Arena (\"la Plataforma\", accesible en srankarena.com) aceptas estos Términos de Servicio. Si no estás de acuerdo, no uses la Plataforma.",
    ]},
    { heading: "2. Descripción del servicio", body: [
      "S-Rank Arena es una plataforma de torneos de esports que permite registrarte, vincular cuentas de juego (League of Legends, Dota 2, Clash Royale, entre otros), participar en torneos y consultar estadísticas.",
    ]},
    { heading: "3. Cuentas", body: [
      "Eres responsable de mantener la seguridad de tu cuenta y de toda la actividad realizada con ella. Debes proporcionar información veraz. Puedes registrarte con correo, Google o Discord.",
      "Nos reservamos el derecho de suspender o eliminar cuentas que incumplan estos términos.",
    ]},
    { heading: "4. Conducta", body: [
      "No debes usar la Plataforma para actividades ilegales, hacer trampa, suplantar a otros, abusar de las APIs, ni interferir con el funcionamiento del servicio.",
    ]},
    { heading: "5. Cuentas de juego de terceros", body: [
      "La vinculación con cuentas de Riot Games, Steam/Dota 2 y Supercell se realiza a través de sus APIs oficiales y está sujeta a los términos de cada proveedor. No estamos afiliados ni respaldados por ellos.",
    ]},
    { heading: "6. Premios", body: [
      "Algunos torneos otorgan premios en forma de objetos de juego (por ejemplo, cosméticos de Dota 2) donados a la comunidad. Los premios se entregan mediante intercambios de Steam, sujetos a disponibilidad y a las reglas de cada torneo. Los objetos no tienen valor monetario garantizado.",
    ]},
    { heading: "7. Propiedad intelectual", body: [
      "Las marcas, logos y contenidos de los juegos pertenecen a sus respectivos dueños. El contenido propio de S-Rank Arena no puede reproducirse sin autorización.",
    ]},
    { heading: "8. Limitación de responsabilidad", body: [
      "La Plataforma se ofrece \"tal cual\", sin garantías. No nos hacemos responsables por daños derivados del uso del servicio, interrupciones, ni por la disponibilidad de las APIs de terceros.",
    ]},
    { heading: "9. Cambios", body: [
      "Podemos actualizar estos términos. El uso continuado tras los cambios implica su aceptación.",
    ]},
    { heading: "10. Contacto", body: [
      `Para consultas sobre estos términos, escríbenos a ${CONTACT}.`,
    ]},
  ],
};

const EN = {
  title: "Terms of Service",
  updated: "Last updated: July 4, 2026",
  sections: [
    { heading: "1. Acceptance", body: [
      "By creating an account or using S-Rank Arena (\"the Platform\", at srankarena.com) you agree to these Terms of Service. If you do not agree, do not use the Platform.",
    ]},
    { heading: "2. Service description", body: [
      "S-Rank Arena is an esports tournament platform that lets you register, link game accounts (League of Legends, Dota 2, Clash Royale, and others), join tournaments, and view stats.",
    ]},
    { heading: "3. Accounts", body: [
      "You are responsible for keeping your account secure and for all activity under it. You must provide accurate information. You may register with email, Google, or Discord.",
      "We may suspend or remove accounts that violate these terms.",
    ]},
    { heading: "4. Conduct", body: [
      "You must not use the Platform for illegal activity, cheating, impersonation, API abuse, or interfering with the service.",
    ]},
    { heading: "5. Third-party game accounts", body: [
      "Linking Riot Games, Steam/Dota 2, and Supercell accounts uses their official APIs and is subject to each provider's terms. We are not affiliated with or endorsed by them.",
    ]},
    { heading: "6. Prizes", body: [
      "Some tournaments award prizes as in-game items (e.g. Dota 2 cosmetics) donated by the community. Prizes are delivered via Steam trades, subject to availability and each tournament's rules. Items carry no guaranteed monetary value.",
    ]},
    { heading: "7. Intellectual property", body: [
      "Game trademarks, logos, and content belong to their respective owners. S-Rank Arena's own content may not be reproduced without permission.",
    ]},
    { heading: "8. Limitation of liability", body: [
      "The Platform is provided \"as is\", without warranties. We are not liable for damages arising from use of the service, interruptions, or third-party API availability.",
    ]},
    { heading: "9. Changes", body: [
      "We may update these terms. Continued use after changes constitutes acceptance.",
    ]},
    { heading: "10. Contact", body: [
      `For questions about these terms, contact us at ${CONTACT}.`,
    ]},
  ],
};

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const c = locale === "en" ? EN : ES;
  return <LegalDoc title={c.title} updated={c.updated} sections={c.sections} />;
}
