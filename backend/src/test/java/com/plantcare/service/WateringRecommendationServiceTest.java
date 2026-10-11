package com.plantcare.service;

import com.plantcare.model.Plant;
import com.plantcare.model.PlantStatus;
import com.plantcare.model.SensorReading;
import com.plantcare.repository.SensorReadingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WateringRecommendationServiceTest {

    @Mock
    private SensorReadingRepository sensorReadingRepository;

    @Mock
    private WeatherService weatherService;

    @InjectMocks
    private WateringRecommendationService recommendationService;

    private final LocalDate today = LocalDate.of(2026, 9, 9);
    private Plant testPlant;

    @BeforeEach
    void setUp() {
        recommendationService.setSoilMoistureThreshold(30.0);
        recommendationService.setRainLookbackHours(24);

        testPlant = Plant.builder()
                .id(1L)
                .name("Monstera")
                .wateringFrequency(7)
                .lastWateredDate(today.minusDays(7))
                .nextWateringDate(today.plusDays(3))
                .status(PlantStatus.RECENTLY_WATERED)
                .build();
    }

    @Test
    void testRainDetectedInLast24HoursOverridesAllAndReturnsSkipWatering() {
        // Even if overdue and moisture is critically low (10%)
        testPlant.setNextWateringDate(today.minusDays(2)); // Overdue
        SensorReading reading = SensorReading.builder()
                .soilMoisture(10.0) // Low moisture
                .temperature(25.0)
                .humidity(60.0)
                .rainDetected(true)
                .timestamp(LocalDateTime.now())
                .build();

        PlantStatus status = recommendationService.determineStatus(
                testPlant,
                Optional.of(reading),
                true, // Rain detected in last 24h
                today
        );

        assertEquals(PlantStatus.SKIP_WATERING, status);
    }

    @Test
    void testLowSoilMoistureFlagsNeedsWaterEvenIfScheduleIsInFuture() {
        testPlant.setNextWateringDate(today.plusDays(5)); // Schedule says 5 days left

        SensorReading reading = SensorReading.builder()
                .soilMoisture(22.5) // Below 30.0% threshold
                .temperature(28.0)
                .humidity(40.0)
                .rainDetected(false)
                .timestamp(LocalDateTime.now())
                .build();

        PlantStatus status = recommendationService.determineStatus(
                testPlant,
                Optional.of(reading),
                false, // No rain
                today
        );

        assertEquals(PlantStatus.NEEDS_WATER, status);
    }

    @Test
    void testOverdueScheduledDateFlagsNeedsWaterEvenIfMoistureIsAdequate() {
        testPlant.setNextWateringDate(today.minusDays(1)); // 1 day overdue

        SensorReading reading = SensorReading.builder()
                .soilMoisture(55.0) // Above 30% threshold
                .temperature(22.0)
                .humidity(65.0)
                .rainDetected(false)
                .timestamp(LocalDateTime.now())
                .build();

        PlantStatus status = recommendationService.determineStatus(
                testPlant,
                Optional.of(reading),
                false,
                today
        );

        assertEquals(PlantStatus.NEEDS_WATER, status);
    }

    @Test
    void testDueTodayScheduledDateFlagsNeedsWater() {
        testPlant.setNextWateringDate(today); // Due today

        SensorReading reading = SensorReading.builder()
                .soilMoisture(45.0)
                .temperature(24.0)
                .humidity(50.0)
                .rainDetected(false)
                .timestamp(LocalDateTime.now())
                .build();

        PlantStatus status = recommendationService.determineStatus(
                testPlant,
                Optional.of(reading),
                false,
                today
        );

        assertEquals(PlantStatus.NEEDS_WATER, status);
    }

    @Test
    void testAdequateMoistureAndFutureScheduleReturnsRecentlyWatered() {
        testPlant.setNextWateringDate(today.plusDays(4)); // 4 days left

        SensorReading reading = SensorReading.builder()
                .soilMoisture(50.0) // Healthy moisture
                .temperature(23.0)
                .humidity(60.0)
                .rainDetected(false)
                .timestamp(LocalDateTime.now())
                .build();

        PlantStatus status = recommendationService.determineStatus(
                testPlant,
                Optional.of(reading),
                false,
                today
        );

        assertEquals(PlantStatus.RECENTLY_WATERED, status);
    }

    @Test
    void testEvaluateStatusUsingRepositoryMocks() {
        when(sensorReadingRepository.existsByPlantIdAndRainDetectedTrueAndTimestampAfter(eq(1L), any(LocalDateTime.class)))
                .thenReturn(true);

        PlantStatus status = recommendationService.evaluateStatus(testPlant);
        assertEquals(PlantStatus.SKIP_WATERING, status);
    }

    @Test
    void testPlantWateredTodayReturnsRecentlyWateredEvenIfHistoricalMoistureWasLow() {
        testPlant.setLastWateredDate(today);
        testPlant.setNextWateringDate(today.plusDays(7));

        SensorReading oldReading = SensorReading.builder()
                .soilMoisture(15.0)
                .temperature(25.0)
                .humidity(40.0)
                .rainDetected(false)
                .timestamp(today.minusDays(1).atStartOfDay())
                .build();

        PlantStatus status = recommendationService.determineStatus(
                testPlant,
                Optional.of(oldReading),
                false,
                today
        );

        assertEquals(PlantStatus.RECENTLY_WATERED, status);
    }

    @Test
    void testDuePlantWithRainForecastReturnsSkipSuggestedAndReason() {
        testPlant.setNextWateringDate(today.minusDays(1)); // Overdue
        when(weatherService.isRainForecastInNextDays()).thenReturn(true);
        when(weatherService.getRainForecastReason()).thenReturn(
                "Rain forecast on 2026-09-10 (75% probability, threshold: 60%) in the next 2 days. Skipping scheduled watering to conserve water."
        );

        WateringRecommendationService.RecommendationResult result = recommendationService.determineRecommendation(
                testPlant,
                Optional.empty(),
                false,
                today
        );

        assertEquals(PlantStatus.SKIP_SUGGESTED, result.status());
        assertNotNull(result.reason());
        assertTrue(result.reason().contains("Rain forecast"));
        assertTrue(result.reason().contains("75%"));
    }

    @Test
    void testDuePlantWithoutRainForecastReturnsNeedsWater() {
        testPlant.setNextWateringDate(today.minusDays(1)); // Overdue
        when(weatherService.isRainForecastInNextDays()).thenReturn(false);

        WateringRecommendationService.RecommendationResult result = recommendationService.determineRecommendation(
                testPlant,
                Optional.empty(),
                false,
                today
        );

        assertEquals(PlantStatus.NEEDS_WATER, result.status());
        assertTrue(result.reason().contains("due"));
    }

    @Test
    void testSensorRainOverridesRainForecastAndReturnsSkipWatering() {
        testPlant.setNextWateringDate(today.minusDays(1)); // Overdue

        // Sensor rain detected
        WateringRecommendationService.RecommendationResult result = recommendationService.determineRecommendation(
                testPlant,
                Optional.empty(),
                true, // Physical rain detected in last 24h
                today
        );

        assertEquals(PlantStatus.SKIP_WATERING, result.status());
        assertTrue(result.reason().contains("Rain detected by local sensor"));
        // WeatherService shouldn't even be called
        verify(weatherService, never()).isRainForecastInNextDays();
    }

    @Test
    void testNullNextWateringDateDoesNotProduceLiteralNullInReason() {
        testPlant.setNextWateringDate(null);
        SensorReading reading = SensorReading.builder()
                .soilMoisture(50.0)
                .temperature(23.0)
                .humidity(60.0)
                .rainDetected(false)
                .timestamp(LocalDateTime.now())
                .build();

        WateringRecommendationService.RecommendationResult result = recommendationService.determineRecommendation(
                testPlant,
                Optional.of(reading),
                false,
                today
        );

        assertEquals(PlantStatus.RECENTLY_WATERED, result.status());
        assertNotNull(result.reason());
        assertTrue(result.reason().contains("No watering scheduled yet"));
        org.junit.jupiter.api.Assertions.assertFalse(result.reason().contains("null"));
    }
}
