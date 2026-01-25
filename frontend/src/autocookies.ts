import Cookies from "js-cookie";

const TOKEN_KEY = "sb_access_token";

/**
 * Session cookie (deleted on tab/browser close)
 */
export function setAuthCookie(token: string) {
  Cookies.set(TOKEN_KEY, token, {
    sameSite: "strict",
    secure: false, // true in production (HTTPS)
  });
}

export function getAuthCookie() {
  return Cookies.get(TOKEN_KEY);
}

export function clearAuthCookie() {
  Cookies.remove(TOKEN_KEY);
}
