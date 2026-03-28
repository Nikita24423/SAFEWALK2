"use client";

import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import Image from "next/image";
import mapImage from "./safwalk.jpg";
import { useLocale } from "@/components/LocaleProvider";

export default function MapPage() {
  const { t } = useLocale();
  return (
    <>
      <div className="container">
        <div className="top-bar" />

        <h1>{t("mapTitle")}</h1>
        <div className="meta">{t("mapMeta")}</div>

        <div className="features">
          <ul className="features-list">
            <li>{t("mapF1")}</li>
            <li>{t("mapF2")}</li>
            <li>{t("mapF3")}</li>
            <li>{t("mapF4")}</li>
            <li>{t("mapF5")}</li>
          </ul>
        </div>

        <div className="map-frame">
          <Image
            className="map-image"
            src={mapImage}
            alt={t("mapAlt")}
            fill
            priority
            sizes="(max-width: 420px) 100vw, 420px"
          />
        </div>

        <Link className="btn btn-primary block-link" href="/profile">
          {t("mapCta")}
        </Link>
      </div>

      <BottomNav active="call" />
    </>
  );
}
