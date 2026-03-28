"use client";

import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { useLocale } from "@/components/LocaleProvider";

export default function HomePage() {
  const { t } = useLocale();
  return (
    <>
      <div className="container">
        <div className="top-bar" />

        <h1>SafeWalk</h1>
        <div className="subtitlle">{t("homeSubtitle")}</div>

        <div className="status">
          <ul>
            <li>{t("homeFeature1")}</li>
            <li>{t("homeFeature2")}</li>
            <li>{t("homeFeature3")}</li>
          </ul>
        </div>

        <Link className="btn btn-primary block-link" href="/map">
          {t("homeCta")}
        </Link>
      </div>

      <BottomNav active="call" />
    </>
  );
}
