"use client";

import { useEffect, useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { useLocale } from "@/components/LocaleProvider";
import { situationMessageKey } from "@/lib/i18n";
import { requestCloseFakeCall, requestOpenFakeCall } from "@/lib/fakeCallEvents";

const PROFILE_KEY = "safewalk_profile";
const ROUTE_HISTORY_KEY = "safewalk_route_history";
const CONTACTS_HISTORY_KEY = "safewalk_contacts_history";
const SOS_TARGETS_KEY = "safewalk_sos_targets";
const FALSE_CALL_HISTORY_KEY = "safewalk_false_call_history";
const SHAKE_SOS_KEY = "safewalk_shake_sos_enabled";
const SHAKE_FAKE_CALL_KEY = "safewalk_shake_fake_call_enabled";
const SHAKE_SEND_SOS_KEY = "safewalk_shake_send_sos_enabled";
const GEO_SEND_KEY = "safewalk_geo_send_enabled";
const GOOGLE_MAPS_SCRIPT_ID = "google-maps-places-script";

const SUBSCRIPTION_PLANS = [
  {
    id: "monthly",
    label: "Monthly",
    price: "$4.99",
    period: "/month",
    stripeLink: "https://buy.stripe.com/test_9B66oH40n8tl70LfOtbZe00",
  },
];

const SITUATION_VALUES = ["late_walk", "stranger_date", "unknown_place", "unplanned_meeting"];

function normalizeSituation(value) {
  if (SITUATION_VALUES.includes(value)) return value;
  if (value === "peaceful") return "late_walk";
  if (value === "guardian") return "stranger_date";
  return "late_walk";
}

/** Без @, trim. */
function normalizeMyTelegramHandle(raw) {
  return String(raw ?? "").trim().replace(/^@+/, "");
}

/**
 * Ошибка на русском или null, если пусто (поле необязательно при сохранении) или формат ок.
 * Правила как у публичного @username в Telegram: 5–32 символа, a–z, 0–9, _.
 */
function getMyTelegramUsernameError(raw, t) {
  const u = normalizeMyTelegramHandle(raw);
  if (u === "") return null;
  if (u.length < 5) {
    return t("errorsTelegramShort");
  }
  if (u.length > 32) {
    return t("errorsTelegramLong");
  }
  if (!/^[a-zA-Z0-9_]+$/.test(u)) {
    return t("errorsTelegramChars");
  }
  return null;
}

const initialProfile = {
  name: "",
  my_telegram_username: "",
  role: "late_walk",
  route: "",
  route_from: "",
  route_to: "",
  contact_name: "",
  emergency_phone: "",
  telegram_username: "",
  instagram_username: "",
  timer_minutes: "5",
  fake_call_melody: "synth",
  fake_call_caller: "Служба безопасности",
};

export default function ProfilePage() {
  const { t, locale, toggleLocale } = useLocale();
  const [profile, setProfile] = useState(initialProfile);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [myTelegramFieldError, setMyTelegramFieldError] = useState("");
  const [shakeSosEnabled, setShakeSosEnabled] = useState(false);
  const [shakeFakeCallEnabled, setShakeFakeCallEnabled] = useState(false);
  const [shakeSendSosEnabled, setShakeSendSosEnabled] = useState(false);
  const [geoSendEnabled, setGeoSendEnabled] = useState(false);
  const [geoStatus, setGeoStatus] = useState("");
  const [geoCoords, setGeoCoords] = useState(null);
  const [showRouteFields, setShowRouteFields] = useState(false);
  const [showContactFields, setShowContactFields] = useState(false);
  const [showTimerFields, setShowTimerFields] = useState(false);
  const [showFalseCallEditor, setShowFalseCallEditor] = useState(false);
  const [falseCallDeleteMode, setFalseCallDeleteMode] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showContactEditor, setShowContactEditor] = useState(false);
  const [contactsHistory, setContactsHistory] = useState([]);
  const [falseCallHistory, setFalseCallHistory] = useState([]);
  const [contactChannels, setContactChannels] = useState({
    phone: true,
    telegram: true,
    instagram: true,
  });
  const [routeHistory, setRouteHistory] = useState([]);
  const [selectedRouteHistoryIndex, setSelectedRouteHistoryIndex] = useState("");
  const [routeHistoryOpen, setRouteHistoryOpen] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(300);
  const [activeFalseCallHistoryIndex, setActiveFalseCallHistoryIndex] = useState(null);
  const [previewingMelody, setPreviewingMelody] = useState(false);
  const routeFromRef = useRef(null);
  const routeToRef = useRef(null);
  const timerSectionRef = useRef(null);
  const geoWatchIdRef = useRef(null);
  const profileRef = useRef(profile);
  const previewFileAudioRef = useRef(null);
  const previewSynthRef = useRef({ ctx: null, osc: null, gain: null });

  useEffect(() => {
    const rawProfile = localStorage.getItem(PROFILE_KEY);

    let parsedProfile = null;

    if (rawProfile) {
      try {
        parsedProfile = JSON.parse(rawProfile);
      } catch (_error) {
        parsedProfile = null;
      }
    }

    setProfile({
      name: parsedProfile?.name ?? "",
      my_telegram_username: parsedProfile?.my_telegram_username ?? "",
      role: normalizeSituation(parsedProfile?.role),
      route: parsedProfile?.route ?? "",
      route_from: parsedProfile?.route_from ?? "",
      route_to: parsedProfile?.route_to ?? "",
      contact_name: parsedProfile?.contact_name ?? "",
      emergency_phone: parsedProfile?.emergency_phone ?? "",
      telegram_username: parsedProfile?.telegram_username ?? "",
      instagram_username: parsedProfile?.instagram_username ?? "",
      timer_minutes: String(parsedProfile?.timer_minutes ?? "5"),
      fake_call_melody: parsedProfile?.fake_call_melody ?? "synth",
      fake_call_caller: parsedProfile?.fake_call_caller ?? "Служба безопасности",
    });
    try {
      const rawHistory = localStorage.getItem(ROUTE_HISTORY_KEY);
      if (rawHistory) {
        const parsed = JSON.parse(rawHistory);
        if (Array.isArray(parsed)) {
          setRouteHistory(parsed);
        }
      }
    } catch (_error) {}
    try {
      const rawContacts = localStorage.getItem(CONTACTS_HISTORY_KEY);
      if (rawContacts) {
        const parsedContacts = JSON.parse(rawContacts);
        if (Array.isArray(parsedContacts)) {
          setContactsHistory(parsedContacts);
        }
      }
    } catch (_error) {}
    try {
      const rawFalseCalls = localStorage.getItem(FALSE_CALL_HISTORY_KEY);
      if (rawFalseCalls) {
        const parsedFalseCalls = JSON.parse(rawFalseCalls);
        if (Array.isArray(parsedFalseCalls)) {
          setFalseCallHistory(parsedFalseCalls);
        }
      }
    } catch (_error) {}
    setShowRouteFields(Boolean(parsedProfile?.route));
    setShowContactFields(Boolean(parsedProfile?.emergency_phone || parsedProfile?.telegram_username));
    setShakeSosEnabled(localStorage.getItem(SHAKE_SOS_KEY) === "true");
    setShakeFakeCallEnabled(localStorage.getItem(SHAKE_FAKE_CALL_KEY) === "true");
    setShakeSendSosEnabled(localStorage.getItem(SHAKE_SEND_SOS_KEY) === "true");
    setGeoSendEnabled(localStorage.getItem(GEO_SEND_KEY) === "true");
  }, []);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    if (!geoSendEnabled) {
      if (geoWatchIdRef.current != null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
      }
      geoWatchIdRef.current = null;
      setGeoStatus("");
      return;
    }

    if (!("geolocation" in navigator)) {
      setGeoStatus(t("profileGeoUnsupported"));
      return;
    }

    setGeoStatus(t("profileGeoRequesting"));
    geoWatchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const next = { lat: position.coords.latitude, lng: position.coords.longitude };
        setGeoCoords(next);
        setGeoStatus(t("profileGeoSending"));
        try {
          localStorage.setItem("safewalk_last_coords", JSON.stringify({ ...next, ts: Date.now() }));
        } catch (_error) {}
      },
      (error) => {
        const message =
          error?.code === 1
            ? t("profileGeoDenied")
            : error?.code === 2
              ? t("profileGeoPosition")
              : t("profileGeoError");
        setGeoStatus(message);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );

    return () => {
      if (geoWatchIdRef.current != null) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
        geoWatchIdRef.current = null;
      }
    };
  }, [geoSendEnabled, t]);

  useEffect(() => {
    const minutes = Number(profile.timer_minutes || 0);
    if (!timerRunning && Number.isFinite(minutes) && minutes > 0) {
      setTimerSecondsLeft(minutes * 60);
    }
  }, [profile.timer_minutes, timerRunning]);

  useEffect(() => {
    if (!saved) {
      return undefined;
    }
    const timer = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [saved]);

  useEffect(() => {
    if (!timerRunning) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setTimerSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          setActiveFalseCallHistoryIndex(null);
          const p = profileRef.current;
          requestOpenFakeCall({
            caller: p.fake_call_caller?.trim() || "Служба безопасности",
            melody: p.fake_call_melody || "synth",
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timerRunning]);

  useEffect(() => {
    return () => {
      if (previewFileAudioRef.current) {
        previewFileAudioRef.current.pause();
        previewFileAudioRef.current.currentTime = 0;
      }
      if (previewSynthRef.current.osc) {
        previewSynthRef.current.osc.stop();
        previewSynthRef.current.osc.disconnect();
        previewSynthRef.current.osc = null;
      }
      if (previewSynthRef.current.gain) {
        previewSynthRef.current.gain.disconnect();
        previewSynthRef.current.gain = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!showRouteFields) {
      return undefined;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return undefined;
    }

    function initAutocomplete() {
      if (!window.google?.maps?.places) {
        return;
      }

      if (routeFromRef.current) {
        const fromAutocomplete = new window.google.maps.places.Autocomplete(routeFromRef.current, {
          types: ["geocode"],
          fields: ["formatted_address"],
        });
        fromAutocomplete.addListener("place_changed", () => {
          const place = fromAutocomplete.getPlace();
          if (place?.formatted_address) {
            setField("route_from", place.formatted_address);
          }
        });
      }

      if (routeToRef.current) {
        const toAutocomplete = new window.google.maps.places.Autocomplete(routeToRef.current, {
          types: ["geocode"],
          fields: ["formatted_address"],
        });
        toAutocomplete.addListener("place_changed", () => {
          const place = toAutocomplete.getPlace();
          if (place?.formatted_address) {
            setField("route_to", place.formatted_address);
          }
        });
      }
    }

    if (window.google?.maps?.places) {
      initAutocomplete();
      return undefined;
    }

    let script = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
    if (!script) {
      script = document.createElement("script");
      script.id = GOOGLE_MAPS_SCRIPT_ID;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    script.addEventListener("load", initAutocomplete);
    return () => {
      script?.removeEventListener("load", initAutocomplete);
    };
  }, [showRouteFields]);

  function setField(field, value) {
    const nextValue = field === "role" ? normalizeSituation(value) : value;
    let routeSnapshot = null;
    setProfile((prev) => {
      const next = { ...prev, [field]: nextValue };
      if (field === "route" || field === "route_from" || field === "route_to") {
        routeSnapshot = next;
      }
      return next;
    });
    if (routeSnapshot) {
      persistRouteFieldsToProfileStorage(
        routeSnapshot.route,
        routeSnapshot.route_from,
        routeSnapshot.route_to,
      );
    }
    if (field === "my_telegram_username") {
      setMyTelegramFieldError("");
      setSaveError("");
    }
  }

  function validateMyTelegramField(value) {
    const err = getMyTelegramUsernameError(value, t);
    setMyTelegramFieldError(err || "");
    return err === null;
  }

  function saveProfile() {
    if (!profile.name.trim()) {
      setSaveError(t("profileSaveEnterName"));
      return;
    }
    const minutesNum = Number(profile.timer_minutes || 0);
    if (!Number.isFinite(minutesNum) || minutesNum < 1) {
      setSaveError(t("profileSaveTimerMin"));
      return;
    }

    const tgErr = getMyTelegramUsernameError(profile.my_telegram_username, t);
    if (tgErr) {
      setMyTelegramFieldError(tgErr);
      setSaveError(tgErr);
      return;
    }

    const data = {
      ...profile,
      name: profile.name.trim(),
      my_telegram_username: normalizeMyTelegramHandle(profile.my_telegram_username),
      role: normalizeSituation(profile.role),
      route: profile.route.trim(),
      route_from: profile.route_from.trim(),
      route_to: profile.route_to.trim(),
      contact_name: profile.contact_name.trim(),
      emergency_phone: profile.emergency_phone.trim(),
      telegram_username: profile.telegram_username.trim(),
      instagram_username: profile.instagram_username.trim(),
      timer_minutes: String(profile.timer_minutes || "5"),
      fake_call_melody: profile.fake_call_melody || "synth",
      fake_call_caller: profile.fake_call_caller?.trim() || "Служба безопасности",
    };
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
      setProfile(data);
      setSaveError("");
      setMyTelegramFieldError("");
      setSaved(true);
    } catch (_error) {
      setSaveError(t("profileSaveFailed"));
    }
  }

  function onSubmit(event) {
    event.preventDefault();
    saveProfile();
  }

  function openPremiumModal() {
    setShowPremiumModal(true);
  }

  function closePremiumModal() {
    setShowPremiumModal(false);
  }

  function openStripeCheckout() {
    const link = SUBSCRIPTION_PLANS[0]?.stripeLink?.trim();
    if (!link) return;
    window.open(link, "_blank", "noopener,noreferrer");
  }

  function onShakeSosChange(event) {
    const nextValue = event.target.checked;
    setShakeSosEnabled(nextValue);
    localStorage.setItem(SHAKE_SOS_KEY, String(nextValue));
  }

  function onShakeFakeCallChange(event) {
    const nextValue = event.target.checked;
    setShakeFakeCallEnabled(nextValue);
    localStorage.setItem(SHAKE_FAKE_CALL_KEY, String(nextValue));
    if (nextValue) {
      persistFakeCallFieldsForShake(profile.fake_call_caller, profile.fake_call_melody);
    }
  }

  /** Маршрут в форме без нажатия «Сохранить профиль» — чтобы SOS и возврат на профиль видели актуальные поля. */
  function persistRouteFieldsToProfileStorage(route, routeFrom, routeTo) {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      let stored = {};
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          stored = parsed;
        }
      }
      localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({
          ...stored,
          route: route ?? "",
          route_from: routeFrom ?? "",
          route_to: routeTo ?? "",
        }),
      );
    } catch (_error) {}
  }

  /** Чтобы ложный звонок по тряске сразу видел актуальные имя/мелодию (GlobalFakeCall читает PROFILE_KEY). */
  function persistFakeCallFieldsForShake(caller, melody) {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      const stored = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({
          ...stored,
          fake_call_caller: String(caller ?? "").trim(),
          fake_call_melody: melody || "synth",
        }),
      );
    } catch (_error) {}
  }

  function onShakeFakeCallCallerChange(event) {
    const v = event.target.value;
    setField("fake_call_caller", v);
    persistFakeCallFieldsForShake(v, profile.fake_call_melody);
  }

  function onShakeFakeCallMelodyChange(event) {
    const v = event.target.value;
    setField("fake_call_melody", v);
    persistFakeCallFieldsForShake(profile.fake_call_caller, v);
    startMelodyPreview(v);
  }

  function onShakeSendSosChange(event) {
    const nextValue = event.target.checked;
    setShakeSendSosEnabled(nextValue);
    localStorage.setItem(SHAKE_SEND_SOS_KEY, String(nextValue));
  }

  function onGeoSendChange(event) {
    const nextValue = event.target.checked;
    setGeoSendEnabled(nextValue);
    localStorage.setItem(GEO_SEND_KEY, String(nextValue));
  }

  function formatSeconds(value) {
    const safe = Math.max(0, Number(value) || 0);
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function startOrStopFalseCallFromHistory(entry, index) {
    const minutes = Number(entry?.timer_minutes || 0);
    const initialSeconds = Number.isFinite(minutes) && minutes > 0 ? minutes * 60 : 0;

    if (timerRunning && activeFalseCallHistoryIndex === index) {
      setTimerRunning(false);
      setActiveFalseCallHistoryIndex(null);
      requestCloseFakeCall();
      setTimerSecondsLeft(initialSeconds);
      return;
    }

    setField("timer_minutes", String(entry?.timer_minutes || "5"));
    setField("fake_call_melody", entry?.fake_call_melody || "synth");
    setField("fake_call_caller", entry?.fake_call_caller || "Служба безопасности");
    requestCloseFakeCall();
    setTimerSecondsLeft(initialSeconds);
    setActiveFalseCallHistoryIndex(index);
    setTimerRunning(initialSeconds > 0);
  }

  function stopMelodyPreview() {
    if (previewFileAudioRef.current) {
      previewFileAudioRef.current.pause();
      previewFileAudioRef.current.currentTime = 0;
    }
    if (previewSynthRef.current.osc) {
      previewSynthRef.current.osc.stop();
      previewSynthRef.current.osc.disconnect();
      previewSynthRef.current.osc = null;
    }
    if (previewSynthRef.current.gain) {
      previewSynthRef.current.gain.disconnect();
      previewSynthRef.current.gain = null;
    }
    setPreviewingMelody(false);
  }

  function startMelodyPreview(melodyValue) {
    stopMelodyPreview();

    if (!melodyValue) {
      return;
    }

    if (melodyValue === "synth") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!previewSynthRef.current.ctx) {
        previewSynthRef.current.ctx = new AudioCtx();
      }
      const ctx = previewSynthRef.current.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = 500;
      gain.gain.value = 0.03;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      previewSynthRef.current.osc = osc;
      previewSynthRef.current.gain = gain;
      setPreviewingMelody(true);
      return;
    }

    previewFileAudioRef.current = new Audio(melodyValue);
    previewFileAudioRef.current.loop = true;
    void previewFileAudioRef.current.play().then(() => setPreviewingMelody(true)).catch(() => {});
  }

  function onMelodyChange(event) {
    const nextValue = event.target.value;
    setField("fake_call_melody", nextValue);
    startMelodyPreview(nextValue);
  }

  function onMelodySelectClick() {
    if (previewingMelody) {
      stopMelodyPreview();
    }
  }

  function openFalseCallSection() {
    if (showTimerFields) {
      setShowTimerFields(false);
      setShowFalseCallEditor(false);
      return;
    }

    setShowTimerFields(true);
    setShowFalseCallEditor(false);
    setTimeout(() => {
      timerSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }

  function saveCurrentFalseCall() {
    const entry = {
      timer_minutes: String(profile.timer_minutes || "5"),
      fake_call_melody: profile.fake_call_melody || "synth",
      fake_call_caller: profile.fake_call_caller?.trim() || "Служба безопасности",
    };
    const next = [entry, ...falseCallHistory].filter(
      (item, index, arr) =>
        arr.findIndex(
          (x) =>
            x.timer_minutes === item.timer_minutes &&
            x.fake_call_melody === item.fake_call_melody &&
            (x.fake_call_caller || "Служба безопасности") === item.fake_call_caller,
        ) === index,
    );
    const limited = next.slice(0, 20);
    setFalseCallHistory(limited);
    localStorage.setItem(FALSE_CALL_HISTORY_KEY, JSON.stringify(limited));
    setShowFalseCallEditor(false);
  }

  function applyFalseCallFromHistory(entry) {
    if (!entry) return;
    setField("timer_minutes", String(entry.timer_minutes || "5"));
    setField("fake_call_melody", entry.fake_call_melody || "synth");
    setField("fake_call_caller", entry.fake_call_caller || "Служба безопасности");
    setShowFalseCallEditor(true);
    setTimeout(() => {
      timerSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }

  function removeFalseCallByIndex(idx) {
    if (idx < 0 || idx >= falseCallHistory.length) return;
    const next = falseCallHistory.filter((_, index) => index !== idx);
    setFalseCallHistory(next);
    localStorage.setItem(FALSE_CALL_HISTORY_KEY, JSON.stringify(next));

    if (timerRunning && activeFalseCallHistoryIndex === idx) {
      setTimerRunning(false);
      setActiveFalseCallHistoryIndex(null);
      requestCloseFakeCall();
      setTimerSecondsLeft(0);
    } else if (timerRunning && activeFalseCallHistoryIndex > idx) {
      setActiveFalseCallHistoryIndex((prev) => (prev == null ? prev : prev - 1));
    }
  }

  function toggleRouteFields() {
    setShowRouteFields((prev) => {
      const next = !prev;
      if (!next) {
        setField("route", "");
        setField("route_from", "");
        setField("route_to", "");
      }
      return next;
    });
  }

  function toggleContactFields() {
    setShowContactFields((prev) => {
      const next = !prev;
      if (!next) {
        setShowContactEditor(false);
      }
      return next;
    });
  }

  function saveCurrentContact() {
    const entry = {
      contact_name: profile.contact_name.trim(),
      emergency_phone: contactChannels.phone ? profile.emergency_phone.trim() : "",
      telegram_username: contactChannels.telegram ? profile.telegram_username.trim() : "",
      instagram_username: contactChannels.instagram ? profile.instagram_username.trim() : "",
    };
    if (
      !entry.contact_name &&
      !entry.emergency_phone &&
      !entry.telegram_username &&
      !entry.instagram_username
    ) {
      return;
    }
    const nextContacts = [entry, ...contactsHistory].filter(
      (item, index, arr) =>
        arr.findIndex(
          (x) =>
            x.contact_name === item.contact_name &&
            x.emergency_phone === item.emergency_phone &&
            x.telegram_username === item.telegram_username &&
            x.instagram_username === item.instagram_username,
        ) === index,
    );
    const limited = nextContacts.slice(0, 20);
    setContactsHistory(limited);
    localStorage.setItem(CONTACTS_HISTORY_KEY, JSON.stringify(limited));
    setShowContactEditor(false);
  }

  function removeContactByIndex(index) {
    setContactsHistory((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const next = prev.filter((_, i) => i !== index);
      try {
        localStorage.setItem(CONTACTS_HISTORY_KEY, JSON.stringify(next));
      } catch (_error) {}
      try {
        const rawPrefs = localStorage.getItem(SOS_TARGETS_KEY);
        if (rawPrefs) {
          const prefs = JSON.parse(rawPrefs);
          if (prefs.mode === "selected" && Array.isArray(prefs.selectedIndices)) {
            const remapped = prefs.selectedIndices
              .filter((i) => i !== index)
              .map((i) => (i > index ? i - 1 : i));
            localStorage.setItem(
              SOS_TARGETS_KEY,
              JSON.stringify({ ...prefs, selectedIndices: remapped }),
            );
          }
        }
      } catch (_error) {}
      return next;
    });
  }

  function applyContactFromHistory(entry) {
    if (!entry) return;
    setField("contact_name", entry.contact_name || "");
    setField("emergency_phone", entry.emergency_phone || "");
    setField("telegram_username", entry.telegram_username || "");
    setField("instagram_username", entry.instagram_username || "");
    setContactChannels({
      phone: Boolean(entry.emergency_phone),
      telegram: Boolean(entry.telegram_username),
      instagram: Boolean(entry.instagram_username),
    });
    setShowContactEditor(true);
  }

  function toggleContactChannel(channel) {
    setContactChannels((prev) => {
      const next = { ...prev, [channel]: !prev[channel] };
      if (!next[channel]) {
        if (channel === "phone") setField("emergency_phone", "");
        if (channel === "telegram") setField("telegram_username", "");
        if (channel === "instagram") setField("instagram_username", "");
      }
      return next;
    });
  }

  function applyRouteFromHistory(entry) {
    if (!entry) return;
    setShowRouteFields(true);
    setField("route", entry.route || "");
    setField("route_from", entry.route_from || "");
    setField("route_to", entry.route_to || "");
  }

  function saveCurrentRoute() {
    const entry = {
      route: profile.route.trim(),
      route_from: profile.route_from.trim(),
      route_to: profile.route_to.trim(),
    };
    if (!entry.route && !entry.route_from && !entry.route_to) {
      return;
    }
    const nextHistory = [entry, ...routeHistory].filter(
      (item, index, arr) =>
        arr.findIndex(
          (x) =>
            x.route === item.route &&
            x.route_from === item.route_from &&
            x.route_to === item.route_to,
        ) === index,
    );
    const limitedHistory = nextHistory.slice(0, 10);
    setRouteHistory(limitedHistory);
    localStorage.setItem(ROUTE_HISTORY_KEY, JSON.stringify(limitedHistory));
    setSelectedRouteHistoryIndex("0");
  }

  function selectRouteHistoryByIndex(index) {
    const indexValue = String(index);
    setSelectedRouteHistoryIndex(indexValue);
    if (index < 0 || index >= routeHistory.length) return;
    applyRouteFromHistory(routeHistory[index]);
    setRouteHistoryOpen(false);
  }

  function removeRouteHistoryByIndex(index) {
    if (index < 0 || index >= routeHistory.length) return;
    const next = routeHistory.filter((_, idx) => idx !== index);
    setRouteHistory(next);
    localStorage.setItem(ROUTE_HISTORY_KEY, JSON.stringify(next));

    if (!next.length) {
      setSelectedRouteHistoryIndex("");
      setRouteHistoryOpen(false);
      return;
    }

    if (Number(selectedRouteHistoryIndex) === index) {
      setSelectedRouteHistoryIndex("");
    } else if (Number(selectedRouteHistoryIndex) > index) {
      setSelectedRouteHistoryIndex(String(Number(selectedRouteHistoryIndex) - 1));
    }
  }

  return (
    <>
      <div className="container">
        <div className="top-bar top-bar-profile">
          <div className="top-bar-profile-actions">
            <button className="btn-payment" type="button" onClick={openPremiumModal}>
              {t("premiumBtn")}
            </button>
            <button
              type="button"
              className={`btn-lang ${locale === "en" ? "btn-lang-active" : ""}`}
              onClick={toggleLocale}
              aria-label={locale === "ru" ? "English" : "Русский"}
            >
              {locale === "ru" ? "EN" : "RUS"}
            </button>
          </div>
        </div>

        <h1>{t("profileTitle")}</h1>

        <form className="profile-form" onSubmit={onSubmit} noValidate>
          <div className="profile-name-row">
            <div>
              <label htmlFor="name">{t("profileName")}</label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder={t("profileNamePh")}
                required
                autoComplete="name"
                value={profile.name}
                onChange={(event) => setField("name", event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="my_telegram_username">{t("profileMyTg")}</label>
              <input
                id="my_telegram_username"
                name="my_telegram_username"
                type="text"
                placeholder={t("profileMyTgPh")}
                autoComplete="off"
                inputMode="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={Boolean(myTelegramFieldError)}
                aria-describedby={myTelegramFieldError ? "my_telegram_username-error" : undefined}
                className={myTelegramFieldError ? "profile-input-invalid" : undefined}
                value={profile.my_telegram_username}
                onChange={(event) => setField("my_telegram_username", event.target.value)}
                onBlur={(event) => validateMyTelegramField(event.target.value)}
              />
              {myTelegramFieldError ? (
                <p id="my_telegram_username-error" className="profile-field-inline-error" role="alert">
                  {myTelegramFieldError}
                </p>
              ) : null}
            </div>
          </div>

          <label htmlFor="role">{t("profileSituation")}</label>
          <select
            id="role"
            name="role"
            required
            value={profile.role}
            onChange={(event) => setField("role", event.target.value)}
          >
            <option value="late_walk">{t(situationMessageKey("late_walk"))}</option>
            <option value="stranger_date">{t(situationMessageKey("stranger_date"))}</option>
            <option value="unknown_place">{t(situationMessageKey("unknown_place"))}</option>
            <option value="unplanned_meeting">{t(situationMessageKey("unplanned_meeting"))}</option>
          </select>

          <div className="add-actions">
            <button type="button" className="btn btn-secondary add-btn" onClick={toggleRouteFields}>
              {t("profileBtnRoute")}
            </button>
            <button type="button" className="btn btn-secondary add-btn" onClick={openFalseCallSection}>
              {t("profileBtnFakeCall")}
            </button>
            <button type="button" className="btn btn-secondary add-btn" onClick={toggleContactFields}>
              {t("profileBtnContacts")}
            </button>
          </div>

          {showRouteFields ? (
            <div className="expand-card">
              <label htmlFor="route">{t("profileRouteName")}</label>
              <input
                id="route"
                name="route"
                type="text"
                placeholder={t("profileRouteNamePh")}
                autoComplete="off"
                value={profile.route}
                onChange={(event) => setField("route", event.target.value)}
              />

              <label htmlFor="route_from">{t("profileRouteFrom")}</label>
              <input
                id="route_from"
                name="route_from"
                type="text"
                placeholder={t("profileRouteFromPh")}
                autoComplete="off"
                ref={routeFromRef}
                value={profile.route_from}
                onChange={(event) => setField("route_from", event.target.value)}
              />

              <label htmlFor="route_to">{t("profileRouteTo")}</label>
              <input
                id="route_to"
                name="route_to"
                type="text"
                placeholder={t("profileRouteToPh")}
                autoComplete="off"
                ref={routeToRef}
                value={profile.route_to}
                onChange={(event) => setField("route_to", event.target.value)}
              />

              <div className="route-actions">
                <button type="button" className="btn btn-primary route-save-btn" onClick={saveCurrentRoute}>
                  {t("profileSaveRoute")}
                </button>
              </div>

              <div className="route-history">
                <div className="route-history-title">{t("profileRouteHistory")}</div>
                <button
                  type="button"
                  className="route-history-trigger"
                  onClick={() => {
                    if (!routeHistory.length) return;
                    setRouteHistoryOpen((prev) => !prev);
                  }}
                  disabled={!routeHistory.length}
                >
                  {routeHistory.length
                    ? selectedRouteHistoryIndex === ""
                      ? t("profilePickRoute")
                      : (routeHistory[Number(selectedRouteHistoryIndex)]?.route || t("profileNoRouteName")) +
                        ": " +
                        (routeHistory[Number(selectedRouteHistoryIndex)]?.route_from || "—") +
                        " → " +
                        (routeHistory[Number(selectedRouteHistoryIndex)]?.route_to || "—")
                    : t("profileNoRoutes")}
                </button>

                {routeHistoryOpen && routeHistory.length ? (
                  <div className="route-history-dropdown">
                    {routeHistory.map((item, index) => (
                      <div className="route-history-row" key={`${item.route}-${item.route_from}-${item.route_to}-${index}`}>
                        <button type="button" className="route-history-option" onClick={() => selectRouteHistoryByIndex(index)}>
                          {(item.route || t("profileNoRouteName")) + ": " + (item.route_from || "—") + " → " + (item.route_to || "—")}
                        </button>
                        <button
                          type="button"
                          className="route-history-delete"
                          aria-label={t("profileDeleteRouteAria")}
                          onClick={() => removeRouteHistoryByIndex(index)}
                        >
                          -
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {showTimerFields ? (
            <div className="expand-card" ref={timerSectionRef}>
              <div className="contacts-head">
                <div className="route-history-title">
                  {falseCallDeleteMode ? t("profileFalseCallsDeleteMode") : t("profileFalseCallsAll")}
                </div>
                <div className="false-call-head-actions">
                  <button type="button" className="btn btn-secondary add-btn" onClick={() => setShowFalseCallEditor((prev) => !prev)}>
                    {t("profileAdd")}
                  </button>
                  <button
                    type="button"
                    className={`btn btn-secondary false-call-delete-btn ${falseCallDeleteMode ? "is-active" : ""}`}
                    onClick={() => setFalseCallDeleteMode((prev) => !prev)}
                    aria-label={falseCallDeleteMode ? t("profileDeleteModeDoneAria") : t("profileDeleteModeAria")}
                  >
                    -
                  </button>
                </div>
              </div>

              {falseCallHistory.length ? (
                <div className="contacts-list">
                  {falseCallHistory.map((item, index) => (
                    <div
                      className="false-call-row"
                      key={`${item.timer_minutes}-${item.fake_call_melody}-${item.fake_call_caller || "caller"}-${index}`}
                    >
                      <button
                        type="button"
                        className={`contact-item ${falseCallDeleteMode ? "is-delete-mode" : ""}`}
                        onClick={() => {
                          if (falseCallDeleteMode) return;
                          applyFalseCallFromHistory(item);
                        }}
                      >
                        <strong>
                          {t("profileTimerPrefix")} {item.timer_minutes} {t("profileTimerMin")}
                        </strong>
                        <span>
                          {t("profileCallerLabel")} {item.fake_call_caller || t("defaultCallerName")}
                        </span>
                        <span>
                          {t("profileMelodyLabel")}{" "}
                          {item.fake_call_melody === "synth" ? t("profileMelodyDefault") : item.fake_call_melody.split("/").pop()}
                        </span>
                      </button>
                      {falseCallDeleteMode ? (
                        <button
                          type="button"
                          className="btn false-call-remove-btn"
                          aria-label={t("profileDeleteFakeCallAria")}
                          onClick={() => removeFalseCallByIndex(index)}
                        >
                          -
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`btn btn-secondary false-call-run-btn ${
                            timerRunning && activeFalseCallHistoryIndex === index ? "is-running" : ""
                          }`}
                          onClick={() => startOrStopFalseCallFromHistory(item, index)}
                        >
                          {timerRunning && activeFalseCallHistoryIndex === index ? (
                            <>
                              <span>{t("profileStop")}</span>
                              <span className="false-call-run-time">{formatSeconds(timerSecondsLeft)}</span>
                            </>
                          ) : (
                            t("profileStart")
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="contacts-empty">{t("profileNoFakeCalls")}</div>
              )}

              {showFalseCallEditor ? (
                <>
                  <label htmlFor="timer_minutes">{t("profileFakeCallMinutes")}</label>
                  <div className="timer-row">
                    <input
                      id="timer_minutes"
                      name="timer_minutes"
                      className="timer-input"
                      type="number"
                      min="1"
                      max="180"
                      step="1"
                      required
                      value={profile.timer_minutes}
                      onChange={(event) => setField("timer_minutes", event.target.value)}
                    />
                    <input
                      id="fake_call_caller"
                      name="fake_call_caller"
                      className="timer-caller-input"
                      type="text"
                      placeholder={t("profileWhoCallsPh")}
                      value={profile.fake_call_caller}
                      onChange={(event) => setField("fake_call_caller", event.target.value)}
                    />
                    <select
                      id="fake_call_melody"
                      name="fake_call_melody"
                      className="timer-melody-select"
                      value={profile.fake_call_melody}
                      onChange={onMelodyChange}
                      onClick={onMelodySelectClick}
                    >
                      <option value="synth">{t("profileMelodyDefault")}</option>
                      <option value="/honor.mp3">Honor</option>
                      <option value="/Huawei.mp3">Huawei</option>
                      <option value="/iphone.mp3">iPhone</option>
                      <option value="/samsung.mp3">Samsung</option>
                      <option value="/vivo.mp3">Vivo</option>
                      <option value="/xiaomi.mp3">Xiaomi</option>
                    </select>
                  </div>
                  <p className="timer-left">
                    {t("profileTimeLeft")} {formatSeconds(timerSecondsLeft)}
                  </p>
                  <div className="route-actions">
                    <button type="button" className="btn btn-primary route-save-btn" onClick={saveCurrentFalseCall}>
                      {t("profileSaveFakeCall")}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {showContactFields ? (
            <div className="expand-card">
              <div className="contacts-head">
                <div className="route-history-title">{t("profileAllContacts")}</div>
                <button type="button" className="btn btn-secondary add-btn" onClick={() => setShowContactEditor((prev) => !prev)}>
                  {t("profileAddContact")}
                </button>
              </div>

              {contactsHistory.length ? (
                <div className="contacts-list">
                  {contactsHistory.map((item, index) => (
                    <div className="contact-row" key={`${item.contact_name}-${item.emergency_phone}-${item.telegram_username}-${item.instagram_username}-${index}`}>
                      <button type="button" className="contact-item" onClick={() => applyContactFromHistory(item)}>
                        <strong>{item.contact_name || t("profileNoName")}</strong>
                        <span>{item.emergency_phone || t("profileNoPhone")}</span>
                        <span>{item.telegram_username || t("profileNoTg")}</span>
                        <span>{item.instagram_username || t("profileNoIg")}</span>
                      </button>
                      <button
                        type="button"
                        className="contact-remove-btn"
                        aria-label={t("profileDeleteContactAria")}
                        onClick={() => removeContactByIndex(index)}
                      >
                        -
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="contacts-empty">{t("profileNoContacts")}</div>
              )}

              {showContactEditor ? (
                <>
                  <div className="contact-channel-grid">
                    <button
                      type="button"
                      className={`contact-channel-btn ${contactChannels.phone ? "is-active" : "is-inactive"}`}
                      onClick={() => toggleContactChannel("phone")}
                      aria-label={t("profilePhoneAria")}
                    >
                      📞
                    </button>
                    <button
                      type="button"
                      className={`contact-channel-btn ${contactChannels.telegram ? "is-active" : "is-inactive"}`}
                      onClick={() => toggleContactChannel("telegram")}
                      aria-label="Telegram"
                    >
                      ✈️
                    </button>
                    <button
                      type="button"
                      className={`contact-channel-btn ${contactChannels.instagram ? "is-active" : "is-inactive"}`}
                      onClick={() => toggleContactChannel("instagram")}
                      aria-label="Instagram"
                    >
                      📸
                    </button>
                  </div>

                  <label htmlFor="contact_name">{t("profileContactName")}</label>
                  <input
                    id="contact_name"
                    name="contact_name"
                    type="text"
                    placeholder={t("profileContactNamePh")}
                    autoComplete="name"
                    value={profile.contact_name}
                    onChange={(event) => setField("contact_name", event.target.value)}
                  />

                  {contactChannels.phone ? (
                    <>
                      <label htmlFor="emergency_phone">{t("profileEmergencyPhone")}</label>
                      <input
                        id="emergency_phone"
                        name="emergency_phone"
                        type="tel"
                        placeholder="+375 (__) ___-__-__"
                        autoComplete="tel"
                        value={profile.emergency_phone}
                        onChange={(event) => setField("emergency_phone", event.target.value)}
                      />
                    </>
                  ) : null}

                  {contactChannels.telegram ? (
                    <>
                      <label htmlFor="telegram_username">{t("profileTgLabel")}</label>
                      <input
                        id="telegram_username"
                        name="telegram_username"
                        type="text"
                        placeholder="@username"
                        autoComplete="off"
                        value={profile.telegram_username}
                        onChange={(event) => setField("telegram_username", event.target.value)}
                      />
                      <p className="profile-telegram-hint">
                        {t("profileTgHintBefore")} <strong>{t("profileTgHintYour")}</strong> {t("profileTgHintAfter")}
                      </p>
                    </>
                  ) : null}

                  {contactChannels.instagram ? (
                    <>
                      <label htmlFor="instagram_username">{t("profileIgLabel")}</label>
                      <input
                        id="instagram_username"
                        name="instagram_username"
                        type="text"
                        placeholder="@instagram"
                        autoComplete="off"
                        value={profile.instagram_username}
                        onChange={(event) => setField("instagram_username", event.target.value)}
                      />
                    </>
                  ) : null}

                  <div className="route-actions">
                    <button type="button" className="btn btn-primary route-save-btn" onClick={saveCurrentContact}>
                      {t("profileSaveContact")}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="switch-row">
            <label className="toggle-switch" htmlFor="shake-sos-switch">
              <input
                id="shake-sos-switch"
                name="shake-sos-switch"
                type="checkbox"
                checked={shakeSosEnabled}
                onChange={onShakeSosChange}
              />
              <span className="toggle-slider" aria-hidden="true" />
            </label>
            <span className="switch-row-text">{t("profileShakeSos")}</span>
          </div>

          <div className="switch-row">
            <label className="toggle-switch" htmlFor="shake-fake-call-switch">
              <input
                id="shake-fake-call-switch"
                name="shake-fake-call-switch"
                type="checkbox"
                checked={shakeFakeCallEnabled}
                onChange={onShakeFakeCallChange}
              />
              <span className="toggle-slider" aria-hidden="true" />
            </label>
            <span className="switch-row-text">{t("profileShakeFake")}</span>
          </div>

          {shakeFakeCallEnabled ? (
            <div className="shake-fake-call-fields">
              <div className="shake-fake-call-row">
                <label htmlFor="shake_fake_call_caller">{t("profileShakeCallerLabel")}</label>
                <input
                  id="shake_fake_call_caller"
                  name="shake_fake_call_caller"
                  type="text"
                  placeholder={t("profileWhoCallsPh")}
                  autoComplete="off"
                  value={profile.fake_call_caller}
                  onChange={onShakeFakeCallCallerChange}
                />
              </div>
              <div className="shake-fake-call-row">
                <label htmlFor="shake_fake_call_melody">{t("profileShakeMelody")}</label>
                <select
                  id="shake_fake_call_melody"
                  name="shake_fake_call_melody"
                  className="shake-fake-call-melody-select"
                  value={profile.fake_call_melody}
                  onChange={onShakeFakeCallMelodyChange}
                  onClick={onMelodySelectClick}
                >
                  <option value="synth">{t("profileMelodyDefault")}</option>
                  <option value="/honor.mp3">Honor</option>
                  <option value="/Huawei.mp3">Huawei</option>
                  <option value="/iphone.mp3">iPhone</option>
                  <option value="/samsung.mp3">Samsung</option>
                  <option value="/vivo.mp3">Vivo</option>
                  <option value="/xiaomi.mp3">Xiaomi</option>
                </select>
              </div>
            </div>
          ) : null}

          <div className="switch-row">
            <label className="toggle-switch" htmlFor="shake-send-sos-switch">
              <input
                id="shake-send-sos-switch"
                name="shake-send-sos-switch"
                type="checkbox"
                checked={shakeSendSosEnabled}
                onChange={onShakeSendSosChange}
              />
              <span className="toggle-slider" aria-hidden="true" />
            </label>
            <span className="switch-row-text">{t("profileShakeSendSos")}</span>
          </div>

          <div className="switch-row">
            <label className="toggle-switch" htmlFor="geo-send-switch">
              <input
                id="geo-send-switch"
                name="geo-send-switch"
                type="checkbox"
                checked={geoSendEnabled}
                onChange={onGeoSendChange}
              />
              <span className="toggle-slider" aria-hidden="true" />
            </label>
            <span className="switch-row-text">{t("profileGeoSend")}</span>
          </div>
          {geoStatus ? <div className="meta">{geoStatus}</div> : null}
          {geoCoords ? (
            <div className="meta">
              {t("profileCoords")} {geoCoords.lat.toFixed(5)}, {geoCoords.lng.toFixed(5)}
            </div>
          ) : null}

          <p className="profile-saved-msg" hidden={!saved}>
            {t("profileSaved")}
          </p>
          {saveError ? <p className="profile-error-msg">{saveError}</p> : null}

          <button className="btn btn-primary profile-save-btn" type="button" onClick={saveProfile}>
            {t("profileSaveBtn")}
          </button>
        </form>
      </div>

      <BottomNav active="profile" />

      {showPremiumModal ? (
        <div
          className="premium-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="premium-modal-title"
          onClick={closePremiumModal}
        >
          <div className="premium-modal-card" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="premium-modal-close" onClick={closePremiumModal} aria-label={t("premiumCloseAria")}>
              ×
            </button>
            <h2 id="premium-modal-title" className="premium-modal-title">
              {t("premiumTitle")}
            </h2>
            <p className="premium-modal-text">{t("premiumText")}</p>
            <p className="premium-modal-price">
              {SUBSCRIPTION_PLANS[0]?.price}
              {SUBSCRIPTION_PLANS[0]?.period}
            </p>
            <div className="premium-modal-actions">
              <button type="button" className="btn btn-primary premium-modal-pay-btn" onClick={openStripeCheckout}>
                {t("premiumPay")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
