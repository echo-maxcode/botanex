package com.plantcare.controller;

import com.plantcare.dto.UserProfileDto;
import com.plantcare.model.User;
import com.plantcare.repository.PlantRepository;
import com.plantcare.security.SecurityUtils;
import com.plantcare.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final SecurityUtils securityUtils;
    private final PlantRepository plantRepository;

    @GetMapping("/me")
    public ResponseEntity<UserProfileDto> getCurrentUserProfile() {
        User user = securityUtils.getCurrentUser();
        long plantCount = plantRepository.countByUserId(user.getId());
        UserProfileDto profile = UserProfileDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .ecoPoints(user.getEcoPoints())
                .createdDate(user.getCreatedDate())
                .plantCount(plantCount)
                .build();
        return ResponseEntity.ok(profile);
    }

    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return userService.getUserById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createUser(@Valid @RequestBody User user) {
        try {
            User created = userService.createUser(user);
            return new ResponseEntity<>(created, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @Valid @RequestBody User user) {
        try {
            User updated = userService.updateUser(id, user);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        try {
            userService.deleteUser(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{id}/points")
    public ResponseEntity<User> addEcoPoints(@PathVariable Long id, @RequestBody Map<String, Integer> payload) {
        int points = payload.getOrDefault("points", 0);
        try {
            User updated = userService.addEcoPoints(id, points);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
