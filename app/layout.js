import "./globals.css";

export const metadata = {
  title: "SafeWalk",
  description: "Прототип приложения личной безопасности",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
