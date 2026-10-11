package com.plantcare.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class ProfileNotLinkedException extends RuntimeException {
    public ProfileNotLinkedException(String message) {
        super(message);
    }
}
