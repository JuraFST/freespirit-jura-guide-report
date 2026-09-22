(() => {
  // src/shared.js
  var CITIES = ["Zagreb", "Dubrovnik", "Split", "Zadar"];
  var PAGES = {
    Page25: null,
    Page26: null,
    PageCmp: null,
    PageGuides: null
  };
  function registerPage(name, page) {
    if (Object.prototype.hasOwnProperty.call(PAGES, name)) {
      PAGES[name] = page;
    }
  }
  var GLOBAL_DATE = REPORT_LAST_UPDATE;
  function setGlobalDate(v) {
    GLOBAL_DATE = v;
  }
  function getGlobalDate() {
    return GLOBAL_DATE;
  }
  function getCutoffMonth() {
    return parseInt(GLOBAL_DATE.split("-")[1]);
  }
  function getCutoffDay() {
    return parseInt(GLOBAL_DATE.split("-")[2]);
  }
  function fmtN(v) {
    return Math.round(v).toLocaleString("en-GB");
  }
  function showPage(id, tabEl) {
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    document.querySelectorAll(".nav-tab").forEach((t) => t.classList.remove("active"));
    document.getElementById("page-" + id).classList.add("active");
    document.querySelectorAll(`.nav-tab[data-page="${id}"]`).forEach((t) => t.classList.add("active"));
    const page = PAGES[pageKeyFor(id)];
    if (page) {
      if (!page._initialized) {
        page.init();
        page._initialized = true;
      } else page.renderAll();
    }
  }
  function pageKeyFor(id) {
    return { p25: "Page25", p26: "Page26", cmp: "PageCmp", guides: "PageGuides" }[id];
  }
  function updateDateAsOf(val) {
    setGlobalDate(val);
    Object.values(PAGES).forEach((page) => {
      if (page && page._initialized) page.renderAll();
    });
  }

  // src/theme.js
  function toggleTheme() {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch (e) {
    }
    document.dispatchEvent(new CustomEvent("themechange"));
  }
  function initTheme() {
    let stored = null;
    try {
      stored = localStorage.getItem("theme");
    } catch (e) {
    }
    if (stored === "dark") document.body.classList.add("dark-mode");
  }

  // src/chartHelpers.js
  function cssVar(name, fallback) {
    const v = getComputedStyle(document.body).getPropertyValue(name).trim();
    return v || fallback;
  }
  var CITY_VARS = { Zagreb: "--zagreb", Dubrovnik: "--dubrovnik", Split: "--split", Zadar: "--zadar" };
  function cityColors(cities) {
    return cities.map((c) => cssVar(CITY_VARS[c], "#1a1a1a"));
  }
  function axisDefaults() {
    return {
      ticks: { color: cssVar("--text3", "#767676"), font: { size: 11 } },
      grid: { color: cssVar("--border", "#dddddd") }
    };
  }
  function tooltipDefaults() {
    return {
      backgroundColor: "#1a1a1a",
      titleColor: "#fff",
      bodyColor: "#fff",
      padding: 8,
      cornerRadius: 4
    };
  }
  function lineChart(ctx, labels, datasets, title) {
    return new Chart(ctx, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: { title: { display: !!title, text: title }, tooltip: tooltipDefaults() },
        scales: { x: axisDefaults(), y: axisDefaults() }
      }
    });
  }
  function barChart(ctx, labels, datasets, title) {
    return new Chart(ctx, {
      type: "bar",
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: { title: { display: !!title, text: title }, tooltip: tooltipDefaults() },
        scales: { x: axisDefaults(), y: axisDefaults() }
      }
    });
  }
  function kpiCardHtml(label, value, sub) {
    return `<div class="kpi-card"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div>${sub ? `<div class="kpi-label">${sub}</div>` : ""}</div>`;
  }
  function chartCardHtml(id, title) {
    return `<div class="card"><div class="card-title">${title}</div><canvas id="${id}"></canvas></div>`;
  }

  // src/categorize.js
  var GROUP_TYPES = ["best", "war", "food"];
  var PRIVATE_TYPES = ["old", "big", "war PR", "food PR"];
  function categorizeType(type) {
    if (GROUP_TYPES.includes(type)) return "group";
    if (PRIVATE_TYPES.includes(type)) return "private";
    return "custom";
  }

  // src/aggregate.js
  function filteredStats(st, months, cutoffMonth, cutoffDay) {
    const activeMonths = months && months.length > 0 ? months : Array.from({ length: cutoffMonth }, (_, i) => i + 1);
    return activeMonths.reduce((acc, m) => {
      if (m < cutoffMonth) {
        const mo = st.byMonth[String(m)];
        if (mo) {
          acc.freeTours += mo.free.tours || 0;
          acc.freePax += mo.free.pax || 0;
          acc.paidTours += mo.paid.tours || 0;
          acc.paidPax += mo.paid.pax || 0;
        }
      } else if (m === cutoffMonth && st.byDay && Object.keys(st.byDay).length > 0) {
        for (let d = 1; d <= cutoffDay; d++) {
          const dy = st.byDay[`${m}-${d}`];
          if (dy) {
            acc.freeTours += dy.free.tours || 0;
            acc.freePax += dy.free.pax || 0;
            acc.paidTours += dy.paid.tours || 0;
            acc.paidPax += dy.paid.pax || 0;
          }
        }
      } else if (m === cutoffMonth) {
        const mo = st.byMonth[String(m)];
        if (mo) {
          acc.freeTours += mo.free.tours || 0;
          acc.freePax += mo.free.pax || 0;
          acc.paidTours += mo.paid.tours || 0;
          acc.paidPax += mo.paid.pax || 0;
        }
      }
      return acc;
    }, { freeTours: 0, freePax: 0, paidTours: 0, paidPax: 0 });
  }
  function filteredTypeStats(st, months, cutoffMonth, cutoffDay, typeFilter3) {
    const activeMonths = months && months.length > 0 ? months : Array.from({ length: cutoffMonth }, (_, i) => i + 1);
    const acc = { tours: 0, pax: 0 };
    const addTypeMap = (typeMap) => {
      if (!typeMap) return;
      for (const [type, v] of Object.entries(typeMap)) {
        if (typeFilter3(type)) {
          acc.tours += v.tours || 0;
          acc.pax += v.pax || 0;
        }
      }
    };
    activeMonths.forEach((m) => {
      if (m < cutoffMonth) {
        addTypeMap(st.byMonthType && st.byMonthType[String(m)]);
      } else if (m === cutoffMonth && st.byDayType && Object.keys(st.byDayType).length > 0) {
        for (let d = 1; d <= cutoffDay; d++) {
          addTypeMap(st.byDayType[`${m}-${d}`]);
        }
      } else if (m === cutoffMonth) {
        addTypeMap(st.byMonthType && st.byMonthType[String(m)]);
      }
    });
    return acc;
  }
  function deltaRow(v25, v26) {
    const delta = v26 - v25;
    const pct = v25 === 0 ? v26 === 0 ? 0 : 100 : Math.round(delta / v25 * 1e3) / 10;
    return { v25, v26, delta, pct };
  }
  var ZERO_STATS = { freeTours: 0, freePax: 0, paidTours: 0, paidPax: 0 };
  function buildGuideRow(guide25, guide26, months, cutoffMonth, cutoffDay, lang = "all") {
    const name = guide26 ? guide26.name : guide25.name;
    const city = guide26 ? guide26.city : guide25.city;
    const st25 = guide25 ? guide25.stats[lang] || guide25.stats.all : null;
    const st26 = guide26 ? guide26.stats[lang] || guide26.stats.all : null;
    const f25 = st25 ? filteredStats(st25, months, cutoffMonth, cutoffDay) : ZERO_STATS;
    const f26 = st26 ? filteredStats(st26, months, cutoffMonth, cutoffDay) : ZERO_STATS;
    return {
      name,
      city,
      freeTours: deltaRow(f25.freeTours, f26.freeTours),
      freePax: deltaRow(f25.freePax, f26.freePax),
      paidTours: deltaRow(f25.paidTours, f26.paidTours),
      paidPax: deltaRow(f25.paidPax, f26.paidPax),
      totalTours: deltaRow(f25.freeTours + f25.paidTours, f26.freeTours + f26.paidTours),
      totalPax: deltaRow(f25.freePax + f25.paidPax, f26.freePax + f26.paidPax)
    };
  }
  function sumRows(rows, key) {
    const v25 = rows.reduce((s, r) => s + r[key].v25, 0);
    const v26 = rows.reduce((s, r) => s + r[key].v26, 0);
    return deltaRow(v25, v26);
  }
  function buildGuideTable(guideStats252, guideStats262, months, cutoffMonth, cutoffDay, lang = "all") {
    const names = Array.from(/* @__PURE__ */ new Set([
      ...guideStats252.map((g) => g.name),
      ...guideStats262.map((g) => g.name)
    ])).sort();
    const rows = names.map((name) => {
      const g25 = guideStats252.find((g) => g.name === name) || null;
      const g26 = guideStats262.find((g) => g.name === name) || null;
      return buildGuideRow(g25, g26, months, cutoffMonth, cutoffDay, lang);
    });
    const totalRow = {
      name: "TOTAL",
      city: "",
      freeTours: sumRows(rows, "freeTours"),
      freePax: sumRows(rows, "freePax"),
      paidTours: sumRows(rows, "paidTours"),
      paidPax: sumRows(rows, "paidPax"),
      totalTours: sumRows(rows, "totalTours"),
      totalPax: sumRows(rows, "totalPax")
    };
    return { rows, totalRow };
  }

  // src/pages/tourStats.js
  var MONTH_NAMES = { 1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun", 7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec" };
  function statFor(cityStats, city, lang) {
    const cs = cityStats[city];
    if (!cs) return null;
    return cs[lang] || cs.all;
  }
  function perCityFree(cityStats, cities, cutoffMonth, cutoffDay, lang) {
    return cities.map((city) => {
      const st = statFor(cityStats, city, lang);
      const r = st ? filteredStats(st, [], cutoffMonth, cutoffDay) : { freeTours: 0, freePax: 0 };
      return { city, tours: r.freeTours, pax: r.freePax };
    });
  }
  function perCityType(cityStats, cities, cutoffMonth, cutoffDay, lang, typeFilter3) {
    return cities.map((city) => {
      const st = statFor(cityStats, city, lang);
      const r = st ? filteredTypeStats(st, [], cutoffMonth, cutoffDay, typeFilter3) : { tours: 0, pax: 0 };
      return { city, ...r };
    });
  }
  function monthlyFree(cityStats, cities, month, cutoffMonth, cutoffDay, lang) {
    return cities.reduce((acc, city) => {
      const st = statFor(cityStats, city, lang);
      const r = st ? filteredStats(st, [month], cutoffMonth, cutoffDay) : { freeTours: 0, freePax: 0 };
      acc.tours += r.freeTours;
      acc.pax += r.freePax;
      return acc;
    }, { tours: 0, pax: 0 });
  }
  function monthlyType(cityStats, cities, month, cutoffMonth, cutoffDay, lang, typeFilter3) {
    return cities.reduce((acc, city) => {
      const st = statFor(cityStats, city, lang);
      const r = st ? filteredTypeStats(st, [month], cutoffMonth, cutoffDay, typeFilter3) : { tours: 0, pax: 0 };
      acc.tours += r.tours;
      acc.pax += r.pax;
      return acc;
    }, { tours: 0, pax: 0 });
  }
  function cumulativeFree(cityStats, cities, cutoffMonth, cutoffDay, lang) {
    const months = Array.from({ length: cutoffMonth }, (_, i) => i + 1);
    let cumTours = 0, cumPax = 0;
    return months.map((m) => {
      const { tours, pax } = monthlyFree(cityStats, cities, m, cutoffMonth, cutoffDay, lang);
      cumTours += tours;
      cumPax += pax;
      return { month: m, tours: cumTours, pax: cumPax };
    });
  }
  function cumulativeType(cityStats, cities, cutoffMonth, cutoffDay, lang, typeFilter3) {
    const months = Array.from({ length: cutoffMonth }, (_, i) => i + 1);
    let cumTours = 0, cumPax = 0;
    return months.map((m) => {
      const { tours, pax } = monthlyType(cityStats, cities, m, cutoffMonth, cutoffDay, lang, typeFilter3);
      cumTours += tours;
      cumPax += pax;
      return { month: m, tours: cumTours, pax: cumPax };
    });
  }

  // src/pages/section-free.js
  var LANGS = [
    { value: "all", label: "All languages" },
    { value: "eng", label: "English" },
    { value: "esp", label: "Espa\xF1ol" },
    { value: "fra", label: "Fran\xE7ais" }
  ];
  var activeCity = "all";
  var activeLang = "all";
  var chartInstances = [];
  function citiesInScope() {
    return activeCity === "all" ? CITIES : [activeCity];
  }
  function renderFreeSection(containerEl, cityStats, chartIdPrefix) {
    const cutoffMonth = getCutoffMonth();
    const cutoffDay = getCutoffDay();
    if (!containerEl.dataset.built) {
      containerEl.innerHTML = `
      <h2>Free Tours</h2>
      <div class="kpi-grid" id="${chartIdPrefix}-free-kpis"></div>
      <div class="filter-bar sticky">
        <select id="${chartIdPrefix}-free-city">
          <option value="all">All cities</option>
          ${CITIES.map((c) => `<option value="${c}">${c}</option>`).join("")}
        </select>
        <select id="${chartIdPrefix}-free-lang">
          ${LANGS.map((l) => `<option value="${l.value}">${l.label}</option>`).join("")}
        </select>
      </div>
      <div class="chart-grid">
        ${chartCardHtml(`${chartIdPrefix}-free-city-chart`, "Free PAX by City")}
        ${chartCardHtml(`${chartIdPrefix}-free-avg`, "Avg PAX per Free Tour")}
        ${chartCardHtml(`${chartIdPrefix}-free-cum`, "Cumulative Free PAX Trend")}
      </div>
      <div class="card">
        <div class="card-title">Free PAX by Month and City</div>
        <table id="${chartIdPrefix}-free-table"></table>
      </div>
    `;
      document.getElementById(`${chartIdPrefix}-free-city`).addEventListener("change", (e) => {
        activeCity = e.target.value;
        renderFreeSection(containerEl, cityStats, chartIdPrefix);
      });
      document.getElementById(`${chartIdPrefix}-free-lang`).addEventListener("change", (e) => {
        activeLang = e.target.value;
        renderFreeSection(containerEl, cityStats, chartIdPrefix);
      });
      containerEl.dataset.built = "true";
    }
    chartInstances.forEach((c) => c.destroy());
    chartInstances = [];
    const cities = citiesInScope();
    const perCity = perCityFree(cityStats, cities, cutoffMonth, cutoffDay, activeLang);
    const totalTours = perCity.reduce((s, c) => s + c.tours, 0);
    const totalPax = perCity.reduce((s, c) => s + c.pax, 0);
    const avgPax = totalTours > 0 ? (totalPax / totalTours).toFixed(1) : "0.0";
    document.getElementById(`${chartIdPrefix}-free-kpis`).innerHTML = kpiCardHtml("Free Tours \u2013 PAX Count", fmtN(totalPax)) + kpiCardHtml("Total Free Tours", fmtN(totalTours)) + kpiCardHtml("Avg PAX / Free Tour", avgPax);
    chartInstances.push(barChart(
      document.getElementById(`${chartIdPrefix}-free-city-chart`),
      perCity.map((c) => c.city),
      [{ label: "Free PAX", data: perCity.map((c) => c.pax), backgroundColor: cityColors(perCity.map((c) => c.city)) }]
    ));
    chartInstances.push(barChart(
      document.getElementById(`${chartIdPrefix}-free-avg`),
      perCity.map((c) => c.city),
      [{ label: "Avg PAX/Tour", data: perCity.map((c) => c.tours > 0 ? +(c.pax / c.tours).toFixed(1) : 0), backgroundColor: cityColors(perCity.map((c) => c.city)) }]
    ));
    const trend = cumulativeFree(cityStats, cities, cutoffMonth, cutoffDay, activeLang);
    chartInstances.push(lineChart(
      document.getElementById(`${chartIdPrefix}-free-cum`),
      trend.map((t) => MONTH_NAMES[t.month]),
      [{ label: "Cumulative Free PAX", data: trend.map((t) => t.pax), borderColor: cssVar("--text", "#1a1a1a"), fill: false }]
    ));
    const months = Array.from({ length: cutoffMonth }, (_, i) => i + 1);
    const table = document.getElementById(`${chartIdPrefix}-free-table`);
    let rowsHtml = "<thead><tr><th>Month</th>" + CITIES.map((c) => `<th>${c}</th>`).join("") + "</tr></thead><tbody>";
    months.forEach((m) => {
      rowsHtml += `<tr><td>${MONTH_NAMES[m]}</td>` + CITIES.map((city) => {
        const { pax } = monthlyFree(cityStats, [city], m, cutoffMonth, cutoffDay, activeLang);
        return `<td>${fmtN(pax)}</td>`;
      }).join("") + "</tr>";
    });
    rowsHtml += "</tbody>";
    table.innerHTML = rowsHtml;
  }

  // src/pages/section-paid-group.js
  var LANGS2 = [
    { value: "all", label: "All languages" },
    { value: "eng", label: "English" },
    { value: "esp", label: "Espa\xF1ol" },
    { value: "fra", label: "Fran\xE7ais" }
  ];
  var activeType = "all";
  var activeCity2 = "all";
  var activeLang2 = "all";
  var chartInstances2 = [];
  function typeFilter() {
    return (t) => {
      if (!GROUP_TYPES.includes(t)) return false;
      if (activeType !== "all" && t !== activeType) return false;
      return true;
    };
  }
  function citiesInScope2() {
    return activeCity2 === "all" ? CITIES : [activeCity2];
  }
  function renderPaidGroupSection(containerEl, cityStats, chartIdPrefix) {
    const cutoffMonth = getCutoffMonth();
    const cutoffDay = getCutoffDay();
    if (!containerEl.dataset.built) {
      containerEl.innerHTML = `
      <h2>Paid Group Tours</h2>
      <div class="kpi-grid" id="${chartIdPrefix}-pg-kpis"></div>
      <div class="filter-bar sticky">
        <select id="${chartIdPrefix}-pg-type">
          <option value="all">All types</option>
          ${GROUP_TYPES.map((t) => `<option value="${t}">${t}</option>`).join("")}
        </select>
        <select id="${chartIdPrefix}-pg-city">
          <option value="all">All cities</option>
          ${CITIES.map((c) => `<option value="${c}">${c}</option>`).join("")}
        </select>
        <select id="${chartIdPrefix}-pg-lang">
          ${LANGS2.map((l) => `<option value="${l.value}">${l.label}</option>`).join("")}
        </select>
      </div>
      <div class="chart-grid">
        ${chartCardHtml(`${chartIdPrefix}-pg-c1`, "Paid Group PAX by City")}
        ${chartCardHtml(`${chartIdPrefix}-pg-c2`, "Cumulative Paid Group PAX Trend")}
        ${chartCardHtml(`${chartIdPrefix}-pg-c3`, "Paid Group Tours by City")}
        ${chartCardHtml(`${chartIdPrefix}-pg-c4`, "Cumulative Paid Group Tours Trend")}
        ${chartCardHtml(`${chartIdPrefix}-pg-c5`, "Avg PAX per Paid Group Tour Trend")}
        <div class="card" id="${chartIdPrefix}-pg-stats"><div class="card-title">Paid Group Totals</div></div>
      </div>
    `;
      document.getElementById(`${chartIdPrefix}-pg-type`).addEventListener("change", (e) => {
        activeType = e.target.value;
        renderPaidGroupSection(containerEl, cityStats, chartIdPrefix);
      });
      document.getElementById(`${chartIdPrefix}-pg-city`).addEventListener("change", (e) => {
        activeCity2 = e.target.value;
        renderPaidGroupSection(containerEl, cityStats, chartIdPrefix);
      });
      document.getElementById(`${chartIdPrefix}-pg-lang`).addEventListener("change", (e) => {
        activeLang2 = e.target.value;
        renderPaidGroupSection(containerEl, cityStats, chartIdPrefix);
      });
      containerEl.dataset.built = "true";
    }
    chartInstances2.forEach((c) => c.destroy());
    chartInstances2 = [];
    const cities = citiesInScope2();
    const filter = typeFilter();
    const perCity = perCityType(cityStats, cities, cutoffMonth, cutoffDay, activeLang2, filter);
    const totalTours = perCity.reduce((s, c) => s + c.tours, 0);
    const totalPax = perCity.reduce((s, c) => s + c.pax, 0);
    const avgPax = totalTours > 0 ? (totalPax / totalTours).toFixed(1) : "0.0";
    document.getElementById(`${chartIdPrefix}-pg-kpis`).innerHTML = kpiCardHtml("Paid Group PAX", fmtN(totalPax)) + kpiCardHtml("Paid Group Tours", fmtN(totalTours)) + kpiCardHtml("Avg PAX / Tour", avgPax);
    chartInstances2.push(barChart(document.getElementById(`${chartIdPrefix}-pg-c1`), perCity.map((c) => c.city), [{ label: "Paid Group PAX", data: perCity.map((c) => c.pax), backgroundColor: cityColors(perCity.map((c) => c.city)) }]));
    chartInstances2.push(barChart(document.getElementById(`${chartIdPrefix}-pg-c3`), perCity.map((c) => c.city), [{ label: "Paid Group Tours", data: perCity.map((c) => c.tours), backgroundColor: cityColors(perCity.map((c) => c.city)) }]));
    const trend = cumulativeType(cityStats, cities, cutoffMonth, cutoffDay, activeLang2, filter);
    const avgTrend = trend.map((t, i, arr) => {
      const prevTours = i > 0 ? arr[i - 1].tours : 0;
      const prevPax = i > 0 ? arr[i - 1].pax : 0;
      const monthTours = t.tours - prevTours;
      const monthPax = t.pax - prevPax;
      return monthTours > 0 ? +(monthPax / monthTours).toFixed(1) : 0;
    });
    chartInstances2.push(lineChart(document.getElementById(`${chartIdPrefix}-pg-c2`), trend.map((t) => MONTH_NAMES[t.month]), [{ label: "Cumulative Paid Group PAX", data: trend.map((t) => t.pax), borderColor: cssVar("--text", "#1a1a1a"), fill: false }]));
    chartInstances2.push(lineChart(document.getElementById(`${chartIdPrefix}-pg-c4`), trend.map((t) => MONTH_NAMES[t.month]), [{ label: "Cumulative Paid Group Tours", data: trend.map((t) => t.tours), borderColor: cssVar("--text", "#1a1a1a"), fill: false }]));
    chartInstances2.push(lineChart(document.getElementById(`${chartIdPrefix}-pg-c5`), trend.map((t) => MONTH_NAMES[t.month]), [{ label: "Avg PAX/Tour", data: avgTrend, borderColor: "#999", fill: false }]));
    document.getElementById(`${chartIdPrefix}-pg-stats`).innerHTML = `<div class="card-title">Paid Group Totals</div>` + kpiCardHtml("Paid PAX", fmtN(totalPax)) + kpiCardHtml("Paid Tours", fmtN(totalTours)) + kpiCardHtml("Avg PAX/Tour", avgPax);
  }

  // src/pages/section-paid-private.js
  var LANGS3 = [
    { value: "all", label: "All languages" },
    { value: "eng", label: "English" },
    { value: "esp", label: "Espa\xF1ol" },
    { value: "fra", label: "Fran\xE7ais" }
  ];
  var activeType2 = "all";
  var activeCity3 = "all";
  var activeLang3 = "all";
  var chartInstances3 = [];
  function isPrivateBucket(t) {
    return categorizeType(t) !== "group";
  }
  function typeFilter2() {
    return (t) => {
      if (!isPrivateBucket(t)) return false;
      if (activeType2 !== "all" && t !== activeType2) return false;
      return true;
    };
  }
  function citiesInScope3() {
    return activeCity3 === "all" ? CITIES : [activeCity3];
  }
  function renderPaidPrivateSection(containerEl, cityStats, chartIdPrefix) {
    const cutoffMonth = getCutoffMonth();
    const cutoffDay = getCutoffDay();
    if (!containerEl.dataset.built) {
      containerEl.innerHTML = `
      <h2>Paid Private Tours</h2>
      <div class="kpi-grid" id="${chartIdPrefix}-pp-kpis"></div>
      <div class="filter-bar sticky">
        <select id="${chartIdPrefix}-pp-type">
          <option value="all">All types</option>
          ${PRIVATE_TYPES.map((t) => `<option value="${t}">${t}</option>`).join("")}
          <option value="food kuoni">custom</option>
        </select>
        <select id="${chartIdPrefix}-pp-city">
          <option value="all">All cities</option>
          ${CITIES.map((c) => `<option value="${c}">${c}</option>`).join("")}
        </select>
        <select id="${chartIdPrefix}-pp-lang">
          ${LANGS3.map((l) => `<option value="${l.value}">${l.label}</option>`).join("")}
        </select>
      </div>
      <div class="chart-grid">
        ${chartCardHtml(`${chartIdPrefix}-pp-c1`, "Paid Private Tours by City")}
        ${chartCardHtml(`${chartIdPrefix}-pp-c2`, "Cumulative Paid Private Tours Trend")}
      </div>
    `;
      document.getElementById(`${chartIdPrefix}-pp-type`).addEventListener("change", (e) => {
        activeType2 = e.target.value;
        renderPaidPrivateSection(containerEl, cityStats, chartIdPrefix);
      });
      document.getElementById(`${chartIdPrefix}-pp-city`).addEventListener("change", (e) => {
        activeCity3 = e.target.value;
        renderPaidPrivateSection(containerEl, cityStats, chartIdPrefix);
      });
      document.getElementById(`${chartIdPrefix}-pp-lang`).addEventListener("change", (e) => {
        activeLang3 = e.target.value;
        renderPaidPrivateSection(containerEl, cityStats, chartIdPrefix);
      });
      containerEl.dataset.built = "true";
    }
    chartInstances3.forEach((c) => c.destroy());
    chartInstances3 = [];
    const cities = citiesInScope3();
    const filter = typeFilter2();
    const perCity = perCityType(cityStats, cities, cutoffMonth, cutoffDay, activeLang3, filter);
    const totalTours = perCity.reduce((s, c) => s + c.tours, 0);
    document.getElementById(`${chartIdPrefix}-pp-kpis`).innerHTML = kpiCardHtml("Paid Private Tours", fmtN(totalTours));
    chartInstances3.push(barChart(document.getElementById(`${chartIdPrefix}-pp-c1`), perCity.map((c) => c.city), [{ label: "Paid Private Tours", data: perCity.map((c) => c.tours), backgroundColor: cityColors(perCity.map((c) => c.city)) }]));
    const trend = cumulativeType(cityStats, cities, cutoffMonth, cutoffDay, activeLang3, filter);
    chartInstances3.push(lineChart(document.getElementById(`${chartIdPrefix}-pp-c2`), trend.map((t) => MONTH_NAMES[t.month]), [{ label: "Cumulative Paid Private Tours", data: trend.map((t) => t.tours), borderColor: cssVar("--text", "#1a1a1a"), fill: false }]));
  }

  // src/pages/page-year.js
  function makeYearPage(pageId, getCityStats, chartIdPrefix) {
    return {
      _initialized: false,
      init() {
        const root = document.getElementById(pageId);
        root.innerHTML = `
        <div id="${chartIdPrefix}-free"></div>
        <div id="${chartIdPrefix}-group"></div>
        <div id="${chartIdPrefix}-private"></div>
      `;
        this.renderAll();
      },
      renderAll() {
        const cityStats = getCityStats();
        renderFreeSection(document.getElementById(`${chartIdPrefix}-free`), cityStats, chartIdPrefix);
        renderPaidGroupSection(document.getElementById(`${chartIdPrefix}-group`), cityStats, chartIdPrefix);
        renderPaidPrivateSection(document.getElementById(`${chartIdPrefix}-private`), cityStats, chartIdPrefix);
      }
    };
  }
  var Page25 = makeYearPage("page-p25", () => cityStats25, "p25");
  var Page26 = makeYearPage("page-p26", () => cityStats26, "p26");

  // src/pages/page-cmp.js
  var LANGS4 = [
    { value: "all", label: "All languages" },
    { value: "eng", label: "English" },
    { value: "esp", label: "Espa\xF1ol" },
    { value: "fra", label: "Fran\xE7ais" }
  ];
  function dualBar(elId, labels, data25, data26) {
    return barChart(document.getElementById(elId), labels, [
      { label: "2025", data: data25, backgroundColor: cssVar("--y25", "#4a3aa7") },
      { label: "2026", data: data26, backgroundColor: cssVar("--y26", "#1a1a1a") }
    ]);
  }
  function dualLine(elId, labels, data25, data26) {
    return lineChart(document.getElementById(elId), labels, [
      { label: "2025", data: data25, borderColor: cssVar("--y25", "#4a3aa7"), fill: false },
      { label: "2026", data: data26, borderColor: cssVar("--y26", "#1a1a1a"), fill: false }
    ]);
  }
  function avgPaxPerCity(perCity) {
    return perCity.map((c) => c.tours > 0 ? +(c.pax / c.tours).toFixed(1) : 0);
  }
  function avgPaxTrend(trend) {
    return trend.map((t, i, arr) => {
      const prevTours = i > 0 ? arr[i - 1].tours : 0;
      const prevPax = i > 0 ? arr[i - 1].pax : 0;
      const monthTours = t.tours - prevTours;
      const monthPax = t.pax - prevPax;
      return monthTours > 0 ? +(monthPax / monthTours).toFixed(1) : 0;
    });
  }
  function langOptionsHtml() {
    return LANGS4.map((l) => `<option value="${l.value}">${l.label}</option>`).join("");
  }
  function cityOptionsHtml() {
    return `<option value="all">All cities</option>` + CITIES.map((c) => `<option value="${c}">${c}</option>`).join("");
  }
  var freeState = { city: "all", lang: "all" };
  var freeCharts = [];
  function renderFreeBlock(containerEl) {
    const cutoffMonth = getCutoffMonth();
    const cutoffDay = getCutoffDay();
    if (!containerEl.dataset.built) {
      containerEl.innerHTML = `
      <div class="card-title">Free Tours</div>
      <div class="filter-bar sticky">
        <select id="cmp-free-city">${cityOptionsHtml()}</select>
        <select id="cmp-free-lang">${langOptionsHtml()}</select>
      </div>
      <div class="kpi-grid" id="cmp-free-kpis"></div>
      <div class="chart-grid">
        ${chartCardHtml("cmp-free-city-chart", "Free PAX by City \u2014 2025 vs 2026")}
        ${chartCardHtml("cmp-free-avg", "Avg PAX per Free Tour by City \u2014 2025 vs 2026")}
        ${chartCardHtml("cmp-free-cum", "Cumulative Free PAX Trend \u2014 2025 vs 2026")}
      </div>
    `;
      document.getElementById("cmp-free-city").addEventListener("change", (e) => {
        freeState.city = e.target.value;
        renderFreeBlock(containerEl);
      });
      document.getElementById("cmp-free-lang").addEventListener("change", (e) => {
        freeState.lang = e.target.value;
        renderFreeBlock(containerEl);
      });
      containerEl.dataset.built = "true";
    }
    const cities = freeState.city === "all" ? CITIES : [freeState.city];
    const pc25 = perCityFree(cityStats25, cities, cutoffMonth, cutoffDay, freeState.lang);
    const pc26 = perCityFree(cityStats26, cities, cutoffMonth, cutoffDay, freeState.lang);
    const t25 = cumulativeFree(cityStats25, cities, cutoffMonth, cutoffDay, freeState.lang);
    const t26 = cumulativeFree(cityStats26, cities, cutoffMonth, cutoffDay, freeState.lang);
    document.getElementById("cmp-free-kpis").innerHTML = kpiCardHtml("2025 Tours", fmtN(pc25.reduce((s, c) => s + c.tours, 0))) + kpiCardHtml("2026 Tours", fmtN(pc26.reduce((s, c) => s + c.tours, 0))) + kpiCardHtml("2025 PAX", fmtN(pc25.reduce((s, c) => s + c.pax, 0))) + kpiCardHtml("2026 PAX", fmtN(pc26.reduce((s, c) => s + c.pax, 0)));
    freeCharts.forEach((c) => c.destroy());
    freeCharts = [
      dualBar("cmp-free-city-chart", cities, pc25.map((c) => c.pax), pc26.map((c) => c.pax)),
      dualBar("cmp-free-avg", cities, avgPaxPerCity(pc25), avgPaxPerCity(pc26)),
      dualLine("cmp-free-cum", t26.map((t) => MONTH_NAMES[t.month]), t25.map((t) => t.pax), t26.map((t) => t.pax))
    ];
  }
  var groupState = { type: "all", city: "all", lang: "all" };
  var groupCharts = [];
  function groupTypeFilter() {
    return (t) => {
      if (categorizeType(t) !== "group") return false;
      if (groupState.type !== "all" && t !== groupState.type) return false;
      return true;
    };
  }
  function renderGroupBlock(containerEl) {
    const cutoffMonth = getCutoffMonth();
    const cutoffDay = getCutoffDay();
    if (!containerEl.dataset.built) {
      containerEl.innerHTML = `
      <div class="card-title">Paid Group Tours</div>
      <div class="filter-bar sticky">
        <select id="cmp-group-type">
          <option value="all">All types</option>
          ${GROUP_TYPES.map((t) => `<option value="${t}">${t}</option>`).join("")}
        </select>
        <select id="cmp-group-city">${cityOptionsHtml()}</select>
        <select id="cmp-group-lang">${langOptionsHtml()}</select>
      </div>
      <div class="kpi-grid" id="cmp-group-kpis"></div>
      <div class="chart-grid">
        ${chartCardHtml("cmp-group-pax-city", "Paid Group PAX by City \u2014 2025 vs 2026")}
        ${chartCardHtml("cmp-group-tours-city", "Paid Group Tours by City \u2014 2025 vs 2026")}
        ${chartCardHtml("cmp-group-pax-trend", "Cumulative Paid Group PAX Trend \u2014 2025 vs 2026")}
        ${chartCardHtml("cmp-group-tours-trend", "Cumulative Paid Group Tours Trend \u2014 2025 vs 2026")}
        ${chartCardHtml("cmp-group-avg-trend", "Avg PAX per Paid Group Tour Trend \u2014 2025 vs 2026")}
      </div>
    `;
      document.getElementById("cmp-group-type").addEventListener("change", (e) => {
        groupState.type = e.target.value;
        renderGroupBlock(containerEl);
      });
      document.getElementById("cmp-group-city").addEventListener("change", (e) => {
        groupState.city = e.target.value;
        renderGroupBlock(containerEl);
      });
      document.getElementById("cmp-group-lang").addEventListener("change", (e) => {
        groupState.lang = e.target.value;
        renderGroupBlock(containerEl);
      });
      containerEl.dataset.built = "true";
    }
    const cities = groupState.city === "all" ? CITIES : [groupState.city];
    const filter = groupTypeFilter();
    const pc25 = perCityType(cityStats25, cities, cutoffMonth, cutoffDay, groupState.lang, filter);
    const pc26 = perCityType(cityStats26, cities, cutoffMonth, cutoffDay, groupState.lang, filter);
    const t25 = cumulativeType(cityStats25, cities, cutoffMonth, cutoffDay, groupState.lang, filter);
    const t26 = cumulativeType(cityStats26, cities, cutoffMonth, cutoffDay, groupState.lang, filter);
    document.getElementById("cmp-group-kpis").innerHTML = kpiCardHtml("2025 Tours", fmtN(pc25.reduce((s, c) => s + c.tours, 0))) + kpiCardHtml("2026 Tours", fmtN(pc26.reduce((s, c) => s + c.tours, 0))) + kpiCardHtml("2025 PAX", fmtN(pc25.reduce((s, c) => s + c.pax, 0))) + kpiCardHtml("2026 PAX", fmtN(pc26.reduce((s, c) => s + c.pax, 0)));
    groupCharts.forEach((c) => c.destroy());
    groupCharts = [
      dualBar("cmp-group-pax-city", cities, pc25.map((c) => c.pax), pc26.map((c) => c.pax)),
      dualBar("cmp-group-tours-city", cities, pc25.map((c) => c.tours), pc26.map((c) => c.tours)),
      dualLine("cmp-group-pax-trend", t26.map((t) => MONTH_NAMES[t.month]), t25.map((t) => t.pax), t26.map((t) => t.pax)),
      dualLine("cmp-group-tours-trend", t26.map((t) => MONTH_NAMES[t.month]), t25.map((t) => t.tours), t26.map((t) => t.tours)),
      dualLine("cmp-group-avg-trend", t26.map((t) => MONTH_NAMES[t.month]), avgPaxTrend(t25), avgPaxTrend(t26))
    ];
  }
  var privateState = { type: "all", city: "all", lang: "all" };
  var privateCharts = [];
  function privateTypeFilter() {
    return (t) => {
      if (categorizeType(t) === "group") return false;
      if (privateState.type !== "all" && t !== privateState.type) return false;
      return true;
    };
  }
  function renderPrivateBlock(containerEl) {
    const cutoffMonth = getCutoffMonth();
    const cutoffDay = getCutoffDay();
    if (!containerEl.dataset.built) {
      containerEl.innerHTML = `
      <div class="card-title">Paid Private Tours</div>
      <div class="filter-bar sticky">
        <select id="cmp-private-type">
          <option value="all">All types</option>
          ${PRIVATE_TYPES.map((t) => `<option value="${t}">${t}</option>`).join("")}
          <option value="food kuoni">custom</option>
        </select>
        <select id="cmp-private-city">${cityOptionsHtml()}</select>
        <select id="cmp-private-lang">${langOptionsHtml()}</select>
      </div>
      <div class="kpi-grid" id="cmp-private-kpis"></div>
      <div class="chart-grid">
        ${chartCardHtml("cmp-private-city-chart", "Paid Private Tours by City \u2014 2025 vs 2026")}
        ${chartCardHtml("cmp-private-trend", "Cumulative Paid Private Tours Trend \u2014 2025 vs 2026")}
      </div>
    `;
      document.getElementById("cmp-private-type").addEventListener("change", (e) => {
        privateState.type = e.target.value;
        renderPrivateBlock(containerEl);
      });
      document.getElementById("cmp-private-city").addEventListener("change", (e) => {
        privateState.city = e.target.value;
        renderPrivateBlock(containerEl);
      });
      document.getElementById("cmp-private-lang").addEventListener("change", (e) => {
        privateState.lang = e.target.value;
        renderPrivateBlock(containerEl);
      });
      containerEl.dataset.built = "true";
    }
    const cities = privateState.city === "all" ? CITIES : [privateState.city];
    const filter = privateTypeFilter();
    const pc25 = perCityType(cityStats25, cities, cutoffMonth, cutoffDay, privateState.lang, filter);
    const pc26 = perCityType(cityStats26, cities, cutoffMonth, cutoffDay, privateState.lang, filter);
    const t25 = cumulativeType(cityStats25, cities, cutoffMonth, cutoffDay, privateState.lang, filter);
    const t26 = cumulativeType(cityStats26, cities, cutoffMonth, cutoffDay, privateState.lang, filter);
    document.getElementById("cmp-private-kpis").innerHTML = kpiCardHtml("2025 Tours", fmtN(pc25.reduce((s, c) => s + c.tours, 0))) + kpiCardHtml("2026 Tours", fmtN(pc26.reduce((s, c) => s + c.tours, 0)));
    privateCharts.forEach((c) => c.destroy());
    privateCharts = [
      dualBar("cmp-private-city-chart", cities, pc25.map((c) => c.tours), pc26.map((c) => c.tours)),
      dualLine("cmp-private-trend", t26.map((t) => MONTH_NAMES[t.month]), t25.map((t) => t.tours), t26.map((t) => t.tours))
    ];
  }
  var PageCmp = {
    _initialized: false,
    init() {
      const root = document.getElementById("page-cmp");
      root.innerHTML = `
      <h2>Comparison</h2>
      <div class="card" id="cmp-free-block"></div>
      <div class="card" id="cmp-group-block"></div>
      <div class="card" id="cmp-private-block"></div>
    `;
      this.renderAll();
    },
    renderAll() {
      renderFreeBlock(document.getElementById("cmp-free-block"));
      renderGroupBlock(document.getElementById("cmp-group-block"));
      renderPrivateBlock(document.getElementById("cmp-private-block"));
    }
  };

  // src/pages/page-guides.js
  var LANGS5 = [
    { value: "all", label: "All languages" },
    { value: "eng", label: "English" },
    { value: "esp", label: "Espa\xF1ol" },
    { value: "fra", label: "Fran\xE7ais" }
  ];
  var activeCity4 = "all";
  var activeLang4 = "all";
  var activeView = "cards";
  var CITY_GROUP_ORDER = ["Zagreb", "Dubrovnik", "Zadar", "Split"];
  function groupRowsByCity(rows) {
    const groups = CITY_GROUP_ORDER.map((city) => ({ city, rows: rows.filter((r) => r.city === city) }));
    const other = rows.filter((r) => !CITY_GROUP_ORDER.includes(r.city));
    if (other.length) groups.push({ city: "Other", rows: other });
    return groups.filter((g) => g.rows.length > 0);
  }
  function deltaCellsHtml(d) {
    const cls = d.delta > 0 ? "delta-pos" : d.delta < 0 ? "delta-neg" : "delta-neu";
    const sign = d.delta > 0 ? "+" : "";
    return `<td>${fmtN(d.v25)}</td><td>${fmtN(d.v26)}</td><td class="${cls}">${sign}${fmtN(d.delta)}</td><td class="${cls}">${sign}${d.pct}%</td>`;
  }
  function rowHtml(row, isTotal) {
    const nameCell = isTotal ? `<td><strong>${row.name}</strong></td>` : `<td>${row.name}</td>`;
    return `<tr>${nameCell}` + deltaCellsHtml(row.freeTours) + deltaCellsHtml(row.freePax) + deltaCellsHtml(row.paidTours) + deltaCellsHtml(row.paidPax) + deltaCellsHtml(row.totalTours) + `</tr>`;
  }
  var CITY_CODES = { Zagreb: "ZG", Dubrovnik: "DU", Split: "ST", Zadar: "ZD" };
  var CITY_KEYS = { Zagreb: "zagreb", Dubrovnik: "dubrovnik", Split: "split", Zadar: "zadar" };
  function cityCode(city) {
    return CITY_CODES[city] || (city ? city.slice(0, 2).toUpperCase() : "?");
  }
  function cityAvatarStyle(city) {
    const key = CITY_KEYS[city];
    return key ? ` style="--avatar-hue: var(--${key}); --avatar-text: var(--${key}-text);"` : "";
  }
  function cardRowHtml(label, d) {
    const cls = d.delta > 0 ? "delta-pos" : d.delta < 0 ? "delta-neg" : "delta-neu";
    const sign = d.delta > 0 ? "+" : "";
    return `
    <div class="guide-card-row">
      <span class="gcr-label">${label}</span>
      <span class="gcr-v25">${fmtN(d.v25)}</span>
      <span class="gcr-v26">${fmtN(d.v26)}</span>
      <span class="gcr-delta ${cls}">${sign}${fmtN(d.delta)} (${sign}${d.pct}%)</span>
    </div>`;
  }
  function cardHtml(row) {
    return `
    <div class="guide-card">
      <div class="guide-card-head">
        <div class="guide-avatar"${cityAvatarStyle(row.city)}>${cityCode(row.city)}</div>
        <div class="guide-name">${row.name}</div>
      </div>
      <div class="guide-card-rows">
        ${cardRowHtml("Free Tours", row.freeTours)}
        ${cardRowHtml("Free Pax", row.freePax)}
        ${cardRowHtml("Paid Tours", row.paidTours)}
        ${cardRowHtml("Paid Pax", row.paidPax)}
        ${cardRowHtml("Total Pax", row.totalPax)}
      </div>
    </div>`;
  }
  function totalStripHtml(row) {
    const stat = (label, d) => {
      const cls = d.delta > 0 ? "delta-pos" : d.delta < 0 ? "delta-neg" : "delta-neu";
      const sign = d.delta > 0 ? "+" : "";
      return `
      <div class="gts-stat">
        <div class="gts-label">${label}</div>
        <div class="gts-values">${fmtN(d.v25)} <span class="gts-arrow">&rarr;</span> ${fmtN(d.v26)}</div>
        <div class="gts-delta ${cls}">${sign}${fmtN(d.delta)} (${sign}${d.pct}%)</div>
      </div>`;
    };
    return `
    <div class="guide-total-strip">
      ${stat("Free Tours", row.freeTours)}
      ${stat("Free Pax", row.freePax)}
      ${stat("Paid Tours", row.paidTours)}
      ${stat("Paid Pax", row.paidPax)}
      ${stat("Total Pax", row.totalPax)}
    </div>`;
  }
  function groupHeaderRowHtml(city) {
    return `<tr class="city-group-row"><td colspan="21">${city}</td></tr>`;
  }
  function groupHeaderCardHtml(city) {
    return `<div class="guide-group-title">${city}</div>`;
  }
  function filterByCity(guides, city) {
    return city === "all" ? guides : guides.filter((g) => g.city === city);
  }
  var PageGuides = {
    _initialized: false,
    init() {
      const root = document.getElementById("page-guides");
      root.innerHTML = `
      <h2>Guides</h2>
      <div class="filter-bar sticky">
        <select id="guides-city">
          <option value="all">All cities</option>
          ${CITIES.map((c) => `<option value="${c}">${c}</option>`).join("")}
        </select>
        <select id="guides-lang">
          ${LANGS5.map((l) => `<option value="${l.value}">${l.label}</option>`).join("")}
        </select>
        <div class="view-toggle-group">
          <button id="view-table-btn" class="view-toggle-btn" title="Table view">&#9776;</button>
          <button id="view-cards-btn" class="view-toggle-btn active" title="Card view">&#9638;</button>
        </div>
      </div>
      <div class="card" id="guides-table-wrap">
        <table id="guides-table">
          <thead>
            <tr>
              <th rowspan="2">Guide</th>
              <th colspan="4">Free Tours</th>
              <th colspan="4">Free PAX</th>
              <th colspan="4">Paid Tours</th>
              <th colspan="4">Paid PAX</th>
              <th colspan="4">Total Tours</th>
            </tr>
            <tr>
              ${"<th>25</th><th>26</th><th>+/-</th><th>%</th>".repeat(5)}
            </tr>
          </thead>
          <tbody id="guides-tbody"></tbody>
          <tfoot id="guides-tfoot"></tfoot>
        </table>
      </div>
      <div id="guides-total-strip"></div>
      <div class="guide-cards" id="guides-cards"></div>
    `;
      document.getElementById("guides-city").addEventListener("change", (e) => {
        activeCity4 = e.target.value;
        this.renderAll();
      });
      document.getElementById("guides-lang").addEventListener("change", (e) => {
        activeLang4 = e.target.value;
        this.renderAll();
      });
      document.getElementById("view-table-btn").addEventListener("click", () => {
        activeView = "table";
        this.renderAll();
      });
      document.getElementById("view-cards-btn").addEventListener("click", () => {
        activeView = "cards";
        this.renderAll();
      });
      this.renderAll();
    },
    renderAll() {
      const cutoffMonth = getCutoffMonth();
      const cutoffDay = getCutoffDay();
      const g25 = filterByCity(guideStats25, activeCity4);
      const g26 = filterByCity(guideStats26, activeCity4);
      const { rows, totalRow } = buildGuideTable(g25, g26, [], cutoffMonth, cutoffDay, activeLang4);
      const showGroups = activeCity4 === "all";
      let tbodyHtml, cardsHtml;
      if (showGroups) {
        const groups = groupRowsByCity(rows);
        tbodyHtml = groups.map((g) => groupHeaderRowHtml(g.city) + g.rows.map((r) => rowHtml(r, false)).join("")).join("");
        cardsHtml = groups.map((g) => groupHeaderCardHtml(g.city) + g.rows.map((r) => cardHtml(r)).join("")).join("");
      } else {
        tbodyHtml = rows.map((r) => rowHtml(r, false)).join("");
        cardsHtml = rows.map((r) => cardHtml(r)).join("");
      }
      document.getElementById("guides-tbody").innerHTML = tbodyHtml;
      document.getElementById("guides-tfoot").innerHTML = rowHtml(totalRow, true);
      document.getElementById("guides-total-strip").innerHTML = totalStripHtml(totalRow);
      document.getElementById("guides-cards").innerHTML = cardsHtml;
      document.getElementById("view-table-btn").classList.toggle("active", activeView === "table");
      document.getElementById("view-cards-btn").classList.toggle("active", activeView === "cards");
      document.getElementById("guides-table-wrap").style.display = activeView === "table" ? "" : "none";
      document.getElementById("guides-total-strip").style.display = activeView === "cards" ? "" : "none";
      document.getElementById("guides-cards").style.display = activeView === "cards" ? "" : "none";
    }
  };

  // src/main.js
  registerPage("Page25", Page25);
  registerPage("Page26", Page26);
  registerPage("PageCmp", PageCmp);
  registerPage("PageGuides", PageGuides);
  window.showPage = showPage;
  window.toggleTheme = toggleTheme;
  window.updateDateAsOf = updateDateAsOf;
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    const dateInput = document.getElementById("as-of-date");
    if (dateInput) {
      dateInput.value = getGlobalDate();
      dateInput.addEventListener("change", (e) => updateDateAsOf(e.target.value));
    }
    document.getElementById("theme-toggle")?.addEventListener("click", toggleTheme);
    showPage("cmp", document.querySelector('.nav-tab[data-page="cmp"]'));
  });
})();
