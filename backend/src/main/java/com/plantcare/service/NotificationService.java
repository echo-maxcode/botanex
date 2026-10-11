package com.plantcare.service;

import com.plantcare.model.Notification;
import com.plantcare.model.Plant;
import com.plantcare.model.User;
import com.plantcare.repository.NotificationRepository;
import com.plantcare.repository.PlantRepository;
import com.plantcare.repository.UserRepository;
import com.plantcare.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final PlantRepository plantRepository;
    private final SecurityUtils securityUtils;

    public List<Notification> getCurrentUserNotifications() {
        return securityUtils.getCurrentUserEmail()
                .map(email -> {
                    User user = securityUtils.getCurrentUser();
                    return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
                })
                .orElseGet(notificationRepository::findAllByOrderByCreatedAtDesc);
    }

    @Transactional
    public Notification markAsRead(Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found with id: " + id));
        notification.setStatus("READ");
        return notificationRepository.save(notification);
    }

    public List<Notification> getAllNotifications() {
        return notificationRepository.findAll();
    }

    public Optional<Notification> getNotificationById(Long id) {
        return notificationRepository.findById(id);
    }

    public List<Notification> getNotificationsByUserId(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Notification> getNotificationsByPlantId(Long plantId) {
        return notificationRepository.findByPlantIdOrderByCreatedAtDesc(plantId);
    }

    @Transactional
    public Notification createNotification(Notification notification) {
        if (notification.getUser() != null && notification.getUser().getId() != null) {
            User user = userRepository.findById(notification.getUser().getId()).orElse(null);
            notification.setUser(user);
        }
        if (notification.getPlant() != null && notification.getPlant().getId() != null) {
            Plant plant = plantRepository.findById(notification.getPlant().getId()).orElse(null);
            notification.setPlant(plant);
        }
        if (notification.getCreatedAt() == null) {
            notification.setCreatedAt(LocalDateTime.now());
        }
        if (notification.getStatus() == null) {
            notification.setStatus("UNREAD");
        }
        return notificationRepository.save(notification);
    }

    @Transactional
    public Notification updateNotification(Long id, Notification details) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found with id: " + id));

        notification.setMessage(details.getMessage());
        notification.setType(details.getType());
        notification.setStatus(details.getStatus());

        return notificationRepository.save(notification);
    }

    @Transactional
    public void deleteNotification(Long id) {
        if (!notificationRepository.existsById(id)) {
            throw new RuntimeException("Notification not found with id: " + id);
        }
        notificationRepository.deleteById(id);
    }
}
