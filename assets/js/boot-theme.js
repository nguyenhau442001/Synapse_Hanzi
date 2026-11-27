// Runs synchronously in <head> before first paint (kept out of inline <script> for the CSP).
// 1) Anti-clickjacking: GitHub Pages cannot send X-Frame-Options / frame-ancestors, so a framed
//    copy of the app is hidden and the top window is sent to the real page.
(function () {
  if (window.top === window.self) return;
  document.documentElement.style.display = 'none';
  try { window.top.location.replace(window.self.location.href); } catch (e) { /* stays hidden */ }
})();
// 2) Theme and Han-Viet preference, applied before the stylesheet paints.
(function(){try{var m=localStorage.getItem('hsk_theme_manual');var e=parseInt(localStorage.getItem('hsk_theme_manual_expiry')||'0',10);if(m&&(m==='dark'||m==='light')&&Date.now()<e){document.documentElement.dataset.theme=m;}else{var p=new URLSearchParams(window.location.search).get('theme');if(p==='dark'||p==='light'){document.documentElement.dataset.theme=p;}else{var h=new Date().getHours();var d=(h>=6&&h<18)?'light':'dark';document.documentElement.dataset.theme=d;}}}catch(e){}if(localStorage.getItem('hsk_show_hanviet')==='false'){document.documentElement.classList.add('hide-hanviet');}})();
