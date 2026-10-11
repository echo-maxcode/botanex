package com.plantcare.service;

import com.plantcare.model.EcoPointsBadge;
import com.plantcare.model.User;
import com.plantcare.repository.EcoPointsBadgeRepository;
import com.plantcare.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class EcoPointsBadgeService {

    private final EcoPointsBadgeRepository badgeRepository;
    private final UserRepository userRepository;

    public List<EcoPointsBadge> getAllBadges() {
        return badgeRepository.findAll();
    }

    public Optional<EcoPointsBadge> getBadgeById(Long id) {
        return badgeRepository.findById(id);
    }

    public List<EcoPointsBadge> getBadgesByUserId(Long userId) {
        return badgeRepository.findByUserId(userId);
    }

    @Transactional
    public EcoPointsBadge createBadge(EcoPointsBadge badge) {
        if (badge.getUser() != null && badge.getUser().getId() != null) {
            User user = userRepository.findById(badge.getUser().getId())
                    .orElse(null);
            badge.setUser(user);
        }
        return badgeRepository.save(badge);
    }

    @Transactional
    public EcoPointsBadge updateBadge(Long id, EcoPointsBadge badgeDetails) {
        EcoPointsBadge badge = badgeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Badge not found with id: " + id));

        badge.setName(badgeDetails.getName());
        badge.setCriteria(badgeDetails.getCriteria());
        badge.setPointsAwarded(badgeDetails.getPointsAwarded());
        if (badgeDetails.getUser() != null && badgeDetails.getUser().getId() != null) {
            User user = userRepository.findById(badgeDetails.getUser().getId()).orElse(null);
            badge.setUser(user);
        }

        return badgeRepository.save(badge);
    }

    @Transactional
    public void deleteBadge(Long id) {
        if (!badgeRepository.existsById(id)) {
            throw new RuntimeException("Badge not found with id: " + id);
        }
        badgeRepository.deleteById(id);
    }
}
