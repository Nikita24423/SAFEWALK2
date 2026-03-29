"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import Image from "next/image";
import mapImage1 from "./safwalk1.jpg";
import mapImage2 from "./safwalk2.jpg";
import mapImage3 from "./safwalk3.jpg";
import mapImage4 from "./safwalk4.jpg";
import { useLocale } from "@/components/LocaleProvider";
import { useTheme } from "@/components/ThemeProvider";
import { MAP_IMAGE_INDEX_KEY } from "@/lib/theme";

const MAP_IMAGES = [mapImage1, mapImage2, mapImage3, mapImage4];

export default function MapPage() {
  const { t, locale, toggleLocale } = useLocale();
  const { cycleTheme } = useTheme();
  const [mapIndex, setMapIndex] = useState(0);
  const skipNextMapPersist = useRef(true);

  useLayoutEffect(() => {
    try {
      const raw = localStorage.getItem(MAP_IMAGE_INDEX_KEY);
      const n = Number(raw);
      if (Number.isInteger(n) && n >= 0 && n < MAP_IMAGES.length) {
        setMapIndex(n);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (skipNextMapPersist.current) {
      skipNextMapPersist.current = false;
      return;
    }
    try {
      localStorage.setItem(MAP_IMAGE_INDEX_KEY, String(mapIndex));
    } catch {
      /* ignore */
    }
  }, [mapIndex]);

  return (
    <>
      <div className="container">
        <div className="top-bar top-bar-profile">
          <div className="top-bar-profile-actions">
            <button
              type="button"
              className={`btn-lang ${locale === "en" ? "btn-lang-active" : ""}`}
              onClick={toggleLocale}
              aria-label={locale === "ru" ? "English" : "Русский"}
            >
              {locale === "ru" ? "EN" : "RUS"}
            </button>
            <button type="button" className="btn-theme" onClick={cycleTheme} aria-label={t("themeCycleAria")}>
              🎨
            </button>
          </div>
        </div>

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

        <button
          type="button"
          className="map-frame map-frame-interactive"
          onClick={() => setMapIndex((i) => (i + 1) % MAP_IMAGES.length)}
          aria-label={t("mapCycleImageAria")}
        >
          <Image
            className="map-image"
            src={MAP_IMAGES[mapIndex]}
            alt={t("mapAlt")}
            fill
            priority={mapIndex === 0}
            sizes="(max-width: 420px) 100vw, 420px"
          />
        </button>

        <Link className="btn btn-primary block-link" href="/profile">
          {t("mapCta")}
        </Link>
      </div>

      <BottomNav active="call" />
    </>
  );
}
