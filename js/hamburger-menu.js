document.addEventListener('DOMContentLoaded', function() {
  var h = document.querySelector('.hamburger');
  var n = document.querySelector('.header-nav');
  if (h && n) {
    h.addEventListener('click', function() {
      n.classList.toggle('open');
      h.textContent = n.classList.contains('open') ? '\u2715' : '\u2630';
    });
  }
});
