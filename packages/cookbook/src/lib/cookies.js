export function getCookie(name) {
  const val = document.cookie.match(`(^|;) ?${name}=([^;]*)(;|$)`);

  return val ? val[2] : null;
}

export function setCookie(name, value, maxAge) {
  document.cookie = `${name}=${value};path=/;max-age=${maxAge};samesite=lax`;
}

export function deleteCookie(name) {
  setCookie(name, "", -1);
}
