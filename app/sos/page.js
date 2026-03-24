"use client";

import { useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/BottomNav";

const CONTACTS_HISTORY_KEY = "safewalk_contacts_history";

export default function SosPage() {
  const [sent, setSent] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [selectedContactIndex, setSelectedContactIndex] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONTACTS_HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setContacts(parsed);
      }
    } catch (_error) {}
  }, []);

  const selectedContact = useMemo(() => {
    const index = Number(selectedContactIndex);
    if (!Number.isFinite(index) || index < 0 || index >= contacts.length) return null;
    return contacts[index];
  }, [contacts, selectedContactIndex]);

  return (
    <>
      <div className="sos-container">
        {!sent ? (
          <div className="sos-initial">
            <div className="sos-contact-picker">
              <label htmlFor="sos-contact-select">Контакт для SOS</label>
              <select
                id="sos-contact-select"
                value={selectedContactIndex}
                onChange={(event) => setSelectedContactIndex(event.target.value)}
                disabled={!contacts.length}
              >
                {!contacts.length ? (
                  <option value="">Нет контактов</option>
                ) : (
                  <>
                    <option value="">Выберите контакт</option>
                    {contacts.map((item, index) => (
                      <option key={`${item.contact_name}-${item.emergency_phone}-${item.telegram_username}-${index}`} value={String(index)}>
                        {item.contact_name || "Без имени"}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <button type="button" className="sos-button" onClick={() => setSent(true)}>
              <span className="sos-text">SOS</span>
              <span className="sos-subtitle">Позвать на помощь</span>
            </button>
          </div>
        ) : (
          <div className="sos-sent sos-sent-visible">
            <div className="sos-success-icon">🚨</div>
            <h1 className="sos-success-title">SOS отправлен!</h1>
            <p className="sos-success-message">Ваши координаты переданы хранителю</p>
            {selectedContact ? (
              <p className="sos-success-contact">
                Контакт: {selectedContact.contact_name || "Без имени"}
              </p>
            ) : null}
            <div className="sos-coordinates">
              <span className="coord-label">📍 Текущее местоположение:</span>
              <span className="coord-value">53.9006, 27.5590</span>
            </div>
            <p className="sos-note">Хранитель получил уведомление и отслеживает ваш маршрут</p>
          </div>
        )}
      </div>

      <BottomNav active="sos" />
    </>
  );
}
