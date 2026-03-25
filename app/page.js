import Link from "next/link";
import BottomNav from "@/components/BottomNav";

export default function HomePage() {
  return (
    <>
      <div className="container">
        <div className="top-bar" />

        <h1>SafeWalk</h1>
        <div className="subtitlle">Защити себя!</div>

        <div className="status">
          <ul>
            <li>Живое сопровождение</li>
            <li>Фейковый звонок</li>
            <li>SOS-кнопка</li>
          </ul>
        </div>

        <Link className="btn btn-primary block-link" href="/map">
          Начать использование
        </Link>
      </div>

      <BottomNav active="call" />
    </>
  );
}
