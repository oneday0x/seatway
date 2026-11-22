/*
 * Seatway front end (plain JavaScript, no framework).
 * Screens follow the Class 6 views: V1 Start, V2 Connections, V3 Stop on the way, V4 Place details,
 * V5 Your day, V6 Passenger, V7 Check before booking, V7b Payment (simulated), V8 Booked, V9 My trips,
 * V10 Trip and change of plans.
 * Data comes from the Spring Boot REST API under /api.
 * Texts come from i18n.js (Polish and English): t("key").
 */
"use strict";

// ------------------------------------------------------------------ storage and state

const FLOW_KEY = "seatway.flow";      // the booking in progress (survives a refresh or an interruption)
const CODES_KEY = "seatway.codes";    // reservation numbers remembered by this browser ("Moje podróże")
const TEXT_KEY = "seatway.bigText";

function readJson(storage, key, fallback) {
    try {
        const raw = storage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
        return fallback;
    }
}

function writeJson(storage, key, value) {
    try {
        storage.setItem(key, JSON.stringify(value));
    } catch (e) {
        /* storage may be unavailable; the app still works for this visit */
    }
}

let flow = readJson(sessionStorage, FLOW_KEY, {});
let stationsCache = null;

function saveFlow() {
    writeJson(sessionStorage, FLOW_KEY, flow);
}

function resetFlow(keepSearch) {
    flow = keepSearch && flow.search ? { search: flow.search } : {};
    saveFlow();
}

function myCodes() {
    const list = readJson(localStorage, CODES_KEY, []);
    return Array.isArray(list) ? list : [];
}

function rememberCode(code) {
    const list = myCodes().filter(function (c) { return c !== code; });
    list.unshift(code);
    writeJson(localStorage, CODES_KEY, list.slice(0, 50));
}

// ------------------------------------------------------------------ API

async function api(path, options) {
    const opts = Object.assign({ headers: { "Accept": "application/json", "Accept-Language": lang() } }, options || {});
    if (opts.body && typeof opts.body !== "string") {
        opts.headers["Content-Type"] = "application/json";
        opts.body = JSON.stringify(opts.body);
    }
    let response;
    try {
        response = await fetch("/api" + path, opts);
    } catch (e) {
        throw { message: t("errNetwork"), field: null };
    }
    let data = null;
    try {
        data = await response.json();
    } catch (e) {
        data = null;
    }
    if (!response.ok) {
        throw {
            message: (data && data.message) || t("errGeneric"),
            field: data ? data.field : null,
            status: response.status
        };
    }
    return data;
}

async function stations() {
    if (!stationsCache) {
        stationsCache = await api("/stations");
    }
    return stationsCache;
}

// ------------------------------------------------------------------ formatting (Polish or English)

function esc(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function money(value) {
    const amount = Number(value).toFixed(2);
    return lang() === "en" ? "PLN " + amount : amount.replace(".", ",") + " zł";
}

function duration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const hours = lang() === "en" ? " h" : " godz.";
    if (h === 0) return m + " min";
    if (m === 0) return h + hours;
    return h + hours + " " + m + " min";
}

function parseDate(iso) {
    const p = iso.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
}

