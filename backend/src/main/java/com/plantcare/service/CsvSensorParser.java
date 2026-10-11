package com.plantcare.service;

import org.springframework.stereotype.Component;

@Component
public class CsvSensorParser {

    public record ParsedSensorData(
            double soilMoisture,
            double temperature,
            double humidity,
            boolean rainDetected
    ) {}

    public ParsedSensorData parse(String line) {
        if (line == null || line.trim().isEmpty()) {
            throw new IllegalArgumentException("CSV line cannot be null or empty");
        }

        String[] tokens = line.trim().split(",");
        if (tokens.length != 4) {
            throw new IllegalArgumentException(
                    "Invalid CSV format. Expected 4 values (soilMoisture,temperature,humidity,rainDetected), but got: " + tokens.length
            );
        }

        try {
            double soilMoisture = Double.parseDouble(tokens[0].trim());
            double temperature = Double.parseDouble(tokens[1].trim());
            double humidity = Double.parseDouble(tokens[2].trim());
            boolean rainDetected = parseBoolean(tokens[3].trim());

            return new ParsedSensorData(soilMoisture, temperature, humidity, rainDetected);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid numeric value in CSV: " + line, e);
        }
    }

    private boolean parseBoolean(String value) {
        String lower = value.toLowerCase();
        if ("true".equals(lower) || "1".equals(lower) || "yes".equals(lower)) {
            return true;
        }
        if ("false".equals(lower) || "0".equals(lower) || "no".equals(lower)) {
            return false;
        }
        throw new IllegalArgumentException("Invalid boolean value for rainDetected: " + value);
    }
}
