package com.seatway.core;

import com.seatway.core.Api.ConnectionDto;
import com.seatway.core.Api.ReservationRequest;
import com.seatway.core.Api.StopOptionDto;
import com.seatway.core.Planner.Plan;
import com.seatway.core.Planner.PlanException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Unit tests for the booking and discovery rules (no Spring context needed). */
class PlannerTest {

    private final Planner planner = SampleData.planner();
    private final LocalDateTime now = LocalDateTime.of(2026, 11, 22, 7, 0);
    private final Planner.SeatCounter noSeatsTaken = (runId, date) -> 0;
    private static final String DATE = "2026-11-27";

    @Test
    void findsConnectionsWithSeniorPrice() {
        List<ConnectionDto> list = planner.connections("WRO", "KRK", DATE, true, noSeatsTaken, now);
        assertEquals(7, list.size());
        assertEquals(new BigDecimal("45.50"), list.get(0).price());
    }

    @Test
    void suggestsAtMostThreeStopsThatLeaveEnoughTime() {
        long runId = planner.connections("WRO", "KRK", DATE, true, noSeatsTaken, now).get(1).runId();
        List<StopOptionDto> stops = planner.stops(runId, "WRO", "KRK", DATE, true, noSeatsTaken, now);
        assertFalse(stops.isEmpty());
        assertTrue(stops.size() <= Planner.MAX_SUGGESTIONS);
        for (StopOptionDto s : stops) {
            var place = SampleData.places().stream().filter(p -> p.id() == s.place().id()).findFirst().orElseThrow();
            assertTrue(s.minutesAvailable() >= Planner.requiredMinutes(place));
        }
    }

    @Test
    void reservationWithStopHasTwoLegs() {
        long runId = planner.connections("WRO", "KRK", DATE, true, noSeatsTaken, now).get(1).runId();
        StopOptionDto stop = planner.stops(runId, "WRO", "KRK", DATE, true, noSeatsTaken, now).get(0);
        Plan plan = planner.plan(new ReservationRequest(runId, "WRO", "KRK", DATE, true, stop.place().id(),
                stop.nextRunId(), " Halina  Kowalska ", "SELF", null, null), noSeatsTaken, now);
        assertEquals(2, plan.legs().size());
        assertEquals("Halina Kowalska", plan.passengerName());
        assertEquals(stop.totalPrice(), plan.total());
    }

    @Test
    void emptyNameIsRejectedWithFieldName() {
        long runId = planner.connections("WRO", "KRK", DATE, true, noSeatsTaken, now).get(0).runId();
        PlanException e = assertThrows(PlanException.class, () -> planner.plan(
                new ReservationRequest(runId, "WRO", "KRK", DATE, true, null, null, " ", "SELF", null, null),
                noSeatsTaken, now));
        assertEquals("passengerName", e.field());
    }

    @Test
    void fullTrainCannotBeBooked() {
        long runId = planner.connections("WRO", "KRK", DATE, true, noSeatsTaken, now).get(0).runId();
        PlanException e = assertThrows(PlanException.class, () -> planner.plan(
                new ReservationRequest(runId, "WRO", "KRK", DATE, true, null, null, "Jan Nowak", "SELF", null, null),
                (r, d) -> 1000, now));
        assertEquals(409, e.status());
    }

    @Test
    void messagesAndPlaceTextsAreAvailableInEnglish() {
        PlanException e = assertThrows(PlanException.class,
                () -> planner.connections("WRO", "KRK", "2026-11-01", true, noSeatsTaken, now));
        assertTrue(e.message("en").startsWith("This date has passed"));
        assertTrue(e.message("pl").startsWith("Ta data już minęła"));
        assertTrue(planner.place(3, "en").openingHours().contains("example"));
        assertTrue(planner.place(3, "pl").openingHours().contains("przykład"));
    }

    @Test
    void reservationNeedsAValidUnusedPaymentForTheExactPrice() {
        PaymentSimulator payments = new PaymentSimulator();
        BigDecimal price = new BigDecimal("45.50");
        // no payment at all
        PlanException none = assertThrows(PlanException.class, () -> payments.use(null, price, now));
        assertEquals(402, none.status());
        // wrong amount
        String small = payments.pay("CARD", new BigDecimal("10.00"), now).reference();
        assertEquals(409, assertThrows(PlanException.class, () -> payments.use(small, price, now)).status());
        // correct payment works once
        String ok = payments.pay("BLIK", price, now).reference();
        assertEquals("BLIK", payments.use(ok, price, now).method());
        assertThrows(PlanException.class, () -> payments.use(ok, price, now));
        // unknown method
        assertThrows(PlanException.class, () -> payments.pay("CASH", price, now));
    }

    @Test
    void pastDateIsRejected() {
        assertThrows(PlanException.class,
                () -> planner.connections("WRO", "KRK", "2026-11-01", true, noSeatsTaken, now));
    }
}