function isoDate(d) {
    const pad = function (n) { return String(n).padStart(2, "0"); };
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

function longDate(iso) {
    const d = parseDate(iso);
    const pad = function (n) { return String(n).padStart(2, "0"); };
    return DAY_NAMES[lang()][d.getDay()] + " " + pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear();
}

function relativeDay(iso) {
    const today = isoDate(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (iso === today) return t("today") + ", " + longDate(iso);
    if (iso === isoDate(tomorrow)) return t("tomorrow") + ", " + longDate(iso);
    return longDate(iso);
}

// ------------------------------------------------------------------ icons (always shown with a text label)

const ICONS = {
    train: '<path d="M7 3h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z M4 11h16 M8 21l2-3 M16 21l-2-3"/><circle cx="8.5" cy="14.5" r="1"/><circle cx="15.5" cy="14.5" r="1"/>',
    walk: '<circle cx="13" cy="4" r="2"/><path d="M11 21l2-6 3 3v3 M8 12l3-4 4 1 2 4 M11 8l-1 6"/>',
    stairs: '<path d="M3 20h5v-4h4v-4h4V8h5"/>',
    nostairs: '<path d="M3 20h5v-4h4v-4h4V8h5"/><path d="M4 4l16 16"/>',
    wc: '<path d="M3 6l2 12 2-8 2 8 2-12 M21 8a3 3 0 1 0 0 8"/>',
    bench: '<path d="M3 10h18 M3 14h18 M5 14v5 M19 14v5 M6 10V7 M18 10V7"/>',
    print: '<path d="M7 9V3h10v6 M7 17H4v-7h16v7h-3 M7 14h10v7H7z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4 M8.2 13.2l7.6 4.4"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    stop: '<circle cx="12" cy="10" r="3"/><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18 M7 15h4"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    bank: '<path d="M3 10l9-6 9 6 M5 10v8 M9 10v8 M15 10v8 M19 10v8 M3 20h18"/>'
};

/** Green circle with a white check mark (confirmation). */
function successCheck(extraClass) {
    return '<svg class="success-check ' + (extraClass || "") + '" viewBox="0 0 52 52" aria-hidden="true">' +
        '<circle cx="26" cy="26" r="25"/><path d="M14 27l8 8 16-17"/></svg>';
}

function icon(name) {
    return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + "</svg>";
}

function placeFacts(place) {
    return '<ul class="facts">' +
        "<li>" + icon("walk") + "<span>" + esc(t("walk", { m: place.walkMeters, min: place.walkMinutes })) + "</span></li>" +
        (place.stepFree
            ? "<li>" + icon("nostairs") + "<span>" + t("noStairs") + "</span></li>"
            : '<li class="fact-warning">' + icon("stairs") + "<span>" + t("stairs") + "</span></li>") +
        "<li>" + icon("wc") + "<span>" + (place.toilet ? t("toilet") : t("noToilet")) + "</span></li>" +
        "<li>" + icon("bench") + "<span>" + (place.benches ? t("benches") : t("noBenches")) + "</span></li>" +
        "</ul>";
}

// ------------------------------------------------------------------ page frame

const app = document.getElementById("app");
const backButton = document.getElementById("back-button");
const stepLabel = document.getElementById("step");
let backTarget = null;

function frame(options) {
    backTarget = options.back || null;
    backButton.hidden = !backTarget;
    stepLabel.textContent = options.step ? t("step", { n: options.step, total: 6 }) : "";
    document.title = options.title ? options.title + " – Seatway" : "Seatway";
}

backButton.addEventListener("click", function () {
    if (backTarget) location.hash = backTarget;
});

function show(html) {
    app.innerHTML = html;
    const heading = app.querySelector("h1:not(.print-only)");
    if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
    }
    window.scrollTo(0, 0);
}

function loading(text) {
    app.innerHTML = '<p class="loading" role="status">' + esc(text || t("loading")) + "</p>";
}

function errorBox(message) {
    return '<div class="alert alert-error" role="alert">' + esc(message) + "</div>";
}

function selectedStrip() {
    let chosen = "";
    if (flow.connection) {
        const c = flow.connection;
        chosen = '<span class="chosen">' + esc(t("chosenTrain", { dep: c.departure, arr: c.arrival, from: c.fromName,
            to: c.toName, date: longDate(flow.search.date) })) + "</span>";
    }
    return '<p class="status-strip" role="status">' + t("selected") + chosen + "</p>";
}

function fieldError(input, errorEl, message) {
    errorEl.textContent = message;
    input.classList.add("input-error", "error-pulse");
    input.setAttribute("aria-invalid", "true");
    input.addEventListener("animationend", function () { input.classList.remove("error-pulse"); }, { once: true });
}

function clearFieldError(input, errorEl) {
    errorEl.textContent = "";
    input.classList.remove("input-error", "error-pulse");
    input.setAttribute("aria-invalid", "false");
}

// ------------------------------------------------------------------ V1 Start: "Dokąd jedziesz?"

async function viewStart() {
    frame({ title: t("whereTo") });
    loading();
    let list;
    try {
        list = await stations();
    } catch (e) {
        show("<h1>" + t("whereTo") + "</h1>" + errorBox(e.message) + '<button class="btn" onclick="location.reload()">' + t("retry") + "</button>");
        return;
    }
    const s = flow.search || {};
    const today = isoDate(new Date());
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = isoDate(tomorrowDate);
    const date = s.date && s.date >= today ? s.date : tomorrow;
    const options = function (selected) {
        return '<option value="">' + t("chooseStation") + "</option>" + list.map(function (st) {
            return '<option value="' + esc(st.id) + '"' + (st.id === selected ? " selected" : "") + ">" + esc(st.name) + "</option>";
        }).join("");
    };
    const count = myCodes().length;

    show(
        "<h1>" + t("whereTo") + "</h1>" +
        '<form id="search-form" novalidate>' +
        '<div class="field"><label for="from">' + t("from") + "</label>" +
        '<select id="from" aria-describedby="from-error">' + options(s.from) + "</select>" +
        '<p id="from-error" class="field-error" role="alert"></p></div>' +
        '<div class="field"><label for="to">' + t("to") + "</label>" +
        '<select id="to" aria-describedby="to-error">' + options(s.to) + "</select>" +
        '<p id="to-error" class="field-error" role="alert"></p>' +
        '<button type="button" id="swap" class="link-button">' + t("swap") + "</button></div>" +
        '<div class="field"><label for="date">' + t("when") + "</label>" +
        '<div class="row date-row">' +
        '<button type="button" class="chip-button" data-date="' + today + '">' + t("todayBtn") + "</button>" +
        '<button type="button" class="chip-button" data-date="' + tomorrow + '">' + t("tomorrowBtn") + "</button></div>" +
        '<input type="date" id="date" class="text-input" lang="' + lang() + '" min="' + today + '" value="' + esc(date) + '" aria-describedby="date-readable date-error">' +
        '<p id="date-readable" class="readable-date"></p>' +
        '<p id="date-error" class="field-error" role="alert"></p></div>' +
        '<div class="field"><label class="check"><input type="checkbox" id="senior"' + (s.senior === false ? "" : " checked") + ">" +
        "<span>" + t("senior") + "</span></label></div>" +
        '<button type="submit" class="btn">' + t("search") + "</button>" +
        "</form>" +
        '<a class="btn btn-secondary" href="#/moje">' + t("myTrips") + (count ? " (" + count + ")" : "") + "</a>"
    );

    const from = document.getElementById("from");
    const to = document.getElementById("to");
    const dateInput = document.getElementById("date");
    const readable = document.getElementById("date-readable");
    const chips = app.querySelectorAll(".chip-button");

    function updateDate() {
        readable.textContent = dateInput.value ? relativeDay(dateInput.value) : "";
        chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.dataset.date === dateInput.value)); });
    }
    chips.forEach(function (c) {
        c.addEventListener("click", function () {
            dateInput.value = c.dataset.date;
            clearFieldError(dateInput, document.getElementById("date-error"));
            updateDate();
        });
    });
    dateInput.addEventListener("input", updateDate);
    updateDate();

    document.getElementById("swap").addEventListener("click", function () {
        const a = from.value;
        from.value = to.value;
        to.value = a;
    });
    [from, to].forEach(function (el) {
        el.addEventListener("change", function () { clearFieldError(el, document.getElementById(el.id + "-error")); });
    });

    document.getElementById("search-form").addEventListener("submit", function (event) {
        event.preventDefault();
        let ok = true;
        if (!from.value) { fieldError(from, document.getElementById("from-error"), t("errFrom")); ok = false; }
        if (!to.value) { fieldError(to, document.getElementById("to-error"), t("errTo")); ok = false; }
        if (from.value && from.value === to.value) { fieldError(to, document.getElementById("to-error"), t("errSame")); ok = false; }
        if (!dateInput.value || dateInput.value < today) { fieldError(dateInput, document.getElementById("date-error"), t("errDate")); ok = false; }
        if (!ok) {
            const firstError = app.querySelector(".input-error");
            if (firstError) firstError.focus();
            return;
        }
        flow = { search: { from: from.value, to: to.value, date: dateInput.value, senior: document.getElementById("senior").checked } };
        saveFlow();
        location.hash = "#/polaczenia";
    });
}

// ------------------------------------------------------------------ V2 Connections (ticket cards)

