package com.plantcare.service;

import com.plantcare.model.Plant;
import com.plantcare.model.PlantStatus;
import com.plantcare.model.User;
import com.plantcare.model.WateringLog;
import com.plantcare.repository.PlantRepository;
import com.plantcare.repository.UserRepository;
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
public class WateringLogService {

    private final WateringLogRepository wateringLogRepository;
    private final PlantRepository plantRepository;
    private final UserRepository userRepository;
    private final com.plantcare.security.SecurityUtils securityUtils;

    public List<WateringLog> getAllWateringLogs() {
        User currentUser = securityUtils.getCurrentUser();
        return wateringLogRepository.findByUserIdOrderByWateredDateDesc(currentUser.getId());
    }

    public Optional<WateringLog> getWateringLogById(Long id) {
        User currentUser = securityUtils.getCurrentUser();
        return wateringLogRepository.findByIdAndUserId(id, currentUser.getId());
    }

    public List<WateringLog> getLogsByPlantId(Long plantId) {
        return wateringLogRepository.findByPlantIdOrderByWateredDateDesc(plantId);
    }

    public List<WateringLog> getLogsByUserId(Long userId) {
        return wateringLogRepository.findByUserIdOrderByWateredDateDesc(userId);
    }

    @Transactional
    public WateringLog createWateringLog(WateringLog log) {
        User currentUser = securityUtils.getCurrentUser();
        Plant plant = plantRepository.findByIdAndUserId(log.getPlant().getId(), currentUser.getId())
                .orElseThrow(() -> new RuntimeException("Plant not found with id: " + log.getPlant().getId() + " for current user"));
        log.setPlant(plant);
        log.setUser(currentUser);

        currentUser.setEcoPoints(currentUser.getEcoPoints() + 10);
        userRepository.save(currentUser);

        if (log.getWateredDate() == null) {
            log.setWateredDate(LocalDateTime.now());
        }

        int freq = plant.getWateringFrequency() != null ? plant.getWateringFrequency() : 7;
        if (log.getNextWateringDate() == null) {
            log.setNextWateringDate(log.getWateredDate().plusDays(freq));
        }

        // Update plant status and dates
        plant.setLastWateredDate(log.getWateredDate().toLocalDate());
        plant.setNextWateringDate(plant.getLastWateredDate().plusDays(freq));
        plant.setStatus(PlantStatus.RECENTLY_WATERED);
        plantRepository.save(plant);

        return wateringLogRepository.save(log);
    }

    @Transactional
    public WateringLog updateWateringLog(Long id, WateringLog logDetails) {
        User currentUser = securityUtils.getCurrentUser();
        WateringLog log = wateringLogRepository.findByIdAndUserId(id, currentUser.getId())
                .orElseThrow(() -> new RuntimeException("WateringLog not found with id: " + id + " for current user"));

        if (logDetails.getPlant() != null && logDetails.getPlant().getId() != null) {
            Plant plant = plantRepository.findByIdAndUserId(logDetails.getPlant().getId(), currentUser.getId())
                    .orElseThrow(() -> new RuntimeException("Plant not found with id: " + logDetails.getPlant().getId() + " for current user"));
            log.setPlant(plant);
        }
        if (logDetails.getWateredDate() != null) {
            log.setWateredDate(logDetails.getWateredDate());
        }
        if (logDetails.getNextWateringDate() != null) {
            log.setNextWateringDate(logDetails.getNextWateringDate());
        }

        return wateringLogRepository.save(log);
    }

    @Transactional
    public void deleteWateringLog(Long id) {
        User currentUser = securityUtils.getCurrentUser();
        WateringLog log = wateringLogRepository.findByIdAndUserId(id, currentUser.getId())
                .orElseThrow(() -> new RuntimeException("WateringLog not found with id: " + id + " for current user"));
        wateringLogRepository.delete(log);
    }
}
