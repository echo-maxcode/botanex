package com.plantcare.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "species_care_profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SpeciesCareProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pid", unique = true, nullable = false, length = 100)
    private String pid;

    @Column(name = "display_pid", nullable = false, length = 100)
    private String displayPid;

    @Column(name = "alias", length = 150)
    private String alias;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "min_temp")
    private Double minTemp;

    @Column(name = "max_temp")
    private Double maxTemp;

    @Column(name = "min_soil_moist")
    private Double minSoilMoist;

    @Column(name = "max_soil_moist")
    private Double maxSoilMoist;

    @Column(name = "min_env_humid")
    private Double minEnvHumid;

    @Column(name = "max_env_humid")
    private Double maxEnvHumid;

    @Column(name = "fertilization_tip", columnDefinition = "TEXT")
    private String fertilizationTip;

    @Column(name = "care_tips", columnDefinition = "TEXT")
    private String careTips;

    @Column(name = "fetched_at", nullable = false)
    private LocalDateTime fetchedAt;
}
