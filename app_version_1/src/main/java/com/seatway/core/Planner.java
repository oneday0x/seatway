package com.seatway.core;

import com.seatway.core.Api.ConnectionDto;
import com.seatway.core.Api.LegDto;
import com.seatway.core.Api.PlaceDto;
import com.seatway.core.Api.ReservationRequest;
import com.seatway.core.Api.StopOptionDto;
import com.seatway.core.Timetable.Place;
import com.seatway.core.Timetable.Run;
import com.seatway.core.Timetable.Station;
import com.seatway.core.Timetable.StopTime;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The booking and discovery rules of Seatway.
 *
 * <ul>
 *   <li>Connections: every train that calls at the origin and later at the destination.</li>
 *   <li>Discovery stops (QFD H1): places at stations between origin and destination.</li>
 *   <li>Safe-time buffer (QFD H2): a place is only suggested if the visit, the walk there and back
 *       and a 30-minute margin all fit before a later train continues to the destination.</li>
 *   <li>Senior price: 30% off for travellers aged 60+ (sample rule).</li>
 * </ul>
 */
public class Planner {

    public static final int SAFETY_MARGIN_MINUTES = 30;
    public static final int MAX_SUGGESTIONS = 3;
    public static final BigDecimal SENIOR_FACTOR = new BigDecimal("0.70");
    private static final DateTimeFormatter HM = DateTimeFormatter.ofPattern("HH:mm");

    /** Tells the planner how many seats are already booked on a run on a given day. */
    public interface SeatCounter {
        int used(long runId, LocalDate date);
    }

    /** A rule was broken; the message is shown to the traveller as it is. */
    public static class PlanException extends RuntimeException {
        private final String field;
        private final int status;

        public PlanException(String message, String field, int status) {
            super(message);
            this.field = field;
            this.status = status;
        }

        public String field() {
            return field;
        }

        public int status() {
            return status;
        }
    }

    /** A checked, priced reservation ready to be saved. */
    public record Plan(LocalDate date, boolean senior, String fromId, String toId,
                       String passengerName, String bookingFor, String contact,
                       Place place, Integer minutesAtStop, List<LegDto> legs, BigDecimal total) {
    }

    private final Map<String, Station> stations;
    private final List<Run> runs;
    private final Map<Long, Place> places;

    public Planner(List<Station> stations, List<Run> runs, List<Place> places) {
        this.stations = stations.stream().collect(Collectors.toMap(Station::id, Function.identity()));
        this.runs = List.copyOf(runs);
        this.places = places.stream().collect(Collectors.toMap(Place::id, Function.identity()));
    }

    // ------------------------------------------------------------------ queries

    public List<Station> stations() {
        return stations.values().stream().sorted(Comparator.comparing(Station::name)).toList();
    }

    public String stationName(String id) {
        Station s = stations.get(id);
        return s == null ? id : s.name();
    }

    public List<ConnectionDto> connections(String from, String to, String dateText, boolean senior,
                                           SeatCounter seats, LocalDateTime now) {
        checkStations(from, to);
        LocalDate date = parseDate(dateText, now);
        List<ConnectionDto> result = new ArrayList<>();
        for (Run run : runs) {
            if (!run.serves(from, to)) {
                continue;
            }
            StopTime a = run.stopAt(from);
            StopTime b = run.stopAt(to);
            if (date.equals(now.toLocalDate()) && a.departure().isBefore(now.toLocalTime().plusMinutes(5))) {
                continue; // already left today
            }
            int left = run.capacity() - seats.used(run.id(), date);
            List<String> via = run.stops().stream()
                    .filter(s -> s.seq() > a.seq() && s.seq() < b.seq())
                    .map(s -> stationName(s.stationId()))
                    .toList();
            boolean stopPossible = !stopOptions(run, from, to, date, senior, seats).isEmpty();
            result.add(new ConnectionDto(run.id(), run.name(), from, stationName(from), to, stationName(to),
                    a.departure().format(HM), b.arrival().format(HM), minutes(a.departure(), b.arrival()),
                    a.platform(), price(run, from, to, senior), senior, Math.max(left, 0), stopPossible, via));
        }
        result.sort(Comparator.comparing(ConnectionDto::departure));
        return result;
    }

    public List<StopOptionDto> stops(long runId, String from, String to, String dateText, boolean senior,
                                     SeatCounter seats, LocalDateTime now) {
        checkStations(from, to);
        LocalDate date = parseDate(dateText, now);
        Run run = run(runId);
        if (!run.serves(from, to)) {
            throw new PlanException("To połączenie nie jedzie na tej trasie.", "runId", 400);
        }
        return stopOptions(run, from, to, date, senior, seats);
    }

    public PlaceDto place(long id) {
        Place p = places.get(id);
        if (p == null) {
            throw new PlanException("Nie znaleziono tego miejsca.", "placeId", 404);
        }
        return toDto(p);
    }

    // ------------------------------------------------------------------ reservation

