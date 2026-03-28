import "./globals.css";
import Script from "next/script";
import GlobalFakeCall from "@/components/GlobalFakeCall";
import ClientProviders from "@/components/ClientProviders";

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
      <body>
        <ClientProviders>
          <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
          <GlobalFakeCall />
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
