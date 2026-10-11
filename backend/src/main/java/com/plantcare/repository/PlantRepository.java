package com.plantcare.repository;

import com.plantcare.model.Plant;
import com.plantcare.model.PlantStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PlantRepository extends JpaRepository<Plant, Long> {
    List<Plant> findByStatus(PlantStatus status);
    List<Plant> findByNextWateringDateLessThanEqual(LocalDate date);
    List<Plant> findByLocationIgnoreCase(String location);
    List<Plant> findByUserId(Long userId);
    java.util.Optional<Plant> findByIdAndUserId(Long id, Long userId);
    long countByUserId(Long userId);
}
