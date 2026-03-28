"use client";

import { LocaleProvider } from "@/components/LocaleProvider";

export default function ClientProviders({ children }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
