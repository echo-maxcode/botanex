package com.plantcare.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class WeatherForecastDto {

    private double latitude;
    private double longitude;
    private String timezone;
    private Double elevation;

    @JsonProperty("daily_units")
    private DailyUnits dailyUnits;

    private Daily daily;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class DailyUnits {
        private String time;

        @JsonProperty("precipitation_probability_max")
        private String precipitationProbabilityMax;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Daily {
        private List<String> time;

        @JsonProperty("precipitation_probability_max")
        private List<Integer> precipitationProbabilityMax;
    }

    /**
     * Determines if any day within the given window (e.g. next 2 days)
     * has maximum precipitation probability >= threshold.
     */
    public boolean hasRainInNextDays(double threshold, int daysToCheck) {
        if (daily == null || daily.getPrecipitationProbabilityMax() == null) {
            return false;
        }
        List<Integer> probs = daily.getPrecipitationProbabilityMax();
        int limit = Math.min(daysToCheck, probs.size());
        for (int i = 0; i < limit; i++) {
            Integer prob = probs.get(i);
            if (prob != null && prob >= threshold) {
                return true;
            }
        }
        return false;
    }

    /**
     * Finds the maximum precipitation probability in the window.
     */
    public Integer getMaxRainProbability(int daysToCheck) {
        if (daily == null || daily.getPrecipitationProbabilityMax() == null) {
            return 0;
        }
        List<Integer> probs = daily.getPrecipitationProbabilityMax();
        int limit = Math.min(daysToCheck, probs.size());
        int max = 0;
        for (int i = 0; i < limit; i++) {
            Integer prob = probs.get(i);
            if (prob != null && prob > max) {
                max = prob;
            }
        }
        return max;
    }

    /**
     * Returns the date string of the first day in the window meeting or exceeding threshold.
     */
    public String getRainForecastDate(double threshold, int daysToCheck) {
        if (daily == null || daily.getPrecipitationProbabilityMax() == null || daily.getTime() == null) {
            return null;
        }
        List<Integer> probs = daily.getPrecipitationProbabilityMax();
        List<String> times = daily.getTime();
        int limit = Math.min(daysToCheck, Math.min(probs.size(), times.size()));
        for (int i = 0; i < limit; i++) {
            Integer prob = probs.get(i);
            if (prob != null && prob >= threshold) {
                return times.get(i);
            }
        }
        return null;
    }
}
