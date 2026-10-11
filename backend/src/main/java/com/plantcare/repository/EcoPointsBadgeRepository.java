package com.plantcare.repository;

import com.plantcare.model.EcoPointsBadge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EcoPointsBadgeRepository extends JpaRepository<EcoPointsBadge, Long> {
    List<EcoPointsBadge> findByUserId(Long userId);
}
