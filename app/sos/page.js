"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";

const CONTACTS_HISTORY_KEY = "safewalk_contacts_history";
const SOS_TARGETS_KEY = "safewalk_sos_targets";
const PROFILE_KEY = "safewalk_profile";

const SITUATION_ROLE_VALUES = ["late_walk", "stranger_date", "unknown_place", "unplanned_meeting"];

const SITUATION_LABELS = {
  late_walk: "Поздняя прогулка",
  stranger_date: "Свидание с незнакомцем",
  unknown_place: "Незнакомое место",
  unplanned_meeting: "Незапланированная встреча",
};

function normalizeSituationRole(value) {
  if (value && SITUATION_ROLE_VALUES.includes(value)) return value;
  if (value === "peaceful") return "late_walk";
  if (value === "guardian") return "stranger_date";
  return "late_walk";
}

function situationLabelForRole(role) {
  return SITUATION_LABELS[role] || SITUATION_LABELS.late_walk;
}

/** Маршрут и ситуация из профиля (как на странице профиля). */
function loadProfileForSos() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      return {
        name: "",
        my_telegram_username: "",
        route: "",
        route_from: "",
        route_to: "",
        role: "late_walk",
      };
    }
    const p = JSON.parse(raw);
    return {
      name: (p.name || "").trim(),
      my_telegram_username: (p.my_telegram_username || "").trim().replace(/^@+/, ""),
      route: p.route || "",
      route_from: p.route_from || "",
      route_to: p.route_to || "",
      role: normalizeSituationRole(p.role),
    };
  } catch {
    return {
      name: "",
      my_telegram_username: "",
      route: "",
      route_from: "",
      route_to: "",
      role: "late_walk",
    };
  }
}

function getTelegramUserId() {
  if (typeof window === "undefined") return undefined;
  try {
    const w = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    return typeof w === "number" ? w : undefined;
  } catch {
    return undefined;
  }
}

function requestGeolocation() {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  });
}

