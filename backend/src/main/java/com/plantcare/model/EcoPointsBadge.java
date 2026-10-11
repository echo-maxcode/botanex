package com.plantcare.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "eco_points_badges")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EcoPointsBadge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Badge name is required")
    @Column(nullable = false)
    private String name;

    private String criteria;

    @Column(name = "points_awarded", nullable = false)
    @Builder.Default
    private int pointsAwarded = 0;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id")
    private User user;
}
