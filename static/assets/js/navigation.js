const menuToggle = document.getElementById('menu-toggle');
const navigation = document.getElementById('primary-nav');

menuToggle.addEventListener('click', function () {
  const expanded = navigation.classList.toggle('js-menu-is-open');
  menuToggle.setAttribute('aria-expanded', String(expanded));
});
