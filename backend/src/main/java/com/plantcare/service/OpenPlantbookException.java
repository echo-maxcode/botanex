package com.plantcare.service;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class OpenPlantbookException extends RuntimeException {

    private final HttpStatus status;

    public OpenPlantbookException(String message) {
        super(message);
        this.status = HttpStatus.BAD_GATEWAY;
    }

    public OpenPlantbookException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public OpenPlantbookException(String message, Throwable cause, HttpStatus status) {
        super(message, cause);
        this.status = status;
    }
}
