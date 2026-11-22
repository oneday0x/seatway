package com.seatway.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "station")
public class StationEntity {

    @Id
    @Column(length = 10)
    private String id;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(nullable = false, length = 80)
    private String city;

    protected StationEntity() {
    }

    public StationEntity(String id, String name, String city) {
        this.id = id;
        this.name = name;
        this.city = city;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getCity() { return city; }
}