export default function SosPage() {
  const [sent, setSent] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [sosTargetMode, setSosTargetMode] = useState("all");
  const [selectedIndices, setSelectedIndices] = useState(() => new Set());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sosError, setSosError] = useState("");
  const [prefsHydrated, setPrefsHydrated] = useState(false);
  const [profileSos, setProfileSos] = useState(() => loadProfileForSos());
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [lastCoords, setLastCoords] = useState(null);
  const [sosResults, setSosResults] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONTACTS_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setContacts(parsed);
        }
      }
    } catch (_error) {}

    try {
      const rawPrefs = localStorage.getItem(SOS_TARGETS_KEY);
      if (rawPrefs) {
        const prefs = JSON.parse(rawPrefs);
        if (prefs.mode === "all" || prefs.mode === "selected") {
          setSosTargetMode(prefs.mode);
        }
        if (Array.isArray(prefs.selectedIndices)) {
          const indices = prefs.selectedIndices.filter((i) => Number.isFinite(i) && i >= 0);
          setSelectedIndices(new Set(indices));
        }
      }
    } catch (_error) {}

    setProfileSos(loadProfileForSos());
    setPrefsHydrated(true);
  }, []);

  useEffect(() => {
    function refreshProfileSos() {
      setProfileSos(loadProfileForSos());
    }
    window.addEventListener("focus", refreshProfileSos);
    window.addEventListener("storage", refreshProfileSos);
    return () => {
      window.removeEventListener("focus", refreshProfileSos);
      window.removeEventListener("storage", refreshProfileSos);
    };
  }, []);

  useEffect(() => {
    if (!prefsHydrated) return;
    setSelectedIndices((prev) => {
      if (!contacts.length) {
        return new Set();
      }
      return new Set([...prev].filter((i) => i >= 0 && i < contacts.length));
    });
  }, [contacts, prefsHydrated]);

  useEffect(() => {
    if (!prefsHydrated) return;
    try {
      localStorage.setItem(
        SOS_TARGETS_KEY,
        JSON.stringify({
          mode: sosTargetMode,
          selectedIndices: [...selectedIndices].sort((a, b) => a - b),
        }),
      );
    } catch (_error) {}
  }, [prefsHydrated, sosTargetMode, selectedIndices]);

  const selectedContactsList = useMemo(() => {
    return [...selectedIndices]
      .filter((i) => Number.isFinite(i) && i >= 0 && i < contacts.length)
      .sort((a, b) => a - b)
      .map((i) => contacts[i]);
  }, [contacts, selectedIndices]);

  function toggleIndex(index) {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
    setSosError("");
  }

  function toggleDropdown() {
    setDropdownOpen((prev) => !prev);
    setSosError("");
  }

  function canSendSos() {
    const snap = loadProfileForSos();
    if (!snap.name) {
      setSosError("В профиле укажите ваше имя");
      return false;
    }
    if (!snap.my_telegram_username) {
      setSosError("В профиле укажите ваш Telegram (@username) — так бот отправит данные и сможет ответить вам");
      return false;
    }
    if (!contacts.length) {
      setSosError("Добавьте контакты в профиле");
      return false;
    }
    if (sosTargetMode === "selected" && selectedIndices.size < 1) {
      setSosError("Выберите хотя бы один контакт");
      return false;
    }
    setSosError("");
    return true;
  }

  const onSosClick = useCallback(async () => {
    if (!canSendSos()) return;
    setSendError("");
    setSending(true);
    try {
      const snap = loadProfileForSos();
      setProfileSos(snap);
      const targets = sosTargetMode === "all" ? contacts : selectedContactsList;
      const geo = await requestGeolocation();
      setLastCoords(geo);

      const payload = {
        contacts: targets.map((c) => ({
          contact_name: c.contact_name || "",
          telegram_username: c.telegram_username || "",
          instagram_username: c.instagram_username || "",
        })),
        route_label: snap.route || null,
        route_from: snap.route_from || null,
        route_to: snap.route_to || null,
        situation: situationLabelForRole(snap.role),
        latitude: geo?.latitude ?? null,
        longitude: geo?.longitude ?? null,
        share_location: Boolean(geo),
        requester_telegram_id: getTelegramUserId() ?? null,
        requester_name: snap.name || null,
        requester_telegram_username: snap.my_telegram_username || null,
      };

      const res = await fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = [data.error || data.detail, data.hint].filter(Boolean).join("\n\n");
        setSendError(msg || `Ошибка сервера (${res.status})`);
        return;
      }
      setSosResults(data.results || null);
      setSent(true);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Не удалось отправить SOS");
    } finally {
      setSending(false);
    }
  }, [contacts, selectedContactsList, sosTargetMode]);

  const dropdownSummary =
    sosTargetMode !== "selected"
      ? "—"
      : selectedIndices.size === 0
        ? "Нажмите, чтобы выбрать контакты"
        : `Выбрано: ${selectedIndices.size}`;

  return (
    <>
      <div className="sos-container">
        {!sent ? (
          <div className="sos-initial">
            <div className="sos-contact-picker">
              <div className="sos-target-label">Кому отправить SOS</div>
              {profileSos.name && profileSos.my_telegram_username ? (
                <p className="sos-sender-hint">
                  Отправитель: <strong>{profileSos.name}</strong>
                  {" · "}
                  Telegram: <strong>@{profileSos.my_telegram_username}</strong>
                  <span className="sos-sender-hint-muted"> (из профиля)</span>
                </p>
              ) : (
                <p className="sos-inline-error">
                  В профиле укажите <strong>имя</strong> и <strong>ваш Telegram @username</strong> — с них уйдёт SOS в Telegram.
                </p>
              )}

              <div className="sos-target-row" role="radiogroup" aria-label="Режим отправки SOS">
                <label className={`sos-mode-pill ${sosTargetMode === "all" ? "is-active" : ""}`}>
                  <input
                    type="radio"
                    name="sos-target-mode"
                    value="all"
                    checked={sosTargetMode === "all"}
                    onChange={() => {
                      setSosTargetMode("all");
                      setDropdownOpen(false);
                      setSosError("");
                    }}
                  />
                  <span>Всем</span>
                </label>
                <label className={`sos-mode-pill ${sosTargetMode === "selected" ? "is-active" : ""}`}>
                  <input
                    type="radio"
                    name="sos-target-mode"
                    value="selected"
                    checked={sosTargetMode === "selected"}
                    onChange={() => {
                      setSosTargetMode("selected");
                      setSosError("");
                    }}
                  />
                  <span>Выбранным</span>
                </label>
              </div>

              {sosTargetMode === "all" ? (
                <p className="sos-all-hint">
                  {contacts.length
                    ? `Будут уведомлены все контакты (${contacts.length}).`
                    : "Сначала добавьте контакты в профиле."}
                </p>
              ) : (
                <div className="sos-dropdown">
                  <button
                    type="button"
                    className="sos-dropdown-trigger"
                    onClick={toggleDropdown}
                    disabled={!contacts.length}
                    aria-expanded={dropdownOpen}
                  >
                    <span className="sos-dropdown-trigger-text">{dropdownSummary}</span>
                    <span className="sos-dropdown-chevron" aria-hidden="true">
                      {dropdownOpen ? "▲" : "▼"}
                    </span>
                  </button>
                  {dropdownOpen ? (
                    <div className="sos-dropdown-panel" role="listbox" aria-multiselectable="true">
                      {contacts.map((item, index) => {
                        const checked = selectedIndices.has(index);
                        const label = item.contact_name || "Без имени";
                        return (
                          <label key={`${label}-${item.emergency_phone}-${index}`} className="sos-dropdown-item">
                            <input type="checkbox" checked={checked} onChange={() => toggleIndex(index)} />
                            <span>{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              )}
              {sosError ? <p className="sos-inline-error">{sosError}</p> : null}

              <div className="sos-situation-label">Ситуация</div>
              <p className="sos-situation-from-profile">{situationLabelForRole(profileSos.role)}</p>
              <p className="sos-situation-hint">Выбор ситуации — в разделе «Профиль»</p>
              <p className="sos-geo-hint">
                При отправке запрашивается геолокация (если разрешите — уйдёт вместе с маршрутом).
              </p>
              <p className="sos-route-hint">
                Маршрут берётся из профиля:{" "}
                {[profileSos.route_from, profileSos.route_to].filter(Boolean).length
                  ? `${profileSos.route_from || "—"} → ${profileSos.route_to || "—"}`
                  : "не задан — укажите в профиле"}
                {profileSos.route ? ` («${profileSos.route}»)` : ""}
              </p>
            </div>

            {sendError ? <p className="sos-inline-error">{sendError}</p> : null}

            <button type="button" className="sos-button" onClick={onSosClick} disabled={sending}>
              <span className="sos-text">{sending ? "…" : "SOS"}</span>
              <span className="sos-subtitle">{sending ? "Отправка…" : "Позвать на помощь"}</span>
            </button>
          </div>
        ) : (
          <div className="sos-sent sos-sent-visible">
            <div className="sos-success-icon">🚨</div>
            <h1 className="sos-success-title">SOS отправлен!</h1>
            <p className="sos-success-message">
              Запрос обработан. Если у контакта не открыт чат с ботом — доставка в Telegram невозможна (нужен /start у
              вашего бота).
            </p>
            {sosTargetMode === "all" && contacts.length ? (
              <p className="sos-success-contact">Контактов: {contacts.length}</p>
            ) : selectedContactsList.length ? (
              <p className="sos-success-contact">
                Контакты: {selectedContactsList.map((c) => c.contact_name || "Без имени").join(", ")}
              </p>
            ) : null}
            {sosResults && sosResults.length ? (
              <ul className="sos-results-list">
                {sosResults.map((r, i) => (
                  <li key={i}>
                    {r.contact || "?"}: {r.ok ? "Telegram ✓" : r.error || "ошибка"}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="sos-coordinates">
              <span className="coord-label">📍 Координаты (если были переданы):</span>
              <span className="coord-value">
                {lastCoords ? `${lastCoords.latitude.toFixed(6)}, ${lastCoords.longitude.toFixed(6)}` : "—"}
              </span>
            </div>
            <p className="sos-note">
              Для Telegram контакт должен хотя бы раз написать боту. Instagram не отправляется ботом автоматически —
              в тексте уведомления указан @ при наличии.
            </p>
          </div>
        )}
      </div>

      <BottomNav active="sos" />
    </>
  );
}
