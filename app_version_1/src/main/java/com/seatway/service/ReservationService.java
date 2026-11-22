package com.seatway.service;

import com.seatway.core.Api.LegDto;
import com.seatway.core.Api.ReservationDto;
import com.seatway.core.Api.ReservationRequest;
import com.seatway.core.Planner;
import com.seatway.core.Planner.Plan;
import com.seatway.core.Planner.PlanException;
import com.seatway.domain.ReservationEntity;
import com.seatway.domain.ReservationLegEntity;
import com.seatway.repository.ReservationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Creates, reads, cancels and changes reservations. All rules are checked again on the server. */
@Service
public class ReservationService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final ReservationRepository reservations;
    private final TimetableService timetable;

    public ReservationService(ReservationRepository reservations, TimetableService timetable) {
        this.reservations = reservations;
        this.timetable = timetable;
    }

    /** Seats already booked, read from the database (used by the planner's capacity check). */
    public Planner.SeatCounter seatCounter() {
        return (runId, date) -> (int) reservations.countSeats(runId, date, ReservationEntity.CONFIRMED);
    }

    /**
     * Saves a reservation. The capacity check and the save run in one transaction, and the method is
     * synchronized so that two requests in this application cannot take the last seat at once (US16).
     */
    @Transactional
    public synchronized ReservationDto create(ReservationRequest request) {
        Plan plan = timetable.planner().plan(request, seatCounter(), timetable.now());

        ReservationEntity r = new ReservationEntity();
        r.setCode(newCode());
        r.setStatus(ReservationEntity.CONFIRMED);
        r.setPassengerName(plan.passengerName());
        r.setBookingFor(plan.bookingFor());
        r.setContact(plan.contact());
        r.setTravelDate(plan.date());
        r.setSenior(plan.senior());
        r.setTotalPrice(plan.total());
        r.setFromStationId(plan.fromId());
        r.setToStationId(plan.toId());
        r.setFirstRunId(plan.legs().get(0).runId());
        if (plan.place() != null) {
            r.setPlaceId(plan.place().id());
            r.setPlaceName(plan.place().name());
            r.setPlaceStationName(timetable.planner().stationName(plan.place().stationId()));
            r.setMinutesAtStop(plan.minutesAtStop());
        }
        r.setCreatedAt(timetable.now());
        for (LegDto leg : plan.legs()) {
            r.addLeg(toEntity(leg));
        }
        return toDto(reservations.save(r));
    }

    @Transactional(readOnly = true)
    public ReservationDto get(String code) {
        return toDto(find(code));
    }

    /** Returns the reservations whose codes the browser remembers, in the same order. */
    @Transactional(readOnly = true)
    public List<ReservationDto> list(Collection<String> codes) {
        Map<String, ReservationEntity> found = reservations.findByCodeIn(codes).stream()
                .collect(Collectors.toMap(ReservationEntity::getCode, Function.identity()));
        return codes.stream().filter(found::containsKey).map(c -> toDto(found.get(c))).toList();
    }

    @Transactional
    public ReservationDto cancel(String code) {
        ReservationEntity r = find(code);
        requireChangeable(r);
        r.setStatus(ReservationEntity.CANCELLED);
        return toDto(reservations.save(r));
    }

    /** Keeps the trip but removes the stop: the traveller stays on the first train to the destination. */
    @Transactional
    public synchronized ReservationDto removeStop(String code) {
        ReservationEntity r = find(code);
        requireChangeable(r);
        if (r.getPlaceId() == null) {
            throw new PlanException("Ta podróż nie ma przystanku po drodze.", null, 400);
        }
        LegDto leg = timetable.planner().directLeg(r.getFirstRunId(), r.getFromStationId(), r.getToStationId(),
                r.isSenior());
        r.clearLegs();
        r.addLeg(toEntity(leg));
        r.setTotalPrice(leg.price());
        r.setPlaceId(null);
        r.setPlaceName(null);
        r.setPlaceStationName(null);
        r.setMinutesAtStop(null);
        return toDto(reservations.save(r));
    }

    // ------------------------------------------------------------------ helpers

    private ReservationEntity find(String code) {
        String normalised = code == null ? "" : code.trim().toUpperCase();
        return reservations.findByCode(normalised)
                .orElseThrow(() -> new PlanException("Nie znaleziono podróży o numerze " + normalised + ".",
                        "code", 404));
    }

    private void requireChangeable(ReservationEntity r) {
        if (!ReservationEntity.CONFIRMED.equals(r.getStatus())) {
            throw new PlanException("Ta podróż jest już odwołana.", null, 409);
        }
        if (r.getTravelDate().isBefore(today())) {
            throw new PlanException("Tej podróży nie można już zmienić, bo jej dzień minął.", null, 409);
        }
    }

    private LocalDate today() {
        return timetable.now().toLocalDate();
    }

    private String newCode() {
        String code;
        do {
            code = "SW-" + (1000 + RANDOM.nextInt(9000));
        } while (reservations.existsByCode(code));
        return code;
    }

    private static ReservationLegEntity toEntity(LegDto l) {
        return new ReservationLegEntity(l.seq(), l.runId(), l.runName(), l.fromId(), l.fromName(), l.toId(),
                l.toName(), l.departure(), l.arrival(), l.platform(), l.price());
    }

    private ReservationDto toDto(ReservationEntity r) {
        List<LegDto> legs = r.getLegs().stream()
                .map(l -> new LegDto(l.getSeq(), l.getRunId(), l.getRunName(), l.getFromStationId(), l.getFromName(),
                        l.getToStationId(), l.getToName(), l.getDeparture(), l.getArrival(), l.getPlatform(),
                        l.getPrice()))
                .toList();
        boolean changeable = ReservationEntity.CONFIRMED.equals(r.getStatus()) && !r.getTravelDate().isBefore(today());
        Planner planner = timetable.planner();
        return new ReservationDto(r.getCode(), r.getStatus(), r.getPassengerName(), r.getBookingFor(),
                r.getContact(), r.getTravelDate().toString(), r.isSenior(), r.getTotalPrice(),
                planner.stationName(r.getFromStationId()), planner.stationName(r.getToStationId()),
                r.getPlaceId(), r.getPlaceName(), r.getPlaceStationName(), r.getMinutesAtStop(),
                changeable, changeable && r.getPlaceId() != null, r.getCreatedAt().format(STAMP), legs);
    }
}
