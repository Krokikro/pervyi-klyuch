/* ==========================================================================
   Первый ключ — общий скрипт
   Без зависимостей. Все анимации на transform/opacity, чтобы не грузить CPU.
   ========================================================================== */
(function () {
  'use strict';

  document.documentElement.classList.remove('no-js');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Хедер: тень при скролле ---------------- */
  var header = document.querySelector('.header');
  if (header) {
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        header.classList.toggle('is-stuck', window.scrollY > 8);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------------- Мобильное меню ---------------- */
  var burger = document.querySelector('.burger');
  var mnav = document.getElementById('mobile-nav');
  if (burger && mnav) {
    var toggleNav = function (open) {
      burger.setAttribute('aria-expanded', String(open));
      mnav.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', function () {
      toggleNav(burger.getAttribute('aria-expanded') !== 'true');
    });
    mnav.addEventListener('click', function (e) {
      if (e.target.closest('a')) toggleNav(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mnav.classList.contains('is-open')) toggleNav(false);
    });
  }

  /* ---------------- Появление блоков ---------------- */
  var revealables = document.querySelectorAll('[data-reveal], [data-steps], [data-count]');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          el.classList.add('is-in');
          if (el.hasAttribute('data-count')) countUp(el);
          io.unobserve(el);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    revealables.forEach(function (el) {
      io.observe(el);
    });
    /* То, что уже в первом экране, показываем сразу: без ожидания наблюдателя
       и без анимации «въезда» контента, который пользователь видит с первого кадра. */
    var showIfVisible = function () {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      revealables.forEach(function (el) {
        if (el.classList.contains('is-in')) return;
        var r = el.getBoundingClientRect();
        if (r.top < vh * 0.92) {
          el.classList.add('is-in');
          if (el.hasAttribute('data-count')) countUp(el);
          io.unobserve(el);
        }
      });
    };
    showIfVisible();
    window.addEventListener('load', showIfVisible, { once: true });
    /* Быстрая прокрутка (флик на телефоне, рывок колесом) может пронести блок
       мимо наблюдателя между кадрами — тогда он останется невидимым навсегда.
       Догоняем: на каждом кадре прокрутки показываем всё, что уже проехало. */
    var sweepTick = false;
    var sweep = function () {
      if (sweepTick) return;
      sweepTick = true;
      requestAnimationFrame(function () {
        sweepTick = false;
        showIfVisible();
        var left = 0;
        revealables.forEach(function (el) {
          if (!el.classList.contains('is-in')) left++;
        });
        if (!left) window.removeEventListener('scroll', sweep);
      });
    };
    window.addEventListener('scroll', sweep, { passive: true });
    window.addEventListener('resize', sweep, { passive: true });
  } else {
    revealables.forEach(function (el) {
      el.classList.add('is-in');
      if (el.hasAttribute('data-count')) el.textContent = el.getAttribute('data-count');
    });
  }

  /* Ступенчатая задержка внутри групп */
  document.querySelectorAll('[data-stagger]').forEach(function (group) {
    var step = parseInt(group.getAttribute('data-stagger'), 10) || 80;
    Array.prototype.forEach.call(group.children, function (child, i) {
      var target = child.hasAttribute('data-reveal') ? child : child.querySelector('[data-reveal]');
      if (target) target.style.setProperty('--rd', i * step + 'ms');
    });
  });

  /* ---------------- Счётчики ---------------- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    var decimals = parseInt(el.getAttribute('data-decimals'), 10) || 0;
    if (isNaN(target)) return;
    var dur = 1400;
    var start = performance.now();
    var tick = function (now) {
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = target * eased;
      el.textContent = formatNum(val, decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function formatNum(n, decimals) {
    return n.toLocaleString('ru-RU', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  /* ---------------- FAQ ---------------- */
  document.querySelectorAll('.faq').forEach(function (faq) {
    faq.addEventListener('click', function (e) {
      var btn = e.target.closest('.faq__q');
      if (!btn) return;
      var item = btn.parentElement;
      var open = item.classList.contains('is-open');
      faq.querySelectorAll('.faq__item.is-open').forEach(function (other) {
        if (other !== item) {
          other.classList.remove('is-open');
          other.querySelector('.faq__q').setAttribute('aria-expanded', 'false');
        }
      });
      item.classList.toggle('is-open', !open);
      btn.setAttribute('aria-expanded', String(!open));
    });
  });

  /* ---------------- Калькулятор ---------------- */
  var MONEY = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

  function plural(n, one, few, many) {
    var n10 = n % 10;
    var n100 = n % 100;
    if (n10 === 1 && n100 !== 11) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
    return many;
  }

  function termLabel(months) {
    var years = Math.floor(months / 12);
    var rest = months % 12;
    var parts = [];
    if (years) parts.push(years + ' ' + plural(years, 'год', 'года', 'лет'));
    if (rest) parts.push(rest + ' ' + plural(rest, 'месяц', 'месяца', 'месяцев'));
    return parts.join(' ') + ' · ' + months + ' ' + plural(months, 'платёж', 'платежа', 'платежей');
  }

  function fillRange(input) {
    var min = parseFloat(input.min);
    var max = parseFloat(input.max);
    var pct = ((parseFloat(input.value) - min) / (max - min)) * 100;
    input.style.setProperty('--fill', pct + '%');
  }

  document.querySelectorAll('[data-calc]').forEach(function (calc) {
    var priceRange = calc.querySelector('[data-calc-price]');
    var priceInput = calc.querySelector('[data-calc-price-num]');
    var downRange = calc.querySelector('[data-calc-down]');
    var termRange = calc.querySelector('[data-calc-term]');

    var outMonthly = calc.querySelector('[data-out-monthly]');
    var outPrice = calc.querySelector('[data-out-price]');
    var outDown = calc.querySelector('[data-out-down]');
    var outDownPct = calc.querySelector('[data-out-downpct]');
    var outTerm = calc.querySelector('[data-out-term]');
    var outTermShort = calc.querySelector('[data-out-termshort]');

    if (!priceRange || !downRange || !termRange) return;

    /* Цена растёт по логарифму: 300 тыс — 100 млн на одном ползунке,
       и при этом мелкий шаг там, где стоит большинство машин. */
    var PMIN = parseFloat(priceRange.dataset.priceMin || priceRange.min);
    var PMAX = parseFloat(priceRange.dataset.priceMax || priceRange.max);
    var LOGSCALE = priceRange.dataset.priceMax ? Math.log(PMAX / PMIN) : 0;

    function niceStep(v) {
      var s = v < 1000000 ? 10000 : v < 5000000 ? 50000 : v < 20000000 ? 250000 : 1000000;
      return Math.round(v / s) * s;
    }
    function posToPrice(pos) {
      if (!LOGSCALE) return parseFloat(pos);
      var v = PMIN * Math.exp((parseFloat(pos) / 1000) * LOGSCALE);
      return Math.min(PMAX, Math.max(PMIN, niceStep(v)));
    }
    function priceToPos(v) {
      if (!LOGSCALE) return v;
      v = Math.min(PMAX, Math.max(PMIN, v));
      return Math.round((1000 * Math.log(v / PMIN)) / LOGSCALE);
    }

    var animId = null;
    var shownMonthly = 0;

    function setMonthly(value) {
      if (reduced) {
        outMonthly.firstChild.nodeValue = MONEY.format(Math.round(value)) + ' ';
        shownMonthly = value;
        return;
      }
      if (animId) cancelAnimationFrame(animId);
      var from = shownMonthly;
      var start = performance.now();
      var dur = 420;
      var run = function (now) {
        var p = Math.min((now - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        var v = from + (value - from) * eased;
        outMonthly.firstChild.nodeValue = MONEY.format(Math.round(v)) + ' ';
        if (p < 1) animId = requestAnimationFrame(run);
        else shownMonthly = value;
      };
      animId = requestAnimationFrame(run);
    }

    function recalc() {
      var price = posToPrice(priceRange.value);
      var downPct = parseFloat(downRange.value);
      var months = parseFloat(termRange.value);

      var down = Math.round((price * downPct) / 100);
      var financed = price - down;

      /* Наценка: 50% за первый год, +25% за каждый следующий (макс. 150% на 5 лет) */
      var markup = 0.5 + ((months - 12) / 12) * 0.25;
      var total = financed * (1 + markup);
      /* 5% суммы уходит в финальный выкупной платёж */
      var buyout = total * 0.05;
      var monthly = (total - buyout) / months;

      setMonthly(monthly);
      if (outPrice) outPrice.textContent = MONEY.format(price) + ' ₽';
      if (outDown) outDown.textContent = MONEY.format(down) + ' ₽';
      if (outDownPct) outDownPct.textContent = downPct + '%';
      if (outTerm) outTerm.textContent = termLabel(months);
      if (outTermShort) {
        outTermShort.textContent =
          months + ' ' + plural(months, 'месяц', 'месяца', 'месяцев');
      }
      if (priceInput && document.activeElement !== priceInput) {
        priceInput.value = MONEY.format(price);
      }

      /* Передаём расчёт в форму заявки */
      document.querySelectorAll('[data-calc-summary]').forEach(function (f) {
        f.value =
          'Авто ' + MONEY.format(price) + ' ₽, взнос ' + downPct + '%, срок ' + months + ' мес.';
      });

      [priceRange, downRange, termRange].forEach(fillRange);
    }

    [priceRange, downRange, termRange].forEach(function (input) {
      input.addEventListener('input', recalc);
    });

    if (priceInput) {
      priceInput.addEventListener('input', function () {
        var digits = priceInput.value.replace(/\D/g, '');
        priceInput.value = digits ? MONEY.format(parseInt(digits, 10)) : '';
      });
      priceInput.addEventListener('change', commitPrice);
      priceInput.addEventListener('blur', commitPrice);
      priceInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); priceInput.blur(); }
      });
    }

    function commitPrice() {
      var digits = priceInput.value.replace(/\D/g, '');
      var v = parseInt(digits, 10);
      if (isNaN(v)) v = posToPrice(priceRange.value);
      v = Math.min(Math.max(v, PMIN), PMAX);
      priceRange.value = priceToPos(niceStep(v));
      recalc();
    }

    recalc();
  });

  /* ---------------- Телефонная маска ---------------- */
  function maskPhone(input) {
    var apply = function () {
      var digits = input.value.replace(/\D/g, '');
      if (digits[0] === '8') digits = '7' + digits.slice(1);
      if (digits[0] !== '7') digits = '7' + digits;
      digits = digits.slice(0, 11);
      var out = '+7';
      if (digits.length > 1) out += ' (' + digits.slice(1, 4);
      if (digits.length >= 5) out += ') ' + digits.slice(4, 7);
      if (digits.length >= 8) out += '-' + digits.slice(7, 9);
      if (digits.length >= 10) out += '-' + digits.slice(9, 11);
      input.value = out;
    };
    input.addEventListener('focus', function () {
      if (!input.value) input.value = '+7 (';
    });
    input.addEventListener('input', apply);
    input.addEventListener('blur', function () {
      if (input.value.replace(/\D/g, '').length <= 1) input.value = '';
    });
  }
  document.querySelectorAll('input[type="tel"]').forEach(maskPhone);

  /* ---------------- Формы ---------------- */
  document.querySelectorAll('form[data-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = true;

      form.querySelectorAll('[required]').forEach(function (input) {
        var field = input.closest('.field') || input.closest('.consent');
        var ok = true;
        if (input.type === 'checkbox') ok = input.checked;
        else if (input.type === 'tel') ok = input.value.replace(/\D/g, '').length === 11;
        else ok = input.value.trim().length > 1;
        if (field) field.classList.toggle('has-error', !ok);
        if (!ok && valid) input.focus();
        if (!ok) valid = false;
      });

      if (!valid) return;

      /* Здесь подключается отправка на ваш сервер / CRM / Telegram-бот.
         Пример: fetch('/api/lead', { method: 'POST', body: new FormData(form) }) */
      form.classList.add('is-sent');
      var done = form.querySelector('.form__done');
      if (done) done.setAttribute('tabindex', '-1'), done.focus({ preventScroll: true });
    });

    form.addEventListener('input', function (e) {
      var field = e.target.closest('.field') || e.target.closest('.consent');
      if (field) field.classList.remove('has-error');
    });
  });

  /* ---------------- Прокрутка к форме с подстановкой темы ---------------- */
  document.querySelectorAll('[data-scroll-to]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('data-scroll-to');
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      var focusable = target.querySelector('input:not([type="hidden"]), select');
      if (focusable) setTimeout(function () { focusable.focus({ preventScroll: true }); }, reduced ? 0 : 600);
    });
  });

  /* ---------------- Год в подвале ---------------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();

/* ==========================================================================
   Доработки: модальная заявка, прогресс чтения, параллакс
   ========================================================================== */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Модальное окно заявки ---------------- */
  var modal = document.getElementById('lead-modal');
  if (modal) {
    var lastFocus = null;
    var topicSel = modal.querySelector('[name="topic"]');
    var calcField = modal.querySelector('[data-calc-summary]');
    var titleEl = modal.querySelector('[data-modal-title]');
    var textEl = modal.querySelector('[data-modal-text]');
    /* Значения по умолчанию — чтобы окно, открытое второй раз с другой кнопки,
       не показывало заголовок и тему от предыдущей. */
    var defTitle = titleEl ? titleEl.textContent : '';
    var defText = textEl ? textEl.textContent : '';

    var open = function (trigger) {
      lastFocus = trigger || document.activeElement;
      var topic = trigger && trigger.getAttribute('data-modal-topic');
      var title = trigger && trigger.getAttribute('data-modal-title');
      var text = trigger && trigger.getAttribute('data-modal-text');
      if (topicSel) {
        topicSel.selectedIndex = 0;
        if (topic) {
          for (var i = 0; i < topicSel.options.length; i++) {
            if (topicSel.options[i].value === topic || topicSel.options[i].text === topic) {
              topicSel.selectedIndex = i;
              break;
            }
          }
        }
      }
      if (titleEl) titleEl.textContent = title || defTitle;
      if (textEl) textEl.textContent = text || defText;

      /* подтягиваем последний расчёт калькулятора, если он был */
      var src = document.querySelector('.page:not([hidden]) [data-calc-summary], [data-calc-summary]');
      if (calcField && src && src !== calcField && src.value) calcField.value = src.value;

      modal.classList.add('is-open');
      modal.removeAttribute('aria-hidden');
      document.body.classList.add('is-locked');
      var first = modal.querySelector('input:not([type="hidden"]), select, textarea, button');
      setTimeout(function () { if (first) first.focus({ preventScroll: true }); }, reduced ? 0 : 260);
    };

    var close = function () {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    };

    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-modal]');
      if (t) { e.preventDefault(); open(t); return; }
      if (e.target.closest('[data-modal-close]')) { e.preventDefault(); close(); }
    });

    document.addEventListener('keydown', function (e) {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      var f = modal.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea');
      var list = Array.prototype.filter.call(f, function (el) { return el.offsetParent !== null; });
      if (!list.length) return;
      var first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    modal.addEventListener('transitionend', function () {
      if (!modal.classList.contains('is-open')) {
        var f = modal.querySelector('form');
        if (f) { f.classList.remove('is-sent'); f.reset(); }
      }
    });
  }

  /* ---------------- Прогресс чтения ---------------- */
  var bar = document.querySelector('.progress');
  if (bar && !reduced) {
    var pending = false;
    var upd = function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        var de = document.documentElement;
        var max = de.scrollHeight - de.clientHeight;
        bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(window.scrollY / max, 1) : 0) + ')';
        pending = false;
      });
    };
    window.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd, { passive: true });
    upd();
  }

  /* ---------------- Параллакс декоративных фигур ---------------- */
  var pars = document.querySelectorAll('.par');
  if (pars.length && !reduced && window.matchMedia('(min-width: 900px)').matches) {
    var tick = false;
    var move = function () {
      if (tick) return;
      tick = true;
      requestAnimationFrame(function () {
        var vh = window.innerHeight;
        pars.forEach(function (el) {
          var r = el.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) return;
          var k = parseFloat(el.getAttribute('data-par')) || 0.08;
          var offset = (r.top + r.height / 2 - vh / 2) * -k;
          el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
        });
        tick = false;
      });
    };
    window.addEventListener('scroll', move, { passive: true });
    move();
  }
})();

