package com.seatway.config;

import com.seatway.core.SampleData;
import com.seatway.core.Timetable.Place;
import com.seatway.core.Timetable.Run;
import com.seatway.core.Timetable.StopTime;
import com.seatway.domain.PlaceEntity;
import com.seatway.domain.RunStopEntity;
import com.seatway.domain.StationEntity;
import com.seatway.domain.TrainRunEntity;
import com.seatway.repository.PlaceRepository;
import com.seatway.repository.RunStopRepository;
import com.seatway.repository.StationRepository;
import com.seatway.repository.TrainRunRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Fills an empty database with the sample timetable and places on the first start. */
@Component
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final StationRepository stations;
    private final TrainRunRepository runs;
    private final RunStopRepository stops;
    private final PlaceRepository places;

    public DataSeeder(StationRepository stations, TrainRunRepository runs, RunStopRepository stops,
                      PlaceRepository places) {
        this.stations = stations;
        this.runs = runs;
        this.stops = stops;
        this.places = places;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (stations.count() > 0) {
            log.info("Seatway: database already contains the timetable, nothing to seed.");
            return;
        }
        SampleData.stations().forEach(s -> stations.save(new StationEntity(s.id(), s.name(), s.city())));
        for (Run r : SampleData.runs()) {
            runs.save(new TrainRunEntity(r.id(), r.name(), r.capacity()));
            for (StopTime s : r.stops()) {
                stops.save(new RunStopEntity(r.id(), s.stationId(), s.seq(), s.arrival(), s.departure(),
                        s.platform(), s.priceFromStart()));
            }
        }
        for (Place p : SampleData.places()) {
            places.save(new PlaceEntity(p.id(), p.stationId(), p.name(), p.shortDescription(), p.longDescription(),
                    p.image(), p.visitMinutes(), p.walkMeters(), p.walkMinutes(), p.stepFree(), p.toilet(),
                    p.benches(), p.openingHours(), p.entryPrice(), p.lastChecked()));
        }
        log.info("Seatway: sample timetable and places saved.");
    }
}
