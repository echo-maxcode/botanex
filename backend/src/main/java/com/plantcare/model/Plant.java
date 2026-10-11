package com.plantcare.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "plants")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Plant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Plant name is required")
    @Column(nullable = false)
    private String name;

    private String species;

    private String location;

    @NotNull(message = "Watering frequency is required")
    @Column(name = "watering_frequency")
    private Integer wateringFrequency; // In days

    @Column(name = "last_watered_date")
    private LocalDate lastWateredDate;

    @Column(name = "next_watering_date")
    private LocalDate nextWateringDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50, columnDefinition = "varchar(50)")
    private PlantStatus status;

    @Column(name = "status_reason")
    private String statusReason;

    @Column(name = "qr_code")
    private String qrCode;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "openplantbook_pid")
    private String openplantbookPid;
}
