package com.plantcare.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
public class OpenPlantbookNotConfiguredException extends RuntimeException {
    public OpenPlantbookNotConfiguredException(String message) {
        super(message);
    }
}
