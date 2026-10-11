package com.plantcare.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.plantcare.dto.LoginRequest;
import com.plantcare.dto.RegisterRequest;
import com.plantcare.model.Notification;
import com.plantcare.model.Plant;
import com.plantcare.model.PlantStatus;
import com.plantcare.model.User;
import com.plantcare.repository.NotificationRepository;
import com.plantcare.repository.PlantRepository;
import com.plantcare.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class AuthenticationSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PlantRepository plantRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    private User testUser;
    private String jwtToken;

    @BeforeEach
    void setUp() {
        String testEmail = "testgardener@example.com";
        testUser = userRepository.findByEmail(testEmail).orElseGet(() ->
                User.builder()
                        .name("Test Gardener")
                        .email(testEmail)
                        .ecoPoints(50)
                        .createdDate(LocalDateTime.now())
                        .build()
        );
        testUser.setPasswordHash(passwordEncoder.encode("secretpass123"));
        testUser = userRepository.save(testUser);

        jwtToken = jwtUtil.generateToken(testUser.getEmail());
    }

    @Test
    void unauthenticatedRequestToPlants_returns401Unauthorized() throws Exception {
        mockMvc.perform(get("/api/plants"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticatedRequestToPlants_succeedsWith200() throws Exception {
        mockMvc.perform(get("/api/plants")
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk());
    }

    @Test
    void registerUser_returns201AndValidToken() throws Exception {
        String uniqueEmail = "reg_" + System.currentTimeMillis() + "@example.com";
        RegisterRequest request = RegisterRequest.builder()
                .name("New User")
                .email(uniqueEmail)
                .password("password123")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.email").value(uniqueEmail))
                .andExpect(jsonPath("$.tokenType").value("Bearer"));
    }

    @Test
    void loginUser_withValidCredentials_returns200AndToken() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email(testUser.getEmail())
                .password("secretpass123")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.email").value(testUser.getEmail()));
    }

    @Test
    void loginUser_withBadCredentials_returns401() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email(testUser.getEmail())
                .password("wrongpassword")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticatedUsersMe_returnsProfileWithPlantCount() throws Exception {
        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(testUser.getEmail()))
                .andExpect(jsonPath("$.name").value(testUser.getName()))
                .andExpect(jsonPath("$.ecoPoints").value(testUser.getEcoPoints()))
                .andExpect(jsonPath("$.plantCount").isNumber());
    }

    @Test
    void plantScoping_userOnlySeesOwnPlants() throws Exception {
        // Create plant belonging to testUser
        Plant userPlant = plantRepository.save(Plant.builder()
                .name("User Unique Fern")
                .species("Nephrolepis exaltata")
                .location("Study")
                .wateringFrequency(4)
                .lastWateredDate(LocalDate.now())
                .nextWateringDate(LocalDate.now().plusDays(4))
                .status(PlantStatus.RECENTLY_WATERED)
                .user(testUser)
                .build());

        // Create second user
        String secondEmail = "other_" + System.currentTimeMillis() + "@example.com";
        User secondUser = userRepository.save(User.builder()
                .name("Other User")
                .email(secondEmail)
                .passwordHash(passwordEncoder.encode("pass123456"))
                .ecoPoints(0)
                .createdDate(LocalDateTime.now())
                .build());
        String secondToken = jwtUtil.generateToken(secondUser.getEmail());

        // Second user calls GET /api/plants -> should not see User Unique Fern
        mockMvc.perform(get("/api/plants")
                        .header("Authorization", "Bearer " + secondToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].name", not(hasItem("User Unique Fern"))));

        // First user calls GET /api/plants -> should see User Unique Fern
        mockMvc.perform(get("/api/plants")
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].name", hasItem("User Unique Fern")));
    }

    @Test
    void notificationEndpoints_authenticatedUserCanFetchAndMarkAsRead() throws Exception {
        // Unauthenticated request to /api/notifications should be rejected (401)
        mockMvc.perform(get("/api/notifications"))
                .andExpect(status().isUnauthorized());

        // Create a notification for testUser
        Notification testNotification = notificationRepository.save(Notification.builder()
                .user(testUser)
                .message("Test Plant needs water — soil moisture at 15.0%")
                .type("LOW_MOISTURE")
                .status("UNREAD")
                .createdAt(LocalDateTime.now())
                .build());

        // Authenticated request to /api/notifications should succeed and include test notification
        mockMvc.perform(get("/api/notifications")
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status", is("UNREAD")))
                .andExpect(jsonPath("$[0].message", containsString("Test Plant needs water")));

        // Authenticated PATCH /api/notifications/{id}/read should mark as READ
        mockMvc.perform(patch("/api/notifications/" + testNotification.getId() + "/read")
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("READ")));

        // Verify updated status in repository
        Notification updated = notificationRepository.findById(testNotification.getId()).orElseThrow();
        assertEquals("READ", updated.getStatus());
    }
}