async function viewConnections() {
    const s = flow.search;
    if (!s) { location.hash = "#/"; return; }
    frame({ title: t("connections"), step: 1, back: "#/" });
    loading(t("searching"));
    let list;
    try {
        list = await api("/connections?from=" + encodeURIComponent(s.from) + "&to=" + encodeURIComponent(s.to) +
            "&date=" + encodeURIComponent(s.date) + "&senior=" + s.senior);
    } catch (e) {
        show("<h1>" + t("connections") + "</h1>" + errorBox(e.message) + '<a class="btn" href="#/">' + t("changeSearch") + "</a>");
        return;
    }
    const all = await stations();
    const name = function (id) { const st = all.find(function (x) { return x.id === id; }); return st ? st.name : id; };
    const heading = "<h1>" + t("connections") + "</h1>" +
        '<p class="lead"><strong>' + esc(name(s.from)) + " → " + esc(name(s.to)) + "</strong><br>" + esc(relativeDay(s.date)) + "</p>";

    if (list.length === 0) {
        show(heading + '<div class="alert alert-info" role="status">' + t("noTrains") + "</div>" +
            '<a class="btn" href="#/">' + t("changeSearch") + "</a>");
        return;
    }

    const allStops = list.every(function (c) { return c.stopPossible; });
    const cards = list.map(function (c, i) {
        const full = c.seatsLeft <= 0;
        return '<article class="ticket" aria-labelledby="t' + i + '">' +
            '<div class="ticket-main">' +
            '<div class="ticket-times"><span class="times" id="t' + i + '">' + esc(c.departure) + " → " + esc(c.arrival) + "</span>" +
            '<span class="price">' + money(c.price) + (c.seniorPrice ? "<small>" + t("seniorPrice") + "</small>" : "") + "</span></div>" +
            '<p class="meta">' + duration(c.durationMinutes) + " · " + t("direct") + " · " + esc(c.runName) + "</p>" +
            (c.stopPossible && !allStops ? '<span class="tag">' + icon("star") + t("stopTag") + "</span>" : "") +
            "</div>" +
            '<div class="ticket-foot">' +
            (full ? '<p class="seats-low">' + t("noSeats") + "</p>"
                : c.seatsLeft < 10 ? '<p class="seats-low">' + t("seatsLeft", { n: c.seatsLeft }) + "</p>"
                    : '<p class="meta">' + esc(t("platformDep", { p: c.departurePlatform })) + "</p>") +
            '<button type="button" class="btn btn-inline" data-index="' + i + '"' + (full ? " disabled" : "") +
            ' aria-describedby="t' + i + '">' + t("choose") + "</button>" +
            "</div></article>";
    }).join("");

    const via = list[0].via.length ? '<p class="meta">' + esc(t("via", { list: list[0].via.join(", ") })) + "</p>" : "";
    show(heading + '<p class="meta" role="status">' + tPlural("found", list.length) + "</p>" +
        via + (allStops ? '<p class="tag">' + icon("star") + t("allStops") + "</p>" : "") + cards);

    app.querySelectorAll("button[data-index]").forEach(function (b) {
        b.addEventListener("click", function () {
            const c = list[Number(b.dataset.index)];
            flow.connection = c;
            flow.stop = null;
            flow.stops = null;
            saveFlow();
            location.hash = c.stopPossible ? "#/po-drodze" : "#/twoj-dzien";
        });
    });
}

// ------------------------------------------------------------------ V3 Stop on the way (postcards)

async function loadStops() {
    const s = flow.search;
    const c = flow.connection;
    if (!flow.stops) {
        flow.stops = await api("/connections/" + c.runId + "/stops?from=" + encodeURIComponent(s.from) + "&to=" +
            encodeURIComponent(s.to) + "&date=" + encodeURIComponent(s.date) + "&senior=" + s.senior);
        saveFlow();
    }
    return flow.stops;
}

async function viewStops() {
    if (!flow.connection) { location.hash = flow.search ? "#/polaczenia" : "#/"; return; }
    frame({ title: t("stopsTitle"), step: 2, back: "#/polaczenia" });
    loading(t("searchingStops"));
    let stops;
    try {
        stops = await loadStops();
    } catch (e) {
        show("<h1>" + t("stopsTitle") + "</h1>" + errorBox(e.message) + '<a class="btn" href="#/twoj-dzien">' + t("goDirectShort") + "</a>");
        return;
    }
    const c = flow.connection;
    if (stops.length === 0) {
        show(selectedStrip() + "<h1>" + t("stopsTitle") + "</h1>" +
            '<div class="alert alert-info" role="status">' + t("noStops") + "</div>" +
            '<a class="btn" href="#/twoj-dzien">' + t("next") + "</a>");
        return;
    }
    const cards = stops.map(function (o, i) {
        const extra = Number(o.totalPrice) - Number(c.price);
        return '<article class="postcard" aria-labelledby="p' + i + '">' +
            '<img src="' + esc(o.place.image) + '" alt="' + esc(t("illustration", { name: o.place.name })) + '">' +
            '<div class="postcard-body">' +
            '<p class="postcard-station">' + icon("stop") + " " + esc(o.stationName) + "</p>" +
            '<h2 id="p' + i + '" style="margin-top:0">' + esc(o.place.name) + "</h2>" +
            "<p>" + esc(o.place.shortDescription) + "</p>" +
            '<div class="time-box">' + icon("clock") + "<div><strong>" + t("youHaveHere", { d: duration(o.minutesAvailable) }) + "</strong><br>" +
            esc(t("onward", { time: o.nextDeparture, p: o.nextPlatform, arr: o.finalArrival })) + "</div></div>" +
            placeFacts(o.place) +
            '<p class="meta">' + t("tripPrice") + " <strong>" + money(o.totalPrice) + "</strong>" +
            (Math.abs(extra) < 0.005 ? t("samePrice") : "") + "</p>" +
            '<div class="postcard-actions">' +
            '<a class="btn btn-secondary" href="#/miejsce/' + o.place.id + '">' + t("morePlace") + "</a>" +
            '<button type="button" class="btn" data-index="' + i + '" aria-describedby="p' + i + '">' + t("chooseThis") + "</button>" +
            "</div></div></article>";
    }).join("");

    show(selectedStrip() +
        "<h1>" + t("stopsTitle") + "</h1>" +
        '<p class="lead">' + t("stopsLead") + "</p>" +
        '<button type="button" class="btn btn-secondary direct">' + t("noGoDirect") + "</button>" +
        cards +
        '<button type="button" id="direct" class="btn btn-secondary direct">' + t("noGoDirect") + "</button>");

    app.querySelectorAll("button[data-index]").forEach(function (b) {
        b.addEventListener("click", function () { chooseStop(stops[Number(b.dataset.index)]); });
    });
    app.querySelectorAll("button.direct").forEach(function (b) {
        b.addEventListener("click", function () {
            flow.stop = null;
            saveFlow();
            location.hash = "#/twoj-dzien";
        });
    });
}

function chooseStop(option) {
    flow.stop = option;
    saveFlow();
    location.hash = "#/twoj-dzien";
}

// ------------------------------------------------------------------ V4 Place details (back of the postcard)

