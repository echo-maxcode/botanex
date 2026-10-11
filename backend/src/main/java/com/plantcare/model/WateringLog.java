package com.plantcare.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "watering_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WateringLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Plant is required")
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "plant_id", nullable = false)
    private Plant plant;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "watered_date", nullable = false)
    private LocalDateTime wateredDate;

    @Column(name = "next_watering_date")
    private LocalDateTime nextWateringDate;

    @PrePersist
    protected void onCreate() {
        if (this.wateredDate == null) {
            this.wateredDate = LocalDateTime.now();
        }
    }
}
