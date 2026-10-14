import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Split&Go | Despesas em grupo",
  description: "Grupos, despesas compartilhadas e saldos individuais.",
};

export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
