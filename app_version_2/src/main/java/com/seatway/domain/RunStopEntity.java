package com.seatway.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalTime;

@Entity
@Table(name = "run_stop")
public class RunStopEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "run_id", nullable = false)
    private Long runId;

    @Column(name = "station_id", nullable = false, length = 10)
    private String stationId;

    @Column(nullable = false)
    private int seq;

    private LocalTime arrival;

    private LocalTime departure;

    @Column(length = 10)
    private String platform;

    @Column(name = "price_from_start", nullable = false, precision = 8, scale = 2)
    private BigDecimal priceFromStart;

    protected RunStopEntity() {
    }

    public RunStopEntity(Long runId, String stationId, int seq, LocalTime arrival, LocalTime departure,
                         String platform, BigDecimal priceFromStart) {
        this.runId = runId;
        this.stationId = stationId;
        this.seq = seq;
        this.arrival = arrival;
        this.departure = departure;
        this.platform = platform;
        this.priceFromStart = priceFromStart;
    }

    public Long getId() { return id; }
    public Long getRunId() { return runId; }
    public String getStationId() { return stationId; }
    public int getSeq() { return seq; }
    public LocalTime getArrival() { return arrival; }
    public LocalTime getDeparture() { return departure; }
    public String getPlatform() { return platform; }
    public BigDecimal getPriceFromStart() { return priceFromStart; }
}
