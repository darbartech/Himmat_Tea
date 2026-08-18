"use client";

const SOUND_FILE_PATH = "/sounds/notification.mp3";
const STORAGE_KEY_MUTED = "himmat-admin-sound-muted";

let hasUserInteracted = false;
let audioInstance: HTMLAudioElement | null = null;

function ensureInteractionListeners() {
  if (typeof window === "undefined") return;
  if (hasUserInteracted) return;

  const markInteracted = () => {
    hasUserInteracted = true;
    window.removeEventListener("click", markInteracted, true);
    window.removeEventListener("keydown", markInteracted, true);
    window.removeEventListener("touchstart", markInteracted, true);
  };

  window.addEventListener("click", markInteracted, true);
  window.addEventListener("keydown", markInteracted, true);
  window.addEventListener("touchstart", markInteracted, true);
}

if (typeof window !== "undefined") {
  ensureInteractionListeners();
}

function loadAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audioInstance) {
    try {
      audioInstance = new Audio(SOUND_FILE_PATH);
      audioInstance.preload = "auto";
      audioInstance.volume = 0.6;
    } catch {
      audioInstance = null;
    }
  }
  return audioInstance;
}

export function isNotificationSoundMuted(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MUTED);
    return raw === null ? true : raw === "true";
  } catch {
    return true;
  }
}

export function setNotificationSoundMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_MUTED, muted ? "true" : "false");
  } catch {
    /* noop */
  }
}

export async function playNotificationSound(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!hasUserInteracted) return false;
  if (isNotificationSoundMuted()) return false;

  const audio = loadAudio();
  if (!audio) return false;

  try {
    if (!audio.paused) {
      audio.pause();
      audio.currentTime = 0;
    }
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

export function userHasInteracted(): boolean {
  return hasUserInteracted;
}
