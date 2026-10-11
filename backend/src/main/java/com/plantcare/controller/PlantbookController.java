package com.plantcare.controller;

import com.plantcare.dto.PlantSearchResultDto;
import com.plantcare.service.OpenPlantbookException;
import com.plantcare.service.OpenPlantbookNotConfiguredException;
import com.plantcare.service.OpenPlantbookService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/plantbook")
@RequiredArgsConstructor
@Slf4j
public class PlantbookController {

    private final OpenPlantbookService openPlantbookService;

    @GetMapping("/search")
    public ResponseEntity<?> searchPlants(@RequestParam(value = "q", required = false) String query) {
        if (query == null || query.trim().length() < 2) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        String trimmed = query.trim();

        try {
            if (openPlantbookService.isConfigured()) {
                List<PlantSearchResultDto> results = openPlantbookService.searchPlants(trimmed);
                if (!results.isEmpty()) {
                    return ResponseEntity.ok(results);
                }
            }
            // Fall back to local profiles in database knowledge base
            List<PlantSearchResultDto> local = openPlantbookService.searchLocalProfiles(trimmed);
            return ResponseEntity.ok(local);
        } catch (Exception e) {
            log.warn("Plantbook live search error for query '{}': {}. Falling back to local profiles.", trimmed, e.getMessage());
            return ResponseEntity.ok(openPlantbookService.searchLocalProfiles(trimmed));
        }
    }
}
