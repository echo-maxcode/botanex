package com.plantcare.service;

import com.plantcare.dto.WeatherForecastDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WeatherServiceTest {

    @Mock
    private RestTemplate restTemplate;

    private WeatherService weatherService;

    @BeforeEach
    void setUp() {
        weatherService = new WeatherService(restTemplate);
        weatherService.setLatitude(37.7749);
        weatherService.setLongitude(-122.4194);
        weatherService.setRainProbabilityThreshold(60.0);
        weatherService.setCacheDurationMinutes(60);
        weatherService.setForecastDaysToCheck(2);
    }

    private WeatherForecastDto createMockForecast(List<Integer> probabilities, List<String> dates) {
        return WeatherForecastDto.builder()
                .latitude(37.7749)
                .longitude(-122.4194)
                .timezone("America/Los_Angeles")
                .dailyUnits(WeatherForecastDto.DailyUnits.builder()
                        .time("iso8601")
                        .precipitationProbabilityMax("%")
                        .build())
                .daily(WeatherForecastDto.Daily.builder()
                        .time(dates)
                        .precipitationProbabilityMax(probabilities)
                        .build())
                .build();
    }

    @Test
    void testGetForecastSuccessAndCaching() {
        WeatherForecastDto mockDto = createMockForecast(
                List.of(10, 75, 20),
                List.of("2026-09-18", "2026-09-19", "2026-09-20")
        );

        when(restTemplate.getForObject(anyString(), eq(WeatherForecastDto.class), anyDouble(), anyDouble()))
                .thenReturn(mockDto);

        // First call should hit RestTemplate
        WeatherForecastDto firstCall = weatherService.getForecast();
        assertNotNull(firstCall);
        assertEquals(37.7749, firstCall.getLatitude());
        assertEquals(3, firstCall.getDaily().getPrecipitationProbabilityMax().size());

        // Second call should return cached object without hitting RestTemplate again
        WeatherForecastDto secondCall = weatherService.getForecast();
        assertSame(firstCall, secondCall);

        verify(restTemplate, times(1)).getForObject(anyString(), eq(WeatherForecastDto.class), anyDouble(), anyDouble());
    }

    @Test
    void testIsRainForecastInNextDaysTrueWhenAboveThreshold() {
        // Day 1 (today): 10%, Day 2 (tomorrow): 75% (>= 60%), Day 3: 20%
        WeatherForecastDto mockDto = createMockForecast(
                List.of(10, 75, 20),
                List.of("2026-09-18", "2026-09-19", "2026-09-20")
        );

        when(restTemplate.getForObject(anyString(), eq(WeatherForecastDto.class), anyDouble(), anyDouble()))
                .thenReturn(mockDto);

        assertTrue(weatherService.isRainForecastInNextDays());
        String reason = weatherService.getRainForecastReason();
        assertNotNull(reason);
        assertTrue(reason.contains("2026-09-19"));
        assertTrue(reason.contains("75%"));
        assertTrue(reason.contains("60%"));
    }

    @Test
    void testIsRainForecastInNextDaysFalseWhenBelowThreshold() {
        // Day 1: 20%, Day 2: 45% (< 60%), Day 3: 80% (outside 2-day window)
        WeatherForecastDto mockDto = createMockForecast(
                List.of(20, 45, 80),
                List.of("2026-09-18", "2026-09-19", "2026-09-20")
        );

        when(restTemplate.getForObject(anyString(), eq(WeatherForecastDto.class), anyDouble(), anyDouble()))
                .thenReturn(mockDto);

        assertFalse(weatherService.isRainForecastInNextDays());
        assertNull(weatherService.getRainForecastReason());
    }

    @Test
    void testApiFailureFallsBackGracefullyWithoutCrashing() {
        when(restTemplate.getForObject(anyString(), eq(WeatherForecastDto.class), anyDouble(), anyDouble()))
                .thenThrow(new RestClientException("Connection timed out"));

        WeatherForecastDto fallback = weatherService.getForecast();
        assertNotNull(fallback);
        assertFalse(weatherService.isRainForecastInNextDays());
        assertNull(weatherService.getRainForecastReason());
    }

    @Test
    void testApiFailureUsesStaleCacheIfAvailable() {
        WeatherForecastDto mockDto = createMockForecast(
                List.of(80, 20, 10),
                List.of("2026-09-18", "2026-09-19", "2026-09-20")
        );

        when(restTemplate.getForObject(anyString(), eq(WeatherForecastDto.class), anyDouble(), anyDouble()))
                .thenReturn(mockDto);

        // Fetch initial forecast
        WeatherForecastDto initial = weatherService.getForecast();
        assertNotNull(initial);

        // Clear cache timestamp but keep cachedForecast by setting duration to 0
        weatherService.setCacheDurationMinutes(0);

        // Subsequent call fails
        when(restTemplate.getForObject(anyString(), eq(WeatherForecastDto.class), anyDouble(), anyDouble()))
                .thenThrow(new RestClientException("503 Service Unavailable"));

        WeatherForecastDto stale = weatherService.getForecast();
        assertNotNull(stale);
        assertEquals(mockDto, stale);
    }
}
