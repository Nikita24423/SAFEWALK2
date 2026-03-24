import Link from "next/link";

export default function BottomNav({ active }) {
  return (
    <nav className="bottom-nav">
      <Link className={`nav-link ${active === "call" ? "active" : ""}`} href="/call">
        Звонок
      </Link>
      <Link className={`nav-link sos ${active === "sos" ? "active" : ""}`} href="/sos">
        <span>🚨</span>
      </Link>
      <Link className={`nav-link ${active === "profile" ? "active" : ""}`} href="/profile">
        Профиль
      </Link>
    </nav>
  );
}
