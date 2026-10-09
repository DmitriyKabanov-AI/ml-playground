import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export const metadata = {
  title: "ML Explorer — реальные артефакты",
  description: "Интерактивная аналитика ML-моделей из artifacts/",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="dark">
      <body className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6 lg:px-10 lg:py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}