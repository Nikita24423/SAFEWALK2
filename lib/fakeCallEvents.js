/** События для глобального экрана ложного вызова (см. components/GlobalFakeCall.js). */

export const SAFEWALK_FAKE_CALL_OPEN = "safewalk-open-fake-call";
export const SAFEWALK_FAKE_CALL_CLOSE = "safewalk-close-fake-call";

/**
 * @param {{ caller?: string; melody?: string }} [detail] — иначе подставятся значения из профиля в localStorage
 */
export function requestOpenFakeCall(detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SAFEWALK_FAKE_CALL_OPEN, {
      detail: detail && typeof detail === "object" ? detail : {},
    }),
  );
}

export function requestCloseFakeCall() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SAFEWALK_FAKE_CALL_CLOSE));
}
