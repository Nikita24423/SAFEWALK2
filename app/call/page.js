"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";

export default function CallPage() {
  const [callStarted, setCallStarted] = useState(false);
  const audioRef = useRef({ ctx: null, osc: null, gain: null });

  useEffect(() => {
    if (!callStarted) {
      if (audioRef.current.osc) {
        audioRef.current.osc.stop();
        audioRef.current.osc.disconnect();
        audioRef.current.osc = null;
      }
      if (audioRef.current.gain) {
        audioRef.current.gain.disconnect();
        audioRef.current.gain = null;
      }
      return;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return;
    }

    if (!audioRef.current.ctx) {
      audioRef.current.ctx = new AudioCtx();
    }

    const ctx = audioRef.current.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 440;
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    audioRef.current.osc = osc;
    audioRef.current.gain = gain;

    return () => {
      if (audioRef.current.osc) {
        audioRef.current.osc.stop();
        audioRef.current.osc.disconnect();
        audioRef.current.osc = null;
      }
      if (audioRef.current.gain) {
        audioRef.current.gain.disconnect();
        audioRef.current.gain = null;
      }
    };
  }, [callStarted]);

  return (
    <>
      <div className="call-screen">
        <div className="top-bar top-bar-call" />

        <div className="caller-info">
          <div className="call-status">{callStarted ? "Вызов..." : "Готов к набору"}</div>
          <div className="caller-name">Служба безопасности</div>
          <div className="caller-number">SafeWalk Help</div>
        </div>

        <div className="action-area">
          <button
            type="button"
            className={`call-button ${callStarted ? "call-button-danger" : ""}`}
            onClick={() => setCallStarted((prev) => !prev)}
            aria-label={callStarted ? "Завершить звонок" : "Начать звонок"}
          >
            <svg className={`phone-icon ${callStarted ? "rotated" : ""}`} viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.28-.28.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
            </svg>
          </button>

        </div>
      </div>

      <BottomNav active="call" />
    </>
  );
}
