package com.seatway.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A train that runs every day; its stops are stored in run_stop. */
@Entity
@Table(name = "train_run")
public class TrainRunEntity {

    @Id
    private Long id;

    @Column(nullable = false, length = 40)
    private String name;

    @Column(nullable = false)
    private int capacity;

    protected TrainRunEntity() {
    }

    public TrainRunEntity(Long id, String name, int capacity) {
        this.id = id;
        this.name = name;
        this.capacity = capacity;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public int getCapacity() { return capacity; }
}
