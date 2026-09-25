(() => {
  // src/shared.js
  var CITIES = ["Zagreb", "Dubrovnik", "Split", "Zadar"];
  var PAGES = {
    Page25: null,
    Page26: null,
    PageCmp: null,
    PageBookings: null,
    PageGuides: null,
    PageFinancial: null
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
  function fmtEUR(v) {
    return "\u20AC" + Math.round(v).toLocaleString("en-GB");
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
    return { p25: "Page25", p26: "Page26", cmp: "PageCmp", bookings: "PageBookings", guides: "PageGuides", financial: "PageFinancial" }[id];
  }
  function rerenderInitializedPages() {
    Object.values(PAGES).forEach((page) => {
      if (page && page._initialized) page.renderAll();
    });
  }
  function updateDateAsOf(val) {
    setGlobalDate(val);
    rerenderInitializedPages();
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
  function hexToRgba(hex, alpha) {
    const h = hex.replace("#", "");
    const r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  function cityColorsAlpha(cities, alpha) {
    return cityColors(cities).map((hex) => hexToRgba(hex, alpha));
  }
  var CITY_CODES = { Zagreb: "ZG", Dubrovnik: "DU", Split: "ST", Zadar: "ZD" };
  var LANG_CODES = [["all", "ALL"], ["eng", "EN"], ["esp", "ES"], ["fra", "FR"]];
  var LANG_VARS = { eng: "--eng", esp: "--esp", fra: "--fra" };
  function chipBtn(value, label, active, extraClass, styleAttr) {
    const cls = ["chip-btn", extraClass, active === value ? "active" : ""].filter(Boolean).join(" ");
    return `<button type="button" class="${cls}" data-value="${value}"${styleAttr || ""}>${label}</button>`;
  }
  function cityChipsHtml(idPrefix, active) {
    const btns = ["all", ...Object.keys(CITY_VARS)].map((c) => {
      if (c === "all") return chipBtn("all", "ALL", active);
      const style = ` style="--chip-hue: var(${CITY_VARS[c]}); --chip-text: var(${CITY_VARS[c]}-text);"`;
      return chipBtn(c, CITY_CODES[c], active, "city", style);
    }).join("");
    return `<div class="chip-group chip-group-pill" id="${idPrefix}-city-chips">${btns}</div>`;
  }
  function langChipsHtml(idPrefix, active) {
    const btns = LANG_CODES.map(([v, l]) => {
      if (v === "all") return chipBtn("all", "ALL", active);
      const style = ` style="--chip-hue: var(${LANG_VARS[v]}); --chip-text: var(${LANG_VARS[v]}-text);"`;
      return chipBtn(v, l, active, "lang", style);
    }).join("");
    return `<div class="chip-group chip-group-pill" id="${idPrefix}-lang-chips">${btns}</div>`;
  }
  function bindChipGroup(groupId, onSelect) {
    document.getElementById(groupId).addEventListener("click", (e) => {
      const btn = e.target.closest(".chip-btn");
      if (!btn) return;
      onSelect(btn.dataset.value);
    });
  }
  function syncChipGroup(groupId, active) {
    document.querySelectorAll(`#${groupId} .chip-btn`).forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.value === active);
    });
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
  var CATEGORY_HOVER = { mode: "index", intersect: false };
  function lineChart(ctx, labels, datasets, title) {
    return new Chart(ctx, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        interaction: CATEGORY_HOVER,
        plugins: {
          title: { display: !!title, text: title },
          legend: { display: datasets.length > 1 },
          tooltip: tooltipDefaults()
        },
        scales: { x: axisDefaults(), y: axisDefaults() }
      }
    });
  }
  function barChart(ctx, labels, datasets, title, extraOptions = {}) {
    return new Chart(ctx, {
      type: "bar",
      data: { labels, datasets },
      options: {
        responsive: true,
        interaction: CATEGORY_HOVER,
        plugins: {
          title: { display: !!title, text: title },
          legend: { display: datasets.length > 1 },
          tooltip: tooltipDefaults()
        },
        scales: { x: axisDefaults(), y: axisDefaults() },
        ...extraOptions
      }
    });
  }
  function dualBar(elId, labels, data25, data26) {
    return barChart(document.getElementById(elId), labels, [
      { label: "2025", data: data25, backgroundColor: cityColorsAlpha(labels, 0.4) },
      { label: "2026", data: data26, backgroundColor: cityColors(labels) }
    ]);
  }
  function dualLine(elId, labels, data25, data26) {
    return lineChart(document.getElementById(elId), labels, [
      { label: "2025", data: data25, borderColor: cssVar("--y25", "#4a3aa7"), fill: false },
      { label: "2026", data: data26, borderColor: cssVar("--y26", "#1a1a1a"), fill: false }
    ]);
  }
  function channelColors(labels) {
    return labels.map((c, i) => c === "other" ? cssVar("--text3", "#767676") : cssVar(`--chan-${i + 1}`, "#1a1a1a"));
  }
  function channelBar(elId, labels, data26, data25 = null) {
    const colors = channelColors(labels);
    const datasets = [];
    if (data25) {
      datasets.push({ label: "2025", data: data25, backgroundColor: colors.map((c) => hexToRgba(c, 0.4)) });
    }
    datasets.push({ label: "2026", data: data26, backgroundColor: colors });
    return barChart(document.getElementById(elId), labels, datasets, void 0, { maintainAspectRatio: false });
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
    const pct = v25 <= 0 ? null : Math.round(delta / v25 * 1e3) / 10;
    return { v25, v26, delta, pct };
  }
  function pctLabel(d) {
    if (d.pct === null) return d.v26 > 0 ? "new" : "\u2014";
    const sign = d.delta > 0 ? "+" : "";
    return `${sign}${d.pct}%`;
  }
  var ZERO_STATS = { freeTours: 0, freePax: 0, paidTours: 0, paidPax: 0 };
  function buildGuideRow(guide25, guide26, months, cutoffMonth, cutoffDay, lang = "all") {
    const name = guide26 ? guide26.name : guide25.name;
    const city = guide26 ? guide26.city : guide25.city;
    const st25 = guide25 ? guide25.stats[lang] || guide25.stats.all : null;
    const st26 = guide26 ? guide26.stats[lang] || guide26.stats.all : null;
    const f25 = st25 ? filteredStats(st25, months, cutoffMonth, cutoffDay) : ZERO_STATS;
    const f26 = st26 ? filteredStats(st26, months, cutoffMonth, cutoffDay) : ZERO_STATS;
    const fAll25 = guide25 ? filteredStats(guide25.stats.all, months, cutoffMonth, cutoffDay) : ZERO_STATS;
    const fAll26 = guide26 ? filteredStats(guide26.stats.all, months, cutoffMonth, cutoffDay) : ZERO_STATS;
    const activity25 = fAll25.freeTours + fAll25.paidTours;
    const activity26 = fAll26.freeTours + fAll26.paidTours;
    const rev25 = guide25 && guide25.mgmt ? guide25.mgmt.revenue : 0;
    const rev26 = guide26 && guide26.mgmt ? guide26.mgmt.revenue : 0;
    const margin25 = guide25 && guide25.mgmt ? guide25.mgmt.grossMargin : 0;
    const margin26 = guide26 && guide26.mgmt ? guide26.mgmt.grossMargin : 0;
    return {
      name,
      city,
      stopped: activity25 > 0 && activity26 === 0,
      isNew: activity25 === 0 && activity26 > 0,
      freeTours: deltaRow(f25.freeTours, f26.freeTours),
      freePax: deltaRow(f25.freePax, f26.freePax),
      paidTours: deltaRow(f25.paidTours, f26.paidTours),
      paidPax: deltaRow(f25.paidPax, f26.paidPax),
      totalTours: deltaRow(f25.freeTours + f25.paidTours, f26.freeTours + f26.paidTours),
      totalPax: deltaRow(f25.freePax + f25.paidPax, f26.freePax + f26.paidPax),
      revenue: deltaRow(rev25, rev26),
      margin: deltaRow(margin25, margin26)
    };
  }
  function sumRows(rows, key) {
    const v25 = rows.reduce((s, r) => s + r[key].v25, 0);
    const v26 = rows.reduce((s, r) => s + r[key].v26, 0);
    return deltaRow(v25, v26);
  }
  var NON_GUIDE_NAMES = /* @__PURE__ */ new Set(["FST"]);
  function buildGuideTable(guideStats252, guideStats262, months, cutoffMonth, cutoffDay, lang = "all") {
    const names = Array.from(/* @__PURE__ */ new Set([
      ...guideStats252.map((g) => g.name),
      ...guideStats262.map((g) => g.name)
    ])).filter((name) => !NON_GUIDE_NAMES.has(name)).sort();
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
      totalPax: sumRows(rows, "totalPax"),
      revenue: sumRows(rows, "revenue"),
      margin: sumRows(rows, "margin")
    };
    return { rows, totalRow };
  }
  function filterByName(rows, query) {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }
  function rankGuides(rows, sort) {
    if (sort === "name") return [...rows].sort((a, b) => a.name.localeCompare(b.name));
    const key = sort.startsWith("revenue") ? "revenue" : "totalPax";
    const sorted = [...rows].sort((a, b) => b[key].delta - a[key].delta);
    return sort === "drop" || sort === "revenue-drop" ? sorted.reverse() : sorted;
  }
  function flagDeclines(rows, threshold = -30) {
    return rows.filter((r) => r.totalPax.v25 > 0 && r.totalPax.v26 > 0 && r.totalPax.pct <= threshold).sort((a, b) => a.totalPax.pct - b.totalPax.pct);
  }
  function flagGainers(rows, threshold = 30) {
    return rows.filter((r) => r.totalPax.v25 > 0 && r.totalPax.v26 > 0 && r.totalPax.pct >= threshold).sort((a, b) => b.totalPax.pct - a.totalPax.pct);
  }
  function guideMonthlyTrend(guide25, guide26, lang, cutoffMonth, cutoffDay) {
    const st25 = guide25 ? guide25.stats[lang] || guide25.stats.all : null;
    const st26 = guide26 ? guide26.stats[lang] || guide26.stats.all : null;
    return Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
      const f25 = st25 ? filteredStats(st25, [month], 12, 31) : ZERO_STATS;
      const pax25 = f25.freePax + f25.paidPax;
      let pax26 = null;
      if (st26 && month <= cutoffMonth) {
        const f26 = filteredStats(st26, [month], cutoffMonth, cutoffDay);
        pax26 = f26.freePax + f26.paidPax;
      }
      return { month, pax25, pax26 };
    });
  }

  // src/pages/tourStats.js
  var MONTH_NAMES = { 1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun", 7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec" };
  var MONTH_FULL_NAMES = { 1: "January", 2: "February", 3: "March", 4: "April", 5: "May", 6: "June", 7: "July", 8: "August", 9: "September", 10: "October", 11: "November", 12: "December" };
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
  function monthlyFreeComparison(cityStats252, cityStats262, cities, cutoffMonth, cutoffDay, lang) {
    return Array.from({ length: 12 }, (_, i) => i + 1).map((month) => ({
      month,
      cities: cities.map((city) => {
        const pax25 = monthlyFree(cityStats252, [city], month, 12, 31, lang).pax;
        if (month > cutoffMonth) return { city, pax25, pax26: null, delta: null };
        const pax26 = monthlyFree(cityStats262, [city], month, cutoffMonth, cutoffDay, lang).pax;
        return { city, pax25, pax26, delta: pax26 - pax25 };
      })
    }));
  }
  function monthlyTypeComparison(cityStats252, cityStats262, cities, cutoffMonth, cutoffDay, lang, typeFilter3) {
    return Array.from({ length: 12 }, (_, i) => i + 1).map((month) => ({
      month,
      cities: cities.map((city) => {
        const pax25 = monthlyType(cityStats252, [city], month, 12, 31, lang, typeFilter3).pax;
        if (month > cutoffMonth) return { city, pax25, pax26: null, delta: null };
        const pax26 = monthlyType(cityStats262, [city], month, cutoffMonth, cutoffDay, lang, typeFilter3).pax;
        return { city, pax25, pax26, delta: pax26 - pax25 };
      })
    }));
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
  var activeCity = "all";
  var activeLang = "all";
  var chartInstances = [];
  function citiesInScope() {
    return activeCity === "all" ? CITIES : [activeCity];
  }
  function renderFreeSection(containerEl, cityStats, chartIdPrefix, fullYearTable = false) {
    const cutoffMonth = getCutoffMonth();
    const cutoffDay = getCutoffDay();
    if (!containerEl.dataset.built) {
      containerEl.innerHTML = `
      <h2>Free Tours</h2>
      <div class="filter-bar sticky">
        ${cityChipsHtml(`${chartIdPrefix}-free`, activeCity)}
        ${langChipsHtml(`${chartIdPrefix}-free`, activeLang)}
      </div>
      <div class="kpi-grid" id="${chartIdPrefix}-free-kpis"></div>
      <div class="chart-grid">
        ${chartCardHtml(`${chartIdPrefix}-free-city-chart`, "Free PAX by City")}
        ${chartCardHtml(`${chartIdPrefix}-free-avg`, "Avg PAX per Free Tour")}
        ${chartCardHtml(`${chartIdPrefix}-free-cum`, "Cumulative Free PAX Trend")}
      </div>
      <div class="card">
        <div class="card-title">Free PAX by Month and City</div>
        <table id="${chartIdPrefix}-free-table" class="single-year-monthly-table"></table>
      </div>
    `;
      bindChipGroup(`${chartIdPrefix}-free-city-chips`, (v) => {
        activeCity = v;
        renderFreeSection(containerEl, cityStats, chartIdPrefix, fullYearTable);
      });
      bindChipGroup(`${chartIdPrefix}-free-lang-chips`, (v) => {
        activeLang = v;
        renderFreeSection(containerEl, cityStats, chartIdPrefix, fullYearTable);
      });
      containerEl.dataset.built = "true";
    }
    syncChipGroup(`${chartIdPrefix}-free-city-chips`, activeCity);
    syncChipGroup(`${chartIdPrefix}-free-lang-chips`, activeLang);
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
    const tableCutoffMonth = fullYearTable ? 12 : cutoffMonth;
    const tableCutoffDay = fullYearTable ? 31 : cutoffDay;
    const months = Array.from({ length: tableCutoffMonth }, (_, i) => i + 1);
    const table = document.getElementById(`${chartIdPrefix}-free-table`);
    let rowsHtml = "<thead><tr><th>Month</th>" + CITIES.map((c) => `<th class="city-column-${c.toLowerCase()}">${c}</th>`).join("") + "</tr></thead><tbody>";
    months.forEach((m) => {
      rowsHtml += `<tr><td>${MONTH_FULL_NAMES[m]}</td>` + CITIES.map((city) => {
        const { pax } = monthlyFree(cityStats, [city], m, tableCutoffMonth, tableCutoffDay, activeLang);
        return `<td class="city-column-${city.toLowerCase()}">${fmtN(pax)}</td>`;
      }).join("") + "</tr>";
    });
    rowsHtml += "</tbody>";
    table.innerHTML = rowsHtml;
  }

  // src/pages/section-paid-group.js
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
  function renderPaidGroupSection(containerEl, cityStats, chartIdPrefix, fullYearTable = false) {
    const cutoffMonth = getCutoffMonth();
    const cutoffDay = getCutoffDay();
    if (!containerEl.dataset.built) {
      containerEl.innerHTML = `
      <h2>Paid Group Tours</h2>
      <div class="filter-bar sticky">
        <select id="${chartIdPrefix}-pg-type">
          <option value="all">All tours</option>
          ${GROUP_TYPES.map((t) => `<option value="${t}">${t}</option>`).join("")}
        </select>
        ${cityChipsHtml(`${chartIdPrefix}-pg`, activeCity2)}
        ${langChipsHtml(`${chartIdPrefix}-pg`, activeLang2)}
      </div>
      <div class="kpi-grid" id="${chartIdPrefix}-pg-kpis"></div>
      <div class="chart-grid paid-group-chart-grid">
        ${chartCardHtml(`${chartIdPrefix}-pg-c1`, "Paid Group PAX by City")}
        ${chartCardHtml(`${chartIdPrefix}-pg-c2`, "Cumulative Paid Group PAX Trend")}
        ${chartCardHtml(`${chartIdPrefix}-pg-c3`, "Paid Group Tours by City")}
        ${chartCardHtml(`${chartIdPrefix}-pg-c4`, "Cumulative Paid Group Tours Trend")}
        ${chartCardHtml(`${chartIdPrefix}-pg-c5`, "Avg PAX per Paid Group Tour Trend")}
      </div>
      <div class="card">
        <div class="card-title">Paid Group PAX by Month and City</div>
        <table id="${chartIdPrefix}-pg-table" class="single-year-monthly-table"></table>
      </div>
    `;
      document.getElementById(`${chartIdPrefix}-pg-type`).addEventListener("change", (e) => {
        activeType = e.target.value;
        renderPaidGroupSection(containerEl, cityStats, chartIdPrefix, fullYearTable);
      });
      bindChipGroup(`${chartIdPrefix}-pg-city-chips`, (v) => {
        activeCity2 = v;
        renderPaidGroupSection(containerEl, cityStats, chartIdPrefix, fullYearTable);
      });
      bindChipGroup(`${chartIdPrefix}-pg-lang-chips`, (v) => {
        activeLang2 = v;
        renderPaidGroupSection(containerEl, cityStats, chartIdPrefix, fullYearTable);
      });
      containerEl.dataset.built = "true";
    }
    syncChipGroup(`${chartIdPrefix}-pg-city-chips`, activeCity2);
    syncChipGroup(`${chartIdPrefix}-pg-lang-chips`, activeLang2);
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
    const tableCutoffMonth = fullYearTable ? 12 : cutoffMonth;
    const tableCutoffDay = fullYearTable ? 31 : cutoffDay;
    const months = Array.from({ length: tableCutoffMonth }, (_, i) => i + 1);
    const table = document.getElementById(`${chartIdPrefix}-pg-table`);
    let rowsHtml = "<thead><tr><th>Month</th>" + CITIES.map((c) => `<th class="city-column-${c.toLowerCase()}">${c}</th>`).join("") + "</tr></thead><tbody>";
    months.forEach((m) => {
      rowsHtml += `<tr><td>${MONTH_FULL_NAMES[m]}</td>` + CITIES.map((city) => {
        const { pax } = monthlyType(cityStats, [city], m, tableCutoffMonth, tableCutoffDay, activeLang2, filter);
        return `<td class="city-column-${city.toLowerCase()}">${fmtN(pax)}</td>`;
      }).join("") + "</tr>";
    });
    rowsHtml += "</tbody>";
    table.innerHTML = rowsHtml;
  }

  // src/pages/section-paid-private.js
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
      <div class="filter-bar sticky">
        <select id="${chartIdPrefix}-pp-type">
          <option value="all">All tours</option>
          ${PRIVATE_TYPES.map((t) => `<option value="${t}">${t}</option>`).join("")}
          <option value="food kuoni">custom</option>
        </select>
        ${cityChipsHtml(`${chartIdPrefix}-pp`, activeCity3)}
        ${langChipsHtml(`${chartIdPrefix}-pp`, activeLang3)}
      </div>
      <div class="kpi-grid paid-private-kpi-grid" id="${chartIdPrefix}-pp-kpis"></div>
      <div class="chart-grid">
        ${chartCardHtml(`${chartIdPrefix}-pp-c1`, "Paid Private Tours by City")}
        ${chartCardHtml(`${chartIdPrefix}-pp-c2`, "Cumulative Paid Private Tours Trend")}
      </div>
    `;
      document.getElementById(`${chartIdPrefix}-pp-type`).addEventListener("change", (e) => {
        activeType2 = e.target.value;
        renderPaidPrivateSection(containerEl, cityStats, chartIdPrefix);
      });
      bindChipGroup(`${chartIdPrefix}-pp-city-chips`, (v) => {
        activeCity3 = v;
        renderPaidPrivateSection(containerEl, cityStats, chartIdPrefix);
      });
      bindChipGroup(`${chartIdPrefix}-pp-lang-chips`, (v) => {
        activeLang3 = v;
        renderPaidPrivateSection(containerEl, cityStats, chartIdPrefix);
      });
      containerEl.dataset.built = "true";
    }
    syncChipGroup(`${chartIdPrefix}-pp-city-chips`, activeCity3);
    syncChipGroup(`${chartIdPrefix}-pp-lang-chips`, activeLang3);
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
  function makeYearPage(pageId, getCityStats, chartIdPrefix, fullYearTables = false) {
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
        renderFreeSection(document.getElementById(`${chartIdPrefix}-free`), cityStats, chartIdPrefix, fullYearTables);
        renderPaidGroupSection(document.getElementById(`${chartIdPrefix}-group`), cityStats, chartIdPrefix, fullYearTables);
        renderPaidPrivateSection(document.getElementById(`${chartIdPrefix}-private`), cityStats, chartIdPrefix);
      }
    };
  }
  var Page25 = makeYearPage("page-p25", () => cityStats25, "p25", true);
  var Page26 = makeYearPage("page-p26", () => cityStats26, "p26");

  // src/pages/page-cmp.js
  function kpiCardCmpHtml(label, v25, v26, fmt = fmtN) {
    const delta = v26 - v25;
    const cls = delta > 0 ? "delta-pos" : delta < 0 ? "delta-neg" : "delta-neu";
    const sign = delta > 0 ? "+" : "";
    const pctText = v25 > 0 ? `${sign}${(delta / v25 * 100).toFixed(1)}%` : v26 > 0 ? "new" : "\u2014";
    return `
    <div class="kpi-card">
      <div class="kpi-label">${label}</div>
      <div class="gts-row">
        <div class="gts-values">${fmt(v25)} <span class="gts-arrow">&rarr;</span> ${fmt(v26)}</div>
        <div class="gts-delta ${cls}">${sign}${fmt(delta)} (${pctText})</div>
      </div>
    </div>`;
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
  function fmtDelta(value) {
    if (value === null) return "-";
    return `${value > 0 ? "+" : ""}${fmtN(value)}`;
  }
  function freeComparisonDeltaCell(city, pax25, pax26, delta) {
    if (delta === null) return `<td class="${cityColumnClass(city)}">-</td>`;
    const comparison = deltaRow(pax25, pax26);
    const deltaClass = delta > 0 ? "delta-pos" : delta < 0 ? "delta-neg" : "delta-neu";
    const pct = comparison.pct === null ? "" : ` (${pctLabel(comparison)})`;
    return `<td class="${cityColumnClass(city)} ${deltaClass}">${fmtDelta(delta)}${pct}</td>`;
  }
  function cityColumnClass(city) {
    return `city-column-${city.toLowerCase()}`;
  }
  function freeMonthlyComparisonHtml(rows) {
    const cityHeaders = CITIES.map((city) => `<th colspan="3" class="${cityColumnClass(city)}">${city}</th>`).join("");
    const metricHeaders = CITIES.map((city) => `<th class="${cityColumnClass(city)}">2025</th><th class="${cityColumnClass(city)}">2026</th><th class="${cityColumnClass(city)}">+/-</th>`).join("");
    const body = rows.map(({ month, cities }) => `
    <tr>
      <td>${MONTH_NAMES[month]}</td>
      ${cities.map(({ city, pax25, pax26, delta }) => `<td class="${cityColumnClass(city)}">${fmtN(pax25)}</td><td class="${cityColumnClass(city)}">${pax26 === null ? "-" : fmtN(pax26)}</td>${freeComparisonDeltaCell(city, pax25, pax26, delta)}`).join("")}
    </tr>`).join("");
    return `<thead><tr><th rowspan="2">Month</th>${cityHeaders}</tr><tr>${metricHeaders}</tr></thead><tbody>${body}</tbody>`;
  }
  var freeState = { city: "all", lang: "all" };
  var freeCharts = [];
  function renderFreeBlock(containerEl) {
    const cutoffMonth = getCutoffMonth();
    const cutoffDay = getCutoffDay();
    if (!containerEl.dataset.built) {
      containerEl.innerHTML = `
      <h2>Free Tours</h2>
      <div class="filter-bar sticky">
        ${cityChipsHtml("cmp-free", freeState.city)}
        ${langChipsHtml("cmp-free", freeState.lang)}
      </div>
      <div class="kpi-grid" id="cmp-free-kpis"></div>
      <div class="chart-grid">
        ${chartCardHtml("cmp-free-city-chart", "Free PAX by City \u2014 2025 vs 2026")}
        ${chartCardHtml("cmp-free-avg", "Avg PAX per Free Tour by City \u2014 2025 vs 2026")}
        ${chartCardHtml("cmp-free-cum", "Cumulative Free PAX Trend \u2014 2025 vs 2026")}
      </div>
      <div class="card comparison-monthly-card">
        <div class="card-title">Free PAX by Month and City</div>
        <p class="page-note">2025 covers Jan-Dec. 2026 is current through ${getGlobalDate()}.</p>
        <div class="comparison-table-scroll"><table id="cmp-free-monthly-table"></table></div>
      </div>
    `;
      bindChipGroup("cmp-free-city-chips", (v) => {
        freeState.city = v;
        renderFreeBlock(containerEl);
      });
      bindChipGroup("cmp-free-lang-chips", (v) => {
        freeState.lang = v;
        renderFreeBlock(containerEl);
      });
      containerEl.dataset.built = "true";
    }
    syncChipGroup("cmp-free-city-chips", freeState.city);
    syncChipGroup("cmp-free-lang-chips", freeState.lang);
    const cities = freeState.city === "all" ? CITIES : [freeState.city];
    const pc25 = perCityFree(cityStats25, cities, cutoffMonth, cutoffDay, freeState.lang);
    const pc26 = perCityFree(cityStats26, cities, cutoffMonth, cutoffDay, freeState.lang);
    const t25 = cumulativeFree(cityStats25, cities, cutoffMonth, cutoffDay, freeState.lang);
    const t26 = cumulativeFree(cityStats26, cities, cutoffMonth, cutoffDay, freeState.lang);
    const toursSum25 = pc25.reduce((s, c) => s + c.tours, 0);
    const toursSum26 = pc26.reduce((s, c) => s + c.tours, 0);
    const paxSum25 = pc25.reduce((s, c) => s + c.pax, 0);
    const paxSum26 = pc26.reduce((s, c) => s + c.pax, 0);
    const avg25 = toursSum25 > 0 ? paxSum25 / toursSum25 : 0;
    const avg26 = toursSum26 > 0 ? paxSum26 / toursSum26 : 0;
    document.getElementById("cmp-free-kpis").innerHTML = kpiCardCmpHtml("Free Tours \u2013 PAX Count", paxSum25, paxSum26) + kpiCardCmpHtml("Total Free Tours", toursSum25, toursSum26) + kpiCardCmpHtml("Avg PAX / Free Tour", avg25, avg26, (v) => v.toFixed(1));
    document.getElementById("cmp-free-monthly-table").innerHTML = freeMonthlyComparisonHtml(
      monthlyFreeComparison(cityStats25, cityStats26, CITIES, cutoffMonth, cutoffDay, freeState.lang)
    );
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
      <h2>Paid Group Tours</h2>
      <div class="filter-bar sticky">
        <select id="cmp-group-type">
          <option value="all">All tours</option>
          ${GROUP_TYPES.map((t) => `<option value="${t}">${t}</option>`).join("")}
        </select>
        ${cityChipsHtml("cmp-group", groupState.city)}
        ${langChipsHtml("cmp-group", groupState.lang)}
      </div>
      <div class="kpi-grid" id="cmp-group-kpis"></div>
      <div class="chart-grid paid-group-chart-grid">
        ${chartCardHtml("cmp-group-pax-city", "Paid Group PAX by City \u2014 2025 vs 2026")}
        ${chartCardHtml("cmp-group-tours-city", "Paid Group Tours by City \u2014 2025 vs 2026")}
        ${chartCardHtml("cmp-group-pax-trend", "Cumulative Paid Group PAX Trend \u2014 2025 vs 2026")}
        ${chartCardHtml("cmp-group-tours-trend", "Cumulative Paid Group Tours Trend \u2014 2025 vs 2026")}
        ${chartCardHtml("cmp-group-avg-trend", "Avg PAX per Paid Group Tour Trend \u2014 2025 vs 2026")}
      </div>
      <div class="card comparison-monthly-card">
        <div class="card-title">Paid Group PAX by Month and City</div>
        <p class="page-note">2025 covers Jan-Dec. 2026 is current through ${getGlobalDate()}.</p>
        <div class="comparison-table-scroll"><table id="cmp-group-monthly-table"></table></div>
      </div>
    `;
      document.getElementById("cmp-group-type").addEventListener("change", (e) => {
        groupState.type = e.target.value;
        renderGroupBlock(containerEl);
      });
      bindChipGroup("cmp-group-city-chips", (v) => {
        groupState.city = v;
        renderGroupBlock(containerEl);
      });
      bindChipGroup("cmp-group-lang-chips", (v) => {
        groupState.lang = v;
        renderGroupBlock(containerEl);
      });
      containerEl.dataset.built = "true";
    }
    syncChipGroup("cmp-group-city-chips", groupState.city);
    syncChipGroup("cmp-group-lang-chips", groupState.lang);
    const cities = groupState.city === "all" ? CITIES : [groupState.city];
    const filter = groupTypeFilter();
    const pc25 = perCityType(cityStats25, cities, cutoffMonth, cutoffDay, groupState.lang, filter);
    const pc26 = perCityType(cityStats26, cities, cutoffMonth, cutoffDay, groupState.lang, filter);
    const t25 = cumulativeType(cityStats25, cities, cutoffMonth, cutoffDay, groupState.lang, filter);
    const t26 = cumulativeType(cityStats26, cities, cutoffMonth, cutoffDay, groupState.lang, filter);
    const toursSum25 = pc25.reduce((s, c) => s + c.tours, 0);
    const toursSum26 = pc26.reduce((s, c) => s + c.tours, 0);
    const paxSum25 = pc25.reduce((s, c) => s + c.pax, 0);
    const paxSum26 = pc26.reduce((s, c) => s + c.pax, 0);
    const avg25 = toursSum25 > 0 ? paxSum25 / toursSum25 : 0;
    const avg26 = toursSum26 > 0 ? paxSum26 / toursSum26 : 0;
    document.getElementById("cmp-group-kpis").innerHTML = kpiCardCmpHtml("Paid Group PAX", paxSum25, paxSum26) + kpiCardCmpHtml("Paid Group Tours", toursSum25, toursSum26) + kpiCardCmpHtml("Avg PAX / Tour", avg25, avg26, (v) => v.toFixed(1));
    document.getElementById("cmp-group-monthly-table").innerHTML = freeMonthlyComparisonHtml(
      monthlyTypeComparison(cityStats25, cityStats26, CITIES, cutoffMonth, cutoffDay, groupState.lang, filter)
    );
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
      <h2>Paid Private Tours</h2>
      <div class="filter-bar sticky">
        <select id="cmp-private-type">
          <option value="all">All tours</option>
          ${PRIVATE_TYPES.map((t) => `<option value="${t}">${t}</option>`).join("")}
          <option value="food kuoni">custom</option>
        </select>
        ${cityChipsHtml("cmp-private", privateState.city)}
        ${langChipsHtml("cmp-private", privateState.lang)}
      </div>
      <div class="kpi-grid paid-private-kpi-grid" id="cmp-private-kpis"></div>
      <div class="chart-grid">
        ${chartCardHtml("cmp-private-city-chart", "Paid Private Tours by City \u2014 2025 vs 2026")}
        ${chartCardHtml("cmp-private-trend", "Cumulative Paid Private Tours Trend \u2014 2025 vs 2026")}
      </div>
      <div class="card comparison-monthly-card">
        <div class="card-title">Paid Private PAX by Month and City</div>
        <p class="page-note">2025 covers Jan-Dec. 2026 is current through ${getGlobalDate()}.</p>
        <div class="comparison-table-scroll"><table id="cmp-private-monthly-table"></table></div>
      </div>
    `;
      document.getElementById("cmp-private-type").addEventListener("change", (e) => {
        privateState.type = e.target.value;
        renderPrivateBlock(containerEl);
      });
      bindChipGroup("cmp-private-city-chips", (v) => {
        privateState.city = v;
        renderPrivateBlock(containerEl);
      });
      bindChipGroup("cmp-private-lang-chips", (v) => {
        privateState.lang = v;
        renderPrivateBlock(containerEl);
      });
      containerEl.dataset.built = "true";
    }
    syncChipGroup("cmp-private-city-chips", privateState.city);
    syncChipGroup("cmp-private-lang-chips", privateState.lang);
    const cities = privateState.city === "all" ? CITIES : [privateState.city];
    const filter = privateTypeFilter();
    const pc25 = perCityType(cityStats25, cities, cutoffMonth, cutoffDay, privateState.lang, filter);
    const pc26 = perCityType(cityStats26, cities, cutoffMonth, cutoffDay, privateState.lang, filter);
    const t25 = cumulativeType(cityStats25, cities, cutoffMonth, cutoffDay, privateState.lang, filter);
    const t26 = cumulativeType(cityStats26, cities, cutoffMonth, cutoffDay, privateState.lang, filter);
    const toursSum25 = pc25.reduce((s, c) => s + c.tours, 0);
    const toursSum26 = pc26.reduce((s, c) => s + c.tours, 0);
    document.getElementById("cmp-private-kpis").innerHTML = kpiCardCmpHtml("Paid Private Tours", toursSum25, toursSum26);
    document.getElementById("cmp-private-monthly-table").innerHTML = freeMonthlyComparisonHtml(
      monthlyTypeComparison(cityStats25, cityStats26, CITIES, cutoffMonth, cutoffDay, privateState.lang, filter)
    );
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
      <div id="cmp-free-block"></div>
      <div id="cmp-group-block"></div>
      <div id="cmp-private-block"></div>
    `;
      this.renderAll();
    },
    renderAll() {
      renderFreeBlock(document.getElementById("cmp-free-block"));
      renderGroupBlock(document.getElementById("cmp-group-block"));
      renderPrivateBlock(document.getElementById("cmp-private-block"));
    }
  };

  // src/pages/bookingStats.js
  function sumEntries(channelStats, channel, cities, lang) {
    const out = { byMonth: {}, byDay: {} };
    const byCity = channelStats[channel] || {};
    cities.forEach((city) => {
      const cs = byCity[city];
      if (!cs) return;
      const entry = cs[lang] || cs.all;
      for (const [m, p] of Object.entries(entry.byMonth)) out.byMonth[m] = (out.byMonth[m] || 0) + p;
      for (const [d, p] of Object.entries(entry.byDay)) out.byDay[d] = (out.byDay[d] || 0) + p;
    });
    return out;
  }
  function hasDayDataForMonth(byDay, m) {
    const prefix = `${m}-`;
    return Object.keys(byDay).some((k) => k.startsWith(prefix));
  }
  function channelTotal(channelStats, channel, cities, lang, cutoffMonth, cutoffDay) {
    const entry = sumEntries(channelStats, channel, cities, lang);
    let pax = 0;
    for (let m = 1; m <= cutoffMonth; m++) {
      if (m < cutoffMonth) {
        pax += entry.byMonth[String(m)] || 0;
      } else if (hasDayDataForMonth(entry.byDay, m)) {
        for (let d = 1; d <= cutoffDay; d++) pax += entry.byDay[`${m}-${d}`] || 0;
      } else {
        pax += entry.byMonth[String(m)] || 0;
      }
    }
    return pax;
  }
  function channelMonthly(channelStats, channel, cities, lang, cutoffMonth, cutoffDay) {
    const entry = sumEntries(channelStats, channel, cities, lang);
    return Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
      if (m > cutoffMonth) return { month: m, pax: null };
      if (m === cutoffMonth && hasDayDataForMonth(entry.byDay, m)) {
        let pax = 0;
        for (let d = 1; d <= cutoffDay; d++) pax += entry.byDay[`${m}-${d}`] || 0;
        return { month: m, pax };
      }
      return { month: m, pax: entry.byMonth[String(m)] || 0 };
    });
  }

  // src/pages/page-bookings.js
  var FREE_CHANNELS = ["web", "GuruWalk", "freetour.com", "Civitatis", "Buendia", "Sandemans", "Walkative", "Viabam", "other"];
  var PAID_CHANNELS = ["web", "Viator", "GYG", "Airbnb", "Musement", "Civitatis", "other"];
  function citiesFor(cityFilter) {
    return cityFilter === "all" ? CITIES : [cityFilter];
  }
  function channelColClass(channel, index) {
    return channel === "other" ? "channel-col-other" : `channel-col-${index + 1}`;
  }
  function channelColumnHtml(channels, has25) {
    const headers = channels.map((c, i) => `<th colspan="${has25 ? 3 : 1}" class="channel-col-group ${channelColClass(c, i)}">${c}</th>`).join("");
    const subHeaders = channels.map((c, i) => {
      const cls = `channel-col-group ${channelColClass(c, i)}`;
      return has25 ? `<th class="${cls}">2025</th><th class="${cls}">2026</th><th class="${cls}">+/-</th>` : `<th class="${cls}">2026</th>`;
    }).join("");
    return `<thead><tr><th rowspan="2">Month</th>${headers}</tr><tr>${subHeaders}</tr></thead>`;
  }
  function deltaCell(pax25, pax26, colClass) {
    if (pax25 === null || pax26 === null) return `<td class="channel-col-group ${colClass}">-</td>`;
    const d = deltaRow(pax25, pax26);
    const cls = d.delta > 0 ? "delta-pos" : d.delta < 0 ? "delta-neg" : "delta-neu";
    const pctText = d.pct === null ? d.v26 > 0 ? "" : "" : ` (${pctLabel(d)})`;
    return `<td class="channel-col-group ${colClass} ${cls}">${d.delta > 0 ? "+" : ""}${fmtN(d.delta)}${pctText}</td>`;
  }
  function monthlyTableHtml(channelStats25, channelStats26, channels, cities, lang, cutoffMonth, cutoffDay) {
    const has25 = !!channelStats25;
    const byChannel = channels.map((c, i) => ({
      channel: c,
      colClass: channelColClass(c, i),
      rows26: channelMonthly(channelStats26, c, cities, lang, cutoffMonth, cutoffDay),
      rows25: has25 ? channelMonthly(channelStats25, c, cities, lang, 12, 31) : null
    }));
    const body = Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
      const cells = byChannel.map(({ rows25, rows26, colClass }) => {
        const pax26 = rows26[month - 1].pax;
        if (!has25) {
          return `<td class="channel-col-group ${colClass}">${pax26 === null ? "-" : fmtN(pax26)}</td>`;
        }
        const pax25 = rows25[month - 1].pax;
        return `<td class="channel-col-group ${colClass}">${pax25 === null ? "-" : fmtN(pax25)}</td><td class="channel-col-group ${colClass}">${pax26 === null ? "-" : fmtN(pax26)}</td>${deltaCell(pax25, pax26, colClass)}`;
      }).join("");
      return `<tr><td>${MONTH_NAMES[month]}</td>${cells}</tr>`;
    }).join("");
    return channelColumnHtml(channels, has25) + `<tbody>${body}</tbody>`;
  }
  function renderBlock({ title, chartId, tableId, channels, channelStats25, channelStats26, state, idPrefix }) {
    const cutoffMonth = getCutoffMonth();
    const cutoffDay = getCutoffDay();
    const containerEl = document.getElementById(idPrefix + "-block");
    if (!containerEl.dataset.built) {
      containerEl.innerHTML = `
      <h2>${title}</h2>
      <div class="filter-bar sticky">
        ${cityChipsHtml(idPrefix, state.city)}
        ${langChipsHtml(idPrefix, state.lang)}
      </div>
      <div class="chart-grid">
        <div class="card">
          <div class="card-title">${title} PAX by Channel${channelStats25 ? " \u2014 2025 vs 2026" : " \u2014 2026"}</div>
          <div class="bk-chart-wrap"><canvas id="${chartId}"></canvas></div>
        </div>
      </div>
      <div class="card comparison-monthly-card">
        <div class="card-title">${title} PAX by Month and Channel</div>
        <div class="comparison-table-scroll"><table id="${tableId}"></table></div>
      </div>
    `;
      bindChipGroup(`${idPrefix}-city-chips`, (v) => {
        state.city = v;
        renderBlock({ title, chartId, tableId, channels, channelStats25, channelStats26, state, idPrefix });
      });
      bindChipGroup(`${idPrefix}-lang-chips`, (v) => {
        state.lang = v;
        renderBlock({ title, chartId, tableId, channels, channelStats25, channelStats26, state, idPrefix });
      });
      containerEl.dataset.built = "true";
    }
    syncChipGroup(`${idPrefix}-city-chips`, state.city);
    syncChipGroup(`${idPrefix}-lang-chips`, state.lang);
    const cities = citiesFor(state.city);
    const totals26 = channels.map((c) => channelTotal(channelStats26, c, cities, state.lang, cutoffMonth, cutoffDay));
    const totals25 = channelStats25 ? channels.map((c) => channelTotal(channelStats25, c, cities, state.lang, cutoffMonth, cutoffDay)) : null;
    if (state.chart) state.chart.destroy();
    state.chart = channelBar(chartId, channels, totals26, totals25);
    document.getElementById(tableId).innerHTML = monthlyTableHtml(channelStats25, channelStats26, channels, cities, state.lang, cutoffMonth, cutoffDay);
  }
  var freeState2 = { city: "all", lang: "all", chart: null };
  var paidState = { city: "all", lang: "all", chart: null };
  function missingBlockHtml(title, missingWhat) {
    return `<h2>${title}</h2><div class="card">Bookings data for ${title} is not available (${missingWhat} is missing from the loaded data files).</div>`;
  }
  var PageBookings = {
    _initialized: false,
    init() {
      const root = document.getElementById("page-bookings");
      root.innerHTML = `<div id="bk-free-block"></div><div id="bk-paid-block"></div>`;
      this.renderAll();
    },
    renderAll() {
      const free26 = typeof freeChannelStats26 !== "undefined" ? freeChannelStats26 : void 0;
      const free25 = typeof freeChannelStats25 !== "undefined" ? freeChannelStats25 : null;
      if (free26) {
        renderBlock({
          title: "Free",
          chartId: "bk-free-chart",
          tableId: "bk-free-table",
          channels: FREE_CHANNELS,
          channelStats25: free25,
          channelStats26: free26,
          state: freeState2,
          idPrefix: "bk-free"
        });
      } else {
        document.getElementById("bk-free-block").innerHTML = missingBlockHtml("Free", "freeChannelStats26");
      }
      const paid26 = typeof paidChannelStats26 !== "undefined" ? paidChannelStats26 : void 0;
      const paid25 = typeof paidChannelStats25 !== "undefined" ? paidChannelStats25 : null;
      if (paid26) {
        renderBlock({
          title: "Paid",
          chartId: "bk-paid-chart",
          tableId: "bk-paid-table",
          channels: PAID_CHANNELS,
          channelStats25: paid25,
          channelStats26: paid26,
          state: paidState,
          idPrefix: "bk-paid"
        });
      } else {
        document.getElementById("bk-paid-block").innerHTML = missingBlockHtml("Paid", "paidChannelStats26");
      }
    }
  };

  // src/pages/guideCardHelpers.js
  var CITY_GROUP_ORDER = ["Zagreb", "Dubrovnik", "Zadar", "Split"];
  function groupRowsByCity(rows) {
    const groups = CITY_GROUP_ORDER.map((city) => ({ city, rows: rows.filter((r) => r.city === city) }));
    const other = rows.filter((r) => !CITY_GROUP_ORDER.includes(r.city));
    if (other.length) groups.push({ city: "Other", rows: other });
    return groups.filter((g) => g.rows.length > 0);
  }
  function filterByCity(guides, city) {
    return city === "all" ? guides : guides.filter((g) => g.city === city);
  }
  var CITY_CODES2 = { Zagreb: "ZG", Dubrovnik: "DU", Split: "ST", Zadar: "ZD" };
  var CITY_KEYS = { Zagreb: "zagreb", Dubrovnik: "dubrovnik", Split: "split", Zadar: "zadar" };
  function cityCode(city) {
    return CITY_CODES2[city] || (city ? city.slice(0, 2).toUpperCase() : "?");
  }
  function cityAvatarStyle(city) {
    const key = CITY_KEYS[city];
    return key ? ` style="--avatar-hue: var(--${key}); --avatar-text: var(--${key}-text);"` : "";
  }
  function cardRowsHeaderHtml() {
    return `
    <div class="guide-card-row guide-card-row-header">
      <span class="gcr-label"></span>
      <span class="gcr-v25">25</span>
      <span class="gcr-v26">26</span>
      <span class="gcr-delta">+/-</span>
    </div>`;
  }
  function cardRowHtml(label, d, opts = {}) {
    const { fmt = fmtN, showPct = true, title = "" } = opts;
    const cls = d.delta > 0 ? "delta-pos" : d.delta < 0 ? "delta-neg" : "delta-neu";
    const sign = d.delta > 0 ? "+" : "";
    const deltaText = showPct && d.pct !== null ? `${sign}${fmt(d.delta)} (${pctLabel(d)})` : `${sign}${fmt(d.delta)}`;
    const titleAttr = title ? ` title="${title}"` : "";
    return `
    <div class="guide-card-row"${titleAttr}>
      <span class="gcr-label">${label}</span>
      <span class="gcr-v25">${fmt(d.v25)}</span>
      <span class="gcr-v26">${fmt(d.v26)}</span>
      <span class="gcr-delta ${cls}">${deltaText}</span>
    </div>`;
  }

  // src/pages/page-guides.js
  var activeCity4 = "all";
  var activeLang4 = "all";
  var activeView = "cards";
  var activeSearch = "";
  var activeSort = "name";
  var detailChart = null;
  function deltaCellsHtml(d) {
    const cls = d.delta > 0 ? "delta-pos" : d.delta < 0 ? "delta-neg" : "delta-neu";
    const sign = d.delta > 0 ? "+" : "";
    return `<td>${fmtN(d.v25)}</td><td>${fmtN(d.v26)}</td><td class="${cls}">${sign}${fmtN(d.delta)}</td><td class="${cls}">${pctLabel(d)}</td>`;
  }
  function rowHtml(row, isTotal) {
    const nameCell = isTotal ? `<td><strong>${row.name}</strong></td>` : `<td>${row.name}</td>`;
    return `<tr>${nameCell}` + deltaCellsHtml(row.freeTours) + deltaCellsHtml(row.freePax) + deltaCellsHtml(row.paidTours) + deltaCellsHtml(row.paidPax) + deltaCellsHtml(row.totalTours) + `</tr>`;
  }
  function cardHtml(row, rank) {
    const rankBadge = rank ? `<div class="guide-rank">#${rank}</div>` : "";
    const stoppedBadge = row.stopped ? `<span class="guide-stopped-badge">Inactive in 2026</span>` : "";
    const newBadge = row.isNew ? `<span class="guide-new-badge">New</span>` : "";
    const note = guideNotes[row.name] ? `<div class="guide-note">${guideNotes[row.name]}</div>` : "";
    return `
    <div class="guide-card" data-name="${row.name}"${cityAvatarStyle(row.city)}>
      ${rankBadge}
      <div class="guide-card-head">
        <div class="guide-avatar">${cityCode(row.city)}</div>
        <div class="guide-name">${row.name} ${stoppedBadge}${newBadge}</div>
      </div>
      ${note}
      <div class="guide-card-rows">
        ${cardRowsHeaderHtml()}
        ${cardRowHtml("Free T", row.freeTours)}
        ${cardRowHtml("Free P", row.freePax)}
        ${cardRowHtml("Paid T", row.paidTours)}
        ${cardRowHtml("Paid P", row.paidPax)}
        ${cardRowHtml("Total T", row.totalTours)}
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
        <div class="gts-delta ${cls}">${sign}${fmtN(d.delta)} (${pctLabel(d)})</div>
      </div>`;
    };
    return `
    <div class="guide-total-strip">
      ${stat("Free Tours", row.freeTours)}
      ${stat("Free Pax", row.freePax)}
      ${stat("Paid Tours", row.paidTours)}
      ${stat("Paid Pax", row.paidPax)}
      ${stat("Total Tours", row.totalTours)}
    </div>`;
  }
  function flagsBannerHtml(rows) {
    const declines = flagDeclines(rows);
    const gainers = flagGainers(rows);
    if (declines.length === 0 && gainers.length === 0) return "";
    const declineItems = declines.slice(0, 5).map((r) => `${r.name} (${pctLabel(r.totalPax)})`).join(", ");
    const declineMore = declines.length > 5 ? ` +${declines.length - 5} more` : "";
    const gainerItems = gainers.slice(0, 5).map((r) => `${r.name} (${pctLabel(r.totalPax)})`).join(", ");
    const gainerMore = gainers.length > 5 ? ` +${gainers.length - 5} more` : "";
    const declineLine = declines.length > 0 ? `<div class="guide-flag-line delta-neg">&#9888; ${declines.length} guide${declines.length > 1 ? "s" : ""} dropped over 30%: ${declineItems}${declineMore}</div>` : "";
    const gainerLine = gainers.length > 0 ? `<div class="guide-flag-line delta-pos">&#9650; ${gainers.length} guide${gainers.length > 1 ? "s" : ""} up over 30%: ${gainerItems}${gainerMore}</div>` : "";
    return `<div class="guide-flags">${declineLine}${gainerLine}</div>`;
  }
  function groupHeaderRowHtml(city) {
    return `<tr class="city-group-row"><td colspan="21">${city}</td></tr>`;
  }
  function guideCardsHtml(rows, grouped) {
    if (!grouped) {
      const ranked = activeSort !== "name";
      return `<div class="guide-cards">${rows.map((r, i) => cardHtml(r, ranked ? i + 1 : null)).join("")}</div>`;
    }
    const groups = groupRowsByCity(rows);
    return groups.map((g) => `
    <details class="guide-group" open>
      <summary class="guide-group-title">${g.city}</summary>
      <div class="guide-cards">${g.rows.map((r) => cardHtml(r, null)).join("")}</div>
    </details>`).join("");
  }
  function openGuideDetail(name) {
    const g25 = guideStats25.find((g) => g.name === name) || null;
    const g26 = guideStats26.find((g) => g.name === name) || null;
    const city = g26 ? g26.city : g25.city;
    const trend = guideMonthlyTrend(g25, g26, activeLang4, getCutoffMonth(), getCutoffDay());
    document.getElementById("guide-detail-name").textContent = name;
    document.getElementById("guide-detail-city").textContent = city;
    document.getElementById("guide-detail-backdrop").classList.add("open");
    document.getElementById("guide-detail-modal").classList.add("open");
    if (detailChart) detailChart.destroy();
    const MONTH_NAMES2 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    detailChart = dualLine(
      "guide-detail-chart",
      trend.map((t) => MONTH_NAMES2[t.month - 1]),
      trend.map((t) => t.pax25),
      trend.map((t) => t.pax26)
    );
  }
  function closeGuideDetail() {
    document.getElementById("guide-detail-backdrop").classList.remove("open");
    document.getElementById("guide-detail-modal").classList.remove("open");
    if (detailChart) {
      detailChart.destroy();
      detailChart = null;
    }
  }
  var PageGuides = {
    _initialized: false,
    init() {
      const root = document.getElementById("page-guides");
      root.innerHTML = `
      <h2>Guides</h2>
      <div id="guides-flags"></div>
      <div class="filter-bar sticky">
        ${cityChipsHtml("guides", activeCity4)}
        ${langChipsHtml("guides", activeLang4)}
        <div class="chip-group" id="guides-sort-chips">
          <button type="button" class="chip-btn" data-value="name">Name</button>
          <button type="button" class="chip-btn" data-value="gain">Total Pax &uarr;</button>
          <button type="button" class="chip-btn" data-value="drop">Total Pax &darr;</button>
        </div>
        <input type="text" id="guides-search" class="guides-search" placeholder="Search guides\u2026">
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
      <div id="guides-cards"></div>
      <div class="guide-detail-backdrop" id="guide-detail-backdrop"></div>
      <div class="guide-detail-modal" id="guide-detail-modal">
        <button class="guide-detail-close" id="guide-detail-close">&times;</button>
        <div class="guide-detail-head">
          <h3 id="guide-detail-name"></h3>
          <span id="guide-detail-city" class="guide-detail-city"></span>
        </div>
        <canvas id="guide-detail-chart"></canvas>
      </div>
    `;
      bindChipGroup("guides-city-chips", (v) => {
        activeCity4 = v;
        this.renderAll();
      });
      bindChipGroup("guides-lang-chips", (v) => {
        activeLang4 = v;
        this.renderAll();
      });
      document.getElementById("guides-search").addEventListener("input", (e) => {
        activeSearch = e.target.value;
        this.renderAll();
      });
      bindChipGroup("guides-sort-chips", (v) => {
        activeSort = v;
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
      document.getElementById("guides-cards").addEventListener("click", (e) => {
        const card = e.target.closest(".guide-card");
        if (card) openGuideDetail(card.dataset.name);
      });
      document.getElementById("guide-detail-close").addEventListener("click", closeGuideDetail);
      document.getElementById("guide-detail-backdrop").addEventListener("click", closeGuideDetail);
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeGuideDetail();
      });
      this.renderAll();
    },
    renderAll() {
      const cutoffMonth = getCutoffMonth();
      const cutoffDay = getCutoffDay();
      const g25 = filterByCity(guideStats25, activeCity4);
      const g26 = filterByCity(guideStats26, activeCity4);
      const { rows: allRows, totalRow } = buildGuideTable(g25, g26, [], cutoffMonth, cutoffDay, activeLang4);
      const searched = filterByName(allRows, activeSearch);
      const rows = rankGuides(searched, activeSort);
      const grouped = activeCity4 === "all" && activeSort === "name";
      let tbodyHtml;
      if (grouped) {
        const groups = groupRowsByCity(rows);
        tbodyHtml = groups.map((g) => groupHeaderRowHtml(g.city) + g.rows.map((r) => rowHtml(r, false)).join("")).join("");
      } else {
        tbodyHtml = rows.map((r) => rowHtml(r, false)).join("");
      }
      document.getElementById("guides-flags").innerHTML = flagsBannerHtml(searched);
      document.getElementById("guides-tbody").innerHTML = tbodyHtml;
      document.getElementById("guides-tfoot").innerHTML = rowHtml(totalRow, true);
      document.getElementById("guides-total-strip").innerHTML = totalStripHtml(totalRow);
      document.getElementById("guides-cards").innerHTML = guideCardsHtml(rows, grouped);
      syncChipGroup("guides-city-chips", activeCity4);
      syncChipGroup("guides-lang-chips", activeLang4);
      syncChipGroup("guides-sort-chips", activeSort);
      document.getElementById("view-table-btn").classList.toggle("active", activeView === "table");
      document.getElementById("view-cards-btn").classList.toggle("active", activeView === "cards");
      document.getElementById("guides-table-wrap").style.display = activeView === "table" ? "" : "none";
      document.getElementById("guides-total-strip").style.display = activeView === "cards" ? "" : "none";
      document.getElementById("guides-cards").style.display = activeView === "cards" ? "" : "none";
    }
  };

  // src/pages/page-financial.js
  var activeCity5 = "all";
  var activeSearch2 = "";
  var activeSort2 = "name";
  var activeView2 = "cards";
  function deltaCellsHtml2(d) {
    const cls = d.delta > 0 ? "delta-pos" : d.delta < 0 ? "delta-neg" : "delta-neu";
    const sign = d.delta > 0 ? "+" : "";
    return `<td>${fmtEUR(d.v25)}</td><td>${fmtEUR(d.v26)}</td><td class="${cls}">${sign}${fmtEUR(d.delta)}</td><td class="${cls}">${pctLabel(d)}</td>`;
  }
  function rowHtml2(row, isTotal) {
    const nameCell = isTotal ? `<td><strong>${row.name}</strong></td>` : `<td>${row.name}</td>`;
    return `<tr>${nameCell}` + deltaCellsHtml2(row.revenue) + deltaCellsHtml2(row.margin) + `</tr>`;
  }
  function cardHtml2(row, rank) {
    const rankBadge = rank ? `<div class="guide-rank">#${rank}</div>` : "";
    const newBadge = row.isNew ? `<span class="guide-new-badge">New</span>` : "";
    return `
    <div class="guide-card"${cityAvatarStyle(row.city)}>
      ${rankBadge}
      <div class="guide-card-head">
        <div class="guide-avatar">${cityCode(row.city)}</div>
        <div class="guide-name">${row.name} ${newBadge}</div>
      </div>
      <div class="guide-card-rows">
        ${cardRowsHeaderHtml()}
        ${cardRowHtml("Revenue", row.revenue, { fmt: fmtEUR })}
        ${cardRowHtml("Margin", row.margin, { fmt: fmtEUR, showPct: false })}
      </div>
    </div>`;
  }
  function totalStripHtml2(row) {
    const stat = (label, d) => {
      const cls = d.delta > 0 ? "delta-pos" : d.delta < 0 ? "delta-neg" : "delta-neu";
      const sign = d.delta > 0 ? "+" : "";
      return `
      <div class="gts-stat">
        <div class="gts-label">${label}</div>
        <div class="gts-row">
          <div class="gts-values">${fmtEUR(d.v25)} <span class="gts-arrow">&rarr;</span> ${fmtEUR(d.v26)}</div>
          <div class="gts-delta ${cls}">${sign}${fmtEUR(d.delta)} (${pctLabel(d)})</div>
        </div>
      </div>`;
    };
    return `
    <div class="guide-total-strip">
      ${stat("Revenue", row.revenue)}
      ${stat("Margin", row.margin)}
    </div>`;
  }
  function groupHeaderRowHtml2(city) {
    return `<tr class="city-group-row"><td colspan="9">${city}</td></tr>`;
  }
  function guideCardsHtml2(rows, grouped) {
    if (!grouped) {
      const ranked = activeSort2 !== "name";
      return `<div class="guide-cards">${rows.map((r, i) => cardHtml2(r, ranked ? i + 1 : null)).join("")}</div>`;
    }
    const groups = groupRowsByCity(rows);
    return groups.map((g) => `
    <details class="guide-group" open>
      <summary class="guide-group-title">${g.city}</summary>
      <div class="guide-cards">${g.rows.map((r) => cardHtml2(r, null)).join("")}</div>
    </details>`).join("");
  }
  var PageFinancial = {
    _initialized: false,
    init() {
      const root = document.getElementById("page-financial");
      root.innerHTML = `
      <h2>Guide Financials</h2>
      <p class="page-note">Revenue and margin are full-year totals per guide, not split by language and not gated to the as-of date.</p>
      <div class="filter-bar sticky">
        ${cityChipsHtml("fin", activeCity5)}
        <div class="chip-group" id="fin-sort-chips">
          <button type="button" class="chip-btn" data-value="name">Name</button>
          <button type="button" class="chip-btn" data-value="revenue-gain">Revenue &uarr;</button>
          <button type="button" class="chip-btn" data-value="revenue-drop">Revenue &darr;</button>
        </div>
        <input type="text" id="fin-search" class="guides-search" placeholder="Search guides\u2026">
        <div class="view-toggle-group">
          <button id="fin-view-table-btn" class="view-toggle-btn" title="Table view">&#9776;</button>
          <button id="fin-view-cards-btn" class="view-toggle-btn active" title="Card view">&#9638;</button>
        </div>
      </div>
      <div class="card" id="fin-table-wrap">
        <table id="fin-table">
          <thead>
            <tr>
              <th rowspan="2">Guide</th>
              <th colspan="4">Revenue</th>
              <th colspan="4">Margin</th>
            </tr>
            <tr>
              ${"<th>25</th><th>26</th><th>+/-</th><th>%</th>".repeat(2)}
            </tr>
          </thead>
          <tbody id="fin-tbody"></tbody>
          <tfoot id="fin-tfoot"></tfoot>
        </table>
      </div>
      <div id="fin-total-strip"></div>
      <div id="fin-cards"></div>
    `;
      bindChipGroup("fin-city-chips", (v) => {
        activeCity5 = v;
        this.renderAll();
      });
      bindChipGroup("fin-sort-chips", (v) => {
        activeSort2 = v;
        this.renderAll();
      });
      document.getElementById("fin-search").addEventListener("input", (e) => {
        activeSearch2 = e.target.value;
        this.renderAll();
      });
      document.getElementById("fin-view-table-btn").addEventListener("click", () => {
        activeView2 = "table";
        this.renderAll();
      });
      document.getElementById("fin-view-cards-btn").addEventListener("click", () => {
        activeView2 = "cards";
        this.renderAll();
      });
      this.renderAll();
    },
    renderAll() {
      const cutoffMonth = getCutoffMonth();
      const cutoffDay = getCutoffDay();
      const g25 = filterByCity(guideStats25, activeCity5);
      const g26 = filterByCity(guideStats26, activeCity5);
      const { rows: allRows, totalRow } = buildGuideTable(g25, g26, [], cutoffMonth, cutoffDay, "all");
      const searched = filterByName(allRows, activeSearch2);
      const rows = rankGuides(searched, activeSort2);
      const grouped = activeCity5 === "all" && activeSort2 === "name";
      let tbodyHtml;
      if (grouped) {
        const groups = groupRowsByCity(rows);
        tbodyHtml = groups.map((g) => groupHeaderRowHtml2(g.city) + g.rows.map((r) => rowHtml2(r, false)).join("")).join("");
      } else {
        tbodyHtml = rows.map((r) => rowHtml2(r, false)).join("");
      }
      document.getElementById("fin-tbody").innerHTML = tbodyHtml;
      document.getElementById("fin-tfoot").innerHTML = rowHtml2(totalRow, true);
      document.getElementById("fin-total-strip").innerHTML = totalStripHtml2(totalRow);
      document.getElementById("fin-cards").innerHTML = guideCardsHtml2(rows, grouped);
      syncChipGroup("fin-city-chips", activeCity5);
      syncChipGroup("fin-sort-chips", activeSort2);
      document.getElementById("fin-view-table-btn").classList.toggle("active", activeView2 === "table");
      document.getElementById("fin-view-cards-btn").classList.toggle("active", activeView2 === "cards");
      document.getElementById("fin-table-wrap").style.display = activeView2 === "table" ? "" : "none";
      document.getElementById("fin-total-strip").style.display = activeView2 === "cards" ? "" : "none";
      document.getElementById("fin-cards").style.display = activeView2 === "cards" ? "" : "none";
    }
  };

  // src/main.js
  registerPage("Page25", Page25);
  registerPage("Page26", Page26);
  registerPage("PageCmp", PageCmp);
  registerPage("PageBookings", PageBookings);
  registerPage("PageGuides", PageGuides);
  registerPage("PageFinancial", PageFinancial);
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
    document.addEventListener("themechange", rerenderInitializedPages);
    showPage("cmp", document.querySelector('.nav-tab[data-page="cmp"]'));
    const PAGE_KEYS = { "1": "p25", "2": "p26", "3": "cmp", "4": "bookings", "5": "guides", "6": "financial" };
    document.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || document.activeElement?.isContentEditable) return;
      const pageId = PAGE_KEYS[e.key];
      if (pageId) showPage(pageId);
    });
  });
})();
