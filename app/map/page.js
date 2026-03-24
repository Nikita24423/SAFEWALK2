import BottomNav from "@/components/BottomNav";
import RoleSwitch from "@/components/RoleSwitch";

export default function MapPage() {
  return (
    <>
      <div className="container">
        <div className="top-bar">
          <RoleSwitch />
        </div>

        <h1>🗺️ Маршрут</h1>
        <div className="meta">👤 Пользователь: Demo User</div>
        <div className="meta">📍 Точка: Минск (53.9006, 27.5590)</div>

        <div className="map-frame">
          <iframe
            title="Карта Google Maps - Минск"
            src="https://maps.google.com/maps?q=53.9006,27.5590&z=16&output=embed"
          />
        </div>

        <a
          className="btn btn-primary block-link"
          href="https://maps.google.com/?q=53.9006,27.5590"
          target="_blank"
          rel="noreferrer"
        >
          Открыть в Google Maps
        </a>
      </div>

      <BottomNav active="call" />
    </>
  );
}