    /** Checks every rule again on the server; prices and times from the browser are never trusted. */
    public Plan plan(ReservationRequest r, SeatCounter seats, LocalDateTime now) {
        if (r == null) {
            throw new PlanException("Brak danych rezerwacji.", null, 400);
        }
        String name = r.passengerName() == null ? "" : r.passengerName().trim().replaceAll("\\s+", " ");
        if (name.isEmpty()) {
            throw new PlanException("Wpisz imię i nazwisko pasażera, żebyśmy mogli przygotować bilet.",
                    "passengerName", 400);
        }
        if (name.length() < 2 || name.length() > 80) {
            throw new PlanException("Imię i nazwisko powinno mieć od 2 do 80 znaków.", "passengerName", 400);
        }
        String bookingFor = "OTHER".equals(r.bookingFor()) ? "OTHER" : "SELF";
        String contact = r.contact() == null ? null : r.contact().trim();
        if (contact != null && contact.isEmpty()) {
            contact = null;
        }
        if (contact != null && contact.length() > 100) {
            throw new PlanException("Kontakt jest za długi (najwyżej 100 znaków).", "contact", 400);
        }
        if (r.runId() == null) {
            throw new PlanException("Wybierz połączenie.", "runId", 400);
        }
        checkStations(r.from(), r.to());
        LocalDate date = parseDate(r.date(), now);
        boolean senior = Boolean.TRUE.equals(r.senior());

        Run first = run(r.runId());
        if (!first.serves(r.from(), r.to())) {
            throw new PlanException("To połączenie nie jedzie na tej trasie.", "runId", 400);
        }
        if (date.equals(now.toLocalDate()) && first.stopAt(r.from()).departure().isBefore(now.toLocalTime())) {
            throw new PlanException("Ten pociąg już odjechał. Wybierz późniejsze połączenie.", "runId", 409);
        }

        List<LegDto> legs = new ArrayList<>();
        Place place = null;
        Integer minutesAtStop = null;

        if (r.placeId() == null) {
            requireSeat(first, date, seats);
            legs.add(leg(1, first, r.from(), r.to(), senior));
        } else {
            place = places.get(r.placeId());
            if (place == null) {
                throw new PlanException("Nie znaleziono tego miejsca.", "placeId", 404);
            }
            String stop = place.stationId();
            StopTime atStop = first.stopAt(stop);
            if (atStop == null || atStop.seq() <= first.stopAt(r.from()).seq()
                    || atStop.seq() >= first.stopAt(r.to()).seq()) {
                throw new PlanException("To miejsce nie leży na trasie tego pociągu.", "placeId", 400);
            }
            if (r.nextRunId() == null) {
                throw new PlanException("Brakuje pociągu, którym pojedziesz dalej.", "nextRunId", 400);
            }
            Run next = run(r.nextRunId());
            if (!next.serves(stop, r.to())) {
                throw new PlanException("Ten pociąg nie jedzie dalej z tej stacji.", "nextRunId", 400);
            }
            LocalTime arrive = atStop.arrival();
            LocalTime leave = next.stopAt(stop).departure();
            int available = minutes(arrive, leave);
            if (available < requiredMinutes(place)) {
                throw new PlanException("Za mało czasu na zwiedzanie i bezpieczny powrót na pociąg.",
                        "nextRunId", 400);
            }
            requireSeat(first, date, seats);
            requireSeat(next, date, seats);
            legs.add(leg(1, first, r.from(), stop, senior));
            legs.add(leg(2, next, stop, r.to(), senior));
            minutesAtStop = available;
        }
        BigDecimal total = legs.stream().map(LegDto::price).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new Plan(date, senior, r.from(), r.to(), name, bookingFor, contact, place, minutesAtStop,
                List.copyOf(legs), money(total));
    }

    /** Recomputes a trip without its stop: the traveller simply stays on the first train. */
    public Plan withoutStop(Plan original, long firstRunId) {
        LegDto leg = directLeg(firstRunId, original.fromId(), original.toId(), original.senior());
        return new Plan(original.date(), original.senior(), original.fromId(), original.toId(),
                original.passengerName(), original.bookingFor(), original.contact(), null, null,
                List.of(leg), leg.price());
    }

    /** The single leg used when a stop is removed from a stored reservation. */
    public LegDto directLeg(long runId, String from, String to, boolean senior) {
        Run run = run(runId);
        if (!run.serves(from, to)) {
            throw new PlanException("To połączenie nie jedzie na tej trasie.", "runId", 400);
        }
        return leg(1, run, from, to, senior);
    }

    // ------------------------------------------------------------------ rules

    /** Visit + walk there and back + safety margin (QFD H2). */
    public static int requiredMinutes(Place p) {
        return p.visitMinutes() + 2 * p.walkMinutes() + SAFETY_MARGIN_MINUTES;
    }

    public BigDecimal price(Run run, String from, String to, boolean senior) {
        BigDecimal full = run.stopAt(to).priceFromStart().subtract(run.stopAt(from).priceFromStart());
        return money(senior ? full.multiply(SENIOR_FACTOR) : full);
    }

