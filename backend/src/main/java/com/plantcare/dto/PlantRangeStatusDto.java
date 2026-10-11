package com.plantcare.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlantRangeStatusDto {
    private Long plantId;
    private String plantName;
    private String species;
    private String pid;
    private boolean hasReading;
    @Builder.Default
    private List<MetricRangeStatusDto> metrics = new ArrayList<>();
    private String summary;
}
