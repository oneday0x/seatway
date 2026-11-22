package com.seatway.repository;

import com.seatway.domain.ReservationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ReservationRepository extends JpaRepository<ReservationEntity, Long> {

    Optional<ReservationEntity> findByCode(String code);

    List<ReservationEntity> findByCodeIn(Collection<String> codes);

    boolean existsByCode(String code);

    /** Seats already taken on one train on one day (every confirmed leg uses one seat). */
    @Query("select count(l) from ReservationLegEntity l "
            + "where l.runId = :runId and l.reservation.travelDate = :date and l.reservation.status = :status")
    long countSeats(@Param("runId") Long runId, @Param("date") LocalDate date, @Param("status") String status);
}