/* ==========================================================================
   Переход между страницами.
   Chrome и Edge делают это сами через CSS @view-transition — там ничего
   не трогаем. Firefox и Safari получают тот же эффект вручную: уходящая
   страница гаснет, новая проявляется.
   ========================================================================== */
(function () {
  var html = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nativeVT = ('startViewTransition' in document) &&
    window.CSS && CSS.supports && CSS.supports('view-transition-name', 'none');
  if (reduced || nativeVT) return;

  html.classList.add('pt-enter');
  window.setTimeout(function () { html.classList.remove('pt-enter'); }, 560);

  var leaving = false;

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) { leaving = false; html.classList.remove('pt-leave'); }
  });

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey ||
        e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || a.target === '_blank' || a.hasAttribute('download') ||
        a.hasAttribute('data-modal') || a.hasAttribute('data-scroll-to')) return;

    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    if (!/\.html?$|\/$/.test(url.pathname)) return;

    e.preventDefault();
    if (leaving) return;
    leaving = true;
    html.classList.add('pt-leave');
    window.setTimeout(function () { location.href = url.href; }, 210);
  });
})();


/* ==========================================================================
   Наезд блоков: высота первого экрана + запасной вариант без scroll-timeline
   ========================================================================== */
(function () {
  var hero = document.querySelector('.hero, .page-hero');
  if (!hero) return;
  var root = document.documentElement;

  var setH = function () {
    root.style.setProperty('--hero-h', hero.offsetHeight + 'px');
  };
  setH();
  window.addEventListener('resize', setH, { passive: true });
  window.addEventListener('load', setH);
  if (window.ResizeObserver) new ResizeObserver(setH).observe(hero);

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var native = window.CSS && CSS.supports && CSS.supports('animation-timeline', 'scroll()');
  if (reduced || native) return;

  var grid = hero.querySelector('.hero__grid, .page-hero__grid');
  if (!grid) return;
  root.classList.add('js-recede');

  var tick = false;
  var run = function () {
    tick = false;
    if (window.innerWidth < 760) {
      grid.style.removeProperty('--rec-s');
      grid.style.removeProperty('--rec-y');
      grid.style.removeProperty('--rec-o');
      return;
    }
    var vh = window.innerHeight;
    var from = Math.max(hero.offsetHeight - vh * 0.96, 0);
    var to = Math.max(hero.offsetHeight - vh * 0.08, from + 1);
    var p = Math.min(Math.max((window.scrollY - from) / (to - from), 0), 1);
    grid.style.setProperty('--rec-s', (1 - 0.038 * p).toFixed(4));
    grid.style.setProperty('--rec-y', (-14.4 * p).toFixed(1) + 'px');
    grid.style.setProperty('--rec-o', (1 - 0.32 * p).toFixed(3));
  };
  var onScroll = function () {
    if (!tick) { tick = true; requestAnimationFrame(run); }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  run();
})();
