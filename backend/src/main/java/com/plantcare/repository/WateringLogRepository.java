package com.plantcare.repository;

import com.plantcare.model.WateringLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface WateringLogRepository extends JpaRepository<WateringLog, Long> {
    List<WateringLog> findByPlantIdOrderByWateredDateDesc(Long plantId);
    List<WateringLog> findByUserIdOrderByWateredDateDesc(Long userId);
    java.util.Optional<WateringLog> findByIdAndUserId(Long id, Long userId);


    @Modifying
    @Transactional
    void deleteByPlantId(Long plantId);
}
