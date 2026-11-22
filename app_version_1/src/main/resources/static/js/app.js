/*
 * Seatway front end (plain JavaScript, no framework).
 * Screens follow the Class 6 views: V1 Start, V2 Connections, V3 Stop on the way, V4 Place details,
 * V5 Your day, V6 Passenger, V7 Check before booking, V8 Booked, V9 My trips, V10 Trip and change of plans.
 * Data comes from the Spring Boot REST API under /api.
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
    const opts = Object.assign({ headers: { "Accept": "application/json" } }, options || {});
    if (opts.body && typeof opts.body !== "string") {
        opts.headers["Content-Type"] = "application/json";
        opts.body = JSON.stringify(opts.body);
    }
    let response;
    try {
        response = await fetch("/api" + path, opts);
    } catch (e) {
        throw { message: "Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie. Nic nie zostało zarezerwowane.", field: null };
    }
    let data = null;
    try {
        data = await response.json();
    } catch (e) {
        data = null;
    }
    if (!response.ok) {
        throw {
            message: (data && data.message) || "Coś poszło nie tak. Spróbuj ponownie.",
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

// ------------------------------------------------------------------ formatting (Polish)

const DAYS = ["niedz.", "pon.", "wt.", "śr.", "czw.", "pt.", "sob."];

function esc(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function money(value) {
    return Number(value).toFixed(2).replace(".", ",") + " zł";
}

function duration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return m + " min";
    if (m === 0) return h + " godz.";
    return h + " godz. " + m + " min";
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
    return DAYS[d.getDay()] + " " + pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear();
}

function relativeDay(iso) {
    const today = isoDate(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (iso === today) return "dziś, " + longDate(iso);
    if (iso === isoDate(tomorrow)) return "jutro, " + longDate(iso);
    return longDate(iso);
}

function cityOf(stationName) {
    return stationName.replace(/ (Główny|Główne|Śląska)$/u, "");
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
    stop: '<circle cx="12" cy="10" r="3"/><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/>'
};

function icon(name) {
    return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + "</svg>";
}

function placeFacts(place) {
    return '<ul class="facts">' +
        "<li>" + icon("walk") + "<span>" + esc(place.walkMeters) + " m · ok. " + esc(place.walkMinutes) + " min pieszo</span></li>" +
        (place.stepFree
            ? "<li>" + icon("nostairs") + "<span>bez schodów</span></li>"
            : '<li class="fact-warning">' + icon("stairs") + "<span>są schody</span></li>") +
        "<li>" + icon("wc") + "<span>" + (place.toilet ? "toaleta" : "brak toalety") + "</span></li>" +
        "<li>" + icon("bench") + "<span>" + (place.benches ? "ławki" : "brak ławek") + "</span></li>" +
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
    stepLabel.textContent = options.step ? "Krok " + options.step + " z 5" : "";
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
    app.innerHTML = '<p class="loading" role="status">' + esc(text || "Wczytywanie…") + "</p>";
}

function errorBox(message) {
    return '<div class="alert alert-error" role="alert">' + esc(message) + "</div>";
}

function selectedStrip() {
    let chosen = "";
    if (flow.connection) {
        const c = flow.connection;
        chosen = '<span class="chosen">Pociąg ' + esc(c.departure) + " → " + esc(c.arrival) + " · " +
            esc(c.fromName) + " → " + esc(c.toName) + " · " + esc(longDate(flow.search.date)) + "</span>";
    }
    return '<p class="status-strip" role="status">Wybrane – jeszcze nie zarezerwowane' + chosen + "</p>";
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
    frame({ title: "Dokąd jedziesz?" });
    loading();
    let list;
    try {
        list = await stations();
    } catch (e) {
        show("<h1>Dokąd jedziesz?</h1>" + errorBox(e.message) + '<button class="btn" onclick="location.reload()">Spróbuj ponownie</button>');
        return;
    }
    const s = flow.search || {};
    const today = isoDate(new Date());
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = isoDate(tomorrowDate);
    const date = s.date && s.date >= today ? s.date : tomorrow;
    const options = function (selected) {
        return '<option value="">Wybierz stację</option>' + list.map(function (st) {
            return '<option value="' + esc(st.id) + '"' + (st.id === selected ? " selected" : "") + ">" + esc(st.name) + "</option>";
        }).join("");
    };
    const count = myCodes().length;

    show(
        "<h1>Dokąd jedziesz?</h1>" +
        '<form id="search-form" novalidate>' +
        '<div class="field"><label for="from">Skąd</label>' +
        '<select id="from" aria-describedby="from-error">' + options(s.from) + "</select>" +
        '<p id="from-error" class="field-error" role="alert"></p></div>' +
        '<div class="field"><label for="to">Dokąd</label>' +
        '<select id="to" aria-describedby="to-error">' + options(s.to) + "</select>" +
        '<p id="to-error" class="field-error" role="alert"></p>' +
        '<button type="button" id="swap" class="link-button">⇅ Zamień stacje</button></div>' +
        '<div class="field"><label for="date">Kiedy</label>' +
        '<div class="row date-row">' +
        '<button type="button" class="chip-button" data-date="' + today + '">Dziś</button>' +
        '<button type="button" class="chip-button" data-date="' + tomorrow + '">Jutro</button></div>' +
        '<input type="date" id="date" class="text-input" min="' + today + '" value="' + esc(date) + '" aria-describedby="date-readable date-error">' +
        '<p id="date-readable" class="readable-date"></p>' +
        '<p id="date-error" class="field-error" role="alert"></p></div>' +
        '<div class="field"><label class="check"><input type="checkbox" id="senior"' + (s.senior === false ? "" : " checked") + ">" +
        "<span><strong>Mam 60 lat lub więcej</strong> – cena z ulgą (−30%)</span></label></div>" +
        '<button type="submit" class="btn">Szukaj połączeń</button>' +
        "</form>" +
        '<a class="btn btn-secondary" href="#/moje">Moje podróże' + (count ? " (" + count + ")" : "") + "</a>"
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
        if (!from.value) { fieldError(from, document.getElementById("from-error"), "Wybierz stację, z której jedziesz."); ok = false; }
        if (!to.value) { fieldError(to, document.getElementById("to-error"), "Wybierz stację, do której jedziesz."); ok = false; }
        if (from.value && from.value === to.value) { fieldError(to, document.getElementById("to-error"), "Stacja docelowa musi być inna niż początkowa."); ok = false; }
        if (!dateInput.value || dateInput.value < today) { fieldError(dateInput, document.getElementById("date-error"), "Wybierz dzisiejszą lub późniejszą datę."); ok = false; }
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
    frame({ title: "Połączenia", step: 1, back: "#/" });
    loading("Szukamy połączeń…");
    let list;
    try {
        list = await api("/connections?from=" + encodeURIComponent(s.from) + "&to=" + encodeURIComponent(s.to) +
            "&date=" + encodeURIComponent(s.date) + "&senior=" + s.senior);
    } catch (e) {
        show("<h1>Połączenia</h1>" + errorBox(e.message) + '<a class="btn" href="#/">Zmień wyszukiwanie</a>');
        return;
    }
    const all = await stations();
    const name = function (id) { const st = all.find(function (x) { return x.id === id; }); return st ? st.name : id; };
    const heading = "<h1>Połączenia</h1>" +
        '<p class="lead"><strong>' + esc(name(s.from)) + " → " + esc(name(s.to)) + "</strong><br>" + esc(relativeDay(s.date)) + "</p>";

    if (list.length === 0) {
        show(heading + '<div class="alert alert-info" role="status">Tego dnia nie ma już połączeń na tej trasie. Spróbuj innej daty.</div>' +
            '<a class="btn" href="#/">Zmień wyszukiwanie</a>');
        return;
    }

    const allStops = list.every(function (c) { return c.stopPossible; });
    const cards = list.map(function (c, i) {
        const full = c.seatsLeft <= 0;
        return '<article class="ticket" aria-labelledby="t' + i + '">' +
            '<div class="ticket-main">' +
            '<div class="ticket-times"><span class="times" id="t' + i + '">' + esc(c.departure) + " → " + esc(c.arrival) + "</span>" +
            '<span class="price">' + money(c.price) + (c.seniorPrice ? "<small>z ulgą seniora</small>" : "") + "</span></div>" +
            '<p class="meta">' + duration(c.durationMinutes) + " · bez przesiadek · " + esc(c.runName) + "</p>" +
            (c.stopPossible && !allStops ? '<span class="tag">' + icon("star") + "Można zatrzymać się po drodze</span>" : "") +
            "</div>" +
            '<div class="ticket-foot">' +
            (full ? '<p class="seats-low">Brak wolnych miejsc</p>'
                : c.seatsLeft < 10 ? '<p class="seats-low">Zostało tylko ' + c.seatsLeft + " miejsc</p>"
                    : '<p class="meta">Odjazd z peronu ' + esc(c.departurePlatform) + "</p>") +
            '<button type="button" class="btn btn-inline" data-index="' + i + '"' + (full ? " disabled" : "") +
            ' aria-describedby="t' + i + '">Wybierz</button>' +
            "</div></article>";
    }).join("");

    const via = list[0].via.length ? '<p class="meta">Pociągi jadą przez: ' + esc(list[0].via.join(", ")) + ".</p>" : "";
    show(heading + '<p class="meta" role="status">Znaleziono ' + list.length + " " + (list.length === 1 ? "połączenie" : list.length < 5 ? "połączenia" : "połączeń") + ".</p>" +
        via + (allStops ? '<p class="tag">' + icon("star") + "Na każdym połączeniu możesz zatrzymać się po drodze.</p>" : "") + cards);

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
    frame({ title: "Zobacz coś po drodze?", step: 2, back: "#/polaczenia" });
    loading("Szukamy ciekawych miejsc po drodze…");
    let stops;
    try {
        stops = await loadStops();
    } catch (e) {
        show("<h1>Zobacz coś po drodze?</h1>" + errorBox(e.message) + '<a class="btn" href="#/twoj-dzien">Jadę prosto</a>');
        return;
    }
    const c = flow.connection;
    if (stops.length === 0) {
        show(selectedStrip() + "<h1>Zobacz coś po drodze?</h1>" +
            '<div class="alert alert-info" role="status">Na tym połączeniu nie zdążysz już bezpiecznie nic zwiedzić. Pojedziesz prosto.</div>' +
            '<a class="btn" href="#/twoj-dzien">Dalej</a>');
        return;
    }
    const cards = stops.map(function (o, i) {
        const extra = Number(o.totalPrice) - Number(c.price);
        return '<article class="postcard" aria-labelledby="p' + i + '">' +
            '<img src="' + esc(o.place.image) + '" alt="Ilustracja: ' + esc(o.place.name) + '">' +
            '<div class="postcard-body">' +
            '<p class="postcard-station">' + icon("stop") + " " + esc(o.stationName) + "</p>" +
            '<h2 id="p' + i + '" style="margin-top:0">' + esc(o.place.name) + "</h2>" +
            "<p>" + esc(o.place.shortDescription) + "</p>" +
            '<div class="time-box">' + icon("clock") + "<div><strong>Masz tu " + duration(o.minutesAvailable) + "</strong><br>" +
            "Dalej pociągiem o " + esc(o.nextDeparture) + " (peron " + esc(o.nextPlatform) + "), na miejscu o " + esc(o.finalArrival) + "</div></div>" +
            placeFacts(o.place) +
            '<p class="meta">Cena całej podróży: <strong>' + money(o.totalPrice) + "</strong>" +
            (Math.abs(extra) < 0.005 ? " – tyle samo, co bez przystanku." : "") + "</p>" +
            '<div class="postcard-actions">' +
            '<a class="btn btn-secondary" href="#/miejsce/' + o.place.id + '">Więcej o miejscu</a>' +
            '<button type="button" class="btn" data-index="' + i + '" aria-describedby="p' + i + '">Wybieram</button>' +
            "</div></div></article>";
    }).join("");

    show(selectedStrip() +
        "<h1>Zobacz coś po drodze?</h1>" +
        '<p class="lead">Możesz wysiąść na kilka godzin i pojechać dalej późniejszym pociągiem. Pokazujemy tylko miejsca, przy których zdążysz bezpiecznie na następny pociąg.</p>' +
        '<button type="button" class="btn btn-secondary direct">Nie, jadę prosto</button>' +
        cards +
        '<button type="button" id="direct" class="btn btn-secondary direct">Nie, jadę prosto</button>');

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
    frame({ title: "O miejscu", step: flow.connection ? 2 : null, back: flow.connection ? "#/po-drodze" : "#/" });
    loading();
    let place;
    try {
        place = await api("/places/" + encodeURIComponent(id));
    } catch (e) {
        show("<h1>O miejscu</h1>" + errorBox(e.message));
        return;
    }
    const option = (flow.stops || []).find(function (o) { return o.place.id === place.id; });
    const checked = place.lastChecked ? longDate(place.lastChecked) : "brak danych";
    show(
        (flow.connection ? selectedStrip() : "") +
        '<article class="postcard"><img src="' + esc(place.image) + '" alt="Ilustracja: ' + esc(place.name) + '">' +
        '<div class="postcard-body">' +
        '<p class="postcard-station">' + icon("stop") + " " + esc(place.stationName) + "</p>" +
        "<h1>" + esc(place.name) + "</h1>" +
        "<p>" + esc(place.longDescription) + "</p>" +
        (option ? '<div class="time-box">' + icon("clock") + "<div><strong>Masz tu " + duration(option.minutesAvailable) + "</strong><br>" +
            "Następny pociąg: " + esc(option.nextDeparture) + ", peron " + esc(option.nextPlatform) + "</div></div>" : "") +
        "<h2>Czy dam radę?</h2>" +
        placeFacts(place) +
        '<dl class="detail-list">' +
        "<dt>Zwiedzanie</dt><dd>ok. " + duration(place.visitMinutes) + "</dd>" +
        "<dt>Dojście</dt><dd>" + esc(place.walkMeters) + " m od dworca, ok. " + esc(place.walkMinutes) + " min w jedną stronę</dd>" +
        "<dt>Godziny</dt><dd>" + esc(place.openingHours) + "</dd>" +
        "<dt>Wstęp</dt><dd>" + esc(place.entryPrice) + "</dd>" +
        "<dt>Sprawdzono</dt><dd>" + esc(checked) + " (przykładowe dane)</dd>" +
        "</dl></div></article>" +
        (option ? '<button type="button" id="choose" class="btn">Wybieram to miejsce</button>' : "") +
        (flow.connection ? '<a class="btn btn-secondary" href="#/po-drodze">Wróć do listy miejsc</a>' : "")
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
            { time: c.departure, station: c.fromName, note: "odjazd, peron " + c.departurePlatform + " · " + c.runName },
            { time: c.arrival, station: c.toName, note: "przyjazd" }
        ]);
    }
    return timelineHtml([
        { time: c.departure, station: c.fromName, note: "odjazd, peron " + c.departurePlatform + " · " + c.runName },
        { time: o.arriveAtStop, station: o.stationName, note: "przyjazd – wysiadasz" },
        { stop: true, minutes: o.minutesAvailable, place: o.place },
        { time: o.nextDeparture, station: o.stationName, note: "peron " + o.nextPlatform + " · " + o.nextRunName, next: true },
        { time: o.finalArrival, station: c.toName, note: "przyjazd" }
    ]);
}

function timelineFromLegs(r) {
    const items = [];
    r.legs.forEach(function (leg, i) {
        items.push({ time: leg.departure, station: leg.fromName, note: "odjazd, peron " + leg.platform + " · " + leg.runName, next: i > 0 });
        if (i === 0 && r.legs.length > 1) {
            items.push({ time: leg.arrival, station: leg.toName, note: "przyjazd – wysiadasz" });
            items.push({ stop: true, minutes: r.minutesAtStop, placeName: r.placeName });
        }
    });
    const last = r.legs[r.legs.length - 1];
    items.push({ time: last.arrival, station: last.toName, note: "przyjazd" });
    return timelineHtml(items);
}

function timelineHtml(items) {
    return '<ol class="timeline">' + items.map(function (it) {
        if (it.stop) {
            const name = it.place ? it.place.name : it.placeName;
            const walk = it.place ? "<br>" + esc(it.place.walkMeters) + " m pieszo, ok. " + esc(it.place.walkMinutes) + " min w jedną stronę" : "";
            return '<li class="t-stop"><div class="stop-box"><strong>Masz ' + duration(it.minutes) + "</strong>" +
                "na zwiedzanie: " + esc(name) + walk + "</div></li>";
        }
        return "<li>" + '<span class="t-time">' + esc(it.time) + '</span> <span class="t-station">' + esc(it.station) + "</span>" +
            (it.next ? '<span class="t-next">NASTĘPNY POCIĄG</span>' : "") +
            '<span class="t-note">' + esc(it.note) + "</span></li>";
    }).join("") + "</ol>";
}

function flowTotal() {
    return flow.stop ? flow.stop.totalPrice : flow.connection.price;
}

// ------------------------------------------------------------------ V5 Your day

function viewDay() {
    if (!flow.connection) { location.hash = "#/"; return; }
    frame({ title: "Twój dzień", step: 3, back: flow.connection.stopPossible ? "#/po-drodze" : "#/polaczenia" });
    show(selectedStrip() +
        "<h1>Twój dzień</h1>" +
        '<p class="lead">' + esc(relativeDay(flow.search.date)) + "</p>" +
        timelineFromFlow() +
        '<p class="total"><span>Razem' + (flow.search.senior ? " (z ulgą 60+)" : "") + ":</span><strong>" + money(flowTotal()) + "</strong></p>" +
        '<a class="btn" href="#/pasazer">Dalej</a>' +
        (flow.connection.stopPossible ? '<a class="btn btn-secondary" href="#/po-drodze">' + (flow.stop ? "Zmień przystanek" : "Jednak chcę coś zobaczyć po drodze") + "</a>" : ""));
}

// ------------------------------------------------------------------ V6 Passenger (max. 3 fields)

function viewPassenger(serverError) {
    if (!flow.connection) { location.hash = "#/"; return; }
    frame({ title: "Kto jedzie?", step: 4, back: "#/twoj-dzien" });
    const p = flow.passenger || { bookingFor: "SELF", name: "", contact: "" };
    show(selectedStrip() +
        "<h1>Kto jedzie?</h1>" +
        '<form id="passenger-form" novalidate>' +
        '<fieldset class="choice-group"><legend>Rezerwuję dla</legend>' +
        '<label class="check"><input type="radio" name="for" value="SELF"' + (p.bookingFor !== "OTHER" ? " checked" : "") + "><span>siebie</span></label>" +
        '<label class="check"><input type="radio" name="for" value="OTHER"' + (p.bookingFor === "OTHER" ? " checked" : "") + "><span>kogoś innego (np. mamy lub taty)</span></label>" +
        "</fieldset>" +
        '<div class="field"><label for="passenger-name" id="name-label"></label>' +
        '<span class="hint" id="name-hint">Potrzebne na bilecie.</span>' +
        '<input type="text" id="passenger-name" class="text-input" autocomplete="name" value="' + esc(p.name) + '" aria-describedby="name-hint passenger-name-error">' +
        '<p id="passenger-name-error" class="field-error" role="alert"></p></div>' +
        '<div class="field"><label for="contact">Telefon lub e-mail rodziny <span class="hint" style="display:inline">(nieobowiązkowe)</span></label>' +
        '<span class="hint" id="contact-hint">Tylko po to, żeby łatwiej wysłać plan podróży. Możesz zostawić puste.</span>' +
        '<input type="text" id="contact" class="text-input" autocomplete="off" value="' + esc(p.contact) + '" aria-describedby="contact-hint contact-error">' +
        '<p id="contact-error" class="field-error" role="alert"></p></div>' +
        '<button type="submit" class="btn">Dalej</button>' +
        "</form>");

    const nameInput = document.getElementById("passenger-name");
    const nameError = document.getElementById("passenger-name-error");
    const label = document.getElementById("name-label");
    const radios = app.querySelectorAll('input[name="for"]');

    function updateLabel() {
        const other = app.querySelector('input[name="for"]:checked').value === "OTHER";
        label.textContent = other ? "Imię i nazwisko osoby, która jedzie" : "Twoje imię i nazwisko";
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
            fieldError(nameInput, nameError, "Wpisz imię i nazwisko, żebyśmy mogli przygotować bilet.");
            nameInput.focus();
            return;
        }
        if (name.length < 2) {
            fieldError(nameInput, nameError, "Imię i nazwisko jest za krótkie.");
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
    frame({ title: "Sprawdź przed rezerwacją", step: 5, back: "#/pasazer" });
    const c = flow.connection;
    const o = flow.stop;
    const p = flow.passenger;
    const route = o ? c.fromName + " → " + o.stationName + " → " + c.toName : c.fromName + " → " + c.toName;
    show(selectedStrip() +
        "<h1>Sprawdź przed rezerwacją</h1>" +
        '<div class="card"><dl class="detail-list">' +
        "<dt>Pasażer</dt><dd>" + esc(p.name.trim()) + "</dd>" +
        "<dt>Rezerwuję dla</dt><dd>" + (p.bookingFor === "OTHER" ? "kogoś innego" : "siebie") + "</dd>" +
        "<dt>Kiedy</dt><dd>" + esc(relativeDay(flow.search.date)) + "</dd>" +
        "<dt>Trasa</dt><dd>" + esc(route) + "</dd>" +
        "<dt>Przystanek</dt><dd>" + (o ? esc(o.place.name) + ", " + duration(o.minutesAvailable) : "bez przystanku") + "</dd>" +
        "<dt>Odjazd</dt><dd>" + esc(c.departure) + ", peron " + esc(c.departurePlatform) + "</dd>" +
        "<dt>Przyjazd</dt><dd>" + esc(o ? o.finalArrival : c.arrival) + "</dd>" +
        "<dt>Cena</dt><dd><strong>" + money(flowTotal()) + "</strong>" + (flow.search.senior ? " (ulga 60+)" : "") + "</dd>" +
        (p.contact && p.contact.trim() ? "<dt>Kontakt</dt><dd>" + esc(p.contact.trim()) + "</dd>" : "") +
        "</dl>" +
        '<p class="meta" style="margin:0">Możesz odwołać podróż lub usunąć przystanek bezpłatnie, aż do dnia wyjazdu. To wersja demonstracyjna – nic nie płacisz.</p></div>' +
        '<div id="booking-error"></div>' +
        '<button type="button" id="book" class="btn">Rezerwuję</button>' +
        '<a class="btn btn-secondary" href="#/pasazer">Wróć i popraw</a>');

    const bookButton = document.getElementById("book");
    bookButton.addEventListener("click", async function () {
        bookButton.disabled = true;
        bookButton.textContent = "Rezerwuję…";
        try {
            const r = await api("/reservations", {
                method: "POST",
                body: {
                    runId: c.runId, from: flow.search.from, to: flow.search.to, date: flow.search.date,
                    senior: flow.search.senior, placeId: o ? o.place.id : null, nextRunId: o ? o.nextRunId : null,
                    passengerName: p.name, bookingFor: p.bookingFor, contact: p.contact
                }
            });
            rememberCode(r.code);
            resetFlow(true);
            location.hash = "#/gotowe/" + encodeURIComponent(r.code);
        } catch (e) {
            if (e.field === "passengerName" || e.field === "contact") {
                viewPassenger(e);
                return;
            }
            document.getElementById("booking-error").innerHTML = errorBox(e.message +
                (e.status === 409 ? " Wróć do listy połączeń i wybierz inne." : ""));
            bookButton.disabled = false;
            bookButton.textContent = "Rezerwuję";
            if (e.status === 409) {
                flow.stops = null;
                saveFlow();
            }
        }
    });
}

// ------------------------------------------------------------------ share and print

async function shareTrip(r, statusEl) {
    const url = location.origin + location.pathname + "#/podroz/" + encodeURIComponent(r.code);
    const text = "Plan podróży Seatway " + r.code + ": " + r.fromName + " → " + r.toName + ", " + longDate(r.date) +
        ", odjazd " + r.legs[0].departure + ".";
    if (navigator.share) {
        try {
            await navigator.share({ title: "Plan podróży " + r.code, text: text, url: url });
            statusEl.innerHTML = '<p class="alert alert-ok" role="status">Plan podróży został udostępniony.</p>';
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
            ? "mailto:" + encodeURIComponent(contact) + "?subject=" + encodeURIComponent("Plan podróży " + r.code) + "&body=" + encodeURIComponent(text + "\n" + url)
            : "sms:" + digits + "?body=" + encodeURIComponent(text + " " + url);
        statusEl.innerHTML = '<div class="alert alert-ok" role="status">Wyślij plan do: <strong>' + esc(contact) + "</strong>" +
            '<a class="btn" style="margin:.6rem 0 0" href="' + esc(href) + '">' + (isMail ? "Otwórz e-mail" : "Otwórz SMS") + "</a>" +
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
        (copied ? "Link skopiowany. Wklej go w SMS-ie lub w wiadomości do rodziny." : "Wyślij rodzinie ten link (SMS, e-mail lub komunikator):") +
        '<p class="share-link" style="margin:.5rem 0 0">' + esc(url) + "</p></div>";
}

// ------------------------------------------------------------------ V8 Booked (the stamped ticket)

async function viewBooked(code) {
    frame({ title: "Zarezerwowane" });
    loading();
    let r;
    try {
        r = await api("/reservations/" + encodeURIComponent(code));
    } catch (e) {
        show("<h1>Twoja podróż</h1>" + errorBox(e.message) + '<a class="btn" href="#/moje">Moje podróże</a>');
        return;
    }
    show('<h1 class="print-only">Plan podróży Seatway</h1>' +
        '<div class="stamp" role="status"><p class="stamp-title">ZAREZERWOWANE ✓</p>' +
        '<p class="stamp-code">Numer: <strong>' + esc(r.code) + "</strong></p></div>" +
        '<h1 class="no-print">Gotowe</h1>' +
        '<p class="lead">' + esc(r.passengerName) + " · " + esc(longDate(r.date)) + "</p>" +
        timelineFromLegs(r) +
        '<p class="total"><span>Razem' + (r.senior ? " (ulga 60+)" : "") + ":</span><strong>" + money(r.totalPrice) + "</strong></p>" +
        '<p class="demo-note"><strong>Wersja demonstracyjna:</strong> bilet nie został naprawdę kupiony.</p>' +
        '<div id="share-status"></div>' +
        '<button type="button" id="print" class="btn btn-secondary">' + icon("print") + "Wydrukuj plan podróży</button>" +
        '<button type="button" id="share" class="btn btn-secondary">' + icon("share") + "Wyślij rodzinie</button>" +
        '<a class="btn" href="#/moje">Moje podróże</a>');
    document.getElementById("print").addEventListener("click", function () { window.print(); });
    document.getElementById("share").addEventListener("click", function () { shareTrip(r, document.getElementById("share-status")); });
}

// ------------------------------------------------------------------ V9 My trips (the ticket wallet)

function statusChip(r) {
    if (r.status === "CANCELLED") return '<span class="status-chip cancelled">Odwołane</span>';
    if (!r.canCancel) return '<span class="status-chip past">Podróż minęła</span>';
    return '<span class="status-chip booked">Zarezerwowane ✓</span>';
}

async function viewMyTrips(message) {
    frame({ title: "Moje podróże", back: "#/" });
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
            '<p class="meta" style="margin-top:0">' + esc(longDate(r.date)) + " · nr " + esc(r.code) + "</p>" +
            '<h2 style="margin-top:0">' + esc(r.fromName) + " → " + esc(r.toName) + "</h2>" +
            '<p class="meta">' + (r.placeName ? "z przystankiem: " + esc(r.placeName) : "bez przystanku") + " · " + esc(r.passengerName) + "</p>" +
            '<div class="row" style="justify-content:space-between;align-items:center">' + statusChip(r) +
            '<a class="btn btn-secondary btn-inline" href="#/podroz/' + encodeURIComponent(r.code) + '" aria-label="Otwórz podróż ' + esc(r.code) + '">Otwórz</a></div>' +
            "</article>";
    }).join("");

    show((message ? '<p class="alert alert-ok" role="status">' + esc(message) + "</p>" : "") +
        "<h1>Moje podróże</h1>" +
        (problem ? errorBox(problem) : "") +
        (list.length ? cards : '<p class="alert alert-info">Nie masz jeszcze żadnych podróży w tej przeglądarce.</p>') +
        '<p class="meta">Podróże zostają tutaj także po zamknięciu strony.</p>' +
        '<a class="btn" href="#/">Nowa podróż</a>' +
        "<h2>Masz numer podróży?</h2>" +
        '<form id="code-form" novalidate><div class="field"><label for="code">Numer podróży</label>' +
        '<span class="hint" id="code-hint">Np. od syna lub córki, w formacie SW-1234.</span>' +
        '<input type="text" id="code" class="text-input" autocomplete="off" aria-describedby="code-hint code-error">' +
        '<p id="code-error" class="field-error" role="alert"></p></div>' +
        '<button type="submit" class="btn btn-secondary">Pokaż podróż</button></form>');

    document.getElementById("code-form").addEventListener("submit", async function (event) {
        event.preventDefault();
        const input = document.getElementById("code");
        const err = document.getElementById("code-error");
        let value = input.value.trim().toUpperCase().replace(/\s+/g, "");
        if (/^\d{4}$/.test(value)) value = "SW-" + value;
        if (!/^SW-\d{4}$/.test(value)) {
            fieldError(input, err, "Wpisz numer w formacie SW-1234.");
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
    frame({ title: "Twoja podróż", back: "#/moje" });
    loading();
    let r;
    try {
        r = await api("/reservations/" + encodeURIComponent(code));
    } catch (e) {
        show("<h1>Twoja podróż</h1>" + errorBox(e.message) + '<a class="btn" href="#/moje">Moje podróże</a>');
        return;
    }
    const saved = myCodes().indexOf(r.code) >= 0;
    const firstLeg = r.legs[0];
    show((message ? '<p class="alert alert-ok" role="status">' + esc(message) + "</p>" : "") +
        '<h1 class="print-only">Plan podróży Seatway</h1>' +
        (r.status === "CONFIRMED" ? '<div class="stamp"><p class="stamp-title">ZAREZERWOWANE ✓</p><p class="stamp-code">Numer: <strong>' + esc(r.code) + "</strong></p></div>"
            : '<p>' + statusChip(r) + " Numer: <strong>" + esc(r.code) + "</strong></p>") +
        '<h1 class="no-print">' + esc(longDate(r.date)) + "</h1>" +
        '<p class="lead">' + esc(r.fromName) + " → " + esc(r.toName) + " · " + esc(r.passengerName) + "</p>" +
        timelineFromLegs(r) +
        '<p class="total"><span>Razem' + (r.senior ? " (ulga 60+)" : "") + ":</span><strong>" + money(r.totalPrice) + "</strong></p>" +
        (!saved ? '<button type="button" id="save" class="btn btn-secondary">Zapisz w moich podróżach</button>' : "") +
        (r.canCancel ? '<section class="card no-print" aria-labelledby="change-title"><h2 id="change-title" style="margin-top:0">Zmiana planów</h2>' +
            '<p class="meta">Możesz to zrobić bezpłatnie aż do dnia wyjazdu.</p>' +
            '<div id="change-error"></div>' +
            (r.canRemoveStop ? '<button type="button" id="remove-stop" class="btn btn-secondary">Usuń tylko przystanek: ' + esc(r.placeName) + "</button>" : "") +
            '<button type="button" id="cancel" class="btn btn-danger" style="margin-bottom:0">Odwołaj całą podróż</button></section>' : "") +
        (r.status === "CONFIRMED"
            ? '<div id="share-status"></div>' +
              '<button type="button" id="print" class="btn btn-secondary">' + icon("print") + "Wydrukuj plan podróży</button>" +
              '<button type="button" id="share" class="btn btn-secondary">' + icon("share") + "Wyślij rodzinie</button>"
            : '<p class="alert alert-info">Ta podróż jest odwołana. Nie trzeba nic drukować ani wysyłać.</p>' +
              '<a class="btn" href="#/">Zaplanuj nową podróż</a>'));

    const printButton = document.getElementById("print");
    if (printButton) {
        printButton.addEventListener("click", function () { window.print(); });
        document.getElementById("share").addEventListener("click", function () { shareTrip(r, document.getElementById("share-status")); });
    }
    const saveButton = document.getElementById("save");
    if (saveButton) {
        saveButton.addEventListener("click", function () {
            rememberCode(r.code);
            viewTrip(r.code, "Zapisano w Twoich podróżach.");
        });
    }
    const removeButton = document.getElementById("remove-stop");
    if (removeButton) {
        removeButton.addEventListener("click", async function () {
            const ok = await confirmDialog("Usunąć przystanek?",
                "Nie zatrzymasz się przy: " + r.placeName + ". Pojedziesz prosto pociągiem " + firstLeg.runName + " o " + firstLeg.departure + ". Podróż zostaje zarezerwowana.",
                "Tak, usuń przystanek", "Nie, zostaw", "btn");
            if (!ok) return;
            try {
                await api("/reservations/" + encodeURIComponent(r.code) + "/remove-stop", { method: "POST" });
                viewTrip(r.code, "Przystanek został usunięty. Podróż jest nadal zarezerwowana.");
            } catch (e) {
                document.getElementById("change-error").innerHTML = errorBox(e.message);
            }
        });
    }
    const cancelButton = document.getElementById("cancel");
    if (cancelButton) {
        cancelButton.addEventListener("click", async function () {
            const ok = await confirmDialog("Czy na pewno odwołać całą podróż?",
                "Nic nie zapłacisz. Miejsce zwolni się dla innych. Tego nie można cofnąć.",
                "Tak, odwołaj", "Nie, zostaw");
            if (!ok) return;
            try {
                await api("/reservations/" + encodeURIComponent(r.code) + "/cancel", { method: "POST" });
                viewTrip(r.code, "Podróż została odwołana.");
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
    document.getElementById("dialog-root").innerHTML = "";
    switch (parts[0]) {
        case undefined: return viewStart();
        case "polaczenia": return viewConnections();
        case "po-drodze": return viewStops();
        case "miejsce": return viewPlace(parts[1]);
        case "twoj-dzien": return viewDay();
        case "pasazer": return viewPassenger();
        case "sprawdz": return viewCheck();
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
    textButton.querySelector(".visually-hidden").textContent = big ? "Zwykły tekst" : "Większy tekst";
    textButton.title = big ? "Zwykły tekst" : "Większy tekst";
}

textButton.addEventListener("click", function () {
    const big = !document.documentElement.classList.contains("big-text");
    writeJson(localStorage, TEXT_KEY, big);
    applyTextSize(big);
});

applyTextSize(readJson(localStorage, TEXT_KEY, false) === true);
window.addEventListener("hashchange", route);
route();
