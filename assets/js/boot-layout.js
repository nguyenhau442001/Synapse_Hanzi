// Runs synchronously as the first child of <body> (kept out of inline <script> for the CSP):
// picks the desktop dock or mobile drawer layout before the app renders.
(function(){
  var mq = window.matchMedia('(min-width: 1280px)');
  function applyLayoutMode(e){
    document.body.classList.toggle('is-desktop-dock', e.matches);
    document.body.classList.toggle('is-mobile-drawer', !e.matches);
  }
  applyLayoutMode(mq);
  mq.addEventListener('change', applyLayoutMode);
})();
