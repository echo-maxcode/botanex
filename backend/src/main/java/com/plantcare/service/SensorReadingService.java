package com.plantcare.service;

import com.plantcare.model.Notification;
import com.plantcare.model.Plant;
import com.plantcare.model.PlantStatus;
import com.plantcare.model.SensorReading;
import com.plantcare.model.User;
import com.plantcare.repository.NotificationRepository;
import com.plantcare.repository.PlantRepository;
import com.plantcare.repository.SensorReadingRepository;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Getter
@Setter
public class SensorReadingService {

    private final SensorReadingRepository sensorReadingRepository;
    private final PlantRepository plantRepository;
    private final WateringRecommendationService recommendationService;
    private final NotificationRepository notificationRepository;

    @Value("${plantcare.alert.soil-moisture-threshold:30.0}")
    private double alertSoilMoistureThreshold = 30.0;

    public List<SensorReading> getAllReadings() {
        return sensorReadingRepository.findAll();
    }

    public Optional<SensorReading> getReadingById(Long id) {
        return sensorReadingRepository.findById(id);
    }

    public Optional<SensorReading> getLatestReadingForPlant(Long plantId) {
        return sensorReadingRepository.findFirstByPlantIdOrderByTimestampDesc(plantId);
    }

    public List<SensorReading> getHistoryForPlant(Long plantId) {
        return sensorReadingRepository.findByPlantIdOrderByTimestampDesc(plantId);
    }

    @Transactional
    public SensorReading saveReading(SensorReading reading) {
        if (reading.getPlant() == null || reading.getPlant().getId() == null) {
            throw new IllegalArgumentException("Sensor reading must be associated with a valid Plant ID");
        }

        Plant plant = plantRepository.findById(reading.getPlant().getId())
                .orElseThrow(() -> new RuntimeException("Plant not found with id: " + reading.getPlant().getId()));

        reading.setPlant(plant);
        if (reading.getTimestamp() == null) {
            reading.setTimestamp(LocalDateTime.now());
        }

        SensorReading saved = sensorReadingRepository.save(reading);

        // Re-evaluate plant status with new reading
        WateringRecommendationService.RecommendationResult rec = recommendationService.evaluate(plant);
        if (plant.getStatus() != rec.status() || !java.util.Objects.equals(plant.getStatusReason(), rec.reason())) {
            plant.setStatus(rec.status());
            plant.setStatusReason(rec.reason());
            plantRepository.save(plant);
        }

        // Low-soil-moisture alert notification check
        checkAndCreateLowMoistureNotification(plant, saved);

        return saved;
    }

    private void checkAndCreateLowMoistureNotification(Plant plant, SensorReading reading) {
        if (reading.getSoilMoisture() < alertSoilMoistureThreshold) {
            boolean unreadExists = plant.getId() != null &&
                    notificationRepository.existsByPlantIdAndTypeAndStatus(plant.getId(), "LOW_MOISTURE", "UNREAD");
            if (!unreadExists) {
                User owner = plant.getUser();
                String message = plant.getName() + " needs water — soil moisture at " + reading.getSoilMoisture() + "%";
                Notification alertNotification = Notification.builder()
                        .user(owner)
                        .plant(plant)
                        .message(message)
                        .type("LOW_MOISTURE")
                        .status("UNREAD")
                        .createdAt(LocalDateTime.now())
                        .build();
                notificationRepository.save(alertNotification);
            }
        }
    }

    @Transactional
    public void deleteReading(Long id) {
        if (!sensorReadingRepository.existsById(id)) {
            throw new RuntimeException("SensorReading not found with id: " + id);
        }
        sensorReadingRepository.deleteById(id);
    }
}
