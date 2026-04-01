"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import mapImage1 from "./safwalk1.jpg";
import mapImage2 from "./safwalk2.jpg";
import mapImage3 from "./safwalk3.jpg";
import mapImage4 from "./safwalk4.jpg";
import { useLocale } from "@/components/LocaleProvider";
import { useTheme } from "@/components/ThemeProvider";
import { MAP_IMAGE_INDEX_KEY } from "@/lib/theme";

const MAP_IMAGES = [mapImage1, mapImage2, mapImage3, mapImage4];
const STRIPE_PRO_LINK = "https://buy.stripe.com/test_9B66oH40n8tl70LfOtbZe00";

export default function MapPage() {
  const { t, locale, toggleLocale } = useLocale();
  const { cycleTheme } = useTheme();
  const router = useRouter();
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

  useEffect(() => {
    const id = window.setInterval(() => {
      setMapIndex((i) => (i + 1) % MAP_IMAGES.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

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

        <div className="map-info-block" aria-label="SafeWalk feature details">
          <div className="map-info-card">
            <div className="map-info-card-title">{t("mapCard1Title")}</div>
            <div className="map-info-card-body">{t("mapCard1Body")}</div>
          </div>
          <div className="map-info-card">
            <div className="map-info-card-title">{t("mapCard2Title")}</div>
            <div className="map-info-card-body">{t("mapCard2Body")}</div>
          </div>
          <div className="map-info-card">
            <div className="map-info-card-title">{t("mapCard3Title")}</div>
            <div className="map-info-card-body">{t("mapCard3Body")}</div>
          </div>
          <div className="map-info-card">
            <div className="map-info-card-title">{t("mapCard4Title")}</div>
            <div className="map-info-card-body">{t("mapCard4Body")}</div>
          </div>
          <div className="map-info-card">
            <div className="map-info-card-title">{t("mapCard5Title")}</div>
            <div className="map-info-card-body">{t("mapCard5Body")}</div>
          </div>
          <div className="map-info-card">
            <div className="map-info-card-title">{t("mapCard6Title")}</div>
            <div className="map-info-card-body">{t("mapCard6Body")}</div>
          </div>
        </div>

        <div className="map-frame">
          <Image
            className="map-image"
            src={MAP_IMAGES[mapIndex]}
            alt={t("mapAlt")}
            fill
            priority={mapIndex === 0}
            sizes="(max-width: 420px) 100vw, 420px"
          />
        </div>

        <div className="map-image-caption">{t("mapImageCaption")}</div>

        <div className="pricing-container" aria-label="Pricing plans">
          <div className="plan">
            <h3>{t("pricingBasicTitle")}</h3>
            <div className="price">{t("pricingBasicPrice")}</div>
            <p className="billing-period">{t("pricingBasicPeriod")}</p>

            <ul className="pricing-features">
              <li>{t("pricingBasicF1")}</li>
              <li>{t("pricingBasicF2")}</li>
              <li>{t("pricingBasicF3")}</li>
              <li>{t("pricingBasicF4")}</li>
              <li>{t("pricingBasicF5")}</li>
              <li>{t("pricingBasicF6")}</li>
            </ul>

            <button type="button" className="btn-outline" onClick={() => router.push("/profile")}>
              {t("pricingBasicBtn")}
            </button>
          </div>

          <div className="plan plan-pro">
            <h3>{t("pricingProTitle")}</h3>
            <div className="price">{t("pricingProPrice")}</div>
            <p className="billing-period">{t("pricingProPeriod")}</p>

            <ul className="pricing-features">
              <li>{t("pricingProF1")}</li>
              <li>{t("pricingProF2")}</li>
              <li>{t("pricingProF3")}</li>
            </ul>

            <button
              type="button"
              className="btn btn-primary pricing-pro-btn"
              onClick={() => window.open(STRIPE_PRO_LINK, "_blank", "noopener,noreferrer")}
            >
              {t("pricingProBtn")}
            </button>
          </div>
        </div>
      </div>

    </>
  );
}