async function viewPlace(id) {
    frame({ title: t("aboutPlace"), step: flow.connection ? 2 : null, back: flow.connection ? "#/po-drodze" : "#/" });
    loading();
    let place;
    try {
        place = await api("/places/" + encodeURIComponent(id));
    } catch (e) {
        show("<h1>" + t("aboutPlace") + "</h1>" + errorBox(e.message));
        return;
    }
    const option = (flow.stops || []).find(function (o) { return o.place.id === place.id; });
    const checked = place.lastChecked ? longDate(place.lastChecked) : t("noData");
    show(
        (flow.connection ? selectedStrip() : "") +
        '<article class="postcard"><img src="' + esc(place.image) + '" alt="' + esc(t("illustration", { name: place.name })) + '">' +
        '<div class="postcard-body">' +
        '<p class="postcard-station">' + icon("stop") + " " + esc(place.stationName) + "</p>" +
        "<h1>" + esc(place.name) + "</h1>" +
        "<p>" + esc(place.longDescription) + "</p>" +
        (option ? '<div class="time-box">' + icon("clock") + "<div><strong>" + t("youHaveHere", { d: duration(option.minutesAvailable) }) + "</strong><br>" +
            esc(t("nextTrainShort", { time: option.nextDeparture, p: option.nextPlatform })) + "</div></div>" : "") +
        "<h2>" + t("canIManage") + "</h2>" +
        placeFacts(place) +
        '<dl class="detail-list">' +
        "<dt>" + t("visit") + "</dt><dd>" + t("approx", { d: duration(place.visitMinutes) }) + "</dd>" +
        "<dt>" + t("access") + "</dt><dd>" + esc(t("accessText", { m: place.walkMeters, min: place.walkMinutes })) + "</dd>" +
        "<dt>" + t("hours") + "</dt><dd>" + esc(place.openingHours) + "</dd>" +
        "<dt>" + t("entry") + "</dt><dd>" + esc(place.entryPrice) + "</dd>" +
        "<dt>" + t("checked") + "</dt><dd>" + esc(checked) + " " + t("sampleData") + "</dd>" +
        "</dl></div></article>" +
        (option ? '<button type="button" id="choose" class="btn">' + t("choosePlace") + "</button>" : "") +
        (flow.connection ? '<a class="btn btn-secondary" href="#/po-drodze">' + t("backToList") + "</a>" : "")
    );
    if (option) {
        document.getElementById("choose").addEventListener("click", function () { chooseStop(option); });
    }
}

// ------------------------------------------------------------------ timeline (railway line metaphor)

function timelineFromFlow() {
    const c = flow.connection;
    const o = flow.stop;
    if (!o) {
        return timelineHtml([
            { time: c.departure, station: c.fromName, note: t("depPlatform", { p: c.departurePlatform, train: c.runName }) },
            { time: c.arrival, station: c.toName, note: t("arrival") }
        ]);
    }
    return timelineHtml([
        { time: c.departure, station: c.fromName, note: t("depPlatform", { p: c.departurePlatform, train: c.runName }) },
        { time: o.arriveAtStop, station: o.stationName, note: t("getOff") },
        { stop: true, minutes: o.minutesAvailable, place: o.place },
        { time: o.nextDeparture, station: o.stationName, note: t("platformTrain", { p: o.nextPlatform, train: o.nextRunName }), next: true },
        { time: o.finalArrival, station: c.toName, note: t("arrival") }
    ]);
}

function timelineFromLegs(r) {
    const items = [];
    r.legs.forEach(function (leg, i) {
        items.push({ time: leg.departure, station: leg.fromName, note: t("depPlatform", { p: leg.platform, train: leg.runName }), next: i > 0 });
        if (i === 0 && r.legs.length > 1) {
            items.push({ time: leg.arrival, station: leg.toName, note: t("getOff") });
            items.push({ stop: true, minutes: r.minutesAtStop, placeName: r.placeName });
        }
    });
    const last = r.legs[r.legs.length - 1];
    items.push({ time: last.arrival, station: last.toName, note: t("arrival") });
    return timelineHtml(items);
}

function timelineHtml(items) {
    return '<ol class="timeline">' + items.map(function (it) {
        if (it.stop) {
            const name = it.place ? it.place.name : it.placeName;
            const walk = it.place ? "<br>" + esc(t("walkOneWay", { m: it.place.walkMeters, min: it.place.walkMinutes })) : "";
            return '<li class="t-stop"><div class="stop-box"><strong>' + t("stopHave", { d: duration(it.minutes) }) + "</strong>" +
                esc(t("toVisit", { name: name })) + walk + "</div></li>";
        }
        return "<li>" + '<span class="t-time">' + esc(it.time) + '</span> <span class="t-station">' + esc(it.station) + "</span>" +
            (it.next ? '<span class="t-next">' + t("nextTrainTag") + "</span>" : "") +
            '<span class="t-note">' + esc(it.note) + "</span></li>";
    }).join("") + "</ol>";
}

function flowTotal() {
    return flow.stop ? flow.stop.totalPrice : flow.connection.price;
}

// ------------------------------------------------------------------ V5 Your day

function viewDay() {
    if (!flow.connection) { location.hash = "#/"; return; }
    frame({ title: t("yourDay"), step: 3, back: flow.connection.stopPossible ? "#/po-drodze" : "#/polaczenia" });
    show(selectedStrip() +
        "<h1>" + t("yourDay") + "</h1>" +
        '<p class="lead">' + esc(relativeDay(flow.search.date)) + "</p>" +
        timelineFromFlow() +
        '<p class="total"><span>' + t("total") + (flow.search.senior ? t("withSenior") : "") + ":</span><strong>" + money(flowTotal()) + "</strong></p>" +
        '<a class="btn" href="#/pasazer">' + t("next") + "</a>" +
        (flow.connection.stopPossible ? '<a class="btn btn-secondary" href="#/po-drodze">' + (flow.stop ? t("changeStop") : t("wantStop")) + "</a>" : ""));
}

// ------------------------------------------------------------------ V6 Passenger (max. 3 fields)

