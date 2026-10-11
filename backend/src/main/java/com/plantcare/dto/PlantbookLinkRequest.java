package com.plantcare.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlantbookLinkRequest {
    @NotBlank(message = "Species PID is required")
    @JsonAlias({"openplantbookPid", "openplantbook_pid"})
    private String pid;
}
