package com.seatway.service;

import com.seatway.core.Api.PaymentDto;
import com.seatway.core.Api.PaymentRequest;
import com.seatway.core.PaymentSimulator;
import com.seatway.core.PaymentSimulator.Payment;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

/**
 * Simulated payment gateway for the prototype (the course does not include a real payment provider).
 * Payments are kept in memory for 15 minutes until they are used for a reservation.
 */
@Service
public class PaymentService {

    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final PaymentSimulator simulator = new PaymentSimulator();
    private final TimetableService timetable;

    public PaymentService(TimetableService timetable) {
        this.timetable = timetable;
    }

    public PaymentDto pay(PaymentRequest request) {
        Payment p = simulator.pay(request == null ? null : request.method(),
                request == null ? null : request.amount(), timetable.now());
        return new PaymentDto(p.reference(), p.method(), p.amount(), "PAID", p.paidAt().format(STAMP));
    }

    /** Checks and uses a payment for a reservation (throws if it is missing, used, expired or the amount differs). */
    public Payment use(String reference, BigDecimal price) {
        return simulator.use(reference, price, timetable.now());
    }
}
