package com.plantcare;

import com.plantcare.model.*;
import com.plantcare.repository.AdminRepository;
import com.plantcare.repository.PlantRepository;
import com.plantcare.repository.UserRepository;
import com.plantcare.repository.WateringLogRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@SpringBootApplication
public class PlantCareApplication {

    public static void main(String[] args) {
        SpringApplication.run(PlantCareApplication.class, args);
    }

    @Bean
    CommandLineRunner initDatabase(
            PlantRepository plantRepository,
            UserRepository userRepository,
            AdminRepository adminRepository,
            WateringLogRepository wateringLogRepository,
            org.springframework.security.crypto.password.PasswordEncoder passwordEncoder,
            com.plantcare.service.OpenPlantbookService openPlantbookService) {
        return args -> {
            if (plantRepository.count() == 0) {
                // Seed sample users
                User alice = User.builder()
                        .name("Alice Green")
                        .email("alice@example.com")
                        .passwordHash(passwordEncoder.encode("password123"))
                        .createdDate(LocalDateTime.now().minusMonths(1))
                        .ecoPoints(45)
                        .build();

                Admin admin = Admin.builder()
                        .name("Botanical Admin")
                        .email("admin@verdant.org")
                        .passwordHash(passwordEncoder.encode("password123"))
                        .createdDate(LocalDateTime.now().minusMonths(2))
                        .ecoPoints(120)
                        .roleTitle("Head Horticulturist")
                        .build();

                userRepository.saveAll(List.of(alice, admin));

                // Seed sample plants
                Plant monstera = Plant.builder()
                        .name("Monstera Deliciosa")
                        .species("Monstera deliciosa")
                        .location("Living Room Window")
                        .wateringFrequency(7)
                        .lastWateredDate(LocalDate.now().minusDays(2))
                        .nextWateringDate(LocalDate.now().plusDays(5))
                        .status(PlantStatus.RECENTLY_WATERED)
                        .qrCode("PLANT-MON-001")
                        .user(alice)
                        .build();

                Plant snakePlant = Plant.builder()
                        .name("Snake Plant")
                        .species("Sansevieria trifasciata")
                        .location("Bedroom Desk")
                        .wateringFrequency(14)
                        .lastWateredDate(LocalDate.now().minusDays(15))
                        .nextWateringDate(LocalDate.now().minusDays(1))
                        .status(PlantStatus.NEEDS_WATER)
                        .qrCode("PLANT-SNK-002")
                        .user(alice)
                        .build();

                Plant pothos = Plant.builder()
                        .name("Golden Pothos")
                        .species("Epipremnum aureum")
                        .location("Kitchen Shelf")
                        .wateringFrequency(5)
                        .lastWateredDate(LocalDate.now().minusDays(1))
                        .nextWateringDate(LocalDate.now().plusDays(4))
                        .status(PlantStatus.RECENTLY_WATERED)
                        .qrCode("PLANT-POT-003")
                        .user(alice)
                        .build();

                plantRepository.saveAll(List.of(monstera, snakePlant, pothos));

                // Seed initial watering log
                WateringLog log = WateringLog.builder()
                        .plant(monstera)
                        .user(alice)
                        .wateredDate(LocalDateTime.now().minusDays(2))
                        .nextWateringDate(LocalDateTime.now().plusDays(5))
                        .build();

                wateringLogRepository.save(log);

                System.out.println("✅ Sample database seeded for Plant Care Expo!");
            } else {
                // Ensure existing users have passwordHash and createdDate, and plants are assigned
                userRepository.findAll().forEach(user -> {
                    boolean changed = false;
                    if (user.getPasswordHash() == null) {
                        user.setPasswordHash(passwordEncoder.encode("password123"));
                        changed = true;
                    }
                    if (user.getCreatedDate() == null) {
                        user.setCreatedDate(LocalDateTime.now().minusMonths(1));
                        changed = true;
                    }
                    if (changed) {
                        userRepository.save(user);
                    }
                });

                userRepository.findByEmail("alice@example.com").ifPresent(alice -> {
                    plantRepository.findAll().forEach(plant -> {
                        if (plant.getUser() == null) {
                            plant.setUser(alice);
                            plantRepository.save(plant);
                        }
                    });
                });
            }

            // Ensure all plants with a species are live linked with OpenPlantbook
            plantRepository.findAll().forEach(plant -> {
                if (plant.getSpecies() != null && !plant.getSpecies().isBlank()) {
                    openPlantbookService.autoLinkPlantToSpecies(plant);
                }
            });
        };
    }
}
