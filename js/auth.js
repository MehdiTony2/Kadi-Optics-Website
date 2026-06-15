/* Auth guard — runs immediately on every protected page */
(function () {
  if (localStorage.getItem('kadi_access') !== 'granted') {
    window.location.replace(
      '/login.html?next=' + encodeURIComponent(window.location.pathname)
    );
  }
})();

function logout() {
  localStorage.removeItem('kadi_access');
  window.location.href = '/login.html';
}
