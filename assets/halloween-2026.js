/* Homepage celebration only. Denver is UTC-06 throughout this window. */
(function () {
  "use strict";
  var start = Date.parse("2026-10-31T00:00:00-06:00");
  var end = Date.parse("2026-11-01T00:01:00-06:00");
  function active(now) { return now >= start && now < end; }
  if (!/^\/(?:index\.html)?$/.test(location.pathname) || !active(Date.now())) return;
  var style = document.createElement("style");
  style.id = "gah-halloween-style";
  style.textContent = `
html.gah-halloween{--page:#100d18;--paper:#1c1627;--ink:#fff2df;--slate:#d4c5df;--gold:#ffad56;--line:#513747;background:#100d18}
.gah-halloween body.home-064{background:radial-gradient(ellipse at top right,#382046 0,transparent 50%),#100d18;color:#fff2df}
.gah-halloween .site-header{background:#17101fee;border-bottom:1px solid #b86634}
.gah-halloween .brand-mark{background:#ffad56;color:#201020;box-shadow:0 0 24px #ff8a3433}
.gah-halloween .site-header a,.gah-halloween .site-header .brand-copy strong{color:#fff2df}
.gah-halloween .home-news-card,.gah-halloween .home-research-panel,.gah-halloween .home-series,.gah-halloween .home-paths>a,.gah-halloween .home-more{background:#1c1627;border-color:#513747}
.gah-halloween .hero:after{background:linear-gradient(90deg,#130d20ed,#1f1027a8)}
.gah-halloween .hero em{color:#ffad56}
.gah-halloween .btn-primary{background:#ffad56;color:#211121;border-color:#ffad56}
.gah-halloween .section-head h2{color:#fff2df}
.gah-halloween a:focus-visible,.gah-halloween button:focus-visible{outline:3px solid #ffbd79;outline-offset:4px}
#gah-halloween{position:relative;isolation:isolate;overflow:hidden;background:radial-gradient(ellipse at 85% 20%,#512d60,transparent 46%),linear-gradient(120deg,#1d1429,#110f1c);border-bottom:1px solid #935b3e;padding:clamp(2.5rem,6vw,5rem) 1.25rem;text-align:center;color:#fff2df}
#gah-halloween .hw-kicker{font:700 .75rem/1.5 system-ui,sans-serif;letter-spacing:.25em;text-transform:uppercase;color:#ffc078;margin:0 0 1rem}
#gah-halloween h2{position:relative;z-index:1;font:700 clamp(2rem,5.7vw,4.8rem)/1.08 Georgia,serif;letter-spacing:-.025em;max-width:1000px;margin:0 auto;text-wrap:balance;color:#fff2df}
#gah-halloween h2 span{color:#ffad56}
#gah-halloween .hw-note{position:relative;z-index:1;font:400 1rem/1.6 system-ui,sans-serif;color:#dfcee9;margin:1.25rem 0 0}
#gah-halloween .hw-moon{position:absolute;right:6%;top:-26px;width:150px;height:150px;border-radius:50%;background:#ffd5a2;box-shadow:0 0 70px #ffb76533;opacity:.16;z-index:-1}
#gah-halloween .hw-pumpkin{display:inline-block;font-size:2.3rem;line-height:1;margin-bottom:1rem}
#gah-halloween .hw-bat{position:absolute;width:70px;fill:#09070e;opacity:.75}
#gah-halloween .hw-bat.one{left:6%;top:20%;transform:rotate(-17deg)}
#gah-halloween .hw-bat.two{right:12%;bottom:15%;width:45px;transform:rotate(13deg)}
@media(max-width:600px){#gah-halloween .hw-bat{opacity:.3;width:40px}#gah-halloween .hw-note{font-size:.9rem}}
`;
  var banner = document.createElement("section");
  banner.id = "gah-halloween";
  banner.setAttribute("aria-label", "Halloween dedication");
  banner.innerHTML = '<div class="hw-moon" aria-hidden="true"></div><svg class="hw-bat one" viewBox="0 0 100 50" aria-hidden="true"><path d="M0 0Q25 15 38 8L44 18L47 9L50 18L55 9L58 18L64 8Q80 15 100 0L90 35Q72 20 65 42Q55 28 50 50Q44 28 35 42Q27 20 10 35Z"/></svg><svg class="hw-bat two" viewBox="0 0 100 50" aria-hidden="true"><path d="M0 0Q25 15 38 8L44 18L47 9L50 18L55 9L58 18L64 8Q80 15 100 0L90 35Q72 20 65 42Q55 28 50 50Q44 28 35 42Q27 20 10 35Z"/></svg><div class="hw-pumpkin" aria-hidden="true">🎃</div><p class="hw-kicker">October 31 · One night only</p><h2>Dedicated to all the <span>Monsters, Ghouls, and Goblins.</span></h2><p class="hw-note">Happy Halloween from Grok Archive Hub.</p>';
  document.head.appendChild(style);
  document.documentElement.classList.add("gah-halloween");
  document.querySelector("main").prepend(banner);
  var timer;
  function expire() {
    if (active(Date.now())) return;
    banner.remove();
    style.remove();
    document.documentElement.classList.remove("gah-halloween");
    clearInterval(timer);
    document.removeEventListener("visibilitychange", expire);
    window.removeEventListener("pageshow", expire);
  }
  timer = setInterval(expire, 1000);
  setTimeout(expire, Math.max(0, end - Date.now()));
  document.addEventListener("visibilitychange", expire);
  window.addEventListener("pageshow", expire);
})();
