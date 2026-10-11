package com.plantcare.controller;

import com.plantcare.model.WateringLog;
import com.plantcare.service.WateringLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/watering-logs")
@RequiredArgsConstructor
public class WateringLogController {

    private final WateringLogService wateringLogService;

    @GetMapping
    public ResponseEntity<List<WateringLog>> getAllLogs() {
        return ResponseEntity.ok(wateringLogService.getAllWateringLogs());
    }

    @GetMapping("/{id}")
    public ResponseEntity<WateringLog> getLogById(@PathVariable Long id) {
        return wateringLogService.getWateringLogById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/plant/{plantId}")
    public ResponseEntity<List<WateringLog>> getLogsByPlant(@PathVariable Long plantId) {
        return ResponseEntity.ok(wateringLogService.getLogsByPlantId(plantId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<WateringLog>> getLogsByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(wateringLogService.getLogsByUserId(userId));
    }

    @PostMapping
    public ResponseEntity<WateringLog> createLog(@Valid @RequestBody WateringLog log) {
        WateringLog created = wateringLogService.createWateringLog(log);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<WateringLog> updateLog(@PathVariable Long id, @Valid @RequestBody WateringLog log) {
        try {
            WateringLog updated = wateringLogService.updateWateringLog(id, log);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLog(@PathVariable Long id) {
        try {
            wateringLogService.deleteWateringLog(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
