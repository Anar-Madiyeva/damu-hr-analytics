/* =========================================================
 * app.js — рендеринг HR-отчёта (Chart.js + навигация)
 * Данные берутся из data.js. Изменять данные — только там.
 * ========================================================= */

(function () {
  'use strict';

  var BLUE = '#0b5fa5';
  var BLUE_DARK = '#084a82';
  var BLUE_SOFT = '#6fa8d0';
  var GREEN = '#1e8e5a';
  var AMBER = '#d99014';
  var RED = '#c0392b';
  var GRAY = '#8ba0b5';
  var PALETTE = [BLUE, '#2e86c1', '#5dade2', '#85c1e9', '#aed6f1', BLUE_DARK, '#1a5276', AMBER, GREEN, GRAY];

  var chartsAvailable = typeof Chart !== 'undefined';

  if (chartsAvailable) {
    Chart.defaults.font.family = '"Segoe UI", "Segoe UI Variable", -apple-system, Arial, sans-serif';
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#5b6b7c';
    Chart.defaults.plugins.legend.labels.boxWidth = 14;
    Chart.defaults.plugins.legend.labels.boxHeight = 14;
  }

  /* ---------- Утилиты ---------- */

  function el(id) { return document.getElementById(id); }

  function fmt(n, decimals) {
    if (decimals == null) decimals = 0;
    return n.toLocaleString('ru-RU', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  function makeChart(canvasId, config) {
    if (!chartsAvailable) {
      var host = el(canvasId);
      if (host && host.parentElement) {
        host.parentElement.innerHTML =
          '<div class="chart-fallback">Диаграмма недоступна: не загружена библиотека Chart.js.<br>' +
          'Проверьте подключение к интернету или добавьте локальную копию chart.umd.min.js.</div>';
      }
      return;
    }
    var ctx = el(canvasId).getContext('2d');
    new Chart(ctx, config);
  }

  function baseOptions(extra) {
    var opts = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          backgroundColor: 'rgba(31,42,55,0.94)',
          padding: 10,
          cornerRadius: 6,
        },
      },
    };
    if (extra) {
      Object.keys(extra).forEach(function (k) { opts[k] = extra[k]; });
    }
    return opts;
  }

  function axisTicks() {
    return {
      x: { grid: { display: false }, ticks: { font: { size: 12 } } },
      y: { grid: { color: '#e6edf3' }, ticks: { font: { size: 12 } }, beginAtZero: true },
    };
  }

  /* ---------- Шапка и футер ---------- */

  el('report-title').textContent = REPORT_META.title;
  el('report-subtitle').textContent = REPORT_META.subtitle;
  el('report-meta').innerHTML =
    '<span>Отчётный период: <strong>' + REPORT_META.currentPeriodLabel + '</strong></span>' +
    '<span>Сравнение с: <strong>' + REPORT_META.previousPeriodLabel + '</strong></span>' +
    '<span>Обновлено: <strong>' + REPORT_META.updatedAt + '</strong></span>' +
    '<span>Ответственный: <strong>' + REPORT_META.responsible + '</strong></span>';

  el('kpi-period').textContent =
    'Значения за ' + REPORT_META.currentPeriodLabel +
    '; динамика — к ' + REPORT_META.previousPeriodLabel + '.';

  el('footer-confidentiality').textContent = REPORT_META.confidentiality;
  el('footer-responsible').textContent = REPORT_META.responsible + ' · обновлено ' + REPORT_META.updatedAt;

  /* ---------- FR-1. KPI-карточки ---------- */

  (function renderKpi() {
    var grid = el('kpi-grid');
    KPI.forEach(function (k) {
      var decimals = k.decimals || 0;
      var diff = +(k.current - k.previous).toFixed(decimals + 1);
      var absDiff = Math.abs(diff);

      var arrow, cls;
      if (absDiff < Math.pow(10, -(decimals + 1))) {
        arrow = '—'; cls = 'flat';
      } else {
        var up = diff > 0;
        arrow = up ? '▲' : '▼';
        var good = k.invert ? !up : up;
        cls = good ? 'good' : 'bad';
      }

      var card = document.createElement('div');
      card.className = 'kpi';
      card.innerHTML =
        '<div class="kpi__label">' + k.label + '</div>' +
        '<div class="kpi__value">' + fmt(k.current, decimals) +
          '<span class="kpi__unit">' + k.unit + '</span></div>' +
        '<div class="kpi__delta kpi__delta--' + cls + '">' + arrow + ' ' + fmt(absDiff, decimals) +
          (k.unit === '%' ? ' п.п.' : '') + '</div>' +
        '<div class="kpi__prev">было: ' + fmt(k.previous, decimals) + ' ' + k.unit + '</div>';
      grid.appendChild(card);
    });
  })();

  /* ---------- FR-2. Структура персонала ---------- */

  makeChart('chart-departments', {
    type: 'bar',
    data: {
      labels: STRUCTURE.departments.map(function (d) { return d.name; }),
      datasets: [
        {
          label: 'План',
          data: STRUCTURE.departments.map(function (d) { return d.plan; }),
          backgroundColor: BLUE_SOFT,
        },
        {
          label: 'Факт',
          data: STRUCTURE.departments.map(function (d) { return d.fact; }),
          backgroundColor: BLUE,
        },
      ],
    },
    options: baseOptions({
      indexAxis: 'y',
      scales: {
        x: { grid: { color: '#e6edf3' }, beginAtZero: true },
        y: { grid: { display: false }, ticks: { font: { size: 12 }, autoSkip: false } },
      },
    }),
  });

  makeChart('chart-age', {
    type: 'bar',
    data: {
      labels: STRUCTURE.age.labels,
      datasets: [
        { label: REPORT_META.currentPeriodLabel,  data: STRUCTURE.age.current,  backgroundColor: BLUE },
        { label: REPORT_META.previousPeriodLabel, data: STRUCTURE.age.previous, backgroundColor: GRAY },
      ],
    },
    options: baseOptions({ scales: axisTicks() }),
  });

  makeChart('chart-categories', {
    type: 'doughnut',
    data: {
      labels: STRUCTURE.categories.labels,
      datasets: [{ data: STRUCTURE.categories.values, backgroundColor: PALETTE }],
    },
    options: baseOptions(),
  });

  makeChart('chart-gender-all', {
    type: 'doughnut',
    data: {
      labels: STRUCTURE.gender.all.labels,
      datasets: [{ data: STRUCTURE.gender.all.values, backgroundColor: [BLUE, '#8fbede'] }],
    },
    options: baseOptions(),
  });

  makeChart('chart-gender-managers', {
    type: 'doughnut',
    data: {
      labels: STRUCTURE.gender.managers.labels,
      datasets: [{ data: STRUCTURE.gender.managers.values, backgroundColor: [AMBER, BLUE_DARK] }],
    },
    options: baseOptions(),
  });

  makeChart('chart-education', {
    type: 'bar',
    data: {
      labels: STRUCTURE.education.labels,
      datasets: [{ label: 'Сотрудники', data: STRUCTURE.education.values, backgroundColor: BLUE }],
    },
    options: baseOptions({ plugins: { legend: { display: false } }, scales: axisTicks() }),
  });

  makeChart('chart-tenure', {
    type: 'bar',
    data: {
      labels: STRUCTURE.tenure.labels,
      datasets: [{ label: 'Сотрудники', data: STRUCTURE.tenure.values, backgroundColor: '#2e86c1' }],
    },
    options: baseOptions({ plugins: { legend: { display: false } }, scales: axisTicks() }),
  });

  makeChart('chart-social', {
    type: 'bar',
    data: {
      labels: STRUCTURE.social.labels,
      datasets: [{ label: 'Сотрудники', data: STRUCTURE.social.values, backgroundColor: AMBER }],
    },
    options: baseOptions({ plugins: { legend: { display: false } }, scales: axisTicks() }),
  });

  /* ---------- FR-3. Движение персонала ---------- */

  makeChart('chart-dynamics', {
    type: 'line',
    data: {
      labels: MOVEMENT.dynamics.labels,
      datasets: [
        {
          label: 'Принято',
          data: MOVEMENT.dynamics.hired,
          borderColor: GREEN,
          backgroundColor: 'rgba(30,142,90,0.10)',
          fill: true,
          tension: 0.3,
        },
        {
          label: 'Уволено',
          data: MOVEMENT.dynamics.fired,
          borderColor: RED,
          backgroundColor: 'rgba(192,57,43,0.08)',
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: baseOptions({ scales: axisTicks() }),
  });

  makeChart('chart-sources', {
    type: 'doughnut',
    data: {
      labels: MOVEMENT.sources.labels,
      datasets: [{ data: MOVEMENT.sources.values, backgroundColor: PALETTE }],
    },
    options: baseOptions(),
  });

  makeChart('chart-reasons', {
    type: 'bar',
    data: {
      labels: MOVEMENT.reasons.labels,
      datasets: [{ label: 'Увольнения', data: MOVEMENT.reasons.values, backgroundColor: '#c0392b' }],
    },
    options: baseOptions({
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#e6edf3' }, beginAtZero: true },
        y: { grid: { display: false } },
      },
    }),
  });

  makeChart('chart-turnover-top', {
    type: 'bar',
    data: {
      labels: MOVEMENT.turnoverTop.labels,
      datasets: [{ label: 'Текучесть, %', data: MOVEMENT.turnoverTop.values, backgroundColor: AMBER }],
    },
    options: baseOptions({
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#e6edf3' }, beginAtZero: true },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } },
      },
    }),
  });

  makeChart('chart-turnover-age', {
    type: 'bar',
    data: {
      labels: MOVEMENT.turnoverAge.labels,
      datasets: [
        { label: REPORT_META.currentPeriodLabel,  data: MOVEMENT.turnoverAge.current,  backgroundColor: RED },
        { label: REPORT_META.previousPeriodLabel, data: MOVEMENT.turnoverAge.previous, backgroundColor: GRAY },
      ],
    },
    options: baseOptions({ scales: axisTicks() }),
  });

  /* ---------- FR-4. Загруженность ---------- */

  function workloadStatus(index) {
    if (index >= 95) return { label: 'Критическая', cls: 'critical', color: RED };
    if (index >= 85) return { label: 'Высокая',     cls: 'high',     color: AMBER };
    if (index >= 70) return { label: 'Оптимальная', cls: 'optimal',  color: GREEN };
    return { label: 'Умеренная', cls: 'moderate', color: GRAY };
  }

  var workloadColors = WORKLOAD.map(function (w) { return workloadStatus(w.index).color; });

  makeChart('chart-workload', {
    type: 'bar',
    data: {
      labels: WORKLOAD.map(function (w) { return w.dept; }),
      datasets: [{ label: 'Индекс загруженности', data: WORKLOAD.map(function (w) { return w.index; }), backgroundColor: workloadColors }],
    },
    options: baseOptions({
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { min: 0, max: 100, grid: { color: '#e6edf3' } },
        y: { grid: { display: false }, ticks: { font: { size: 12 }, autoSkip: false } },
      },
    }),
  });

  (function renderWorkloadTable() {
    var tbody = el('workload-table').querySelector('tbody');
    WORKLOAD.forEach(function (w) {
      var st = workloadStatus(w.index);
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + w.dept + '</td>' +
        '<td class="num">' + w.tasks + '</td>' +
        '<td class="num">' + w.staff + '</td>' +
        '<td class="num">' + fmt(w.hoursPerTask, 1) + '</td>' +
        '<td class="num"><strong>' + w.index + '</strong></td>' +
        '<td><span class="badge badge--' + st.cls + '">' + st.label + '</span></td>';
      tbody.appendChild(tr);
    });
  })();

  /* ---------- FR-5. Обучение ---------- */

  (function renderTrainingSummary() {
    var s = TRAINING.summary;
    var host = el('training-summary');
    var items = [
      { label: 'Обучено за период', value: s.total, unit: 'чел.' },
      { label: 'Внешнее обучение', value: s.external, unit: 'чел.' },
      { label: 'Внутреннее обучение', value: s.internal, unit: 'чел.' },
      { label: 'Доля от численности', value: s.shareOfHeadcount, unit: '%', decimals: 1 },
    ];
    items.forEach(function (k) {
      var card = document.createElement('div');
      card.className = 'kpi';
      card.innerHTML =
        '<div class="kpi__label">' + k.label + '</div>' +
        '<div class="kpi__value">' + fmt(k.value, k.decimals || 0) +
          '<span class="kpi__unit">' + k.unit + '</span></div>';
      host.appendChild(card);
    });
  })();

  makeChart('chart-training-category', {
    type: 'bar',
    data: {
      labels: TRAINING.byCategory.labels,
      datasets: [{ label: 'Обучено', data: TRAINING.byCategory.values, backgroundColor: BLUE }],
    },
    options: baseOptions({ plugins: { legend: { display: false } }, scales: axisTicks() }),
  });

  makeChart('chart-training-direction', {
    type: 'bar',
    data: {
      labels: TRAINING.byDirection.labels,
      datasets: [{ label: 'Обучено', data: TRAINING.byDirection.values, backgroundColor: '#5dade2' }],
    },
    options: baseOptions({
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#e6edf3' }, beginAtZero: true },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } },
      },
    }),
  });

  /* ---------- FR-6. Качественные показатели ---------- */

  makeChart('chart-performance', {
    type: 'bar',
    data: {
      labels: QUALITY.performance.labels,
      datasets: [
        { label: REPORT_META.currentPeriodLabel,  data: QUALITY.performance.current,  backgroundColor: BLUE },
        { label: REPORT_META.previousPeriodLabel, data: QUALITY.performance.previous, backgroundColor: GRAY },
      ],
    },
    options: baseOptions({
      scales: axisTicks(),
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: function (c) { return ' ' + c.dataset.label + ': ' + c.parsed.y + '%'; } } },
      },
    }),
  });

  (function renderReserve() {
    var r = QUALITY.reserve;
    el('reserve-stats').innerHTML =
      '<div class="stat"><div class="stat__value">' + r.total + '</div><div class="stat__label">Состав резерва, чел.</div></div>' +
      '<div class="stat"><div class="stat__value">' + r.trainedShare + '%</div><div class="stat__label">Прошли подготовку</div></div>' +
      '<div class="stat"><div class="stat__value">' + r.appointed + '</div><div class="stat__label">Назначено из резерва</div></div>';
  })();

  makeChart('chart-reserve', {
    type: 'doughnut',
    data: {
      labels: QUALITY.reserve.byLevel.labels,
      datasets: [{ data: QUALITY.reserve.byLevel.values, backgroundColor: [BLUE_DARK, BLUE_SOFT] }],
    },
    options: baseOptions(),
  });

  makeChart('chart-appointments', {
    type: 'doughnut',
    data: {
      labels: QUALITY.appointments.labels,
      datasets: [{ data: QUALITY.appointments.values, backgroundColor: [GREEN, BLUE] }],
    },
    options: baseOptions(),
  });

  makeChart('chart-awards', {
    type: 'bar',
    data: {
      labels: QUALITY.awards.byType.labels,
      datasets: [{ label: 'Награждения', data: QUALITY.awards.byType.values, backgroundColor: AMBER }],
    },
    options: baseOptions({
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#e6edf3' }, beginAtZero: true },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } },
      },
    }),
  });

  (function renderSalary() {
    var s = QUALITY.salary;
    el('salary-stats').innerHTML =
      '<div class="stat"><div class="stat__value">' + s.employees + '</div><div class="stat__label">Сотрудников получили повышение оклада</div></div>' +
      '<div class="stat"><div class="stat__value">' + fmt(s.avgIncreasePct, 1) + '%</div><div class="stat__label">Средний процент повышения</div></div>';
  })();

  /* ---------- FR-7. Выводы ---------- */

  (function renderConclusions() {
    var host = el('conclusions-list');
    CONCLUSIONS.forEach(function (c) {
      var block = document.createElement('div');
      block.className = 'conclusion';
      block.innerHTML =
        '<h3 class="conclusion__title">' + c.title + '</h3>' +
        '<p class="conclusion__text">' + c.text + '</p>';
      host.appendChild(block);
    });
  })();

  /* ---------- FR-8. Подсветка активного раздела ---------- */

  (function highlightNav() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav__link'));
    var sections = links
      .map(function (l) { return document.querySelector(l.getAttribute('href')); })
      .filter(Boolean);
    if (!('IntersectionObserver' in window) || sections.length === 0) return;

    var byId = {};
    links.forEach(function (l) { byId[l.getAttribute('href').slice(1)] = l; });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          links.forEach(function (l) { l.classList.remove('active'); });
          var link = byId[entry.target.id];
          if (link) link.classList.add('active');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

    sections.forEach(function (s) { observer.observe(s); });
  })();

})();
