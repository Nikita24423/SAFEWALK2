"use client";

import BottomNav from "@/components/BottomNav";
import Link from "next/link";
import Image from "next/image";
import mapImage from "./safwalk.jpg";

export default function MapPage() {
  return (
    <>
      <div className="container">

        <div className="top-bar" />

        <h1>Привет, пользователь!</h1>
        <div className="meta">Это приложение защитит тебя в опасных ситуациях</div>

        <div className="features">
          <ul className="features-list">
            <li>Живое сопровождение</li>
            <li>Ложный звонок с таймером</li>
            <li>SOS-кнопка</li>
            <li>Экстренный вызов при тряске</li>
            <li>Контакты для экстренных случаев</li>
          </ul>
        </div>

        <div className="map-frame">
          <Image
            className="map-image"
            src={mapImage}
            alt="Маршрут SafeWalk"
            fill
            priority
            sizes="(max-width: 420px) 100vw, 420px"
          />
        </div>

        <Link className="btn btn-primary block-link" href="/profile">
          НАЧАТЬ
        </Link>
      </div>

      <BottomNav active="call" />
    </>
  );
}
