package com.plantcare.service;

import com.plantcare.model.Plant;
import com.plantcare.model.PlantStatus;
import com.plantcare.model.WateringLog;
import com.plantcare.repository.NotificationRepository;
import com.plantcare.repository.PlantRepository;
import com.plantcare.repository.SensorReadingRepository;
import com.plantcare.repository.WateringLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PlantService {

    private final PlantRepository plantRepository;
    private final WateringLogRepository wateringLogRepository;
    private final SensorReadingRepository sensorReadingRepository;
    private final NotificationRepository notificationRepository;
    private final WateringRecommendationService recommendationService;
    private final com.plantcare.security.SecurityUtils securityUtils;
    private final OpenPlantbookService openPlantbookService;

    @Transactional
    public List<Plant> getAllPlants() {
        com.plantcare.model.User currentUser = securityUtils.getCurrentUser();
        List<Plant> plants = plantRepository.findByUserId(currentUser.getId());
        plants.forEach(plant -> {
            if (plant.getSpecies() != null && !plant.getSpecies().isBlank()
                    && (plant.getOpenplantbookPid() == null || !openPlantbookService.isPidMatchingSpecies(plant.getOpenplantbookPid(), plant.getSpecies()))) {
                openPlantbookService.autoLinkPlantToSpecies(plant);
            }
            WateringRecommendationService.RecommendationResult rec = recommendationService.evaluate(plant);
            if (plant.getStatus() != rec.status() || !java.util.Objects.equals(plant.getStatusReason(), rec.reason())) {
                plant.setStatus(rec.status());
                plant.setStatusReason(rec.reason());
                plantRepository.save(plant);
            }
        });
        return plants;
    }

    @Transactional
    public Optional<Plant> getPlantById(Long id) {
        com.plantcare.model.User currentUser = securityUtils.getCurrentUser();
        return plantRepository.findByIdAndUserId(id, currentUser.getId()).map(plant -> {
            if (plant.getSpecies() != null && !plant.getSpecies().isBlank()
                    && (plant.getOpenplantbookPid() == null || !openPlantbookService.isPidMatchingSpecies(plant.getOpenplantbookPid(), plant.getSpecies()))) {
                openPlantbookService.autoLinkPlantToSpecies(plant);
            }
            WateringRecommendationService.RecommendationResult rec = recommendationService.evaluate(plant);
            if (plant.getStatus() != rec.status() || !java.util.Objects.equals(plant.getStatusReason(), rec.reason())) {
                plant.setStatus(rec.status());
                plant.setStatusReason(rec.reason());
                plantRepository.save(plant);
            }
            return plant;
        });
    }

    public Optional<Plant> getPlantByIdInternal(Long id) {
        return plantRepository.findById(id);
    }

    @Transactional
    public Plant createPlant(Plant plant) {
        com.plantcare.model.User currentUser = securityUtils.getCurrentUser();
        plant.setUser(currentUser);
        if (plant.getLastWateredDate() == null) {
            plant.setLastWateredDate(LocalDate.now());
        }
        if (plant.getNextWateringDate() == null && plant.getWateringFrequency() != null) {
            plant.setNextWateringDate(plant.getLastWateredDate().plusDays(plant.getWateringFrequency()));
        }
        if (plant.getStatus() == null) {
            plant.setStatus(PlantStatus.RECENTLY_WATERED);
        }
        Plant saved = plantRepository.save(plant);
        if (saved.getSpecies() != null && !saved.getSpecies().isBlank()) {
            openPlantbookService.autoLinkPlantToSpecies(saved);
        }
        return saved;
    }

    @Transactional
    public Plant updatePlant(Long id, Plant plantDetails) {
        com.plantcare.model.User currentUser = securityUtils.getCurrentUser();
        Plant plant = plantRepository.findByIdAndUserId(id, currentUser.getId())
                .orElseThrow(() -> new RuntimeException("Plant not found with id: " + id + " for current user"));

        boolean speciesChanged = false;
        if (plantDetails.getSpecies() != null && !plantDetails.getSpecies().trim().isEmpty()) {
            if (!plantDetails.getSpecies().trim().equalsIgnoreCase(plant.getSpecies())) {
                speciesChanged = true;
            }
            plant.setSpecies(plantDetails.getSpecies().trim());
        }

        if (plantDetails.getName() != null && !plantDetails.getName().isBlank()) {
            plant.setName(plantDetails.getName().trim());
        }
        if (plantDetails.getLocation() != null) {
            plant.setLocation(plantDetails.getLocation().trim());
        }
        if (plantDetails.getWateringFrequency() != null) {
            plant.setWateringFrequency(plantDetails.getWateringFrequency());
            if (plant.getLastWateredDate() != null && plantDetails.getNextWateringDate() == null) {
                plant.setNextWateringDate(plant.getLastWateredDate().plusDays(plantDetails.getWateringFrequency()));
            }
        }
        if (plantDetails.getLastWateredDate() != null) {
            plant.setLastWateredDate(plantDetails.getLastWateredDate());
        }
        if (plantDetails.getNextWateringDate() != null) {
            plant.setNextWateringDate(plantDetails.getNextWateringDate());
        }
        if (plantDetails.getStatus() != null) {
            plant.setStatus(plantDetails.getStatus());
        }
        if (plantDetails.getQrCode() != null) {
            plant.setQrCode(plantDetails.getQrCode());
        }

        // Live-link OpenPlantbook PID when species changes or explicit PID is provided
        if (plantDetails.getOpenplantbookPid() != null && !plantDetails.getOpenplantbookPid().isBlank()) {
            plant.setOpenplantbookPid(plantDetails.getOpenplantbookPid().trim().toLowerCase());
            openPlantbookService.linkPlantToSpecies(plant, plant.getOpenplantbookPid());
        } else if (speciesChanged || plant.getOpenplantbookPid() == null) {
            openPlantbookService.autoLinkPlantToSpecies(plant);
        }

        return plantRepository.save(plant);
    }

    @Transactional
    public void deletePlant(Long id) {
        com.plantcare.model.User currentUser = securityUtils.getCurrentUser();
        Plant plant = plantRepository.findByIdAndUserId(id, currentUser.getId())
                .orElseThrow(() -> new RuntimeException("Plant not found with id: " + id + " for current user"));

        // Clean up foreign key references before deleting plant
        wateringLogRepository.deleteByPlantId(id);
        sensorReadingRepository.deleteByPlantId(id);
        notificationRepository.deleteByPlantId(id);
        plantRepository.delete(plant);
    }

    @Transactional
    public Plant recordWatering(Long id) {
        com.plantcare.model.User currentUser = securityUtils.getCurrentUser();
        Plant plant = plantRepository.findByIdAndUserId(id, currentUser.getId())
                .orElseThrow(() -> new RuntimeException("Plant not found with id: " + id + " for current user"));

        LocalDate today = LocalDate.now();
        plant.setLastWateredDate(today);
        int frequency = plant.getWateringFrequency() != null ? plant.getWateringFrequency() : 7;
        plant.setNextWateringDate(today.plusDays(frequency));
        plant.setStatus(PlantStatus.RECENTLY_WATERED);
        plant.setStatusReason("Watered today (" + today + ")");
        plant = plantRepository.save(plant);

        // Also record a WateringLog entry linked to the current user
        WateringLog log = WateringLog.builder()
                .plant(plant)
                .user(currentUser)
                .wateredDate(LocalDateTime.now())
                .nextWateringDate(today.plusDays(frequency).atStartOfDay())
                .build();
        wateringLogRepository.save(log);

        return plant;
    }
}
