package com.plantcare.service;

import com.plantcare.model.Notification;
import com.plantcare.model.Plant;
import com.plantcare.model.PlantStatus;
import com.plantcare.model.SensorReading;
import com.plantcare.model.User;
import com.plantcare.repository.NotificationRepository;
import com.plantcare.repository.PlantRepository;
import com.plantcare.repository.SensorReadingRepository;
import com.plantcare.security.SecurityUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationAlertServiceTest {

    @Mock
    private SensorReadingRepository sensorReadingRepository;

    @Mock
    private PlantRepository plantRepository;

    @Mock
    private WateringRecommendationService recommendationService;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private SecurityUtils securityUtils;

    @InjectMocks
    private SensorReadingService sensorReadingService;

    @InjectMocks
    private NotificationService notificationService;

    private User sampleUser;
    private Plant samplePlant;

    @BeforeEach
    void setUp() {
        sensorReadingService.setAlertSoilMoistureThreshold(30.0);

        sampleUser = User.builder()
                .id(10L)
                .name("Alice Green")
                .email("alice@example.com")
                .build();

        samplePlant = Plant.builder()
                .id(1L)
                .name("Swiss cheese plant")
                .species("Monstera deliciosa")
                .user(sampleUser)
                .status(PlantStatus.RECENTLY_WATERED)
                .build();
    }

    @Test
    void testLowSoilMoistureCreatesUnreadNotificationWhenNoneExists() {
        when(plantRepository.findById(1L)).thenReturn(Optional.of(samplePlant));
        when(sensorReadingRepository.save(any(SensorReading.class))).thenAnswer(i -> i.getArgument(0));
        when(recommendationService.evaluate(samplePlant)).thenReturn(
                new WateringRecommendationService.RecommendationResult(PlantStatus.NEEDS_WATER, "Low moisture")
        );
        when(notificationRepository.existsByPlantIdAndTypeAndStatus(1L, "LOW_MOISTURE", "UNREAD"))
                .thenReturn(false);

        SensorReading reading = SensorReading.builder()
                .plant(samplePlant)
                .soilMoisture(18.5)
                .temperature(25.0)
                .humidity(60.0)
                .rainDetected(false)
                .build();

        sensorReadingService.saveReading(reading);

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(1)).save(captor.capture());

        Notification created = captor.getValue();
        assertNotNull(created);
        assertEquals(sampleUser, created.getUser());
        assertEquals(samplePlant, created.getPlant());
        assertEquals("LOW_MOISTURE", created.getType());
        assertEquals("UNREAD", created.getStatus());
        assertEquals("Swiss cheese plant needs water — soil moisture at 18.5%", created.getMessage());
        assertNotNull(created.getCreatedAt());
    }

    @Test
    void testLowSoilMoistureDoesNotCreateDuplicateNotificationIfUnreadExists() {
        when(plantRepository.findById(1L)).thenReturn(Optional.of(samplePlant));
        when(sensorReadingRepository.save(any(SensorReading.class))).thenAnswer(i -> i.getArgument(0));
        when(recommendationService.evaluate(samplePlant)).thenReturn(
                new WateringRecommendationService.RecommendationResult(PlantStatus.NEEDS_WATER, "Low moisture")
        );
        when(notificationRepository.existsByPlantIdAndTypeAndStatus(1L, "LOW_MOISTURE", "UNREAD"))
                .thenReturn(true);

        SensorReading reading = SensorReading.builder()
                .plant(samplePlant)
                .soilMoisture(22.0)
                .temperature(24.0)
                .humidity(65.0)
                .build();

        sensorReadingService.saveReading(reading);

        verify(notificationRepository, never()).save(any(Notification.class));
    }

    @Test
    void testOptimalSoilMoistureDoesNotCreateNotification() {
        when(plantRepository.findById(1L)).thenReturn(Optional.of(samplePlant));
        when(sensorReadingRepository.save(any(SensorReading.class))).thenAnswer(i -> i.getArgument(0));
        when(recommendationService.evaluate(samplePlant)).thenReturn(
                new WateringRecommendationService.RecommendationResult(PlantStatus.RECENTLY_WATERED, "Optimal")
        );

        SensorReading reading = SensorReading.builder()
                .plant(samplePlant)
                .soilMoisture(45.0)
                .temperature(24.0)
                .humidity(65.0)
                .build();

        sensorReadingService.saveReading(reading);

        verify(notificationRepository, never()).existsByPlantIdAndTypeAndStatus(any(), any(), any());
        verify(notificationRepository, never()).save(any(Notification.class));
    }

    @Test
    void testMarkAsReadUpdatesStatusToRead() {
        Notification existing = Notification.builder()
                .id(5L)
                .user(sampleUser)
                .plant(samplePlant)
                .message("Swiss cheese plant needs water — soil moisture at 15.0%")
                .type("LOW_MOISTURE")
                .status("UNREAD")
                .createdAt(LocalDateTime.now().minusHours(1))
                .build();

        when(notificationRepository.findById(5L)).thenReturn(Optional.of(existing));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> i.getArgument(0));

        Notification result = notificationService.markAsRead(5L);

        assertEquals("READ", result.getStatus());
        verify(notificationRepository, times(1)).save(existing);
    }

    @Test
    void testGetCurrentUserNotificationsReturnsNewestFirst() {
        when(securityUtils.getCurrentUserEmail()).thenReturn(Optional.of("alice@example.com"));
        when(securityUtils.getCurrentUser()).thenReturn(sampleUser);

        Notification n1 = Notification.builder().id(1L).createdAt(LocalDateTime.now()).build();
        Notification n2 = Notification.builder().id(2L).createdAt(LocalDateTime.now().minusMinutes(10)).build();

        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(10L)).thenReturn(List.of(n1, n2));

        List<Notification> result = notificationService.getCurrentUserNotifications();

        assertEquals(2, result.size());
        assertEquals(1L, result.get(0).getId());
        assertEquals(2L, result.get(1).getId());
    }
}
