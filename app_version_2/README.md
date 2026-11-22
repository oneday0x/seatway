# Seatway

Ticket booking web application for older adults (65+) travelling within Poland, with an optional
**stop on the way**: when you book a journey from A to B, Seatway suggests up to three interesting
places along the route, checks that there is enough time to visit them and still catch the next
train, and books every leg in one reservation.

University UX project – Mohamed Eisa and Ahmed Mohamed.

> **Demo only.** The timetable, prices, opening hours and places are sample data. No tickets are sold
> and nothing is paid.

## Features

| View | What it does |
|------|--------------|
| V1 Start – "Dokąd jedziesz?" | From / to stations, date (Dziś / Jutro), senior discount 60+ |
| V2 Connections | Ticket cards with times, duration, price with discount, seats left |
| V3 Stop on the way | Up to 3 postcards; only stops with a safe-time buffer; "Nie, jadę prosto" |
| V4 Place details | Walking distance and time, stairs, toilet, benches, hours, entry, last checked |
| V5 Your day | Railway-line timeline with the time at the stop and the next train |
| V6 Passenger | Book for yourself or someone else, at most 3 fields, inline errors |
| V7 Check before booking | Full summary, cancellation rule, "Rezerwuję" |
| V8 Booked | Stamp "ZAREZERWOWANE ✓", number, print, send to family |
| V9 My trips | Reservations remembered by the browser (no account), open a trip by its code |
| V10 Trip | Details, remove only the stop, cancel the whole trip (with confirmation) |

**Languages:** Polish (default) and English. The **PL | EN** button in the header switches the
whole interface, including server messages and place descriptions; the choice is remembered.
All texts of the interface are in `src/main/resources/static/js/i18n.js`, server messages in
`core/Msg.java`.

Rules checked on the server: capacity (no overbooking), past dates, departed trains, the
safe-time buffer (visit + walk there and back + 30 min margin), senior price (−30%), cancellation
only until the day of travel.

## Technology

* Front end: HTML, CSS, JavaScript (no framework) – `src/main/resources/static`
* Back end: Java 17, Spring Boot 3.3 (Spring Web, Spring Data JPA)
* Database: PostgreSQL (default) or in-memory H2 (`demo` profile)
* Communication: REST API with JSON

## Running the application

You need **Java 17 or newer** and **Maven** (IntelliJ IDEA includes Maven).

### Option 1 – quick demo without PostgreSQL (H2 in memory)

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=demo
```

Open http://localhost:8080. Reservations are lost when the application stops.

In IntelliJ IDEA: open the folder, wait for Maven to load, then run `SeatwayApplication` with
**Active profiles: demo** (Run → Edit Configurations).

### Option 2 – with PostgreSQL

Start PostgreSQL, either with Docker:

```bash
docker compose up -d
```

or in your own PostgreSQL create a database and user:

```sql
CREATE USER seatway WITH PASSWORD 'seatway';
CREATE DATABASE seatway OWNER seatway;
```

Then run:

```bash
mvn spring-boot:run
```

Different connection settings can be given with the environment variables `DB_URL`, `DB_USER` and
`DB_PASSWORD`. Tables are created automatically and the sample timetable is added on the first start.
Reservations are kept between restarts.

### Tests

```bash
mvn test
```

`PlannerTest` checks the booking and discovery rules (connections, senior price, the safe-time
buffer, two-leg reservations, empty name, full train, past date).

## REST API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/stations` | All stations |
| GET | `/api/connections?from=WRO&to=KRK&date=2026-12-01&senior=true` | Trains for a day |
| GET | `/api/connections/{runId}/stops?from=…&to=…&date=…&senior=…` | Possible stops on the way (max. 3) |
| GET | `/api/places/{id}` | Place details |
| POST | `/api/reservations` | Book (JSON body: runId, from, to, date, senior, placeId, nextRunId, passengerName, bookingFor, contact) |
| GET | `/api/reservations?codes=SW-1234,SW-5678` | Reservations remembered by the browser |
| GET | `/api/reservations/{code}` | One reservation |
| POST | `/api/reservations/{code}/remove-stop` | Remove only the stop |
| POST | `/api/reservations/{code}/cancel` | Cancel the whole trip |

Errors are returned as `{ "message": "…", "field": "…" }` with a plain-language Polish message.

## Project structure

```
src/main/java/com/seatway
├── SeatwayApplication.java
├── core/          booking and discovery rules (plain Java, unit-tested), sample data, API records
├── domain/        JPA entities (station, train_run, run_stop, place, reservation, reservation_leg)
├── repository/    Spring Data repositories
├── service/       TimetableService, ReservationService
├── web/           ApiController, ApiErrorHandler
└── config/        DataSeeder (fills an empty database with the sample data)
src/main/resources
├── application.properties        PostgreSQL settings
├── application-demo.properties   H2 settings
└── static/                       index.html, css/style.css, js/app.js, img/
```

## History

The first prototype (single `index.html`, `script.js`, `style.css` with an in-memory list) was
extended into this application. Its accessible validation pattern (message next to the field,
`aria-invalid`, short pulse animation, kept data) is reused on the passenger form.
Version 1.1 includes the corrections from the Class 8 usability evaluation (see the course documents).
Version 2 adds the Polish / English language switch.
