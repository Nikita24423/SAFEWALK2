import "./globals.css";

export const metadata = {
  title: "SafeWalk",
  description: "Прототип приложения личной безопасности",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
