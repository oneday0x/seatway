package com.seatway.core;

import com.seatway.core.Timetable.Place;
import com.seatway.core.Timetable.Run;
import com.seatway.core.Timetable.Station;
import com.seatway.core.Timetable.StopTime;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Sample timetable and places for the demo (the project has no access to real operator data).
 * Two lines are modelled in both directions:
 * Wrocław – Brzeg – Opole – Gliwice – Katowice – Kraków, and Jelenia Góra – Wałbrzych – Jaworzyna Śląska – Wrocław.
 * Times, prices, opening hours and entry prices are invented examples and are labelled as such in the interface.
 */
public final class SampleData {

    private SampleData() {
    }

    public static List<Station> stations() {
        return List.of(
                new Station("WRO", "Wrocław Główny", "Wrocław"),
                new Station("BRZ", "Brzeg", "Brzeg"),
                new Station("OPO", "Opole Główne", "Opole"),
                new Station("GLI", "Gliwice", "Gliwice"),
                new Station("KAT", "Katowice", "Katowice"),
                new Station("KRK", "Kraków Główny", "Kraków"),
                new Station("JGO", "Jelenia Góra", "Jelenia Góra"),
                new Station("WAL", "Wałbrzych Główny", "Wałbrzych"),
                new Station("JAW", "Jaworzyna Śląska", "Jaworzyna Śląska"));
    }

    /** A line pattern: station, arrival offset, departure offset (minutes from the first departure), full fare. */
    private record Pattern(String station, Integer arr, Integer dep, int price) {
    }

    public static List<Run> runs() {
        List<Run> runs = new ArrayList<>();
        List<Pattern> aForward = List.of(
                new Pattern("WRO", null, 0, 0), new Pattern("BRZ", 31, 32, 14), new Pattern("OPO", 55, 58, 24),
                new Pattern("GLI", 112, 114, 40), new Pattern("KAT", 136, 140, 47), new Pattern("KRK", 197, null, 65));
        List<Pattern> aBack = List.of(
                new Pattern("KRK", null, 0, 0), new Pattern("KAT", 57, 61, 18), new Pattern("GLI", 83, 85, 25),
                new Pattern("OPO", 139, 142, 41), new Pattern("BRZ", 165, 166, 51), new Pattern("WRO", 197, null, 65));
        List<Pattern> bForward = List.of(
                new Pattern("JGO", null, 0, 0), new Pattern("WAL", 52, 54, 12), new Pattern("JAW", 78, 79, 18),
                new Pattern("WRO", 122, null, 29));
        List<Pattern> bBack = List.of(
                new Pattern("WRO", null, 0, 0), new Pattern("JAW", 43, 44, 11), new Pattern("WAL", 68, 70, 17),
                new Pattern("JGO", 122, null, 29));

        long id = 1;
        id = addLine(runs, id, "IC 61", aForward, 80, "06:10", "08:05", "10:15", "12:40", "15:05", "17:20", "19:30");
        id = addLine(runs, id, "IC 62", aBack, 80, "05:50", "08:20", "10:45", "13:10", "15:35", "18:00");
        id = addLine(runs, id, "RE 64", bForward, 60, "05:40", "07:30", "09:45", "12:10", "14:35", "16:50", "19:05");
        addLine(runs, id, "RE 65", bBack, 60, "06:30", "08:40", "11:00", "13:25", "15:50", "18:15");
        return runs;
    }

    private static long addLine(List<Run> runs, long firstId, String prefix, List<Pattern> pattern, int capacity,
                                String... departures) {
        long id = firstId;
        for (int i = 0; i < departures.length; i++) {
            LocalTime start = LocalTime.parse(departures[i]);
            List<StopTime> stops = new ArrayList<>();
            for (int s = 0; s < pattern.size(); s++) {
                Pattern p = pattern.get(s);
                stops.add(new StopTime(p.station(), s + 1,
                        p.arr() == null ? null : start.plusMinutes(p.arr()),
                        p.dep() == null ? null : start.plusMinutes(p.dep()),
                        String.valueOf(1 + (i + s) % 4), BigDecimal.valueOf(p.price())));
            }
            runs.add(new Run(id, prefix + String.format("%02d", i * 2 + 1), capacity, List.copyOf(stops)));
            id++;
        }
        return id;
    }

    public static List<Place> places() {
        LocalDate checked = LocalDate.of(2026, 11, 2);
        return List.of(
                new Place(1, "OPO", "Wieża Piastowska",
                        "Najstarszy zabytek Opola, z widokiem na całe miasto.",
                        "Gotycka wieża dawnego zamku Piastów na wyspie Pasiece. Z tarasu widokowego widać Odrę i stare "
                                + "miasto. Na górę prowadzą schody, ale u stóp wieży jest park z ławkami nad wodą.",
                        "img/tower.svg", 60, 1100, 15, false, true, true,
                        "wt.–ndz. 10:00–18:00 (przykład)", "ok. 10 zł (przykład)", checked),
                new Place(2, "OPO", "Rynek i Ratusz w Opolu",
                        "Kolorowe kamienice i kawiarnie w samym sercu miasta.",
                        "Rynek otoczony kamienicami, z ratuszem pośrodku. Dużo kawiarni i ławek, płaski teren, "
                                + "dobre miejsce na obiad przed dalszą podróżą.",
                        "img/square.svg", 45, 800, 11, true, true, true,
                        "cały dzień", "bezpłatnie", checked),
                new Place(3, "BRZ", "Zamek Piastów Śląskich w Brzegu",
                        "Renesansowy zamek nazywany śląskim Wawelem.",
                        "Zamek z pięknym dziedzińcem arkadowym i muzeum. Dziedziniec jest płaski, ale do sal "
                                + "muzealnych prowadzą schody. W pobliżu park i kawiarnie.",
                        "img/castle.svg", 75, 1200, 17, false, true, true,
                        "wt.–ndz. 10:00–17:00 (przykład)", "ok. 15 zł (przykład)", checked),
                new Place(4, "GLI", "Rynek w Gliwicach",
                        "Spokojny rynek z ratuszem i fontanną z Neptunem.",
                        "Kameralny rynek ze starymi kamienicami i ratuszem. Płaski teren, ławki przy fontannie, "
                                + "kawiarnie z toaletą.",
                        "img/square.svg", 45, 900, 12, true, true, true,
                        "cały dzień", "bezpłatnie", checked),
                new Place(5, "KAT", "Muzeum Śląskie",
                        "Nowoczesne muzeum w dawnej kopalni, z windą na wieżę widokową.",
                        "Muzeum zbudowane na terenie dawnej kopalni. Wystawy o historii Śląska, winda na wieżę "
                                + "widokową, wszędzie bez schodów. Dużo miejsc do odpoczynku.",
                        "img/museum.svg", 90, 1500, 20, true, true, true,
                        "wt.–ndz. 10:00–20:00 (przykład)", "ok. 20 zł (przykład)", checked),
                new Place(6, "JAW", "Muzeum Przemysłu i Kolejnictwa",
                        "Stare parowozy i wagony tuż obok stacji.",
                        "Kolekcja zabytkowych parowozów i wagonów w dawnej parowozowni, kilka minut pieszo od "
                                + "peronu. Teren płaski, ławki przy torach.",
                        "img/train.svg", 75, 300, 4, true, true, true,
                        "codziennie 10:00–17:00 (przykład)", "ok. 20 zł (przykład)", checked));
    }

    public static Planner planner() {
        return new Planner(stations(), runs(), places());
    }
}
