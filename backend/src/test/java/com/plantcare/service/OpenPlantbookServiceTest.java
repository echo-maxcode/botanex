package com.plantcare.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plantcare.dto.MetricRangeStatusDto;
import com.plantcare.dto.PlantRangeStatusDto;
import com.plantcare.dto.PlantSearchResultDto;
import com.plantcare.model.Plant;
import com.plantcare.model.SensorReading;
import com.plantcare.model.SpeciesCareProfile;
import com.plantcare.model.User;
import com.plantcare.repository.PlantRepository;
import com.plantcare.repository.SensorReadingRepository;
import com.plantcare.repository.SpeciesCareProfileRepository;
import com.plantcare.security.SecurityUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OpenPlantbookServiceTest {

    @Mock
    private SpeciesCareProfileRepository profileRepository;

    @Mock
    private PlantRepository plantRepository;

    @Mock
    private SensorReadingRepository sensorReadingRepository;

    @Mock
    private SecurityUtils securityUtils;

    @Mock
    private RestTemplate restTemplate;

    private ObjectMapper objectMapper;
    private OpenPlantbookService service;
    private User mockUser;
    private Plant mockPlant;
    private SpeciesCareProfile mockProfile;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        service = new OpenPlantbookService(
                profileRepository,
                plantRepository,
                sensorReadingRepository,
                securityUtils,
                objectMapper,
                restTemplate
        );
        service.setBaseUrl("https://open.plantbook.io/api/v1");
        service.setClientId("test-client-id");
        service.setClientSecret("test-client-secret");
        service.setCacheTtlHours(24);

        mockUser = User.builder().id(1L).email("user@example.com").build();
        mockPlant = Plant.builder()
                .id(1L)
                .name("Monstera Deliciosa")
                .species("Monstera deliciosa")
                .openplantbookPid("monstera deliciosa")
                .user(mockUser)
                .build();

        mockProfile = SpeciesCareProfile.builder()
                .id(10L)
                .pid("monstera deliciosa")
                .displayPid("Monstera deliciosa")
                .alias("Swiss Cheese Plant")
                .minTemp(18.0)
                .maxTemp(30.0)
                .minSoilMoist(40.0)
                .maxSoilMoist(70.0)
                .minEnvHumid(50.0)
                .maxEnvHumid(80.0)
                .fertilizationTip("Diluted liquid fertilizer once a month in spring/summer.")
                .careTips("Watering: Water when top 2 inches dry.\nSunlight: Bright indirect light.")
                .fetchedAt(LocalDateTime.now())
                .build();
    }

    // ==========================================
    // 1. Range Comparison Unit Tests (LOW, OK, HIGH)
    // ==========================================

    @Test
    void testEvaluateMetric_LowOkHigh() {
        // Test LOW: 30.0% < min 40.0%
        MetricRangeStatusDto lowResult = service.evaluateMetric("soilMoisture", "Soil Moisture", 30.0, "%", 40.0, 70.0);
        assertEquals("LOW", lowResult.getStatus());
        assertEquals(30.0, lowResult.getCurrentValue());
        assertTrue(lowResult.getMessage().contains("low at 30.0%"));

        // Test OK: 55.0% is between min 40.0% and max 70.0%
        MetricRangeStatusDto okResult = service.evaluateMetric("soilMoisture", "Soil Moisture", 55.0, "%", 40.0, 70.0);
        assertEquals("OK", okResult.getStatus());
        assertEquals(55.0, okResult.getCurrentValue());
        assertTrue(okResult.getMessage().contains("optimal at 55.0%"));

        // Test HIGH: 85.0% > max 70.0%
        MetricRangeStatusDto highResult = service.evaluateMetric("soilMoisture", "Soil Moisture", 85.0, "%", 40.0, 70.0);
        assertEquals("HIGH", highResult.getStatus());
        assertEquals(85.0, highResult.getCurrentValue());
        assertTrue(highResult.getMessage().contains("high at 85.0%"));

        // Test boundary values
        MetricRangeStatusDto boundaryMin = service.evaluateMetric("soilMoisture", "Soil Moisture", 40.0, "%", 40.0, 70.0);
        assertEquals("OK", boundaryMin.getStatus());

        MetricRangeStatusDto boundaryMax = service.evaluateMetric("soilMoisture", "Soil Moisture", 70.0, "%", 40.0, 70.0);
        assertEquals("OK", boundaryMax.getStatus());
    }

    @Test
    void testEvaluateMetric_MissingRangeCases() {
        // Missing min range (only max is set)
        MetricRangeStatusDto maxOnlyOk = service.evaluateMetric("temp", "Temp", 25.0, "°C", null, 30.0);
        assertEquals("OK", maxOnlyOk.getStatus());

        MetricRangeStatusDto maxOnlyHigh = service.evaluateMetric("temp", "Temp", 35.0, "°C", null, 30.0);
        assertEquals("HIGH", maxOnlyHigh.getStatus());

        // Missing max range (only min is set)
        MetricRangeStatusDto minOnlyOk = service.evaluateMetric("temp", "Temp", 20.0, "°C", 15.0, null);
        assertEquals("OK", minOnlyOk.getStatus());

        MetricRangeStatusDto minOnlyLow = service.evaluateMetric("temp", "Temp", 10.0, "°C", 15.0, null);
        assertEquals("LOW", minOnlyLow.getStatus());

        // Sensor reading is null (no reading yet)
        MetricRangeStatusDto noReading = service.evaluateMetric("humidity", "Humidity", null, "%", 50.0, 80.0);
        assertNull(noReading.getCurrentValue());
        assertNull(noReading.getStatus());
        assertTrue(noReading.getMessage().contains("No sensor reading recorded yet"));
    }

    @Test
    void testRangeStatus_SkipsMetricsWithNoRange() {
        // Profile with ONLY temperature defined, soilMoisture and humidity ranges are NULL
        SpeciesCareProfile tempOnlyProfile = SpeciesCareProfile.builder()
                .pid("cactus")
                .displayPid("Cactus")
                .minTemp(15.0)
                .maxTemp(35.0)
                .minSoilMoist(null)
                .maxSoilMoist(null)
                .minEnvHumid(null)
                .maxEnvHumid(null)
                .fetchedAt(LocalDateTime.now())
                .build();

        when(securityUtils.getCurrentUser()).thenReturn(mockUser);
        when(plantRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(mockPlant));
        when(profileRepository.findByPidIgnoreCase("monstera deliciosa")).thenReturn(Optional.of(tempOnlyProfile));

        SensorReading reading = SensorReading.builder()
                .plant(mockPlant)
                .soilMoisture(50.0)
                .temperature(22.0)
                .humidity(60.0)
                .timestamp(LocalDateTime.now())
                .build();
        when(sensorReadingRepository.findFirstByPlantIdOrderByTimestampDesc(1L)).thenReturn(Optional.of(reading));

        PlantRangeStatusDto result = service.getRangeStatusForPlant(1L);

        assertNotNull(result);
        assertEquals(1, result.getMetrics().size(), "Only temperature should be evaluated; missing ranges skipped");
        assertEquals("temperature", result.getMetrics().get(0).getMetric());
        assertEquals("OK", result.getMetrics().get(0).getStatus());
    }

    @Test
    void testRangeStatus_FullEvaluationAgainstLiveReading() {
        when(securityUtils.getCurrentUser()).thenReturn(mockUser);
        when(plantRepository.findByIdAndUserId(1L, 1L)).thenReturn(Optional.of(mockPlant));
        when(profileRepository.findByPidIgnoreCase("monstera deliciosa")).thenReturn(Optional.of(mockProfile));

        // Sensor reading:
        // Soil Moisture: 68.2% (ideal: 40-70) -> OK
        // Temperature: 32.5°C (ideal: 18-30) -> HIGH
        // Humidity: 45.0% (ideal: 50-80) -> LOW
        SensorReading reading = SensorReading.builder()
                .plant(mockPlant)
                .soilMoisture(68.2)
                .temperature(32.5)
                .humidity(45.0)
                .timestamp(LocalDateTime.now())
                .build();
        when(sensorReadingRepository.findFirstByPlantIdOrderByTimestampDesc(1L)).thenReturn(Optional.of(reading));

        PlantRangeStatusDto result = service.getRangeStatusForPlant(1L);

        assertNotNull(result);
        assertTrue(result.isHasReading());
        assertEquals(3, result.getMetrics().size());

        MetricRangeStatusDto moisture = result.getMetrics().stream()
                .filter(m -> "soilMoisture".equals(m.getMetric())).findFirst().orElseThrow();
        assertEquals("OK", moisture.getStatus());
        assertEquals(68.2, moisture.getCurrentValue());

        MetricRangeStatusDto temp = result.getMetrics().stream()
                .filter(m -> "temperature".equals(m.getMetric())).findFirst().orElseThrow();
        assertEquals("HIGH", temp.getStatus());
        assertEquals(32.5, temp.getCurrentValue());

        MetricRangeStatusDto humid = result.getMetrics().stream()
                .filter(m -> "humidity".equals(m.getMetric())).findFirst().orElseThrow();
        assertEquals("LOW", humid.getStatus());
        assertEquals(45.0, humid.getCurrentValue());

        assertTrue(result.getSummary().contains("Attention needed"));
    }

    @Test
    void testRangeStatus_PlantNotLinkedThrowsProfileNotLinkedException() {
        Plant unlinkedPlant = Plant.builder()
                .id(2L)
                .name("Unlinked Plant")
                .openplantbookPid(null)
                .user(mockUser)
                .build();

        when(securityUtils.getCurrentUser()).thenReturn(mockUser);
        when(plantRepository.findByIdAndUserId(2L, 1L)).thenReturn(Optional.of(unlinkedPlant));

        assertThrows(ProfileNotLinkedException.class, () -> service.getRangeStatusForPlant(2L));
    }

    // ==========================================
    // 2. Caching & Graceful Failure Tests
    // ==========================================

    @Test
    void testGetPlantDetails_ReturnsCachedProfileWithoutCallingApi() {
        when(profileRepository.findByPidIgnoreCase("monstera deliciosa")).thenReturn(Optional.of(mockProfile));

        SpeciesCareProfile result = service.getPlantDetails("monstera deliciosa");

        assertNotNull(result);
        assertEquals("monstera deliciosa", result.getPid());
        verify(restTemplate, never()).exchange(any(), any(), any(), eq(String.class));
    }

    @Test
    void testGetPlantDetails_FallsBackToStaleProfileWhenApiUnreachable() {
        // Cache profile is older than 24h
        SpeciesCareProfile staleProfile = SpeciesCareProfile.builder()
                .pid("monstera deliciosa")
                .displayPid("Monstera deliciosa")
                .fetchedAt(LocalDateTime.now().minusHours(30))
                .build();

        when(profileRepository.findByPidIgnoreCase("monstera deliciosa")).thenReturn(Optional.of(staleProfile));

        // Mock token success
        when(restTemplate.postForEntity(anyString(), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok("{\"access_token\":\"mock-token\",\"expires_in\":3600}"));

        // Detail call fails due to network outage
        when(restTemplate.exchange(any(), any(), any(), eq(String.class)))
                .thenThrow(new ResourceAccessException("I/O error on GET request: Connection timed out"));

        // Should NOT crash, returns stale profile gracefully
        SpeciesCareProfile fallback = service.getPlantDetails("monstera deliciosa");

        assertNotNull(fallback);
        assertEquals("monstera deliciosa", fallback.getPid());
    }

    @Test
    void testGetPlantDetails_ThrowsWhenNotConfiguredAndNoCache() {
        service.setClientId("");
        service.setClientSecret("");

        when(profileRepository.findByPidIgnoreCase("unknown")).thenReturn(Optional.empty());

        assertThrows(OpenPlantbookNotConfiguredException.class, () -> service.getPlantDetails("unknown"));
    }

    @Test
    void testSearchPlants_ShortQueryReturnsEmptyListImmediately() {
        List<PlantSearchResultDto> empty1 = service.searchPlants("ab");
        List<PlantSearchResultDto> empty2 = service.searchPlants(null);
        List<PlantSearchResultDto> empty3 = service.searchPlants("   ");

        assertTrue(empty1.isEmpty());
        assertTrue(empty2.isEmpty());
        assertTrue(empty3.isEmpty());

        verify(restTemplate, never()).exchange(any(), any(), any(), eq(String.class));
    }

    @Test
    void testSearchPlants_RateLimit429HandledGracefully() {
        // Mock token
        when(restTemplate.postForEntity(anyString(), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok("{\"access_token\":\"mock-token\",\"expires_in\":3600}"));

        // Search returns 429
        when(restTemplate.exchange(anyString(), any(), any(), eq(String.class)))
                .thenThrow(new HttpClientErrorException(HttpStatus.TOO_MANY_REQUESTS, "Too Many Requests"));

        OpenPlantbookException exception = assertThrows(OpenPlantbookException.class, () -> service.searchPlants("monstera"));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, exception.getStatus());
        assertTrue(exception.getMessage().contains("rate limit"));
    }

    @Test
    void testAutoLinkPlantToSpecies_MatchesKnownSpeciesInDb() {
        SpeciesCareProfile ficusProfile = SpeciesCareProfile.builder()
                .pid("ficus lyrata")
                .displayPid("Ficus lyrata")
                .alias("Fiddle Leaf Fig")
                .build();

        when(profileRepository.findByPidIgnoreCase("ficus lyrata")).thenReturn(Optional.of(ficusProfile));

        Plant unlinkedPlant = Plant.builder()
                .id(5L)
                .name("My Fig")
                .species("Ficus lyrata")
                .openplantbookPid(null)
                .build();

        Optional<SpeciesCareProfile> linked = service.autoLinkPlantToSpecies(unlinkedPlant);

        assertTrue(linked.isPresent());
        assertEquals("ficus lyrata", linked.get().getPid());
        assertEquals("ficus lyrata", unlinkedPlant.getOpenplantbookPid());
        verify(plantRepository).save(unlinkedPlant);
    }

    @Test
    void testIsPidMatchingSpecies_ReturnsTrueWhenMatching() {
        assertTrue(service.isPidMatchingSpecies("ficus lyrata", "Ficus lyrata"));
        assertTrue(service.isPidMatchingSpecies("monstera deliciosa", "monstera deliciosa"));
    }

    @Test
    void testIsPidMatchingSpecies_ReturnsFalseWhenSpeciesChanged() {
        assertFalse(service.isPidMatchingSpecies("monstera deliciosa", "Ficus lyrata"));
        assertFalse(service.isPidMatchingSpecies(null, "Ficus lyrata"));
    }
}
