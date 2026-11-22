package com.seatway.core;

import java.math.BigDecimal;
import java.util.List;

/**
 * JSON shapes exchanged between the browser and the server (REST API).
 * Times are sent as "HH:mm" and dates as "yyyy-MM-dd" so the front end can show them directly.
 */
public final class Api {

    private Api() {
    }

    public record StationDto(String id, String name) {
    }

    /** One ticket card on the "Połączenia" screen (V2). */
    public record ConnectionDto(long runId, String runName,
                                String fromId, String fromName, String toId, String toName,
                                String departure, String arrival, int durationMinutes,
                                String departurePlatform, BigDecimal price, boolean seniorPrice,
                                int seatsLeft, boolean stopPossible, List<String> via) {
    }

    /** One postcard on the "Zobacz coś po drodze?" screen (V3). */
    public record StopOptionDto(PlaceDto place, String stationName,
                                String arriveAtStop, String nextDeparture, String nextPlatform,
                                long nextRunId, String nextRunName,
                                int minutesAvailable, String finalArrival, BigDecimal totalPrice) {
    }

    /** Place details (V4) and the place inside a postcard. */
    public record PlaceDto(long id, String stationId, String stationName, String name,
                           String shortDescription, String longDescription, String image,
                           int visitMinutes, int walkMeters, int walkMinutes,
                           boolean stepFree, boolean toilet, boolean benches,
                           String openingHours, String entryPrice, String lastChecked) {
    }

    /** What the browser sends when the traveller presses "Rezerwuję". */
    public record ReservationRequest(Long runId, String from, String to, String date, Boolean senior,
                                     Long placeId, Long nextRunId,
                                     String passengerName, String bookingFor, String contact) {
    }

    public record LegDto(int seq, long runId, String runName, String fromId, String fromName,
                         String toId, String toName, String departure, String arrival,
                         String platform, BigDecimal price) {
    }

    /** A stored reservation, as shown on V8, V9 and V10. */
    public record ReservationDto(String code, String status, String passengerName, String bookingFor,
                                 String contact, String date, boolean senior, BigDecimal totalPrice,
                                 String fromName, String toName,
                                 Long placeId, String placeName, String placeStationName, Integer minutesAtStop,
                                 boolean canCancel, boolean canRemoveStop, String createdAt,
                                 List<LegDto> legs) {
    }

    /** Error body: a plain-language message the interface can show next to the problem. */
    public record ErrorDto(String message, String field) {
    }
}
