"use client";

import { useEffect, useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { useLocale } from "@/components/LocaleProvider";

const CALL_VOICE_IDS = /** @type {const} */ (["dad", "mom", "acquaintance", "guardian"]);

const CALL_VOICE_KEYS = {
  dad: "callVoiceDad",
  mom: "callVoiceMom",
  acquaintance: "callVoiceAcquaintance",
  guardian: "callVoiceGuardian",
};

const CALL_VOICE_STORAGE_KEY = "safewalk_call_voice";

export default function CallPage() {
  const { t } = useLocale();
  const [callStarted, setCallStarted] = useState(false);
  const [voiceId, setVoiceId] = useState(/** @type {string} */ ("dad"));
  const audioRef = useRef({ ctx: null, osc: null, gain: null });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CALL_VOICE_STORAGE_KEY);
      if (raw && CALL_VOICE_IDS.includes(/** @type {any} */ (raw))) {
        setVoiceId(raw);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CALL_VOICE_STORAGE_KEY, voiceId);
    } catch {
      /* ignore */
    }
  }, [voiceId]);

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
          <div className="caller-name">{t("callSecurityService")}</div>
          <div className="call-voice-picker">
            <div className="call-voice-row" role="radiogroup" aria-label={t("callVoiceLabel")}>
              {CALL_VOICE_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`call-voice-pill ${voiceId === id ? "is-active" : ""}`}
                  role="radio"
                  aria-checked={voiceId === id}
                  onClick={() => setVoiceId(id)}
                >
                  {t(CALL_VOICE_KEYS[id])}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="action-area">
          <button
            type="button"
            className={`call-button ${callStarted ? "call-button-danger" : ""}`}
            onClick={() => setCallStarted((prev) => !prev)}
            aria-label={callStarted ? t("callAriaEnd") : t("callAriaStart")}
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
