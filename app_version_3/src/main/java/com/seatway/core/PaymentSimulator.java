package com.seatway.core;

import com.seatway.core.Planner.PlanException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Simulated payment gateway (no real money is moved).
 * <p>
 * The browser first "pays" (POST /api/payments) and gets a one-time payment reference.
 * A reservation is only saved with a valid, unused reference for exactly the ticket price,
 * so a booking cannot be confirmed without the payment step.
 */
public class PaymentSimulator {

    public static final Set<String> METHODS = Set.of("CARD", "BLIK", "TRANSFER");
    private static final Duration VALID_FOR = Duration.ofMinutes(15);
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    /** One simulated payment. */
    public record Payment(String reference, String method, BigDecimal amount, LocalDateTime paidAt) {
    }

    private final Map<String, Payment> open = new ConcurrentHashMap<>();

    /** "Charges" the amount and returns the payment with its reference (e.g. PAY-7K3M9QX2). */
    public Payment pay(String method, BigDecimal amount, LocalDateTime now) {
        if (method == null || !METHODS.contains(method)) {
            throw new PlanException(Msg.PAYMENT_METHOD, "paymentMethod", 400);
        }
        if (amount == null || amount.signum() <= 0 || amount.compareTo(new BigDecimal("10000")) > 0) {
            throw new PlanException(Msg.PAYMENT_INVALID_AMOUNT, "amount", 400);
        }
        removeExpired(now);
        Payment p = new Payment(newReference(), method, amount.setScale(2, RoundingMode.HALF_UP), now);
        open.put(p.reference(), p);
        return p;
    }

    /**
     * Uses a payment for a reservation. It must exist, be unused, not older than 15 minutes
     * and match the ticket price exactly. After this call the reference cannot be used again.
     */
    public synchronized Payment use(String reference, BigDecimal price, LocalDateTime now) {
        if (reference == null || reference.isBlank()) {
            throw new PlanException(Msg.PAYMENT_REQUIRED, "payment", 402);
        }
        Payment p = open.get(reference.trim());
        if (p == null || p.paidAt().plus(VALID_FOR).isBefore(now)) {
            throw new PlanException(Msg.PAYMENT_REQUIRED, "payment", 402);
        }
        if (p.amount().compareTo(price.setScale(2, RoundingMode.HALF_UP)) != 0) {
            throw new PlanException(Msg.PAYMENT_AMOUNT, "payment", 409);
        }
        open.remove(p.reference());
        return p;
    }

    private void removeExpired(LocalDateTime now) {
        open.values().removeIf(p -> p.paidAt().plus(VALID_FOR).isBefore(now));
    }

    private static String newReference() {
        StringBuilder sb = new StringBuilder("PAY-");
        for (int i = 0; i < 8; i++) {
            sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }
}
