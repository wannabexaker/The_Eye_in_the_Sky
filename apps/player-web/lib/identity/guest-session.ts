export const GUEST_MODE_STORAGE_KEY = "eye-in-the-sky-guest-mode";

export const isGuestModeStorageEnabled = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(GUEST_MODE_STORAGE_KEY) === "true";
};

export const setGuestModeStorageFlag = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(GUEST_MODE_STORAGE_KEY, "true");
};

export const clearGuestModeStorageFlag = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(GUEST_MODE_STORAGE_KEY);
};