function viewPassenger(serverError) {
    if (!flow.connection) { location.hash = "#/"; return; }
    frame({ title: t("whoTravels"), step: 4, back: "#/twoj-dzien" });
    const p = flow.passenger || { bookingFor: "SELF", name: "", contact: "" };
    show(selectedStrip() +
        "<h1>" + t("whoTravels") + "</h1>" +
        '<form id="passenger-form" novalidate>' +
        '<fieldset class="choice-group"><legend>' + t("bookingFor") + "</legend>" +
        '<label class="check"><input type="radio" name="for" value="SELF"' + (p.bookingFor !== "OTHER" ? " checked" : "") + "><span>" + t("self") + "</span></label>" +
        '<label class="check"><input type="radio" name="for" value="OTHER"' + (p.bookingFor === "OTHER" ? " checked" : "") + "><span>" + t("otherLong") + "</span></label>" +
        "</fieldset>" +
        '<div class="field"><label for="passenger-name" id="name-label"></label>' +
        '<span class="hint" id="name-hint">' + t("neededOnTicket") + "</span>" +
        '<input type="text" id="passenger-name" class="text-input" autocomplete="name" value="' + esc(p.name) + '" aria-describedby="name-hint passenger-name-error">' +
        '<p id="passenger-name-error" class="field-error" role="alert"></p></div>' +
        '<div class="field"><label for="contact">' + t("contactLabel") + ' <span class="hint" style="display:inline">' + t("optional") + "</span></label>" +
        '<span class="hint" id="contact-hint">' + t("contactHint") + "</span>" +
        '<input type="text" id="contact" class="text-input" autocomplete="off" value="' + esc(p.contact) + '" aria-describedby="contact-hint contact-error">' +
        '<p id="contact-error" class="field-error" role="alert"></p></div>' +
        '<button type="submit" class="btn">' + t("next") + "</button>" +
        "</form>");

    const nameInput = document.getElementById("passenger-name");
    const nameError = document.getElementById("passenger-name-error");
    const label = document.getElementById("name-label");
    const radios = app.querySelectorAll('input[name="for"]');

    function updateLabel() {
        const other = app.querySelector('input[name="for"]:checked').value === "OTHER";
        label.textContent = other ? t("nameOther") : t("nameSelf");
    }
    radios.forEach(function (r) { r.addEventListener("change", updateLabel); });
    updateLabel();

    nameInput.addEventListener("input", function () {
        if (nameInput.value.trim() !== "") clearFieldError(nameInput, nameError);
        storePassenger();
    });
    document.getElementById("contact").addEventListener("input", storePassenger);

    function storePassenger() {
        flow.passenger = {
            bookingFor: app.querySelector('input[name="for"]:checked').value,
            name: nameInput.value,
            contact: document.getElementById("contact").value
        };
        saveFlow();
    }

    if (serverError && serverError.field === "passengerName") {
        fieldError(nameInput, nameError, serverError.message);
        nameInput.focus();
    } else if (serverError && serverError.field === "contact") {
        fieldError(document.getElementById("contact"), document.getElementById("contact-error"), serverError.message);
    }

    document.getElementById("passenger-form").addEventListener("submit", function (event) {
        event.preventDefault();
        storePassenger();
        const name = nameInput.value.trim();
        if (name === "") {
            fieldError(nameInput, nameError, t("errName"));
            nameInput.focus();
            return;
        }
        if (name.length < 2) {
            fieldError(nameInput, nameError, t("errNameShort"));
            nameInput.focus();
            return;
        }
        location.hash = "#/sprawdz";
    });
}

// ------------------------------------------------------------------ V7 Check before booking

function viewCheck() {
    if (!flow.connection) { location.hash = "#/"; return; }
    if (!flow.passenger || !flow.passenger.name || !flow.passenger.name.trim()) { location.hash = "#/pasazer"; return; }
    frame({ title: t("checkTitle"), step: 5, back: "#/pasazer" });
    const c = flow.connection;
    const o = flow.stop;
    const p = flow.passenger;
    const route = o ? c.fromName + " → " + o.stationName + " → " + c.toName : c.fromName + " → " + c.toName;
    show(selectedStrip() +
        "<h1>" + t("checkTitle") + "</h1>" +
        '<div class="card"><dl class="detail-list">' +
        "<dt>" + t("passenger") + "</dt><dd>" + esc(p.name.trim()) + "</dd>" +
        "<dt>" + t("bookingFor") + "</dt><dd>" + (p.bookingFor === "OTHER" ? t("other") : t("self")) + "</dd>" +
        "<dt>" + t("when") + "</dt><dd>" + esc(relativeDay(flow.search.date)) + "</dd>" +
        "<dt>" + t("route") + "</dt><dd>" + esc(route) + "</dd>" +
        "<dt>" + t("stop") + "</dt><dd>" + (o ? esc(o.place.name) + ", " + duration(o.minutesAvailable) : t("noStop")) + "</dd>" +
        "<dt>" + t("departure") + "</dt><dd>" + esc(t("departurePlatform", { time: c.departure, p: c.departurePlatform })) + "</dd>" +
        "<dt>" + t("arrivalLabel") + "</dt><dd>" + esc(o ? o.finalArrival : c.arrival) + "</dd>" +
        "<dt>" + t("price") + "</dt><dd><strong>" + money(flowTotal()) + "</strong>" + (flow.search.senior ? t("seniorShort") : "") + "</dd>" +
        (p.contact && p.contact.trim() ? "<dt>" + t("contact") + "</dt><dd>" + esc(p.contact.trim()) + "</dd>" : "") +
        "</dl>" +
        '<p class="meta" style="margin:0">' + t("cancelRule") + "</p></div>" +
        '<a class="btn" href="#/platnosc">' + t("goToPayment") + "</a>" +
        '<a class="btn btn-secondary" href="#/pasazer">' + t("fixBack") + "</a>");
}

// ------------------------------------------------------------------ V7b Payment (simulated, step 6 of 6)

const PAY_METHODS = [
    { id: "CARD", icon: "card", label: "payCard", hint: "payCardHint" },
    { id: "BLIK", icon: "phone", label: "payBlik", hint: "payBlikHint" },
    { id: "TRANSFER", icon: "bank", label: "payTransfer", hint: "payTransferHint" }
];

let paymentRunning = false;

function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function viewPayment(serverError) {
    if (!flow.connection) { location.hash = "#/"; return; }
    if (!flow.passenger || !flow.passenger.name || !flow.passenger.name.trim()) { location.hash = "#/pasazer"; return; }
    frame({ title: t("paymentTitle"), step: 6, back: "#/sprawdz" });
    const total = flowTotal();
    const chosen = flow.payMethod || "CARD";
    show(selectedStrip() +
        "<h1>" + t("paymentTitle") + "</h1>" +
        '<div class="card pay-amount"><span>' + t("toPay") + (flow.search.senior ? t("seniorShort") : "") + "</span><strong>" + money(total) + "</strong></div>" +
        '<fieldset class="choice-group pay-methods"><legend>' + t("payMethod") + "</legend>" +
        PAY_METHODS.map(function (m) {
            return '<label class="check pay-option"><input type="radio" name="pay" value="' + m.id + '"' + (m.id === chosen ? " checked" : "") + ">" +
                icon(m.icon) + "<span><strong>" + t(m.label) + '</strong><span class="pay-hint">' + t(m.hint) + "</span></span></label>";
        }).join("") +
        "</fieldset>" +
        '<div id="payment-error">' + (serverError ? errorBox(serverError) : "") + "</div>" +
        '<button type="button" id="pay" class="btn">' + esc(t("payButton", { amount: money(total) })) + "</button>" +
        '<p class="demo-note">' + t("paySimNote") + "</p>" +
        '<a class="btn btn-secondary" href="#/sprawdz">' + t("payBack") + "</a>");

    app.querySelectorAll('input[name="pay"]').forEach(function (r) {
        r.addEventListener("change", function () { flow.payMethod = r.value; saveFlow(); });
    });
    document.getElementById("pay").addEventListener("click", function () {
        const method = app.querySelector('input[name="pay"]:checked').value;
        flow.payMethod = method;
        saveFlow();
        processPayment(method, total);
    });
}