    private List<StopOptionDto> stopOptions(Run first, String from, String to, LocalDate date, boolean senior,
                                            SeatCounter seats) {
        int fromSeq = first.stopAt(from).seq();
        int toSeq = first.stopAt(to).seq();
        List<StopOptionDto> options = new ArrayList<>();
        for (StopTime s : first.stops()) {
            if (s.seq() <= fromSeq || s.seq() >= toSeq || s.arrival() == null) {
                continue;
            }
            for (Place p : places.values()) {
                if (!p.stationId().equals(s.stationId())) {
                    continue;
                }
                LocalTime earliest = s.arrival().plusMinutes(requiredMinutes(p));
                Run next = null;
                for (Run r : runs) {
                    if (r.id() == first.id() || !r.serves(s.stationId(), to)) {
                        continue;
                    }
                    LocalTime dep = r.stopAt(s.stationId()).departure();
                    if (dep.isBefore(earliest)) {
                        continue;
                    }
                    if (r.capacity() - seats.used(r.id(), date) <= 0) {
                        continue;
                    }
                    if (next == null || dep.isBefore(next.stopAt(s.stationId()).departure())) {
                        next = r;
                    }
                }
                if (next == null) {
                    continue;
                }
                StopTime nextAtStop = next.stopAt(s.stationId());
                BigDecimal total = price(first, from, s.stationId(), senior)
                        .add(price(next, s.stationId(), to, senior));
                options.add(new StopOptionDto(toDto(p), stationName(s.stationId()),
                        s.arrival().format(HM), nextAtStop.departure().format(HM), nextAtStop.platform(),
                        next.id(), next.name(), minutes(s.arrival(), nextAtStop.departure()),
                        next.stopAt(to).arrival().format(HM), money(total)));
            }
        }
        // Prefer the stops with the least waiting (time available minus time needed),
        // then show the chosen ones in the order the train reaches them.
        options.sort(Comparator.comparingInt((StopOptionDto o) -> o.minutesAvailable() - requiredMinutes(places.get(o.place().id())))
                .thenComparing(o -> o.place().name()));
        List<StopOptionDto> best = new ArrayList<>(options.subList(0, Math.min(MAX_SUGGESTIONS, options.size())));
        best.sort(Comparator.comparingInt((StopOptionDto o) -> first.stopAt(o.place().stationId()).seq())
                .thenComparing(o -> o.place().name()));
        return List.copyOf(best);
    }

    // ------------------------------------------------------------------ helpers

    private void requireSeat(Run run, LocalDate date, SeatCounter seats) {
        if (seats.used(run.id(), date) >= run.capacity()) {
            throw new PlanException("To połączenie jest już pełne. Wybierz inne połączenie.", "runId", 409);
        }
    }

    private LegDto leg(int seq, Run run, String from, String to, boolean senior) {
        StopTime a = run.stopAt(from);
        StopTime b = run.stopAt(to);
        return new LegDto(seq, run.id(), run.name(), from, stationName(from), to, stationName(to),
                a.departure().format(HM), b.arrival().format(HM), a.platform(), price(run, from, to, senior));
    }

    private Run run(long id) {
        for (Run r : runs) {
            if (r.id() == id) {
                return r;
            }
        }
        throw new PlanException("Nie znaleziono tego połączenia.", "runId", 404);
    }

    private void checkStations(String from, String to) {
        if (from == null || !stations.containsKey(from)) {
            throw new PlanException("Wybierz stację, z której jedziesz.", "from", 400);
        }
        if (to == null || !stations.containsKey(to)) {
            throw new PlanException("Wybierz stację, do której jedziesz.", "to", 400);
        }
        if (from.equals(to)) {
            throw new PlanException("Stacja początkowa i docelowa muszą być różne.", "to", 400);
        }
    }

    private static LocalDate parseDate(String text, LocalDateTime now) {
        LocalDate date;
        try {
            date = LocalDate.parse(text);
        } catch (DateTimeParseException | NullPointerException e) {
            throw new PlanException("Wybierz datę podróży.", "date", 400);
        }
        if (date.isBefore(now.toLocalDate())) {
            throw new PlanException("Ta data już minęła. Wybierz dzisiejszą lub późniejszą datę.", "date", 400);
        }
        if (date.isAfter(now.toLocalDate().plusDays(60))) {
            throw new PlanException("Rezerwacje są możliwe najwyżej 60 dni naprzód.", "date", 400);
        }
        return date;
    }

    private PlaceDto toDto(Place p) {
        return new PlaceDto(p.id(), p.stationId(), stationName(p.stationId()), p.name(), p.shortDescription(),
                p.longDescription(), p.image(), p.visitMinutes(), p.walkMeters(), p.walkMinutes(),
                p.stepFree(), p.toilet(), p.benches(), p.openingHours(), p.entryPrice(),
                p.lastChecked() == null ? null : p.lastChecked().toString());
    }

    static int minutes(LocalTime a, LocalTime b) {
        return (int) Duration.between(a, b).toMinutes();
    }

    static BigDecimal money(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP);
    }
}
