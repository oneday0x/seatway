package com.seatway.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;

/** One train ride inside a reservation (a trip with a stop has two legs). */
@Entity
@Table(name = "reservation_leg")
public class ReservationLegEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reservation_id", nullable = false)
    private ReservationEntity reservation;

    @Column(nullable = false)
    private int seq;

    @Column(name = "run_id", nullable = false)
    private Long runId;

    @Column(name = "run_name", nullable = false, length = 40)
    private String runName;

    @Column(name = "from_station_id", nullable = false, length = 10)
    private String fromStationId;

    @Column(name = "from_name", nullable = false, length = 80)
    private String fromName;

    @Column(name = "to_station_id", nullable = false, length = 10)
    private String toStationId;

    @Column(name = "to_name", nullable = false, length = 80)
    private String toName;

    @Column(nullable = false, length = 5)
    private String departure;

    @Column(nullable = false, length = 5)
    private String arrival;

    @Column(length = 10)
    private String platform;

    @Column(nullable = false, precision = 8, scale = 2)
    private BigDecimal price;

    public ReservationLegEntity() {
    }

    public ReservationLegEntity(int seq, Long runId, String runName, String fromStationId, String fromName,
                                String toStationId, String toName, String departure, String arrival,
                                String platform, BigDecimal price) {
        this.seq = seq;
        this.runId = runId;
        this.runName = runName;
        this.fromStationId = fromStationId;
        this.fromName = fromName;
        this.toStationId = toStationId;
        this.toName = toName;
        this.departure = departure;
        this.arrival = arrival;
        this.platform = platform;
        this.price = price;
    }

    public Long getId() { return id; }
    public ReservationEntity getReservation() { return reservation; }
    public void setReservation(ReservationEntity reservation) { this.reservation = reservation; }
    public int getSeq() { return seq; }
    public Long getRunId() { return runId; }
    public String getRunName() { return runName; }
    public String getFromStationId() { return fromStationId; }
    public String getFromName() { return fromName; }
    public String getToStationId() { return toStationId; }
    public String getToName() { return toName; }
    public String getDeparture() { return departure; }
    public String getArrival() { return arrival; }
    public String getPlatform() { return platform; }
    public BigDecimal getPrice() { return price; }
}
