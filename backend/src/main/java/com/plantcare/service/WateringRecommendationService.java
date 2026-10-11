package com.plantcare.service;

import com.plantcare.model.Plant;
import com.plantcare.model.PlantStatus;
import com.plantcare.model.SensorReading;
import com.plantcare.repository.SensorReadingRepository;
import lombok.Getter;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
@Getter
@Setter
public class WateringRecommendationService {

    public record RecommendationResult(
            PlantStatus status,
            String reason
    ) {}

    private final SensorReadingRepository sensorReadingRepository;
    private final WeatherService weatherService;

    @Value("${plantcare.watering.soil-moisture-threshold:30.0}")
    private double soilMoistureThreshold = 30.0;

    @Value("${plantcare.watering.rain-lookback-hours:24}")
    private int rainLookbackHours = 24;

    @Autowired
    public WateringRecommendationService(
            SensorReadingRepository sensorReadingRepository,
            WeatherService weatherService) {
        this.sensorReadingRepository = sensorReadingRepository;
        this.weatherService = weatherService;
    }

    /**
     * Evaluates the recommended plant status and reason by querying current DB readings, schedule, and weather forecast.
     */
    public RecommendationResult evaluate(Plant plant) {
        if (plant == null) {
            return new RecommendationResult(PlantStatus.RECENTLY_WATERED, "Plant is not specified");
        }

        LocalDateTime rainCutoff = LocalDateTime.now().minusHours(rainLookbackHours);
        boolean rainDetectedRecently = plant.getId() != null &&
                sensorReadingRepository.existsByPlantIdAndRainDetectedTrueAndTimestampAfter(plant.getId(), rainCutoff);

        Optional<SensorReading> latestReading = plant.getId() != null
                ? sensorReadingRepository.findFirstByPlantIdOrderByTimestampDesc(plant.getId())
                : Optional.empty();

        return determineRecommendation(plant, latestReading, rainDetectedRecently, LocalDate.now());
    }

    /**
     * Backward-compatible evaluation returning only the status enum.
     */
    public PlantStatus evaluateStatus(Plant plant) {
        return evaluate(plant).status();
    }

    /**
     * Backward-compatible method signature used in tests.
     */
    public PlantStatus determineStatus(
            Plant plant,
            Optional<SensorReading> latestReading,
            boolean rainDetectedRecently,
            LocalDate currentDate) {
        return determineRecommendation(plant, latestReading, rainDetectedRecently, currentDate).status();
    }

    /**
     * Core multi-factor recommendation logic.
     *
     * 1. If physical rain detected by sensor in last 24h -> SKIP_WATERING.
     * 1b. If plant was watered today -> RECENTLY_WATERED.
     * 2. If plant is due for watering (past scheduled date OR soil moisture < threshold):
     *    - If Open-Meteo weather forecast predicts rain above threshold in next 2 days -> SKIP_SUGGESTED with forecast reason.
     *    - Else -> NEEDS_WATER with reason.
     * 3. Else -> RECENTLY_WATERED with reason.
     */
    public RecommendationResult determineRecommendation(
            Plant plant,
            Optional<SensorReading> latestReading,
            boolean rainDetectedRecently,
            LocalDate currentDate) {

        // Rule 1: Physical rain detected by hardware sensor in last 24 hours overrides everything
        if (rainDetectedRecently) {
            return new RecommendationResult(
                    PlantStatus.SKIP_WATERING,
                    "Rain detected by local sensor in the last 24 hours. Natural watering occurred."
            );
        }

        // Rule 1b: Plant was watered today -> RECENTLY_WATERED
        if (plant.getLastWateredDate() != null && !plant.getLastWateredDate().isBefore(currentDate)) {
            return new RecommendationResult(
                    PlantStatus.RECENTLY_WATERED,
                    "Plant was already watered today (" + plant.getLastWateredDate() + ")."
            );
        }

        // Rule 2a: Past scheduled next watering date (overdue or due today)
        boolean pastScheduledDate = plant.getNextWateringDate() != null &&
                !plant.getNextWateringDate().isAfter(currentDate);

        // Rule 2b: Latest soil moisture reading is below configurable threshold
        boolean lowMoisture = latestReading
                .filter(reading -> plant.getLastWateredDate() == null ||
                        reading.getTimestamp() == null ||
                        !reading.getTimestamp().isBefore(plant.getLastWateredDate().atStartOfDay()))
                .map(reading -> reading.getSoilMoisture() < soilMoistureThreshold)
                .orElse(false);

        boolean isDue = pastScheduledDate || lowMoisture;

        if (isDue) {
            // Check weather forecast for upcoming rain
            if (weatherService != null && weatherService.isRainForecastInNextDays()) {
                String forecastReason = weatherService.getRainForecastReason();
                String message = forecastReason != null
                        ? forecastReason
                        : "Rain is forecast in the next 2 days. Skipping scheduled watering to conserve water.";
                return new RecommendationResult(PlantStatus.SKIP_SUGGESTED, message);
            }

            String dueReason;
            if (pastScheduledDate && lowMoisture && latestReading.isPresent()) {
                dueReason = String.format(
                        "Watering is due (scheduled for %s) and soil moisture is low (%.1f%% < %.1f%%).",
                        plant.getNextWateringDate(), latestReading.get().getSoilMoisture(), soilMoistureThreshold
                );
            } else if (pastScheduledDate) {
                dueReason = String.format("Watering schedule is due (scheduled date: %s).", plant.getNextWateringDate());
            } else {
                dueReason = String.format(
                        "Soil moisture is critically low (%.1f%% < %.1f%%).",
                        latestReading.get().getSoilMoisture(), soilMoistureThreshold
                );
            }

            return new RecommendationResult(PlantStatus.NEEDS_WATER, dueReason);
        }

        // Rule 3: Otherwise recently watered / good
        String optimalReason = plant.getNextWateringDate() != null
                ? String.format("Soil moisture is optimal and next scheduled watering is on %s.", plant.getNextWateringDate())
                : "Soil moisture is optimal. No watering scheduled yet.";
        return new RecommendationResult(PlantStatus.RECENTLY_WATERED, optimalReason);
    }
}
