import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "S-Rank Arena",
  description: "The ultimate eSports tournament platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
