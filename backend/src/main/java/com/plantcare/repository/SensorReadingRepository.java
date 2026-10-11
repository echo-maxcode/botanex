package com.plantcare.repository;

import com.plantcare.model.SensorReading;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SensorReadingRepository extends JpaRepository<SensorReading, Long> {

    Optional<SensorReading> findFirstByPlantIdOrderByTimestampDesc(Long plantId);

    List<SensorReading> findByPlantIdOrderByTimestampDesc(Long plantId);

    boolean existsByPlantIdAndRainDetectedTrueAndTimestampAfter(Long plantId, LocalDateTime after);

    List<SensorReading> findByPlantIdAndTimestampAfterOrderByTimestampDesc(Long plantId, LocalDateTime after);

    @Modifying
    @Transactional
    void deleteByPlantId(Long plantId);
}