/** The loading window shown while the (simulated) payment runs. */
function paymentDialog(activeStep) {
    const steps = ["payStep1", "payStep2", "payStep3"].map(function (key, i) {
        const state = i < activeStep ? "done" : i === activeStep ? "active" : "";
        return '<li class="' + state + '">' + t(key) + "</li>";
    }).join("");
    return '<div class="dialog-backdrop"><div class="dialog pay-dialog" role="alertdialog" aria-modal="true" aria-busy="true" aria-labelledby="pay-title">' +
        '<div class="spinner" aria-hidden="true"></div>' +
        '<h2 id="pay-title" tabindex="-1">' + t("payProcessing") + "</h2>" +
        '<ol class="pay-steps" aria-live="polite">' + steps + "</ol>" +
        '<p class="meta">' + t("payDontClose") + "</p></div></div>";
}

async function processPayment(method, total) {
    if (paymentRunning) return;
    paymentRunning = true;
    const root = document.getElementById("dialog-root");
    const payButton = document.getElementById("pay");
    payButton.disabled = true;
    const c = flow.connection;
    const o = flow.stop;
    const p = flow.passenger;
    let stage = 0;
    function showStep(n) {
        stage = n;
        root.innerHTML = paymentDialog(n);
        const title = document.getElementById("pay-title");
        if (title) title.focus({ preventScroll: true });
    }
    try {
        showStep(0);
        await wait(1100);                                   // "Connecting to the bank…"
        showStep(1);
        const started = Date.now();
        const payment = await api("/payments", { method: "POST", body: { method: method, amount: Number(total) } });
        await wait(Math.max(0, 1100 - (Date.now() - started))); // "Charging the amount…"
        showStep(2);
        const started2 = Date.now();
        const r = await api("/reservations", {
            method: "POST",
            body: {
                runId: c.runId, from: flow.search.from, to: flow.search.to, date: flow.search.date,
                senior: flow.search.senior, placeId: o ? o.place.id : null, nextRunId: o ? o.nextRunId : null,
                passengerName: p.name, bookingFor: p.bookingFor, contact: p.contact,
                paymentReference: payment.reference
            }
        });
        await wait(Math.max(0, 900 - (Date.now() - started2))); // "Confirming the booking…"
        // success: green circle with a white check
        root.innerHTML = '<div class="dialog-backdrop"><div class="dialog pay-dialog" role="alertdialog" aria-modal="true" aria-labelledby="pay-done">' +
            successCheck() + '<h2 id="pay-done" tabindex="-1">' + t("paySuccess") + "</h2>" +
            '<p class="pay-success-sub">' + t("paySuccessSub") + "</p></div></div>";
        document.getElementById("pay-done").focus({ preventScroll: true });
        rememberCode(r.code);
        resetFlow(true);
        await wait(1600);
        paymentRunning = false;
        root.innerHTML = "";
        location.hash = "#/gotowe/" + encodeURIComponent(r.code);
    } catch (e) {
        paymentRunning = false;
        root.innerHTML = "";
        if (e.field === "passengerName" || e.field === "contact") {
            viewPassenger(e);
            return;
        }
        if (e.status === 409 && e.field !== "payment") {
            flow.stops = null;
            saveFlow();
        }
        const message = stage < 2 ? t("payFailed") + " " + e.message : e.message +
            (e.status === 409 && e.field !== "payment" ? t("fullHint") : "");
        viewPayment(message);
    }
}

// ------------------------------------------------------------------ share and print

async function shareTrip(r, statusEl) {
    const url = location.origin + location.pathname + "#/podroz/" + encodeURIComponent(r.code);
    const text = t("shareText", { code: r.code, from: r.fromName, to: r.toName, date: longDate(r.date), dep: r.legs[0].departure });
    if (navigator.share) {
        try {
            await navigator.share({ title: t("planTitle", { code: r.code }), text: text, url: url });
            statusEl.innerHTML = '<p class="alert alert-ok" role="status">' + t("shared") + "</p>";
            return;
        } catch (e) {
            /* the person closed the share menu: fall back to the link below */
        }
    }
    const contact = (r.contact || "").trim();
    if (contact) {
        const isMail = contact.indexOf("@") > 0;
        const digits = contact.replace(/[^\d+]/g, "");
        const href = isMail
            ? "mailto:" + encodeURIComponent(contact) + "?subject=" + encodeURIComponent(t("planTitle", { code: r.code })) + "&body=" + encodeURIComponent(text + "\n" + url)
            : "sms:" + digits + "?body=" + encodeURIComponent(text + " " + url);
        statusEl.innerHTML = '<div class="alert alert-ok" role="status">' + t("sendTo") + " <strong>" + esc(contact) + "</strong>" +
            '<a class="btn" style="margin:.6rem 0 0" href="' + esc(href) + '">' + (isMail ? t("openEmail") : t("openSms")) + "</a>" +
            '<p class="share-link" style="margin:.6rem 0 0">' + esc(url) + "</p></div>";
        return;
    }
    let copied = false;
    try {
        await navigator.clipboard.writeText(text + " " + url);
        copied = true;
    } catch (e) {
        copied = false;
    }
    statusEl.innerHTML = '<div class="alert alert-ok" role="status">' +
        (copied ? t("copied") : t("sendLink")) +
        '<p class="share-link" style="margin:.5rem 0 0">' + esc(url) + "</p></div>";
}

// ------------------------------------------------------------------ V8 Booked (the stamped ticket)

function paidLine(r) {
    if (!r.paymentReference) return "";
    return '<p class="paid-line">' + esc(t("paidLine", { amount: money(r.totalPrice), method: t("method_" + r.paymentMethod), ref: r.paymentReference })) + "</p>";
}

