package com.plantcare.controller;

import com.plantcare.dto.WeatherForecastDto;
import com.plantcare.service.WeatherService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/weather")
@RequiredArgsConstructor
public class WeatherController {

    private final WeatherService weatherService;

    @GetMapping("/forecast")
    public ResponseEntity<WeatherForecastDto> getForecast() {
        return ResponseEntity.ok(weatherService.getForecast());
    }
}
