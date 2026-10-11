package com.plantcare.repository;

import com.plantcare.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Notification> findByPlantIdOrderByCreatedAtDesc(Long plantId);
    List<Notification> findAllByOrderByCreatedAtDesc();
    boolean existsByPlantIdAndTypeAndStatus(Long plantId, String type, String status);

    @Modifying
    @Transactional
    void deleteByPlantId(Long plantId);
}
