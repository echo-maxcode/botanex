package com.plantcare.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "sensor_readings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SensorReading {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Plant association is required")
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "plant_id", nullable = false)
    private Plant plant;

    @Column(name = "soil_moisture", nullable = false)
    private double soilMoisture;

    @Column(nullable = false)
    private double temperature;

    @Column(nullable = false)
    private double humidity;

    @Column(name = "rain_detected", nullable = false)
    @Builder.Default
    private boolean rainDetected = false;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        if (this.timestamp == null) {
            this.timestamp = LocalDateTime.now();
        }
    }
}
