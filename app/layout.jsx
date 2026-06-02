import "./globals.css";
import "./ui-fixes.css";
import "./title-fix.css";

export const metadata = {
  title: "Око косметолога",
  description: "Beauty-tech аналитика конкурентов для косметологии.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
