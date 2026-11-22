package com.seatway.core;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * Plain data types for the timetable and the places to visit.
 * They have no framework dependencies, so the planning rules can be tested on their own.
 */
public final class Timetable {

    private Timetable() {
    }

    /** A railway station. */
    public record Station(String id, String name, String city) {
    }

    /**
     * One stop of a train run.
     * arrival is null at the first stop, departure is null at the last stop.
     * priceFromStart is the full (not discounted) fare from the first station of the run.
     */
    public record StopTime(String stationId, int seq, LocalTime arrival, LocalTime departure,
                           String platform, BigDecimal priceFromStart) {
    }

    /** One train that runs every day along a line. Stops are ordered by seq. */
    public record Run(long id, String name, int capacity, List<StopTime> stops) {

        public StopTime stopAt(String stationId) {
            for (StopTime s : stops) {
                if (s.stationId().equals(stationId)) {
                    return s;
                }
            }
            return null;
        }

        /** True if the run calls at "from" and later at "to". */
        public boolean serves(String from, String to) {
            StopTime a = stopAt(from);
            StopTime b = stopAt(to);
            return a != null && b != null && a.seq() < b.seq() && a.departure() != null && b.arrival() != null;
        }
    }

    /** A place worth seeing near a station: the "postcard" in the interface. */
    public record Place(long id, String stationId, String name, String shortDescription, String longDescription,
                        String image, int visitMinutes, int walkMeters, int walkMinutes,
                        boolean stepFree, boolean toilet, boolean benches,
                        String openingHours, String entryPrice, LocalDate lastChecked) {
    }
}
