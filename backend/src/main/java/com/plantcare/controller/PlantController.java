package com.plantcare.controller;

import com.plantcare.dto.PlantRangeStatusDto;
import com.plantcare.dto.PlantbookLinkRequest;
import com.plantcare.model.Plant;
import com.plantcare.model.SpeciesCareProfile;
import com.plantcare.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/plants")
@RequiredArgsConstructor
@Slf4j
public class PlantController {

    private final PlantService plantService;
    private final OpenPlantbookService openPlantbookService;

    @GetMapping
    public ResponseEntity<List<Plant>> getAllPlants() {
        return ResponseEntity.ok(plantService.getAllPlants());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Plant> getPlantById(@PathVariable Long id) {
        return plantService.getPlantById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Plant> createPlant(@Valid @RequestBody Plant plant) {
        Plant created = plantService.createPlant(plant);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Plant> updatePlant(@PathVariable Long id, @Valid @RequestBody Plant plant) {
        try {
            Plant updated = plantService.updatePlant(id, plant);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePlant(@PathVariable Long id) {
        try {
            plantService.deletePlant(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{id}/water")
    public ResponseEntity<Plant> recordWatering(@PathVariable Long id) {
        try {
            Plant watered = plantService.recordWatering(id);
            return ResponseEntity.ok(watered);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Links an existing plant to an OpenPlantbook species PID.
     * Fetches and caches the SpeciesCareProfile, sets plant.openplantbookPid, and returns the profile.
     */
    @PostMapping("/{plantId}/plantbook-link")
    public ResponseEntity<?> linkPlantbookSpecies(@PathVariable Long plantId,
                                                  @Valid @RequestBody PlantbookLinkRequest request) {
        try {
            SpeciesCareProfile profile = openPlantbookService.linkPlantToSpecies(plantId, request.getPid());
            return ResponseEntity.ok(profile);
        } catch (OpenPlantbookNotConfiguredException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "error", "NOT_CONFIGURED",
                    "message", e.getMessage()
            ));
        } catch (OpenPlantbookException e) {
            return ResponseEntity.status(e.getStatus()).body(Map.of(
                    "error", e.getStatus().name(),
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Error linking species '{}' to plant #{}: {}", request.getPid(), plantId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "INTERNAL_ERROR",
                    "message", "Failed to link species profile: " + e.getMessage()
            ));
        }
    }

    /**
     * Retrieves the stored OpenPlantbook care profile for a plant.
     * Returns 404 if no profile is linked to the plant.
     */
    @GetMapping("/{plantId}/care-profile")
    public ResponseEntity<?> getCareProfile(@PathVariable Long plantId) {
        try {
            SpeciesCareProfile profile = openPlantbookService.getCareProfileForPlant(plantId);
            return ResponseEntity.ok(profile);
        } catch (ProfileNotLinkedException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "error", "NOT_LINKED",
                    "message", e.getMessage()
            ));
        } catch (OpenPlantbookNotConfiguredException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "error", "NOT_CONFIGURED",
                    "message", e.getMessage()
            ));
        } catch (OpenPlantbookException e) {
            return ResponseEntity.status(e.getStatus()).body(Map.of(
                    "error", e.getStatus().name(),
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Error retrieving care profile for plant #{}: {}", plantId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "INTERNAL_ERROR",
                    "message", "Failed to load species care profile: " + e.getMessage()
            ));
        }
    }

    /**
     * Compares latest sensor reading to the species ideal care ranges.
     * Returns LOW, OK, or HIGH for applicable metrics.
     */
    @GetMapping("/{plantId}/range-status")
    public ResponseEntity<?> getRangeStatus(@PathVariable Long plantId) {
        try {
            PlantRangeStatusDto status = openPlantbookService.getRangeStatusForPlant(plantId);
            return ResponseEntity.ok(status);
        } catch (ProfileNotLinkedException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "error", "NOT_LINKED",
                    "message", e.getMessage()
            ));
        } catch (OpenPlantbookNotConfiguredException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "error", "NOT_CONFIGURED",
                    "message", e.getMessage()
            ));
        } catch (OpenPlantbookException e) {
            return ResponseEntity.status(e.getStatus()).body(Map.of(
                    "error", e.getStatus().name(),
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Error checking range status for plant #{}: {}", plantId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "INTERNAL_ERROR",
                    "message", "Failed to calculate range status: " + e.getMessage()
            ));
        }
    }
}
