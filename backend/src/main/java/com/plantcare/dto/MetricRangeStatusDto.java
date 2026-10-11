package com.plantcare.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MetricRangeStatusDto {
    private String metric;
    private String label;
    private Double currentValue;
    private String unit;
    private Double min;
    private Double max;
    private String status; // "LOW", "OK", "HIGH"
    private String message;
}
