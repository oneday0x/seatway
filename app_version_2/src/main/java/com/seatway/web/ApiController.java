package com.seatway.web;

import com.seatway.core.Api.ConnectionDto;
import com.seatway.core.Api.PlaceDto;
import com.seatway.core.Api.ReservationDto;
import com.seatway.core.Api.ReservationRequest;
import com.seatway.core.Api.StationDto;
import com.seatway.core.Api.StopOptionDto;
import com.seatway.core.Msg;
import com.seatway.service.ReservationService;
import com.seatway.service.TimetableService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * REST API used by the Seatway front end.
 * The interface language comes from the Accept-Language header ("pl" or "en"); Spring passes it as a Locale.
 */
@RestController
@RequestMapping("/api")
public class ApiController {

    private final TimetableService timetable;
    private final ReservationService reservations;

    public ApiController(TimetableService timetable, ReservationService reservations) {
        this.timetable = timetable;
        this.reservations = reservations;
    }

    @GetMapping("/stations")
    public List<StationDto> stations() {
        return timetable.planner().stations().stream().map(s -> new StationDto(s.id(), s.name())).toList();
    }

    @GetMapping("/connections")
    public List<ConnectionDto> connections(@RequestParam String from, @RequestParam String to,
                                           @RequestParam String date,
                                           @RequestParam(defaultValue = "true") boolean senior) {
        return timetable.planner().connections(from, to, date, senior, reservations.seatCounter(), timetable.now());
    }

    @GetMapping("/connections/{runId}/stops")
    public List<StopOptionDto> stops(@PathVariable long runId, @RequestParam String from, @RequestParam String to,
                                     @RequestParam String date,
                                     @RequestParam(defaultValue = "true") boolean senior, Locale locale) {
        return timetable.planner().stops(runId, from, to, date, senior, reservations.seatCounter(), timetable.now(),
                Msg.Lang.of(locale.getLanguage()));
    }

    @GetMapping("/places/{id}")
    public PlaceDto place(@PathVariable long id, Locale locale) {
        return timetable.planner().place(id, Msg.Lang.of(locale.getLanguage()));
    }

    @PostMapping("/reservations")
    @ResponseStatus(HttpStatus.CREATED)
    public ReservationDto create(@RequestBody ReservationRequest request) {
        return reservations.create(request);
    }

    /** "Moje podróże": the browser sends the codes it remembers, e.g. ?codes=SW-1234,SW-5678 */
    @GetMapping("/reservations")
    public List<ReservationDto> list(@RequestParam(defaultValue = "") String codes) {
        List<String> list = Arrays.stream(codes.split(","))
                .map(String::trim).map(String::toUpperCase).filter(c -> !c.isEmpty()).distinct().limit(50).toList();
        return list.isEmpty() ? List.of() : reservations.list(list);
    }

    @GetMapping("/reservations/{code}")
    public ReservationDto get(@PathVariable String code) {
        return reservations.get(code);
    }

    @PostMapping("/reservations/{code}/cancel")
    public ReservationDto cancel(@PathVariable String code) {
        return reservations.cancel(code);
    }

    @PostMapping("/reservations/{code}/remove-stop")
    public ReservationDto removeStop(@PathVariable String code) {
        return reservations.removeStop(code);
    }
}
