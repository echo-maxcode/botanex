package com.plantcare.controller;

import com.plantcare.model.SensorReading;
import com.plantcare.service.SensorReadingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sensor-readings")
@RequiredArgsConstructor
public class SensorReadingController {

    private final SensorReadingService sensorReadingService;

    @GetMapping
    public ResponseEntity<List<SensorReading>> getAllReadings() {
        return ResponseEntity.ok(sensorReadingService.getAllReadings());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SensorReading> getReadingById(@PathVariable Long id) {
        return sensorReadingService.getReadingById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/latest/{plantId}")
    public ResponseEntity<SensorReading> getLatestReading(@PathVariable Long plantId) {
        return sensorReadingService.getLatestReadingForPlant(plantId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/history/{plantId}")
    public ResponseEntity<List<SensorReading>> getReadingHistory(@PathVariable Long plantId) {
        return ResponseEntity.ok(sensorReadingService.getHistoryForPlant(plantId));
    }

    @PostMapping
    public ResponseEntity<SensorReading> createReading(@Valid @RequestBody SensorReading reading) {
        try {
            SensorReading created = sensorReadingService.saveReading(reading);
            return new ResponseEntity<>(created, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReading(@PathVariable Long id) {
        try {
            sensorReadingService.deleteReading(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
