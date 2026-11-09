/* PÉTRA ROOFTOP — интерактив: прелоадер, переходы, шапка, меню, анимации, курсор, галерея */
(function () {
  "use strict";

  var doc = document.documentElement;
  var body = document.body;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function store(key, val) {
    try {
      if (val === undefined) return sessionStorage.getItem(key);
      sessionStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  /* ---------- Иконки Lucide ---------- */
  function icons() { if (window.lucide && lucide.createIcons) lucide.createIcons({ attrs: { "stroke-width": 1.5 } }); }
  icons();
  window.addEventListener("load", icons);

  /* ---------- Шторка: прелоадер и переходы ---------- */
  var curtain = document.querySelector(".curtain");
  var firstVisit = !store("petra-visited");

  function liftCurtain() {
    if (!curtain) return;
    curtain.classList.add("is-up");
    body.classList.add("is-ready");
    setTimeout(startPage, reduce ? 0 : 350);
  }

  if (curtain) {
    if (firstVisit && !reduce) {
      store("petra-visited", "1");
      var bar = curtain.querySelector(".curtain__bar i");
      var count = curtain.querySelector(".curtain__count");
      var start = performance.now();
      var minTime = 1700;
      var loaded = document.readyState === "complete";
      window.addEventListener("load", function () { loaded = true; });
      (function tick(now) {
        var t = Math.min((now - start) / minTime, 1);
        var p = loaded ? t : Math.min(t, 0.86);
        var eased = 1 - Math.pow(1 - p, 3);
        if (bar) bar.style.transform = "scaleX(" + eased + ")";
        if (count) count.textContent = String(Math.round(eased * 100)).padStart(3, "0");
        if (p < 1) requestAnimationFrame(tick);
        else setTimeout(liftCurtain, 250);
      })(start);
      // страховка: не держим посетителя дольше 4.5 с
      setTimeout(function () { if (!curtain.classList.contains("is-up")) liftCurtain(); }, 4500);
    } else {
      curtain.classList.add("is-quick");
      // rAF может не срабатывать во фоновой вкладке — дублируем таймером
      var lifted = false;
      var liftOnce = function () { if (!lifted) { lifted = true; liftCurtain(); } };
      requestAnimationFrame(function () { requestAnimationFrame(liftOnce); });
      setTimeout(liftOnce, 120);
    }

    // Переход между страницами
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var href = a.getAttribute("href");
      if (!href || a.target === "_blank" || a.hasAttribute("download")) return;
      if (/^(https?:|tel:|mailto:|#)/i.test(href)) return;
      var url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.hash) return;
      e.preventDefault();
      closeMenu();
      if (reduce) { location.href = a.href; return; }
      curtain.classList.add("is-quick", "is-below");
      curtain.classList.remove("is-up");
      void curtain.offsetWidth;
      curtain.classList.remove("is-below");
      setTimeout(function () { location.href = a.href; }, 900);
    });

    // Возврат кнопкой «назад» из bfcache
    window.addEventListener("pageshow", function (e) {
      if (e.persisted) { curtain.classList.add("is-quick", "is-up"); curtain.classList.remove("is-below"); }
    });
  } else {
    startPage();
  }

  /* ---------- Шапка ---------- */
  var header = document.querySelector(".header");
  var lastY = window.scrollY;
  function onScrollHeader() {
    var y = window.scrollY;
    if (!header) return;
    header.classList.toggle("is-scrolled", y > 40);
    if (!body.classList.contains("is-menu-open")) {
      header.classList.toggle("is-hidden", y > 400 && y > lastY + 2);
      if (y < lastY - 2) header.classList.remove("is-hidden");
    }
    lastY = y;
  }

  /* ---------- Мобильное меню ---------- */
  var burger = document.querySelector(".burger");
  function closeMenu() {
    if (!body.classList.contains("is-menu-open")) return;
    body.classList.remove("is-menu-open", "is-locked");
    if (burger) { burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-label", "Открыть меню"); }
  }
  if (burger) {
    burger.addEventListener("click", function () {
      var open = !body.classList.contains("is-menu-open");
      body.classList.toggle("is-menu-open", open);
      body.classList.toggle("is-locked", open);
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
      if (open) header.classList.remove("is-hidden");
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
    window.addEventListener("resize", function () { if (window.innerWidth > 900) closeMenu(); });
  }

  /* ---------- Разбивка заголовков на слова ---------- */
  function splitWords(el) {
    var walker = function (node, out) {
      node.childNodes.forEach(function (n) {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { out.appendChild(document.createTextNode(" ")); return; }
            var w = document.createElement("span"); w.className = "w";
            var i = document.createElement("span"); i.textContent = part;
            w.appendChild(i); out.appendChild(w);
          });
        } else if (n.nodeType === 1 && n.tagName === "BR") {
          out.appendChild(n.cloneNode());
        } else if (n.nodeType === 1) {
          var clone = n.cloneNode(false);
          walker(n, clone);
          out.appendChild(clone);
        }
      });
    };
    var frag = document.createElement(el.tagName);
    walker(el, frag);
    el.innerHTML = frag.innerHTML;
    el.querySelectorAll(".w > span").forEach(function (s, idx) { s.style.transitionDelay = (idx * 0.06) + "s"; });
  }
  document.querySelectorAll("[data-split]").forEach(function (el) { el.classList.add("split"); splitWords(el); });

  /* ---------- Появление при прокрутке ---------- */
  var io;
  function startPage() {
    if (startPage.done) return;
    startPage.done = true;
    var targets = document.querySelectorAll(".reveal, .split, .reveal-img");
    if (!("IntersectionObserver" in window) || reduce) {
      targets.forEach(function (t) { t.classList.add("is-in"); });
      return;
    }
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* ---------- Параллакс ---------- */
  var parallax = [].slice.call(document.querySelectorAll("[data-parallax]"));
  function onScrollParallax() {
    if (reduce || !parallax.length) return;
    var vh = window.innerHeight;
    parallax.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var speed = parseFloat(el.getAttribute("data-parallax")) || 0.12;
      var progress = (r.top + r.height / 2 - vh / 2) / vh;
      var img = el.querySelector("img") || el;
      img.style.transform = "translate3d(0," + (progress * speed * -100) + "%,0)";
    });
  }

  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { onScrollHeader(); onScrollParallax(); ticking = false; });
  }, { passive: true });
  onScrollHeader(); onScrollParallax();

  /* ---------- Hero-слайдер ---------- */
  var slides = [].slice.call(document.querySelectorAll(".hero__slide"));
  var dots = [].slice.call(document.querySelectorAll(".hero__dot"));
  if (slides.length > 1) {
    var cur = 0, timer;
    var show = function (n) {
      slides[cur].classList.remove("is-active");
      if (dots[cur]) dots[cur].classList.remove("is-active");
      cur = (n + slides.length) % slides.length;
      var img = slides[cur].querySelector("img");
      if (img) { img.style.animation = "none"; void img.offsetWidth; img.style.animation = ""; }
      slides[cur].classList.add("is-active");
      if (dots[cur]) { var i = dots[cur].querySelector("i"); dots[cur].classList.add("is-active"); if (i) { i.style.animation = "none"; void i.offsetWidth; i.style.animation = ""; } }
    };
    var loop = function () { clearInterval(timer); if (!reduce) timer = setInterval(function () { show(cur + 1); }, 7000); };
    dots.forEach(function (d, i) { d.addEventListener("click", function () { show(i); loop(); }); });
    loop();
  }

  /* ---------- Курсор ---------- */
  if (fine && !reduce) {
    var ring = document.createElement("div"); ring.className = "cursor"; ring.innerHTML = "<span>Смотреть</span>";
    var dot = document.createElement("div"); dot.className = "cursor-dot";
    body.appendChild(ring); body.appendChild(dot);
    var mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = "translate3d(" + mx + "px," + my + "px,0)";
    }, { passive: true });
    (function follow() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = "translate3d(" + rx + "px," + ry + "px,0)";
      requestAnimationFrame(follow);
    })();
    document.addEventListener("mouseover", function (e) {
      var view = e.target.closest("[data-cursor='view']");
      var link = e.target.closest("a, button, [role='tab']");
      ring.classList.toggle("is-view", !!view);
      ring.classList.toggle("is-link", !view && !!link);
    });
    document.addEventListener("mouseleave", function () { ring.classList.add("is-hidden"); dot.classList.add("is-hidden"); });
    document.addEventListener("mouseenter", function () { ring.classList.remove("is-hidden"); dot.classList.remove("is-hidden"); });
  }

  /* ---------- Меню: вкладки ---------- */
  var tabs = [].slice.call(document.querySelectorAll(".menu-tab"));
  if (tabs.length) {
    var ink = document.querySelector(".menu-tabs__ink");
    var visuals = [].slice.call(document.querySelectorAll(".menu-visual__frame img"));
    var capName = document.querySelector("[data-visual-caption]");
    var capNum = document.querySelector("[data-visual-num]");
    var tabsWrap = document.querySelector(".menu-tabs-wrap");
    var moveInk = function (tab) {
      if (!ink || !tab) return;
      ink.style.width = tab.offsetWidth + "px";
      ink.style.transform = "translateX(" + tab.offsetLeft + "px)";
    };
    var activate = function (id, scroll) {
      var tab = tabs.filter(function (t) { return t.dataset.tab === id; })[0] || tabs[0];
      id = tab.dataset.tab;
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle("is-active", on);
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
      });
      document.querySelectorAll(".menu-panel").forEach(function (p) { p.classList.toggle("is-active", p.id === "panel-" + id); p.hidden = p.id !== "panel-" + id; });
      visuals.forEach(function (v) { v.classList.toggle("is-active", v.dataset.for === id); });
      var activeImg = visuals.filter(function (v) { return v.dataset.for === id; })[0];
      if (capName && activeImg) capName.textContent = activeImg.alt;
      if (capNum) capNum.textContent = String(tabs.indexOf(tab) + 1).padStart(2, "0") + " / " + String(tabs.length).padStart(2, "0");
      moveInk(tab);
      tab.scrollIntoView({ block: "nearest", inline: "center", behavior: reduce ? "auto" : "smooth" });
      if (history.replaceState) history.replaceState(null, "", "#" + id);
      if (scroll && tabsWrap) {
        var top = tabsWrap.getBoundingClientRect().top + window.scrollY;
        if (window.scrollY > top + 10) window.scrollTo({ top: top, behavior: reduce ? "auto" : "smooth" });
      }
    };
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { activate(t.dataset.tab, true); });
      t.addEventListener("keydown", function (e) {
        var n = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
        if (n === null) return;
        e.preventDefault();
        var next = tabs[(n + tabs.length) % tabs.length];
        next.focus(); activate(next.dataset.tab, false);
      });
    });
    activate((location.hash || "").replace("#", ""), false);
    window.addEventListener("resize", function () { moveInk(document.querySelector(".menu-tab.is-active")); });
    window.addEventListener("load", function () { moveInk(document.querySelector(".menu-tab.is-active")); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { moveInk(document.querySelector(".menu-tab.is-active")); });
  }

  /* ---------- Галерея: фильтры ---------- */
  var items = [].slice.call(document.querySelectorAll(".masonry__item"));
  var filters = [].slice.call(document.querySelectorAll(".filter"));
  filters.forEach(function (f) {
    f.addEventListener("click", function () {
      var cat = f.dataset.filter;
      filters.forEach(function (x) { x.classList.toggle("is-active", x === f); x.setAttribute("aria-pressed", String(x === f)); });
      items.forEach(function (it) {
        var show = cat === "all" || it.dataset.cat === cat;
        it.classList.toggle("is-hidden", !show);
        if (show && !reduce) { it.style.opacity = "0"; it.style.transform = "translateY(20px)"; requestAnimationFrame(function () { requestAnimationFrame(function () { it.style.opacity = ""; it.style.transform = ""; }); }); }
      });
    });
  });

  /* ---------- Лайтбокс ---------- */
  var lb = document.querySelector(".lightbox");
  if (lb) {
    var group = [].slice.call(document.querySelectorAll("[data-lightbox]"));
    var lbImg = lb.querySelector(".lightbox__img");
    var lbCap = lb.querySelector(".lightbox__caption");
    var lbNum = lb.querySelector("[data-lb-current]");
    var lbTotal = lb.querySelector("[data-lb-total]");
    var lbThumbs = lb.querySelector(".lightbox__thumbs");
    var visible = [], idx = 0, lastFocus = null;

    var visibleList = function () { return group.filter(function (g) { return !g.classList.contains("is-hidden"); }); };
    var buildThumbs = function () {
      if (!lbThumbs) return;
      lbThumbs.innerHTML = "";
      visible.forEach(function (g, i) {
        var b = document.createElement("button");
        b.type = "button"; b.setAttribute("aria-label", "Фото " + (i + 1));
        b.innerHTML = '<img src="' + g.getAttribute("href") + '" alt="" loading="lazy">';
        b.addEventListener("click", function () { go(i); });
        lbThumbs.appendChild(b);
      });
    };
    var render = function (instant) {
      var g = visible[idx];
      var src = g.getAttribute("href");
      var cap = g.dataset.caption || "";
      var apply = function () {
        lbImg.src = src; lbImg.alt = cap;
        lbCap.textContent = cap;
        lbNum.textContent = String(idx + 1).padStart(2, "0");
        lbTotal.textContent = String(visible.length).padStart(2, "0");
        if (lbThumbs) [].forEach.call(lbThumbs.children, function (b, i) { b.classList.toggle("is-active", i === idx); if (i === idx) b.scrollIntoView({ block: "nearest", inline: "center" }); });
      };
      if (instant || reduce) { apply(); return; }
      lbImg.classList.add("is-leaving");
      setTimeout(function () {
        apply();
        lbImg.classList.remove("is-leaving"); lbImg.classList.add("is-entering");
        var done = function () { requestAnimationFrame(function () { lbImg.classList.remove("is-entering"); }); };
        if (lbImg.complete) done(); else lbImg.onload = done;
      }, 320);
    };
    var go = function (n) { idx = (n + visible.length) % visible.length; render(false); };
    var open = function (el) {
      visible = visibleList(); idx = Math.max(0, visible.indexOf(el));
      lastFocus = document.activeElement;
      buildThumbs(); render(true);
      lb.classList.add("is-open"); lb.setAttribute("aria-hidden", "false");
      body.classList.add("is-locked");
      lb.querySelector("[data-lb-close]").focus();
    };
    var close = function () {
      lb.classList.remove("is-open"); lb.setAttribute("aria-hidden", "true");
      body.classList.remove("is-locked");
      if (lastFocus) lastFocus.focus();
    };
    group.forEach(function (g) { g.addEventListener("click", function (e) { e.preventDefault(); open(g); }); });
    lb.querySelector("[data-lb-close]").addEventListener("click", close);
    lb.querySelector("[data-lb-prev]").addEventListener("click", function () { go(idx - 1); });
    lb.querySelector("[data-lb-next]").addEventListener("click", function () { go(idx + 1); });
    lb.querySelector(".lightbox__stage").addEventListener("click", function (e) { if (e.target === e.currentTarget) close(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") go(idx + 1);
      if (e.key === "ArrowLeft") go(idx - 1);
    });
    var sx = 0, sy = 0;
    lb.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? idx + 1 : idx - 1);
    }, { passive: true });
  }

  /* ---------- Год в подвале ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
