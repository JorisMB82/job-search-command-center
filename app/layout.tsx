import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Search Command Center",
  description: "Private V1 dashboard for managing job opportunities and copy/paste ChatGPT prompts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
