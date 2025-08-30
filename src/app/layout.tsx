import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ThemeRegistry from "../components/ThemeRegistry";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bitcoin Cost Basis Tracker",
  description: "Track your Bitcoin transactions and calculate cost basis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeRegistry>
          {children}
        </ThemeRegistry>
      </body>
    </html>
  );
}
