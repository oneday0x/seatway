package com.seatway.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;

/** A place worth seeing near a station (a "postcard" in the interface). */
@Entity
@Table(name = "place")
public class PlaceEntity {

    @Id
    private Long id;

    @Column(name = "station_id", nullable = false, length = 10)
    private String stationId;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "short_description", length = 300)
    private String shortDescription;

    @Column(name = "long_description", length = 1000)
    private String longDescription;

    @Column(length = 120)
    private String image;

    @Column(name = "visit_minutes", nullable = false)
    private int visitMinutes;

    @Column(name = "walk_meters", nullable = false)
    private int walkMeters;

    @Column(name = "walk_minutes", nullable = false)
    private int walkMinutes;

    @Column(name = "step_free", nullable = false)
    private boolean stepFree;

    @Column(nullable = false)
    private boolean toilet;

    @Column(nullable = false)
    private boolean benches;

    @Column(name = "opening_hours", length = 120)
    private String openingHours;

    @Column(name = "entry_price", length = 60)
    private String entryPrice;

    @Column(name = "last_checked")
    private LocalDate lastChecked;

    @Column(name = "short_description_en", length = 300)
    private String shortDescriptionEn;

    @Column(name = "long_description_en", length = 1000)
    private String longDescriptionEn;

    @Column(name = "opening_hours_en", length = 120)
    private String openingHoursEn;

    @Column(name = "entry_price_en", length = 60)
    private String entryPriceEn;

    protected PlaceEntity() {
    }

    public PlaceEntity(Long id, String stationId, String name, String shortDescription, String longDescription,
                       String image, int visitMinutes, int walkMeters, int walkMinutes, boolean stepFree,
                       boolean toilet, boolean benches, String openingHours, String entryPrice,
                       LocalDate lastChecked, String shortDescriptionEn, String longDescriptionEn,
                       String openingHoursEn, String entryPriceEn) {
        this.id = id;
        this.stationId = stationId;
        this.name = name;
        this.shortDescription = shortDescription;
        this.longDescription = longDescription;
        this.image = image;
        this.visitMinutes = visitMinutes;
        this.walkMeters = walkMeters;
        this.walkMinutes = walkMinutes;
        this.stepFree = stepFree;
        this.toilet = toilet;
        this.benches = benches;
        this.openingHours = openingHours;
        this.entryPrice = entryPrice;
        this.lastChecked = lastChecked;
        this.shortDescriptionEn = shortDescriptionEn;
        this.longDescriptionEn = longDescriptionEn;
        this.openingHoursEn = openingHoursEn;
        this.entryPriceEn = entryPriceEn;
    }

    public Long getId() { return id; }
    public String getStationId() { return stationId; }
    public String getName() { return name; }
    public String getShortDescription() { return shortDescription; }
    public String getLongDescription() { return longDescription; }
    public String getImage() { return image; }
    public int getVisitMinutes() { return visitMinutes; }
    public int getWalkMeters() { return walkMeters; }
    public int getWalkMinutes() { return walkMinutes; }
    public boolean isStepFree() { return stepFree; }
    public boolean isToilet() { return toilet; }
    public boolean isBenches() { return benches; }
    public String getOpeningHours() { return openingHours; }
    public String getEntryPrice() { return entryPrice; }
    public LocalDate getLastChecked() { return lastChecked; }
    public String getShortDescriptionEn() { return shortDescriptionEn; }
    public String getLongDescriptionEn() { return longDescriptionEn; }
    public String getOpeningHoursEn() { return openingHoursEn; }
    public String getEntryPriceEn() { return entryPriceEn; }
}