async function viewBooked(code) {
    frame({ title: t("bookedTitle") });
    loading();
    let r;
    try {
        r = await api("/reservations/" + encodeURIComponent(code));
    } catch (e) {
        show("<h1>" + t("yourTrip") + "</h1>" + errorBox(e.message) + '<a class="btn" href="#/moje">' + t("myTrips") + "</a>");
        return;
    }
    show('<h1 class="print-only">' + t("printTitle") + "</h1>" +
        (r.paymentReference ? successCheck("small no-animation") : "") +
        '<div class="stamp" role="status"><p class="stamp-title">' + (r.paymentReference ? t("stampPaid") : t("stamp")) + "</p>" +
        '<p class="stamp-code">' + t("number") + " <strong>" + esc(r.code) + "</strong></p></div>" +
        paidLine(r) +
        '<h1 class="no-print">' + t("done") + "</h1>" +
        '<p class="lead">' + esc(r.passengerName) + " · " + esc(longDate(r.date)) + "</p>" +
        timelineFromLegs(r) +
        '<p class="total"><span>' + t("total") + (r.senior ? t("seniorShort") : "") + ":</span><strong>" + money(r.totalPrice) + "</strong></p>" +
        '<p class="demo-note">' + t("demoNote") + "</p>" +
        '<div id="share-status"></div>' +
        '<button type="button" id="print" class="btn btn-secondary">' + icon("print") + t("print") + "</button>" +
        '<button type="button" id="share" class="btn btn-secondary">' + icon("share") + t("share") + "</button>" +
        '<a class="btn" href="#/moje">' + t("myTrips") + "</a>");
    document.getElementById("print").addEventListener("click", function () { window.print(); });
    document.getElementById("share").addEventListener("click", function () { shareTrip(r, document.getElementById("share-status")); });
}

// ------------------------------------------------------------------ V9 My trips (the ticket wallet)

function statusChip(r) {
    if (r.status === "CANCELLED") return '<span class="status-chip cancelled">' + t("chipCancelled") + "</span>";
    if (!r.canCancel) return '<span class="status-chip past">' + t("chipPast") + "</span>";
    return '<span class="status-chip booked">' + t("chipBooked") + "</span>";
}

async function viewMyTrips(message) {
    frame({ title: t("myTrips"), back: "#/" });
    loading();
    const codes = myCodes();
    let list = [];
    let problem = null;
    if (codes.length) {
        try {
            list = await api("/reservations?codes=" + encodeURIComponent(codes.join(",")));
        } catch (e) {
            problem = e.message;
        }
    }
    const cards = list.map(function (r) {
        return '<article class="card">' +
            '<p class="meta" style="margin-top:0">' + esc(longDate(r.date)) + " · " + esc(t("tripNo", { code: r.code })) + "</p>" +
            '<h2 style="margin-top:0">' + esc(r.fromName) + " → " + esc(r.toName) + "</h2>" +
            '<p class="meta">' + (r.placeName ? esc(t("withStop", { name: r.placeName })) : t("noStop")) + " · " + esc(r.passengerName) + "</p>" +
            '<div class="row" style="justify-content:space-between;align-items:center">' + statusChip(r) +
            '<a class="btn btn-secondary btn-inline" href="#/podroz/' + encodeURIComponent(r.code) + '" aria-label="' + esc(t("openTrip", { code: r.code })) + '">' + t("open") + "</a></div>" +
            "</article>";
    }).join("");

    show((message ? '<p class="alert alert-ok" role="status">' + esc(message) + "</p>" : "") +
        "<h1>" + t("myTrips") + "</h1>" +
        (problem ? errorBox(problem) : "") +
        (list.length ? cards : '<p class="alert alert-info">' + t("noTrips") + "</p>") +
        '<p class="meta">' + t("tripsStay") + "</p>" +
        '<a class="btn" href="#/">' + t("newTrip") + "</a>" +
        "<h2>" + t("haveCode") + "</h2>" +
        '<form id="code-form" novalidate><div class="field"><label for="code">' + t("codeLabel") + "</label>" +
        '<span class="hint" id="code-hint">' + t("codeHint") + "</span>" +
        '<input type="text" id="code" class="text-input" autocomplete="off" aria-describedby="code-hint code-error">' +
        '<p id="code-error" class="field-error" role="alert"></p></div>' +
        '<button type="submit" class="btn btn-secondary">' + t("showTrip") + "</button></form>");

    document.getElementById("code-form").addEventListener("submit", async function (event) {
        event.preventDefault();
        const input = document.getElementById("code");
        const err = document.getElementById("code-error");
        let value = input.value.trim().toUpperCase().replace(/\s+/g, "");
        if (/^\d{4}$/.test(value)) value = "SW-" + value;
        if (!/^SW-\d{4}$/.test(value)) {
            fieldError(input, err, t("errCode"));
            input.focus();
            return;
        }
        try {
            await api("/reservations/" + encodeURIComponent(value));
            rememberCode(value);
            location.hash = "#/podroz/" + encodeURIComponent(value);
        } catch (e) {
            fieldError(input, err, e.message);
            input.focus();
        }
    });
}

// ------------------------------------------------------------------ V10 Trip details and change of plans

function confirmDialog(title, text, yesLabel, noLabel, yesClass) {
    return new Promise(function (resolve) {
        const root = document.getElementById("dialog-root");
        const previous = document.activeElement;
        root.innerHTML = '<div class="dialog-backdrop"><div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-text">' +
            '<h2 id="dlg-title">' + esc(title) + "</h2>" +
            '<p id="dlg-text">' + esc(text) + "</p>" +
            '<button type="button" class="' + (yesClass || "btn btn-danger-solid") + '" id="dlg-yes">' + esc(yesLabel) + "</button>" +
            '<button type="button" class="btn btn-secondary" id="dlg-no">' + esc(noLabel) + "</button>" +
            "</div></div>";
        const yes = document.getElementById("dlg-yes");
        const no = document.getElementById("dlg-no");
        function close(result) {
            root.innerHTML = "";
            document.removeEventListener("keydown", onKey);
            if (previous && previous.focus) previous.focus();
            resolve(result);
        }
        function onKey(e) {
            if (e.key === "Escape") close(false);
            if (e.key === "Tab") {
                e.preventDefault();
                (document.activeElement === no ? yes : no).focus();
            }
        }
        yes.addEventListener("click", function () { close(true); });
        no.addEventListener("click", function () { close(false); });
        document.addEventListener("keydown", onKey);
        no.focus();
    });
}

