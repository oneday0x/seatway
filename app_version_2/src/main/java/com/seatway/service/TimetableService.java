package com.seatway.service;

import com.seatway.core.Planner;
import com.seatway.core.Timetable.Place;
import com.seatway.core.Timetable.Run;
import com.seatway.core.Timetable.Station;
import com.seatway.core.Timetable.StopTime;
import com.seatway.domain.PlaceEntity;
import com.seatway.domain.RunStopEntity;
import com.seatway.domain.TrainRunEntity;
import com.seatway.repository.PlaceRepository;
import com.seatway.repository.RunStopRepository;
import com.seatway.repository.StationRepository;
import com.seatway.repository.TrainRunRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Loads the timetable and the places from the database and builds the {@link Planner}.
 * The timetable is small and changes rarely, so the planner is built once and reused.
 */
@Service
public class TimetableService {

    public static final ZoneId ZONE = ZoneId.of("Europe/Warsaw");

    private final StationRepository stations;
    private final TrainRunRepository runs;
    private final RunStopRepository stops;
    private final PlaceRepository places;
    private volatile Planner planner;

    public TimetableService(StationRepository stations, TrainRunRepository runs, RunStopRepository stops,
                            PlaceRepository places) {
        this.stations = stations;
        this.runs = runs;
        this.stops = stops;
        this.places = places;
    }

    public Planner planner() {
        Planner p = planner;
        if (p == null) {
            synchronized (this) {
                if (planner == null) {
                    planner = load();
                }
                p = planner;
            }
        }
        return p;
    }

    /** Call after the timetable changes (for example from an administration screen). */
    public synchronized void reload() {
        planner = null;
    }

    public LocalDateTime now() {
        return LocalDateTime.now(ZONE);
    }

    private Planner load() {
        List<Station> stationList = stations.findAll().stream()
                .map(s -> new Station(s.getId(), s.getName(), s.getCity()))
                .toList();

        Map<Long, List<StopTime>> stopsByRun = new LinkedHashMap<>();
        for (RunStopEntity s : stops.findAllByOrderByRunIdAscSeqAsc()) {
            stopsByRun.computeIfAbsent(s.getRunId(), k -> new ArrayList<>())
                    .add(new StopTime(s.getStationId(), s.getSeq(), s.getArrival(), s.getDeparture(),
                            s.getPlatform(), s.getPriceFromStart()));
        }
        List<Run> runList = new ArrayList<>();
        for (TrainRunEntity r : runs.findAll()) {
            runList.add(new Run(r.getId(), r.getName(), r.getCapacity(),
                    List.copyOf(stopsByRun.getOrDefault(r.getId(), List.of()))));
        }

        List<Place> placeList = places.findAll().stream().map(TimetableService::toPlace).toList();
        return new Planner(stationList, runList, placeList);
    }

    private static Place toPlace(PlaceEntity p) {
        return new Place(p.getId(), p.getStationId(), p.getName(), p.getShortDescription(), p.getLongDescription(),
                p.getImage(), p.getVisitMinutes(), p.getWalkMeters(), p.getWalkMinutes(), p.isStepFree(),
                p.isToilet(), p.isBenches(), p.getOpeningHours(), p.getEntryPrice(), p.getLastChecked(),
                p.getShortDescriptionEn(), p.getLongDescriptionEn(), p.getOpeningHoursEn(), p.getEntryPriceEn());
    }
}
