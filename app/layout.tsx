import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Food Buddy",
  description: "Upload a food photo for an FDA-style nutrition label and natural food chat."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