async function viewTrip(code, message) {
    frame({ title: t("yourTrip"), back: "#/moje" });
    loading();
    let r;
    try {
        r = await api("/reservations/" + encodeURIComponent(code));
    } catch (e) {
        show("<h1>" + t("yourTrip") + "</h1>" + errorBox(e.message) + '<a class="btn" href="#/moje">' + t("myTrips") + "</a>");
        return;
    }
    const saved = myCodes().indexOf(r.code) >= 0;
    const firstLeg = r.legs[0];
    show((message ? '<p class="alert alert-ok" role="status">' + esc(message) + "</p>" : "") +
        '<h1 class="print-only">' + t("printTitle") + "</h1>" +
        (r.status === "CONFIRMED" ? '<div class="stamp"><p class="stamp-title">' + (r.paymentReference ? t("stampPaid") : t("stamp")) + '</p><p class="stamp-code">' + t("number") + " <strong>" + esc(r.code) + "</strong></p></div>" + paidLine(r)
            : "<p>" + statusChip(r) + " " + t("number") + " <strong>" + esc(r.code) + "</strong></p>") +
        '<h1 class="no-print">' + esc(longDate(r.date)) + "</h1>" +
        '<p class="lead">' + esc(r.fromName) + " → " + esc(r.toName) + " · " + esc(r.passengerName) + "</p>" +
        timelineFromLegs(r) +
        '<p class="total"><span>' + t("total") + (r.senior ? t("seniorShort") : "") + ":</span><strong>" + money(r.totalPrice) + "</strong></p>" +
        (!saved ? '<button type="button" id="save" class="btn btn-secondary">' + t("saveTrip") + "</button>" : "") +
        (r.canCancel ? '<section class="card no-print" aria-labelledby="change-title"><h2 id="change-title" style="margin-top:0">' + t("changePlans") + "</h2>" +
            '<p class="meta">' + t("freeUntil") + "</p>" +
            '<div id="change-error"></div>' +
            (r.canRemoveStop ? '<button type="button" id="remove-stop" class="btn btn-secondary">' + esc(t("removeStop", { name: r.placeName })) + "</button>" : "") +
            '<button type="button" id="cancel" class="btn btn-danger" style="margin-bottom:0">' + t("cancelTrip") + "</button></section>" : "") +
        (r.status === "CONFIRMED"
            ? '<div id="share-status"></div>' +
              '<button type="button" id="print" class="btn btn-secondary">' + icon("print") + t("print") + "</button>" +
              '<button type="button" id="share" class="btn btn-secondary">' + icon("share") + t("share") + "</button>"
            : '<p class="alert alert-info">' + t("isCancelled") + "</p>" +
              '<a class="btn" href="#/">' + t("planNew") + "</a>"));

    const printButton = document.getElementById("print");
    if (printButton) {
        printButton.addEventListener("click", function () { window.print(); });
        document.getElementById("share").addEventListener("click", function () { shareTrip(r, document.getElementById("share-status")); });
    }
    const saveButton = document.getElementById("save");
    if (saveButton) {
        saveButton.addEventListener("click", function () {
            rememberCode(r.code);
            viewTrip(r.code, t("savedMsg"));
        });
    }
    const removeButton = document.getElementById("remove-stop");
    if (removeButton) {
        removeButton.addEventListener("click", async function () {
            const ok = await confirmDialog(t("removeQ"),
                t("removeText", { name: r.placeName, train: firstLeg.runName, time: firstLeg.departure }),
                t("removeYes"), t("keep"), "btn");
            if (!ok) return;
            try {
                await api("/reservations/" + encodeURIComponent(r.code) + "/remove-stop", { method: "POST" });
                viewTrip(r.code, t("removed"));
            } catch (e) {
                document.getElementById("change-error").innerHTML = errorBox(e.message);
            }
        });
    }
    const cancelButton = document.getElementById("cancel");
    if (cancelButton) {
        cancelButton.addEventListener("click", async function () {
            const ok = await confirmDialog(t("cancelQ"),
                r.paymentReference ? t("cancelTextPaid", { amount: money(r.totalPrice), method: t("method_" + r.paymentMethod) }) : t("cancelText"),
                t("cancelYes"), t("keep"));
            if (!ok) return;
            try {
                await api("/reservations/" + encodeURIComponent(r.code) + "/cancel", { method: "POST" });
                viewTrip(r.code, r.paymentReference ? t("cancelledRefund", { amount: money(r.totalPrice) }) : t("cancelledMsg"));
            } catch (e) {
                document.getElementById("change-error").innerHTML = errorBox(e.message);
            }
        });
    }
}

// ------------------------------------------------------------------ router

function route() {
    const hash = decodeURIComponent(location.hash.replace(/^#/, "")) || "/";
    const parts = hash.split("/").filter(Boolean);
    if (!paymentRunning) document.getElementById("dialog-root").innerHTML = "";
    switch (parts[0]) {
        case undefined: return viewStart();
        case "polaczenia": return viewConnections();
        case "po-drodze": return viewStops();
        case "miejsce": return viewPlace(parts[1]);
        case "twoj-dzien": return viewDay();
        case "pasazer": return viewPassenger();
        case "sprawdz": return viewCheck();
        case "platnosc": return viewPayment();
        case "gotowe": return viewBooked(parts[1]);
        case "moje": return viewMyTrips();
        case "podroz": return viewTrip(parts[1]);
        default:
            location.hash = "#/";
    }
}

// ------------------------------------------------------------------ larger text (US9)

const textButton = document.getElementById("text-size");

function applyTextSize(big) {
    document.documentElement.classList.toggle("big-text", big);
    textButton.setAttribute("aria-pressed", String(big));
    textButton.querySelector("[aria-hidden]").textContent = big ? "A−" : "A+";
    textButton.querySelector(".visually-hidden").textContent = big ? t("normalText") : t("biggerText");
    textButton.title = big ? t("normalText") : t("biggerText");
}

textButton.addEventListener("click", function () {
    const big = !document.documentElement.classList.contains("big-text");
    writeJson(localStorage, TEXT_KEY, big);
    applyTextSize(big);
});

// ------------------------------------------------------------------ language (Polish / English)

/** Texts that are part of index.html rather than of a screen. */
function applyStaticTexts() {
    document.documentElement.lang = lang();
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
        el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
        el.title = t(el.getAttribute("data-i18n-title"));
    });
    const group = document.getElementById("lang-switch");
    group.setAttribute("aria-label", t("language"));
    group.querySelectorAll("button[data-lang]").forEach(function (b) {
        const active = b.dataset.lang === lang();
        b.setAttribute("aria-pressed", String(active));
        b.setAttribute("aria-label", t("langName_" + b.dataset.lang));
    });
    applyTextSize(document.documentElement.classList.contains("big-text"));
}

document.querySelectorAll("#lang-switch button[data-lang]").forEach(function (b) {
    b.addEventListener("click", function () {
        if (b.dataset.lang === lang()) return;
        setLang(b.dataset.lang);
        flow.stops = null; // place descriptions are loaded again in the new language
        saveFlow();
        applyStaticTexts();
        route(); // show the current screen again in the new language
    });
});

applyTextSize(readJson(localStorage, TEXT_KEY, false) === true);
applyStaticTexts();
window.addEventListener("hashchange", route);
route();
