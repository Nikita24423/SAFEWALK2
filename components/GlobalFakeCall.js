"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SAFEWALK_FAKE_CALL_CLOSE,
  SAFEWALK_FAKE_CALL_OPEN,
} from "@/lib/fakeCallEvents";

const PROFILE_KEY = "safewalk_profile";
const SHAKE_FAKE_CALL_KEY = "safewalk_shake_fake_call_enabled";

function loadProfileFakeCallDefaults() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { caller: "Служба безопасности", melody: "synth" };
    const p = JSON.parse(raw);
    return {
      caller: (p.fake_call_caller || "").trim() || "Служба безопасности",
      melody: p.fake_call_melody || "synth",
    };
  } catch {
    return { caller: "Служба безопасности", melody: "synth" };
  }
}

export default function GlobalFakeCall() {
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [fakeCallAnswered, setFakeCallAnswered] = useState(false);
  const [caller, setCaller] = useState("Служба безопасности");
  const [melody, setMelody] = useState("synth");

  const fakeCallAudioRef = useRef({ ctx: null, osc: null, gain: null });
  const fakeCallFileAudioRef = useRef(null);
  const fakeCallAutoCloseTimeoutRef = useRef(null);
  const showFakeCallRef = useRef(false);

  useEffect(() => {
    showFakeCallRef.current = showFakeCall;
  }, [showFakeCall]);

  const closeFakeCall = useCallback(() => {
    setShowFakeCall(false);
    setFakeCallAnswered(false);
  }, []);

  useEffect(() => {
    function onOpen(e) {
      const d = e.detail || {};
      const defaults = loadProfileFakeCallDefaults();
      setCaller(typeof d.caller === "string" && d.caller.trim() ? d.caller.trim() : defaults.caller);
      setMelody(typeof d.melody === "string" && d.melody ? d.melody : defaults.melody);
      setFakeCallAnswered(false);
      setShowFakeCall(true);
    }
    function onClose() {
      closeFakeCall();
    }
    window.addEventListener(SAFEWALK_FAKE_CALL_OPEN, onOpen);
    window.addEventListener(SAFEWALK_FAKE_CALL_CLOSE, onClose);
    return () => {
      window.removeEventListener(SAFEWALK_FAKE_CALL_OPEN, onOpen);
      window.removeEventListener(SAFEWALK_FAKE_CALL_CLOSE, onClose);
    };
  }, [closeFakeCall]);

  /** iOS: разрешение на датчики после жеста пользователя */
  useEffect(() => {
    async function requestMotion() {
      try {
        if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
          await DeviceOrientationEvent.requestPermission();
        }
        if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
          await DeviceMotionEvent.requestPermission();
        }
      } catch {
        /* ignore */
      }
    }
    window.addEventListener("click", requestMotion, { once: true });
    window.addEventListener("touchend", requestMotion, { once: true });
    return () => {
      window.removeEventListener("click", requestMotion);
      window.removeEventListener("touchend", requestMotion);
    };
  }, []);

  useEffect(() => {
    let lastShakeAt = 0;
    let last = { x: 0, y: 0, z: 0 };
    let primed = false;

    function onMotion(e) {
      if (showFakeCallRef.current) return;
      try {
        if (localStorage.getItem(SHAKE_FAKE_CALL_KEY) !== "true") return;
      } catch {
        return;
      }

      const a = e.accelerationIncludingGravity;
      if (a == null) return;

      const x = a.x ?? 0;
      const y = a.y ?? 0;
      const z = a.z ?? 0;

      if (!primed) {
        last = { x, y, z };
        primed = true;
        return;
      }

      const delta = Math.abs(x - last.x) + Math.abs(y - last.y) + Math.abs(z - last.z);
      last = { x, y, z };

      const now = Date.now();
      if (delta < 22) return;
      if (now - lastShakeAt < 11000) return;

      lastShakeAt = now;
      const { caller: c, melody: m } = loadProfileFakeCallDefaults();
      window.dispatchEvent(
        new CustomEvent(SAFEWALK_FAKE_CALL_OPEN, {
          detail: { caller: c, melody: m },
        }),
      );
    }

    window.addEventListener("devicemotion", onMotion, true);
    return () => window.removeEventListener("devicemotion", onMotion, true);
  }, []);

  useEffect(() => {
    if (!showFakeCall || fakeCallAnswered) {
      if (fakeCallAutoCloseTimeoutRef.current) {
        clearTimeout(fakeCallAutoCloseTimeoutRef.current);
        fakeCallAutoCloseTimeoutRef.current = null;
      }
      if (fakeCallFileAudioRef.current) {
        fakeCallFileAudioRef.current.pause();
        fakeCallFileAudioRef.current.currentTime = 0;
      }
      if (fakeCallAudioRef.current.osc) {
        fakeCallAudioRef.current.osc.stop();
        fakeCallAudioRef.current.osc.disconnect();
        fakeCallAudioRef.current.osc = null;
      }
      if (fakeCallAudioRef.current.gain) {
        fakeCallAudioRef.current.gain.disconnect();
        fakeCallAudioRef.current.gain = null;
      }
      return undefined;
    }

    fakeCallAutoCloseTimeoutRef.current = setTimeout(() => {
      setShowFakeCall(false);
      setFakeCallAnswered(false);
    }, 90 * 1000);

    if (melody && melody !== "synth") {
      if (!fakeCallFileAudioRef.current) {
        fakeCallFileAudioRef.current = new Audio(melody);
        fakeCallFileAudioRef.current.loop = true;
      } else {
        fakeCallFileAudioRef.current.src = melody;
      }
      void fakeCallFileAudioRef.current.play().catch(() => {});
      return () => {
        if (fakeCallAutoCloseTimeoutRef.current) {
          clearTimeout(fakeCallAutoCloseTimeoutRef.current);
          fakeCallAutoCloseTimeoutRef.current = null;
        }
        if (fakeCallFileAudioRef.current) {
          fakeCallFileAudioRef.current.pause();
          fakeCallFileAudioRef.current.currentTime = 0;
        }
      };
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return undefined;
    }

    if (!fakeCallAudioRef.current.ctx) {
      fakeCallAudioRef.current.ctx = new AudioCtx();
    }

    const ctx = fakeCallAudioRef.current.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 470;
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    fakeCallAudioRef.current.osc = osc;
    fakeCallAudioRef.current.gain = gain;

    return () => {
      if (fakeCallAutoCloseTimeoutRef.current) {
        clearTimeout(fakeCallAutoCloseTimeoutRef.current);
        fakeCallAutoCloseTimeoutRef.current = null;
      }
      if (fakeCallAudioRef.current.osc) {
        fakeCallAudioRef.current.osc.stop();
        fakeCallAudioRef.current.osc.disconnect();
        fakeCallAudioRef.current.osc = null;
      }
      if (fakeCallAudioRef.current.gain) {
        fakeCallAudioRef.current.gain.disconnect();
        fakeCallAudioRef.current.gain = null;
      }
    };
  }, [showFakeCall, fakeCallAnswered, melody]);

  if (!showFakeCall) return null;

  return (
    <div className="fake-call-overlay" role="dialog" aria-modal="true" aria-label="Входящий вызов">
      <div className="fake-call-screen">
        <div className="fake-call-screen-main">
          {!fakeCallAnswered ? (
            <p className="fake-call-screen-label">входящий вызов</p>
          ) : (
            <p className="fake-call-screen-label fake-call-screen-label-active">разговор</p>
          )}
          <h1 className="fake-call-screen-name">{caller}</h1>
          {!fakeCallAnswered ? <p className="fake-call-screen-sub">SafeWalk</p> : null}
        </div>

        <div className="fake-call-screen-footer">
          {!fakeCallAnswered ? (
            <div className="fake-call-ios-row">
              <div className="fake-call-ios-action">
                <button
                  type="button"
                  className="fake-call-ios-circle fake-call-ios-circle-decline"
                  aria-label="Сбросить"
                  onClick={closeFakeCall}
                >
                  <svg className="fake-call-ios-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.16-.43.25-.7.25-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.29 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.09-.7-.25-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.51-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"
                      transform="rotate(135 12 12)"
                    />
                  </svg>
                </button>
                <span className="fake-call-ios-caption">Сбросить</span>
              </div>
              <div className="fake-call-ios-action">
                <button
                  type="button"
                  className="fake-call-ios-circle fake-call-ios-circle-accept"
                  aria-label="Принять"
                  onClick={() => setFakeCallAnswered(true)}
                >
                  <svg className="fake-call-ios-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
                    />
                  </svg>
                </button>
                <span className="fake-call-ios-caption">Принять</span>
              </div>
            </div>
          ) : (
            <div className="fake-call-ios-row fake-call-ios-row-single">
              <div className="fake-call-ios-action">
                <button
                  type="button"
                  className="fake-call-ios-circle fake-call-ios-circle-decline"
                  aria-label="Завершить вызов"
                  onClick={closeFakeCall}
                >
                  <svg className="fake-call-ios-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.16-.43.25-.7.25-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.29 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.09-.7-.25-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.51-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"
                      transform="rotate(135 12 12)"
                    />
                  </svg>
                </button>
                <span className="fake-call-ios-caption">Завершить</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
