package com.seatway.repository;

import com.seatway.domain.RunStopEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RunStopRepository extends JpaRepository<RunStopEntity, Long> {

    List<RunStopEntity> findAllByOrderByRunIdAscSeqAsc();
}
