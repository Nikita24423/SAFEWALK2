"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "safewalk_role";
const ROLE_CHANGE_EVENT = "safewalk-role-change";
const SHOW_SWITCH_KEY = "safewalk_show_role_switch";
const SWITCH_VISIBILITY_EVENT = "safewalk-role-switch-visibility-change";

function normalizeRole(role) {
  return role === "guardian" ? "guardian" : "peaceful";
}

export default function RoleSwitch({ className = "" }) {
  const [role, setRole] = useState("peaceful");
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    setRole(normalizeRole(saved));
    const savedVisibility = localStorage.getItem(SHOW_SWITCH_KEY);
    setIsVisible(savedVisibility !== "false");

    const onRoleChange = (event) => {
      const nextRole = normalizeRole(event?.detail);
      setRole(nextRole);
    };

    const onVisibilityChange = (event) => {
      setIsVisible(event?.detail !== false);
    };

    const onStorage = (event) => {
      if (event.key === STORAGE_KEY) {
        setRole(normalizeRole(event.newValue));
      }
      if (event.key === SHOW_SWITCH_KEY) {
        setIsVisible(event.newValue !== "false");
      }
    };

    window.addEventListener(ROLE_CHANGE_EVENT, onRoleChange);
    window.addEventListener(SWITCH_VISIBILITY_EVENT, onVisibilityChange);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(ROLE_CHANGE_EVENT, onRoleChange);
      window.removeEventListener(SWITCH_VISIBILITY_EVENT, onVisibilityChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function onChange(nextChecked) {
    const nextRole = nextChecked ? "guardian" : "peaceful";
    const normalized = normalizeRole(nextRole);
    setRole(normalized);
    localStorage.setItem(STORAGE_KEY, normalized);
    window.dispatchEvent(new CustomEvent(ROLE_CHANGE_EVENT, { detail: normalized }));
  }

  if (!isVisible) {
    return null;
  }

  return (
    <div className={className}>
      <input
        className="role-toggle"
        id="role-toggle"
        type="checkbox"
        checked={role === "guardian"}
        onChange={(event) => onChange(event.target.checked)}
      />
      <label className="role-switch" htmlFor="role-toggle">
        <span className="peaceful-text">Мирный</span>
        <span className="guardian-text">Защитник</span>
      </label>
    </div>
  );
}
