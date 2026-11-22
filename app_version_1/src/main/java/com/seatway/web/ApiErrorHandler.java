package com.seatway.web;

import com.seatway.core.Api.ErrorDto;
import com.seatway.core.Planner.PlanException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** Turns errors into short, plain-language messages that the interface shows next to the problem. */
@RestControllerAdvice
public class ApiErrorHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiErrorHandler.class);

    @ExceptionHandler(PlanException.class)
    public ResponseEntity<ErrorDto> plan(PlanException e) {
        return ResponseEntity.status(e.status()).body(new ErrorDto(e.getMessage(), e.field()));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ErrorDto> badRequest(Exception e) {
        return ResponseEntity.badRequest().body(new ErrorDto("Nieprawidłowe dane. Spróbuj jeszcze raz.", null));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorDto> notFound(NoResourceFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorDto("Nie znaleziono strony.", null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorDto> unexpected(Exception e) {
        log.error("Unexpected error", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorDto("Coś poszło nie tak po naszej stronie. Nic nie zostało zarezerwowane. "
                        + "Spróbuj ponownie za chwilę.", null));
    }
}
