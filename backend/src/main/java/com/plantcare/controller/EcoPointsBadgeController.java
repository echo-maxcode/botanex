package com.plantcare.controller;

import com.plantcare.model.EcoPointsBadge;
import com.plantcare.service.EcoPointsBadgeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/badges")
@RequiredArgsConstructor
public class EcoPointsBadgeController {

    private final EcoPointsBadgeService badgeService;

    @GetMapping
    public ResponseEntity<List<EcoPointsBadge>> getAllBadges() {
        return ResponseEntity.ok(badgeService.getAllBadges());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EcoPointsBadge> getBadgeById(@PathVariable Long id) {
        return badgeService.getBadgeById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<EcoPointsBadge>> getBadgesByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(badgeService.getBadgesByUserId(userId));
    }

    @PostMapping
    public ResponseEntity<EcoPointsBadge> createBadge(@Valid @RequestBody EcoPointsBadge badge) {
        EcoPointsBadge created = badgeService.createBadge(badge);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<EcoPointsBadge> updateBadge(@PathVariable Long id, @Valid @RequestBody EcoPointsBadge badge) {
        try {
            EcoPointsBadge updated = badgeService.updateBadge(id, badge);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBadge(@PathVariable Long id) {
        try {
            badgeService.deleteBadge(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
