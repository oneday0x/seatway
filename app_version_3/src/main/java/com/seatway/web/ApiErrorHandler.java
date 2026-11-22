package com.seatway.web;

import com.seatway.core.Api.ErrorDto;
import com.seatway.core.Msg;
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

import java.util.Locale;

/**
 * Turns errors into short, plain-language messages that the interface shows next to the problem,
 * in the language of the request (Accept-Language: "pl" or "en").
 */
@RestControllerAdvice
public class ApiErrorHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiErrorHandler.class);

    @ExceptionHandler(PlanException.class)
    public ResponseEntity<ErrorDto> plan(PlanException e, Locale locale) {
        return ResponseEntity.status(e.status()).body(new ErrorDto(e.message(lang(locale)), e.field()));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ErrorDto> badRequest(Exception e, Locale locale) {
        return ResponseEntity.badRequest().body(new ErrorDto(Msg.BAD_REQUEST.text(lang(locale)), null));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorDto> notFound(NoResourceFoundException e, Locale locale) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorDto(Msg.PAGE_NOT_FOUND.text(lang(locale)), null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorDto> unexpected(Exception e, Locale locale) {
        log.error("Unexpected error", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorDto(Msg.SERVER_ERROR.text(lang(locale)), null));
    }

    private static String lang(Locale locale) {
        return Msg.Lang.of(locale == null ? null : locale.getLanguage());
    }
}
