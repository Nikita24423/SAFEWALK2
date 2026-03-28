"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";

export default function BottomNav({ active }) {
  const { t } = useLocale();
  return (
    <nav className="bottom-nav">
      <Link className={`nav-link ${active === "call" ? "active" : ""}`} href="/call">
        {t("navCall")}
      </Link>
      <Link className={`nav-link sos ${active === "sos" ? "active" : ""}`} href="/sos">
        <span>🚨</span>
      </Link>
      <Link className={`nav-link ${active === "profile" ? "active" : ""}`} href="/profile">
        {t("navProfile")}
      </Link>
    </nav>
  );
}
