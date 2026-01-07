import Cookies from "js-cookie";

const TOKEN_KEY = "sb-access-token";

export function setAuthCookie(token: string) {
  Cookies.set(TOKEN_KEY, token); // session cookie
}

export function getAuthCookie() {
  return Cookies.get(TOKEN_KEY);
}

export function clearAuthCookie() {
  Cookies.remove(TOKEN_KEY);
}
