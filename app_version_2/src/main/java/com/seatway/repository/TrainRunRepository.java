package com.seatway.repository;

import com.seatway.domain.TrainRunEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainRunRepository extends JpaRepository<TrainRunEntity, Long> {
}
