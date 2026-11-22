package com.seatway.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** A (demo) reservation. No account is needed: the browser remembers the reservation codes. */
@Entity
@Table(name = "reservation")
public class ReservationEntity {

    public static final String CONFIRMED = "CONFIRMED";
    public static final String CANCELLED = "CANCELLED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 12)
    private String code;

    @Column(nullable = false, length = 12)
    private String status;

    @Column(name = "passenger_name", nullable = false, length = 80)
    private String passengerName;

    @Column(name = "booking_for", nullable = false, length = 8)
    private String bookingFor;

    @Column(length = 100)
    private String contact;

    @Column(name = "travel_date", nullable = false)
    private LocalDate travelDate;

    @Column(nullable = false)
    private boolean senior;

    @Column(name = "total_price", nullable = false, precision = 8, scale = 2)
    private BigDecimal totalPrice;

    @Column(name = "from_station_id", nullable = false, length = 10)
    private String fromStationId;

    @Column(name = "to_station_id", nullable = false, length = 10)
    private String toStationId;

    @Column(name = "first_run_id", nullable = false)
    private Long firstRunId;

    @Column(name = "place_id")
    private Long placeId;

    @Column(name = "place_name", length = 120)
    private String placeName;

    @Column(name = "place_station_name", length = 80)
    private String placeStationName;

    @Column(name = "minutes_at_stop")
    private Integer minutesAtStop;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /** Simulated payment: CARD, BLIK or TRANSFER (null for reservations made before version 2). */
    @Column(name = "payment_method", length = 10)
    private String paymentMethod;

    @Column(name = "payment_reference", length = 20)
    private String paymentReference;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @OneToMany(mappedBy = "reservation", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @OrderBy("seq ASC")
    private List<ReservationLegEntity> legs = new ArrayList<>();

    public ReservationEntity() {
    }

    public void addLeg(ReservationLegEntity leg) {
        leg.setReservation(this);
        legs.add(leg);
    }

    /** Removes all legs; orphanRemoval deletes them from the database. */
    public void clearLegs() {
        legs.clear();
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getPassengerName() { return passengerName; }
    public void setPassengerName(String passengerName) { this.passengerName = passengerName; }
    public String getBookingFor() { return bookingFor; }
    public void setBookingFor(String bookingFor) { this.bookingFor = bookingFor; }
    public String getContact() { return contact; }
    public void setContact(String contact) { this.contact = contact; }
    public LocalDate getTravelDate() { return travelDate; }
    public void setTravelDate(LocalDate travelDate) { this.travelDate = travelDate; }
    public boolean isSenior() { return senior; }
    public void setSenior(boolean senior) { this.senior = senior; }
    public BigDecimal getTotalPrice() { return totalPrice; }
    public void setTotalPrice(BigDecimal totalPrice) { this.totalPrice = totalPrice; }
    public String getFromStationId() { return fromStationId; }
    public void setFromStationId(String fromStationId) { this.fromStationId = fromStationId; }
    public String getToStationId() { return toStationId; }
    public void setToStationId(String toStationId) { this.toStationId = toStationId; }
    public Long getFirstRunId() { return firstRunId; }
    public void setFirstRunId(Long firstRunId) { this.firstRunId = firstRunId; }
    public Long getPlaceId() { return placeId; }
    public void setPlaceId(Long placeId) { this.placeId = placeId; }
    public String getPlaceName() { return placeName; }
    public void setPlaceName(String placeName) { this.placeName = placeName; }
    public String getPlaceStationName() { return placeStationName; }
    public void setPlaceStationName(String placeStationName) { this.placeStationName = placeStationName; }
    public Integer getMinutesAtStop() { return minutesAtStop; }
    public void setMinutesAtStop(Integer minutesAtStop) { this.minutesAtStop = minutesAtStop; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public List<ReservationLegEntity> getLegs() { return legs; }
    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    public String getPaymentReference() { return paymentReference; }
    public void setPaymentReference(String paymentReference) { this.paymentReference = paymentReference; }
    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }
}
