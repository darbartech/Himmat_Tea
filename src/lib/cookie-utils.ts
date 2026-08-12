// Cookie utility functions for client-side
export function setCookie(name: string, value: string, days: number = 4): void {
  if (typeof document === 'undefined') return;
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = "expires=" + date.toUTCString();
  document.cookie = name + "=" + encodeURIComponent(value) + ";" + expires + ";path=/;SameSite=Lax;Secure";
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      try {
        return decodeURIComponent(c.substring(nameEQ.length));
      } catch {
        return c.substring(nameEQ.length);
      }
    }
  }
  return null;
}

export function eraseCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = name + '=;Path=/;Expires=Thu, 01 Jan 1970 00:00:00 UTC;SameSite=Lax';
}

export const COOKIE_NAMES = {
  IS_LOGGED_IN: 'himmat_isLoggedIn',
  CURRENT_USER: 'himmat_currentUser'
} as const;
