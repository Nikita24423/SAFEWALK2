"use client";

import BottomNav from "@/components/BottomNav";
import { useLocale } from "@/components/LocaleProvider";

export default function GuardianPage() {
  const { t } = useLocale();
  return (
    <>
      <div className="container">
        <div className="top-bar" />

        <h1>{t("guardianTitle")}</h1>
        <div className="meta">{t("guardianMeta")}</div>
        <div className="status">📍 {t("guardianPoint")}</div>

        <div className="map-frame">
          <iframe
            title={t("guardianIframeTitle")}
            src="https://maps.google.com/maps?q=53.9006,27.5590&z=16&output=embed"
          />
        </div>

        <a
          className="btn btn-primary block-link"
          href="https://maps.google.com/?q=53.9006,27.5590"
          target="_blank"
          rel="noreferrer"
        >
          {t("guardianOpenMap")}
        </a>
      </div>

      <BottomNav active="call" />
    </>
  );
}
