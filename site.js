(function () {
        'use strict';
        var root = document.documentElement;

        /* ==== НАЛАШТУВАННЯ (змінюйте тут) ==== */
        var CONFIG = {
            telegram: 'likarchuk',
            instagram: 'marina.likarchuk',
            emailUser: 'likarchukmarin',      /* частина до @ */
            emailDomain: 'gmail.com',    /* частина після @ */
            goatcounter: ''              /* код лічильника GoatCounter, напр. 'marynalikarchuk' (порожньо = вимкнено) */
        };
        var EMAIL = CONFIG.emailUser + '@' + CONFIG.emailDomain;
        var $ = function (s, c) { return (c || document).querySelector(s); };
        var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
        var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

        /* ---------- Розбиття заголовків на слова ---------- */
        $$('.split').forEach(function (el) {
            var i = 0;
            (function walk(node) {
                Array.prototype.slice.call(node.childNodes).forEach(function (n) {
                    if (n.nodeType === 3) {
                        var frag = document.createDocumentFragment();
                        var SHORT = /^[^A-Za-zА-Яа-яІіЇїЄєҐґ]*[A-Za-zА-Яа-яІіЇїЄєҐґ]{1,2}[^A-Za-zА-Яа-яІіЇїЄєҐґ]*$/;
                        var pend = '';
                        function word(txt) {
                            var w = document.createElement('span'); w.className = 'w';
                            var wi = document.createElement('span'); wi.className = 'wi';
                            wi.style.setProperty('--i', i++); wi.textContent = txt;
                            w.appendChild(wi); frag.appendChild(w);
                        }
                        n.textContent.split(/(\s+)/).forEach(function (p) {
                            if (!p) return;
                            if (/^\s+$/.test(p)) { if (!pend) frag.appendChild(document.createTextNode(' ')); return; }
                            if (SHORT.test(p)) { pend += p + '\u00A0'; return; }
                            word(pend + p); pend = '';
                        });
                        if (pend) word(pend.replace(/\u00A0$/, ''));
                        n.parentNode.replaceChild(frag, n);
                    } else if (n.nodeType === 1) { walk(n); }
                });
            })(el);
        });

        /* ---------- Поява елементів при скролі ---------- */
        function initReveal() {
            var els = $$('.rv, .split');
            if (!('IntersectionObserver' in window) || reduce) { els.forEach(function (e) { e.classList.add('in'); }); return; }
            var io = new IntersectionObserver(function (es) {
                es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
            }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
            els.forEach(function (e) { io.observe(e); });
        }

        /* ---------- Заставка з кицею: не зависає, плавно зникає ---------- */
        var intro = $('#intro'), t0 = performance.now(), introDone = false;
        var skipIntro = root.classList.contains('skip-intro');
        function finishIntro() {
            if (introDone) return; introDone = true;
            try { sessionStorage.setItem('introSeen', '1'); } catch (e) {}
            if (intro) { intro.classList.add('hide'); intro.setAttribute('aria-hidden', 'true'); }
            setTimeout(initReveal, intro && !skipIntro ? 380 : 0);
            setTimeout(function () { if (intro) intro.remove(); startCordHint(); }, intro && !skipIntro ? 900 : 0);
        }
        function scheduleIntro() { setTimeout(finishIntro, skipIntro ? 0 : Math.max(0, 1200 - (performance.now() - t0))); }
        if (document.readyState === 'complete') scheduleIntro(); else window.addEventListener('load', scheduleIntro);
        setTimeout(finishIntro, 3500);
        if (intro) intro.addEventListener('click', finishIntro);

        /* ---------- Лічильники ---------- */
        function fmt(n, dec) { return dec ? String(n).replace('.', ',') : String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0'); }
        var canAnimate = 'IntersectionObserver' in window && !reduce;
        $$('.stat-counter').forEach(function (c) {
            var end = parseFloat(c.getAttribute('data-target')), dec = c.getAttribute('data-decimal') === 'true';
            c.textContent = fmt(end, dec);
            if (!canAnimate) return;
            c.textContent = dec ? '0,0' : '0';
        });
        function animateValue(obj, end, dur, dec) {
            var st = null;
            function step(ts) {
                if (!st) st = ts;
                var p = Math.min((ts - st) / dur, 1), e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p), v = e * end;
                obj.textContent = dec ? v.toFixed(1).replace('.', ',') : fmt(v);
                if (p < 1) requestAnimationFrame(step); else obj.textContent = fmt(end, dec);
            }
            requestAnimationFrame(step);
        }
        var stats = $('#stats');
        if (stats && canAnimate) {
            var so = new IntersectionObserver(function (es, ob) {
                es.forEach(function (en) {
                    if (!en.isIntersecting) return;
                    $$('.stat-counter', en.target).forEach(function (c) {
                        animateValue(c, parseFloat(c.getAttribute('data-target')), 2200, c.getAttribute('data-decimal') === 'true');
                    });
                    ob.unobserve(en.target);
                });
            }, { threshold: 0.4 });
            so.observe(stats);
        }

        /* ---------- Бігучий рядок: дублюємо для безшовності ---------- */
        var track = $('#track'); if (track) track.innerHTML += track.innerHTML;

        /* ---------- Тема: шнурок, тап, клавіатура, плавний перехід ---------- */
        var cord = $('#pullCord'), cordLine = $('#cordLine'), cordHandle = $('#cordHandle');
        var startY = 0, dragging = false, curY = 0, maxPull = 0, baseH = 64;
        var isDark = root.classList.contains('dark');
        cord.setAttribute('aria-checked', isDark ? 'true' : 'false');
        var liquidColor = [222, 211, 166];
        function readLiquidColor() {
            var v = getComputedStyle(root).getPropertyValue('--accent2').trim();
            var m = /^#?([0-9a-f]{6})$/i.exec(v);
            if (m) { var n = parseInt(m[1], 16); liquidColor = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
        }
        function applyTheme(dark) {
            isDark = dark;
            cord.setAttribute('aria-checked', dark ? 'true' : 'false');
            root.classList.toggle('dark', dark);
            try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
            var meta = $('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', dark ? '#12261F' : '#F5F0E6');
            readLiquidColor();
        }
        function toggleTheme() {
            var next = !isDark;
            if (!document.startViewTransition || reduce) { applyTheme(next); return; }
            var r = cordHandle.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
            var rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
            var vt = document.startViewTransition(function () { applyTheme(next); });
            vt.ready.then(function () {
                root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + rad + 'px at ' + x + 'px ' + y + 'px)'] },
                    { duration: 700, easing: 'cubic-bezier(.2,.7,.2,1)', pseudoElement: '::view-transition-new(root)' });
            }).catch(function () {});
        }
        function stopCordHint() { cord.classList.remove('cord-nudge'); }
        function startCordHint() { if (!reduce) cord.classList.add('cord-nudge'); }
        cordLine.addEventListener('animationend', stopCordHint);
        cord.addEventListener('pointerdown', function (e) {
            stopCordHint(); dragging = true; maxPull = 0; startY = e.clientY - curY;
            cordLine.style.transition = 'none'; cordHandle.style.transition = 'none'; cord.style.cursor = 'grabbing';
            e.preventDefault();
        });
        window.addEventListener('pointermove', function (e) {
            if (!dragging) return;
            curY = Math.max(0, e.clientY - startY);
            if (curY > maxPull) maxPull = curY;
            var pull = curY > 40 ? 40 + (curY - 40) * 0.3 : curY;
            cordLine.style.height = (baseH + pull) + 'px';
        });
        function release(allow) {
            if (!dragging) return;
            dragging = false; cord.style.cursor = 'grab';
            cordLine.style.transition = 'height .6s cubic-bezier(.175,.885,.32,1.275)';
            cordHandle.style.transition = 'transform .3s ease, background-color .5s';
            cordLine.style.height = baseH + 'px';
            var pulled = curY > 60, tapped = maxPull < 8;
            curY = 0; maxPull = 0;
            if (allow && (pulled || tapped)) toggleTheme();
        }
        window.addEventListener('pointerup', function () { release(true); });
        window.addEventListener('pointercancel', function () { release(false); });
        cord.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stopCordHint(); toggleTheme(); }
        });

        /* ---------- Мобільне меню ---------- */
        var hdr = $('#siteHeader'), menuBtn = $('#menuBtn'), mmenu = $('#mobileMenu');
        function setMenu(open) {
            mmenu.classList.toggle('open', open);
            menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
            menuBtn.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
            document.body.style.overflow = open ? 'hidden' : '';
            document.body.classList.toggle('menu-open', open);
            var m = $('main'), f = $('footer'); if (m) m.inert = open; if (f) f.inert = open;
            if (open) { var first = $('a', mmenu); if (first) setTimeout(function () { first.focus(); }, 60); }
        }
        menuBtn.addEventListener('click', function () { setMenu(!mmenu.classList.contains('open')); });
        $$('a', mmenu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mmenu.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });
        window.matchMedia('(min-width: 900px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });

        /* ---------- «Про мене»: розкриття карток ---------- */
        $$('.acc').forEach(function (acc) {
            var btn = $('.acc-head', acc);
            btn.addEventListener('click', function () {
                var open = !acc.classList.contains('open');
                acc.classList.toggle('open', open);
                btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
        });

        /* ---------- Кейси: вкладки ---------- */
        var tabs = $$('[role="tab"]');
        function selectTab(i, focus) {
            tabs.forEach(function (t, j) {
                var on = i === j;
                t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1;
                $('#' + t.getAttribute('aria-controls')).hidden = !on;
            });
            if (focus) tabs[i].focus();
        }
        tabs.forEach(function (t, i) {
            t.addEventListener('click', function () { selectTab(i); });
            t.addEventListener('keydown', function (e) {
                var k = e.key, n = tabs.length;
                if (k === 'ArrowDown' || k === 'ArrowRight') { e.preventDefault(); selectTab((i + 1) % n, true); }
                else if (k === 'ArrowUp' || k === 'ArrowLeft') { e.preventDefault(); selectTab((i - 1 + n) % n, true); }
                else if (k === 'Home') { e.preventDefault(); selectTab(0, true); }
                else if (k === 'End') { e.preventDefault(); selectTab(n - 1, true); }
            });
        });

        /* ---------- Копіювання Telegram ---------- */
        var copyTimer;
        function copyTelegram(username) {
            var text = '@' + username, tip = $('#copyTip'), live = $('#copyText');
            function done(msg) {
                tip.textContent = msg; tip.classList.add('on'); live.textContent = msg;
                clearTimeout(copyTimer); copyTimer = setTimeout(function () { tip.classList.remove('on'); live.textContent = ''; }, 1800);
            }
            function fallback() {
                try {
                    var ta = document.createElement('textarea');
                    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0';
                    document.body.appendChild(ta); ta.select();
                    var ok = document.execCommand('copy'); document.body.removeChild(ta);
                    done(ok ? 'Скопійовано ' + text : text);
                } catch (err) { done(text); }
            }
            if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { done('Скопійовано ' + text); }).catch(fallback);
            else fallback();
        }
        var copyBtn = $('#copyBtn'); if (copyBtn) copyBtn.addEventListener('click', function () { copyTelegram('likarchuk'); });

        /* ---------- Spotlight на картках ---------- */
        if (finePointer) {
            document.addEventListener('pointermove', function (e) {
                var el = e.target.closest && e.target.closest('.spot');
                if (!el) return;
                var r = el.getBoundingClientRect();
                el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
                el.style.setProperty('--my', (e.clientY - r.top) + 'px');
            }, { passive: true });
        }

        /* ---------- Хвилі від кліку та від кнопок ---------- */
        if (!reduce) {
            document.addEventListener('pointerdown', function (e) {
                if (e.target.closest && e.target.closest('#pullCord')) return;
                [0, 1].forEach(function (k) {
                    var w = document.createElement('span'); w.className = 'wave' + (k ? ' w2' : '');
                    w.style.left = e.clientX + 'px'; w.style.top = e.clientY + 'px';
                    w.addEventListener('animationend', function () { w.remove(); });
                    document.body.appendChild(w);
                });
                var btn = e.target.closest && e.target.closest('.btn');
                if (btn) {
                    var r = btn.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2;
                    var s = document.createElement('span'); s.className = 'rip';
                    s.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px';
                    s.addEventListener('animationend', function () { s.remove(); });
                    btn.appendChild(s);
                }
            }, { passive: true });
        }

        /* ---------- Магнітні кнопки ---------- */
        if (finePointer && !reduce) {
            $$('.magnetic').forEach(function (el) {
                el.addEventListener('pointermove', function (e) {
                    var r = el.getBoundingClientRect();
                    el.style.translate = ((e.clientX - (r.left + r.width / 2)) * 0.28).toFixed(1) + 'px ' + ((e.clientY - (r.top + r.height / 2)) * 0.34).toFixed(1) + 'px';
                });
                el.addEventListener('pointerleave', function () { el.style.translate = ''; });
            });
        }

        /* ---------- 3D-нахил та глибина (паралакс від курсору) ---------- */
        if (finePointer && !reduce) {
            $$('[data-tilt]').forEach(function (stage) {
                var body = $('.pwrap', stage) || stage;
                var chips = $$('[data-depth]', stage);
                stage.addEventListener('pointermove', function (e) {
                    var r = stage.getBoundingClientRect();
                    var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
                    body.style.transition = 'transform .12s linear';
                    body.style.transform = 'rotateX(' + (-py * 9).toFixed(2) + 'deg) rotateY(' + (px * 11).toFixed(2) + 'deg)';
                    chips.forEach(function (c) { var d = +c.getAttribute('data-depth'); c.style.translate = (px * d).toFixed(1) + 'px ' + (py * d).toFixed(1) + 'px'; });
                });
                stage.addEventListener('pointerleave', function () {
                    body.style.transition = 'transform .7s cubic-bezier(.2,.8,.2,1)'; body.style.transform = '';
                    chips.forEach(function (c) { c.style.translate = ''; });
                });
            });
        }

        /* ---------- Скрол: шапка, прогрес, паралакс ---------- */
        var prog = $('#progress'), parEls = $$('[data-speed]'), blobs = $$('[data-bg]');
        var mx = 0, my = 0, tx = 0, ty = 0, ticking = false;
        function frame() {
            ticking = false;
            var sy = window.pageYOffset || 0, vh = window.innerHeight;
            hdr.classList.toggle('scrolled', sy > 24);
            var max = document.documentElement.scrollHeight - vh;
            prog.style.transform = 'scaleX(' + (max > 0 ? Math.min(sy / max, 1) : 0) + ')';
            if (reduce) return;
            parEls.forEach(function (el) {
                var host = el.closest('.card, .scard, section') || el.parentElement, r = host.getBoundingClientRect();
                if (r.bottom < -200 || r.top > vh + 200) return;
                el.style.translate = '0 ' + (((r.top + r.height / 2) - vh / 2) * parseFloat(el.getAttribute('data-speed'))).toFixed(1) + 'px';
            });
            mx += (tx - mx) * 0.08; my += (ty - my) * 0.08;
            blobs.forEach(function (b) {
                var k = parseFloat(b.getAttribute('data-bg'));
                b.style.translate = (mx * k * 900).toFixed(1) + 'px ' + (sy * -k * 1.4 + my * k * 900).toFixed(1) + 'px';
            });
            if (Math.abs(tx - mx) > 0.0005 || Math.abs(ty - my) > 0.0005) request();
        }
        function request() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
        window.addEventListener('scroll', request, { passive: true });
        window.addEventListener('resize', request);
        if (finePointer && !reduce) {
            window.addEventListener('pointermove', function (e) { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; request(); }, { passive: true });
        }
        request();

        /* ---------- Рідкий курсор (канвас, лише для миші) ---------- */
        (function () {
            var c = $('#liquid');
            if (!c || !finePointer || reduce || !c.getContext) return;
            var ctx = c.getContext('2d'), pts = [], raf = 0, lx = -1, ly = -1, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            function size() { c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
            size(); window.addEventListener('resize', size); readLiquidColor();
            function add(x, y, speed) { pts.push({ x: x, y: y, r: Math.min(20 + speed * 0.55, 54), life: 1 }); if (pts.length > 70) pts.shift(); }
            window.addEventListener('pointermove', function (e) {
                if (lx >= 0) {
                    var dx = e.clientX - lx, dy = e.clientY - ly, d = Math.hypot(dx, dy), n = Math.max(1, Math.floor(d / 14));
                    for (var i = 1; i <= n; i++) add(lx + dx * i / n, ly + dy * i / n, d);
                }
                lx = e.clientX; ly = e.clientY;
                if (!raf) raf = requestAnimationFrame(draw);
            }, { passive: true });
            function draw() {
                ctx.clearRect(0, 0, innerWidth, innerHeight);
                var col = liquidColor.join(',');
                for (var i = pts.length - 1; i >= 0; i--) {
                    var p = pts[i]; p.life -= 0.028; p.r *= 0.992;
                    if (p.life <= 0) { pts.splice(i, 1); continue; }
                    var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
                    g.addColorStop(0, 'rgba(' + col + ',' + (0.22 * p.life * p.life).toFixed(3) + ')');
                    g.addColorStop(1, 'rgba(' + col + ',0)');
                    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
                }
                raf = pts.length && !document.hidden ? requestAnimationFrame(draw) : 0;
            }
        })();

        /* ---------- Краплі води у блоці контактів ---------- */
        (function () {
            var sec = $('#contact');
            if (!sec || !finePointer || reduce) return;
            var last = 0;
            sec.addEventListener('pointermove', function (e) {
                var now = performance.now(); if (now - last < 150) return; last = now;
                var r = sec.getBoundingClientRect(), w = document.createElement('span');
                w.className = 'wave sm'; w.style.left = (e.clientX - r.left) + 'px'; w.style.top = (e.clientY - r.top) + 'px';
                w.addEventListener('animationend', function () { w.remove(); });
                sec.appendChild(w);
            }, { passive: true });
        })();

        /* ---------- Плаваюча кнопка (телефони): після героя і до контактів ---------- */
        (function () {
            var fab = $('#fab'), hero = $('#top'), contact = $('#contact');
            if (!fab || !hero || !contact || !('IntersectionObserver' in window)) return;
            var inHero = true, inContact = false;
            function upd() { fab.classList.toggle('show', !inHero && !inContact); }
            new IntersectionObserver(function (es) { inHero = es[0].isIntersecting; upd(); }, { threshold: 0.35 }).observe(hero);
            new IntersectionObserver(function (es) { inContact = es[0].isIntersecting; upd(); }, { threshold: 0.1 }).observe(contact);
        })();

        /* ---------- Відгуки: стіна (комп'ютер) / стрічка (телефон) ---------- */
        (function () {
            var wall = $('#revWall'), grid = $('#revGrid');
            if (!wall || !grid) return;
            var cards = $$('.rev-card', grid), total = cards.length;
            var desk = window.matchMedia('(min-width: 900px)'), cols = null, rt = 0, rz = 0;
            var pauseBtn = $('#revPause'), pauseText = $('#revPauseText'), countEl = $('#revCount');
            var SPEED = 24; /* пікселів за секунду */

            function teardown() { if (cols) { cols.remove(); cols = null; } wall.classList.remove('is-marquee', 'paused'); if (pauseBtn) { pauseBtn.setAttribute('aria-pressed', 'false'); pauseText.textContent = 'Пауза'; } }
            function fit() {
                if (!cols) return;
                var h = cols.clientHeight;
                $$('.rev-track', cols).forEach(function (t) {
                    while (t.children.length > 1) t.removeChild(t.lastChild);
                    var base = t.firstElementChild, sh = base.offsetHeight;
                    if (!sh) return;
                    var copies = Math.max(2, Math.ceil(h / sh) + 1);
                    for (var i = 1; i < copies; i++) {
                        var c = base.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.inert = true; t.appendChild(c);
                    }
                    t.style.setProperty('--shift', (-100 / copies) + '%');
                    t.style.setProperty('--dur', (sh / SPEED).toFixed(1) + 's');
                });
            }
            function build() {
                teardown();
                if (!desk.matches || reduce) return;
                cols = document.createElement('div'); cols.className = 'rev-cols';
                for (var k = 0; k < 3; k++) {
                    var col = document.createElement('div'); col.className = 'rev-col';
                    var track = document.createElement('div'); track.className = 'rev-track';
                    var set = document.createElement('div'); set.className = 'rev-set';
                    cards.forEach(function (c, i) {
                        if (i % 3 !== k) return;
                        var n = c.cloneNode(true);
                        $$('img', n).forEach(function (im) { im.loading = 'eager'; });
                        set.appendChild(n);
                    });
                    track.appendChild(set); col.appendChild(track); cols.appendChild(col);
                }
                wall.insertBefore(cols, grid);
                wall.classList.add('is-marquee');
                fit();
            }
            build();
            if (desk.addEventListener) desk.addEventListener('change', build);
            window.addEventListener('load', fit);
            window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(fit, 200); });

            if (pauseBtn) pauseBtn.addEventListener('click', function () {
                var p = wall.classList.toggle('paused');
                pauseBtn.setAttribute('aria-pressed', p ? 'true' : 'false');
                pauseText.textContent = p ? 'Продовжити' : 'Пауза';
            });

            /* телефон: лічильник і стрілки */
            function upd() {
                var mid = grid.scrollLeft + grid.clientWidth / 2, best = 0, bd = 1e9;
                cards.forEach(function (c, i) { var d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
                if (countEl) countEl.textContent = (best + 1) + ' / ' + total;
            }
            grid.addEventListener('scroll', function () { cancelAnimationFrame(rt); rt = requestAnimationFrame(upd); }, { passive: true });
            function step(dir) { var w = cards[0].getBoundingClientRect().width + 16; grid.scrollBy({ left: dir * w, behavior: reduce ? 'auto' : 'smooth' }); }
            var pv = $('#revPrev'), nx = $('#revNext');
            if (pv) pv.addEventListener('click', function () { step(-1); });
            if (nx) nx.addEventListener('click', function () { step(1); });
        })();

        /* ---------- Збільшення скриншотів відгуків ---------- */
        (function () {
            var dlg = $('#lightbox'), grid = $('#revWall');
            if (!dlg || !grid) return;
            var big = $('img', dlg);
            grid.addEventListener('click', function (e) {
                var b = e.target.closest('.shot-btn'); if (!b) return;
                var im = $('img', b);
                if (typeof dlg.showModal !== 'function') { window.open(im.getAttribute('src'), '_blank'); return; }
                big.src = im.getAttribute('src'); big.alt = im.alt;
                big.style.width = Math.min(window.innerWidth * 0.94, im.naturalWidth * 2.4, 1000) + 'px';
                dlg.showModal();
            });
            dlg.addEventListener('click', function (e) { if (e.target !== $('.lb-close', dlg)) dlg.close(); });
            $('.lb-close', dlg).addEventListener('click', function () { dlg.close(); });
        })();

        /* ---------- Пошта: складаємо адресу в браузері (проти спам-ботів) ---------- */
        $$('[data-email]').forEach(function (el) {
            el.href = 'mailto:' + EMAIL;
            if (el.hasAttribute('data-email-text')) el.textContent = EMAIL;
            el.hidden = false;
        });

        /* ---------- Лічильник відвідувань (GoatCounter, без cookies) ---------- */
        function trackEvent(name) {
            if (!CONFIG.goatcounter) return;
            var n = 0, t = setInterval(function () {
                if (window.goatcounter && window.goatcounter.count) { clearInterval(t); window.goatcounter.count({ path: name, title: name, event: true }); }
                else if (++n > 50) clearInterval(t);
            }, 100);
        }
        if (CONFIG.goatcounter) {
            var gcScript = document.createElement('script');
            gcScript.async = true; gcScript.src = '//gc.zgo.at/count.js';
            gcScript.setAttribute('data-goatcounter', 'https://' + CONFIG.goatcounter + '.goatcounter.com/count');
            document.head.appendChild(gcScript);
            $$('[data-gc-note]').forEach(function (n) { n.hidden = false; });
        }
        document.addEventListener('click', function (e) {
            var t = e.target.closest && e.target.closest('[data-track]');
            if (t) trackEvent(t.getAttribute('data-track'));
        });

        /* ---------- Форма: рівень + мета → готове повідомлення ---------- */
        (function () {
            var form = $('#leadForm'); if (!form) return;
            var nameI = $('#leadName'), ta = $('#leadMsg'), tg = $('#sendTg'), ml = $('#sendMail'), ig = $('#sendIg'), cp = $('#copyMsg'), note = $('#leadNote');
            var dirty = false, noteTimer;
            function build() {
                var name = nameI.value.trim();
                var lvl = form.querySelector('input[name="level"]:checked');
                var goals = $$('input[name="goal"]:checked', form).map(function (i) { return i.value; });
                var t = 'Вітаю, Марино! ';
                if (name) t += 'Мене звати ' + name + '. ';
                t += 'Хочу записатися на безкоштовну консультацію з англійської.';
                if (lvl) t += ' Мій рівень: ' + lvl.value + '.';
                if (goals.length) t += ' Мета: ' + goals.join(', ') + '.';
                return t + ' Коли Вам зручно поговорити?';
            }
            function sync() {
                var t = ta.value;
                tg.href = 'https://t.me/' + CONFIG.telegram + '?text=' + encodeURIComponent(t);
                ml.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Безкоштовна консультація з англійської') + '&body=' + encodeURIComponent(t);
                ml.hidden = false;
            }
            function say(msg) { note.textContent = msg; clearTimeout(noteTimer); noteTimer = setTimeout(function () { note.textContent = 'Текст підставиться в чат автоматично. Якщо ні — натисніть «Скопіювати текст» і вставте його в чат.'; }, 4000); }
            function copy(text, done) {
                function fb() {
                    try { var a = document.createElement('textarea'); a.value = text; a.setAttribute('readonly', ''); a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select(); var ok = document.execCommand('copy'); document.body.removeChild(a); done(ok); } catch (e) { done(false); }
                }
                if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { done(true); }).catch(fb); else fb();
            }
            form.addEventListener('input', function (e) { if (e.target === ta) dirty = true; else if (!dirty) ta.value = build(); sync(); });
            form.addEventListener('change', function (e) { if (e.target !== ta && !dirty) { ta.value = build(); sync(); } });
            form.addEventListener('submit', function (e) { e.preventDefault(); });
            ta.value = build(); sync();
            tg.addEventListener('click', function () { copy(ta.value, function () {}); });
            ig.addEventListener('click', function () {
                copy(ta.value, function (ok) { say(ok ? 'Текст скопійовано — вставте його в чат Instagram.' : 'Не вдалося скопіювати — виділіть текст у полі й скопіюйте вручну.'); });
                window.open('https://ig.me/m/' + CONFIG.instagram, '_blank', 'noopener');
            });
            cp.addEventListener('click', function () { copy(ta.value, function (ok) { say(ok ? 'Текст скопійовано.' : 'Не вдалося скопіювати — виділіть текст у полі й скопіюйте вручну.'); }); });
        })();
    })();
