import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MDE — Marketing Delivery Engine",
  description: "AI-powered delivery engine for marketing agencies",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
