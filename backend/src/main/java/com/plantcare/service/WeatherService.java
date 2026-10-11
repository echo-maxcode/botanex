package com.plantcare.service;

import com.plantcare.dto.WeatherForecastDto;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.LocalDateTime;

@Service
@Slf4j
@Getter
@Setter
public class WeatherService {

    private static final String OPEN_METEO_URL =
            "https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&daily=precipitation_probability_max&forecast_days=3";

    @Value("${weather.latitude:37.7749}")
    private double latitude = 37.7749;

    @Value("${weather.longitude:-122.4194}")
    private double longitude = -122.4194;

    @Value("${weather.rain-probability-threshold:60.0}")
    private double rainProbabilityThreshold = 60.0;

    @Value("${weather.cache-duration-minutes:60}")
    private long cacheDurationMinutes = 60L;

    @Value("${weather.forecast-days-to-check:2}")
    private int forecastDaysToCheck = 2;

    private RestTemplate restTemplate;

    // In-memory cache fields
    private volatile WeatherForecastDto cachedForecast;
    private volatile LocalDateTime lastFetchTime;
    private final Object cacheLock = new Object();

    public WeatherService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(5));
        this.restTemplate = new RestTemplate(factory);
    }

    public WeatherService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Retrieves the 3-day weather forecast, utilizing an in-memory cache for at least 1 hour.
     * If the cache is expired, fetches fresh data from Open-Meteo.
     * If the API call fails, logs a warning and falls back gracefully to previous cache or safe default.
     */
    public WeatherForecastDto getForecast() {
        if (isCacheValid()) {
            log.debug("Returning cached weather forecast from {}", lastFetchTime);
            return cachedForecast;
        }

        synchronized (cacheLock) {
            if (isCacheValid()) {
                return cachedForecast;
            }

            try {
                log.info("Fetching fresh weather forecast from Open-Meteo (lat: {}, lon: {})", latitude, longitude);
                WeatherForecastDto response = restTemplate.getForObject(
                        OPEN_METEO_URL,
                        WeatherForecastDto.class,
                        latitude,
                        longitude
                );

                if (response != null) {
                    this.cachedForecast = response;
                    this.lastFetchTime = LocalDateTime.now();
                    log.info("Successfully fetched and cached weather forecast for next 3 days");
                    return this.cachedForecast;
                }
            } catch (RestClientException e) {
                log.warn("Failed to fetch weather forecast from Open-Meteo: {}. Falling back gracefully.", e.getMessage());
            } catch (Exception e) {
                log.error("Unexpected error fetching weather forecast: {}. Falling back gracefully.", e.getMessage(), e);
            }

            // Fallback: If previous cache exists, use it even if stale; otherwise return fallback empty forecast
            if (this.cachedForecast != null) {
                log.warn("Using stale cached forecast as fallback");
                return this.cachedForecast;
            }

            return createFallbackForecast();
        }
    }

    /**
     * Checks if rain is forecast in the next 2 days above the configured threshold.
     */
    public boolean isRainForecastInNextDays() {
        WeatherForecastDto forecast = getForecast();
        return forecast != null && forecast.hasRainInNextDays(rainProbabilityThreshold, forecastDaysToCheck);
    }

    /**
     * Returns a human-readable explanation when rain is forecast above threshold.
     */
    public String getRainForecastReason() {
        WeatherForecastDto forecast = getForecast();
        if (forecast != null && forecast.hasRainInNextDays(rainProbabilityThreshold, forecastDaysToCheck)) {
            String date = forecast.getRainForecastDate(rainProbabilityThreshold, forecastDaysToCheck);
            Integer maxProb = forecast.getMaxRainProbability(forecastDaysToCheck);
            if (date != null) {
                return String.format(
                        "Rain forecast on %s (%d%% probability, threshold: %.0f%%) in the next %d days. Skipping scheduled watering to conserve water.",
                        date, maxProb, rainProbabilityThreshold, forecastDaysToCheck
                );
            } else {
                return String.format(
                        "Rain forecast (%d%% probability, threshold: %.0f%%) in the next %d days. Skipping scheduled watering to conserve water.",
                        maxProb, rainProbabilityThreshold, forecastDaysToCheck
                );
            }
        }
        return null;
    }

    public void clearCache() {
        synchronized (cacheLock) {
            this.cachedForecast = null;
            this.lastFetchTime = null;
        }
    }

    private boolean isCacheValid() {
        return cachedForecast != null &&
                lastFetchTime != null &&
                LocalDateTime.now().isBefore(lastFetchTime.plusMinutes(cacheDurationMinutes));
    }

    private WeatherForecastDto createFallbackForecast() {
        return WeatherForecastDto.builder()
                .latitude(latitude)
                .longitude(longitude)
                .timezone("UTC")
                .daily(WeatherForecastDto.Daily.builder()
                        .time(java.util.List.of())
                        .precipitationProbabilityMax(java.util.List.of())
                        .build())
                .build();
    }
}
