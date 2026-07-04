import { LegalDoc } from "@/modules/legal/LegalDoc";

export const metadata = { title: "Política de Privacidad · S-Rank Arena" };

const CONTACT = "srankarena@gmail.com";

const ES = {
  title: "Política de Privacidad",
  updated: "Última actualización: 4 de julio de 2026",
  sections: [
    { heading: "1. Introducción", body: [
      "Esta Política describe cómo S-Rank Arena (srankarena.com) recopila, usa y protege tu información personal.",
    ]},
    { heading: "2. Información que recopilamos", body: [
      "Datos de cuenta: correo electrónico y nombre de usuario.",
      "Si te registras con Google o Discord: tu correo y nombre público del proveedor.",
      "Cuentas de juego que vincules: identificadores de Riot, Steam/Dota 2 y Supercell, y estadísticas públicas asociadas.",
      "Datos de uso: registros de inicio de sesión, dirección IP y navegador, para seguridad.",
    ]},
    { heading: "3. Cómo usamos tu información", body: [
      "Para crear y gestionar tu cuenta, mostrar tus estadísticas, organizar torneos, entregar premios y mantener la seguridad de la Plataforma.",
      "No vendemos tus datos personales.",
    ]},
    { heading: "4. Terceros", body: [
      "Usamos Supabase para autenticación y base de datos. Consultamos las APIs de Riot Games, Steam y Supercell para obtener estadísticas. El inicio de sesión con Google y Discord procesa tus datos según las políticas de cada proveedor.",
    ]},
    { heading: "5. Cookies", body: [
      "Usamos cookies necesarias para mantener tu sesión iniciada. No usamos cookies de publicidad.",
    ]},
    { heading: "6. Conservación y tus derechos", body: [
      "Conservamos tus datos mientras tu cuenta esté activa. Puedes solicitar acceder, corregir o eliminar tu información escribiéndonos.",
    ]},
    { heading: "7. Menores", body: [
      "La Plataforma no está dirigida a menores de 13 años. No recopilamos conscientemente datos de menores de esa edad.",
    ]},
    { heading: "8. Cambios", body: [
      "Podemos actualizar esta Política. Publicaremos la versión vigente en esta página.",
    ]},
    { heading: "9. Contacto", body: [
      `Para ejercer tus derechos o resolver dudas, escríbenos a ${CONTACT}.`,
    ]},
  ],
};

const EN = {
  title: "Privacy Policy",
  updated: "Last updated: July 4, 2026",
  sections: [
    { heading: "1. Introduction", body: [
      "This Policy describes how S-Rank Arena (srankarena.com) collects, uses, and protects your personal information.",
    ]},
    { heading: "2. Information we collect", body: [
      "Account data: email address and username.",
      "If you sign in with Google or Discord: your email and public name from the provider.",
      "Game accounts you link: Riot, Steam/Dota 2, and Supercell identifiers and associated public stats.",
      "Usage data: login records, IP address, and browser, for security.",
    ]},
    { heading: "3. How we use your information", body: [
      "To create and manage your account, display your stats, run tournaments, deliver prizes, and keep the Platform secure.",
      "We do not sell your personal data.",
    ]},
    { heading: "4. Third parties", body: [
      "We use Supabase for authentication and database. We query Riot Games, Steam, and Supercell APIs for stats. Google and Discord sign-in process your data under their own policies.",
    ]},
    { heading: "5. Cookies", body: [
      "We use cookies necessary to keep you signed in. We do not use advertising cookies.",
    ]},
    { heading: "6. Retention and your rights", body: [
      "We retain your data while your account is active. You may request to access, correct, or delete your information by contacting us.",
    ]},
    { heading: "7. Minors", body: [
      "The Platform is not directed to children under 13. We do not knowingly collect data from children under that age.",
    ]},
    { heading: "8. Changes", body: [
      "We may update this Policy. The current version will be posted on this page.",
    ]},
    { heading: "9. Contact", body: [
      `To exercise your rights or ask questions, contact us at ${CONTACT}.`,
    ]},
  ],
};

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const c = locale === "en" ? EN : ES;
  return <LegalDoc title={c.title} updated={c.updated} sections={c.sections} />;
}
