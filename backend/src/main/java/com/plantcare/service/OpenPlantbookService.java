package com.plantcare.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plantcare.dto.MetricRangeStatusDto;
import com.plantcare.dto.PlantRangeStatusDto;
import com.plantcare.dto.PlantSearchResultDto;
import com.plantcare.model.Plant;
import com.plantcare.model.SensorReading;
import com.plantcare.model.SpeciesCareProfile;
import com.plantcare.repository.PlantRepository;
import com.plantcare.repository.SensorReadingRepository;
import com.plantcare.repository.SpeciesCareProfileRepository;
import com.plantcare.security.SecurityUtils;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
@Getter
@Setter
public class OpenPlantbookService {

    @Value("${openplantbook.base-url:https://open.plantbook.io/api/v1}")
    private String baseUrl = "https://open.plantbook.io/api/v1";

    @Value("${openplantbook.client-id:}")
    private String clientId;

    @Value("${openplantbook.client-secret:}")
    private String clientSecret;

    @Value("${openplantbook.cache-ttl-hours:24}")
    private int cacheTtlHours = 24;

    private final SpeciesCareProfileRepository profileRepository;
    private final PlantRepository plantRepository;
    private final SensorReadingRepository sensorReadingRepository;
    private final SecurityUtils securityUtils;
    private final ObjectMapper objectMapper;
    private RestTemplate restTemplate;

    // Token caching
    private volatile String cachedAccessToken;
    private volatile Instant tokenExpiresAt;
    private final Object tokenLock = new Object();

    @Autowired
    public OpenPlantbookService(SpeciesCareProfileRepository profileRepository,
                                PlantRepository plantRepository,
                                SensorReadingRepository sensorReadingRepository,
                                SecurityUtils securityUtils,
                                ObjectMapper objectMapper) {
        this.profileRepository = profileRepository;
        this.plantRepository = plantRepository;
        this.sensorReadingRepository = sensorReadingRepository;
        this.securityUtils = securityUtils;
        this.objectMapper = objectMapper;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(6));
        factory.setReadTimeout(Duration.ofSeconds(8));
        this.restTemplate = new RestTemplate(factory);
    }

    /**
     * Testing constructor allowing injected RestTemplate
     */
    public OpenPlantbookService(SpeciesCareProfileRepository profileRepository,
                                PlantRepository plantRepository,
                                SensorReadingRepository sensorReadingRepository,
                                SecurityUtils securityUtils,
                                ObjectMapper objectMapper,
                                RestTemplate restTemplate) {
        this.profileRepository = profileRepository;
        this.plantRepository = plantRepository;
        this.sensorReadingRepository = sensorReadingRepository;
        this.securityUtils = securityUtils;
        this.objectMapper = objectMapper;
        this.restTemplate = restTemplate;
    }

    /**
     * Checks if credentials are configured in properties / environment variables.
     */
    public boolean isConfigured() {
        return clientId != null && !clientId.trim().isEmpty() &&
                clientSecret != null && !clientSecret.trim().isEmpty();
    }

    /**
     * Obtains OAuth2 access token via Client Credentials grant.
     * Caches token until expires_in - 60s.
     */
    public String getAccessToken() {
        if (!isConfigured()) {
            throw new OpenPlantbookNotConfiguredException(
                    "OpenPlantbook API credentials are not configured. Please set OPENPLANTBOOK_CLIENT_ID and OPENPLANTBOOK_CLIENT_SECRET."
            );
        }

        if (cachedAccessToken != null && tokenExpiresAt != null && Instant.now().isBefore(tokenExpiresAt)) {
            return cachedAccessToken;
        }

        synchronized (tokenLock) {
            if (cachedAccessToken != null && tokenExpiresAt != null && Instant.now().isBefore(tokenExpiresAt)) {
                return cachedAccessToken;
            }

            try {
                String tokenEndpoint = baseUrl.replaceAll("/+$", "") + "/token/";
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

                MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
                body.add("grant_type", "client_credentials");
                body.add("client_id", clientId.trim());
                body.add("client_secret", clientSecret.trim());

                HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
                log.info("Requesting OAuth2 access token from OpenPlantbook at {}", tokenEndpoint);

                ResponseEntity<String> response = restTemplate.postForEntity(tokenEndpoint, request, String.class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    JsonNode node = objectMapper.readTree(response.getBody());
                    String token = node.path("access_token").asText(null);
                    long expiresIn = node.path("expires_in").asLong(86400);

                    if (token != null && !token.isBlank()) {
                        this.cachedAccessToken = token;
                        // Subtract 60 seconds safety margin
                        this.tokenExpiresAt = Instant.now().plusSeconds(Math.max(60, expiresIn - 60));
                        log.info("Obtained OpenPlantbook access token, expires in {}s", expiresIn);
                        return this.cachedAccessToken;
                    }
                }

                throw new OpenPlantbookException("Failed to obtain access token: Invalid response", HttpStatus.BAD_GATEWAY);
            } catch (HttpClientErrorException e) {
                if (e.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                    log.error("OpenPlantbook client credentials unauthorized (401): {}", e.getMessage());
                    throw new OpenPlantbookException("Invalid OpenPlantbook client credentials", HttpStatus.UNAUTHORIZED);
                } else if (e.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                    log.warn("OpenPlantbook token endpoint rate-limited (429)");
                    throw new OpenPlantbookException("OpenPlantbook rate limit exceeded. Please try again later.", HttpStatus.TOO_MANY_REQUESTS);
                }
                log.error("OpenPlantbook token error ({}): {}", e.getStatusCode(), e.getMessage());
                throw new OpenPlantbookException("Failed to authenticate with OpenPlantbook: " + e.getMessage(), (HttpStatus) e.getStatusCode());
            } catch (ResourceAccessException e) {
                log.error("Network timeout or unreachable error connecting to OpenPlantbook token endpoint: {}", e.getMessage());
                throw new OpenPlantbookException("OpenPlantbook API unreachable: " + e.getMessage(), HttpStatus.SERVICE_UNAVAILABLE);
            } catch (OpenPlantbookException e) {
                throw e;
            } catch (Exception e) {
                log.error("Unexpected error obtaining OpenPlantbook token: {}", e.getMessage(), e);
                throw new OpenPlantbookException("Error authenticating with OpenPlantbook: " + e.getMessage(), HttpStatus.BAD_GATEWAY);
            }
        }
    }

    /**
     * Searches OpenPlantbook database by query alias (minimum 3 characters).
     * Returns matching species with pid, display_pid and alias.
     */
    public List<PlantSearchResultDto> searchPlants(String query) {
        if (!isConfigured()) {
            throw new OpenPlantbookNotConfiguredException(
                    "OpenPlantbook API credentials are not configured. Set OPENPLANTBOOK_CLIENT_ID and OPENPLANTBOOK_CLIENT_SECRET to enable species search."
            );
        }

        if (query == null || query.trim().length() < 3) {
            return Collections.emptyList();
        }

        String trimmed = query.trim();
        String token = getAccessToken();

        try {
            String searchUrl = UriComponentsBuilder.fromHttpUrl(baseUrl.replaceAll("/+$", "") + "/plant/search")
                    .queryParam("alias", trimmed)
                    .toUriString();

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            HttpEntity<Void> request = new HttpEntity<>(headers);

            log.debug("Searching OpenPlantbook species for query '{}'", trimmed);
            ResponseEntity<String> response = restTemplate.exchange(searchUrl, HttpMethod.GET, request, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode results = root.path("results");
                List<PlantSearchResultDto> list = new ArrayList<>();

                if (results.isArray()) {
                    for (JsonNode item : results) {
                        String pid = item.path("pid").asText(null);
                        String displayPid = item.path("display_pid").asText(pid);
                        String alias = item.hasNonNull("alias") ? item.path("alias").asText() : null;

                        if (pid != null) {
                            list.add(PlantSearchResultDto.builder()
                                    .pid(pid)
                                    .displayPid(displayPid)
                                    .alias(alias)
                                    .build());
                        }
                    }
                }
                return list;
            }

            return Collections.emptyList();
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                log.warn("Search returned 401. Invalidating token cache.");
                clearTokenCache();
                throw new OpenPlantbookException("OpenPlantbook session expired. Please retry.", HttpStatus.UNAUTHORIZED);
            } else if (e.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                log.warn("OpenPlantbook search rate-limited (429)");
                throw new OpenPlantbookException("OpenPlantbook rate limit exceeded. Please wait a moment and try again.", HttpStatus.TOO_MANY_REQUESTS);
            }
            log.error("HTTP error searching OpenPlantbook: {}", e.getMessage());
            throw new OpenPlantbookException("OpenPlantbook error: " + e.getMessage(), (HttpStatus) e.getStatusCode());
        } catch (ResourceAccessException e) {
            log.error("Network timeout searching OpenPlantbook: {}", e.getMessage());
            throw new OpenPlantbookException("OpenPlantbook API unreachable: " + e.getMessage(), HttpStatus.SERVICE_UNAVAILABLE);
        } catch (OpenPlantbookException e) {
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error searching OpenPlantbook for '{}': {}", trimmed, e.getMessage(), e);
            throw new OpenPlantbookException("Error searching OpenPlantbook: " + e.getMessage(), HttpStatus.BAD_GATEWAY);
        }
    }

    /**
     * Retrieves plant details for a given pid.
     * Uses DB cache if within cacheTtlHours; refetches and updates if stale or missing.
     * If external API call fails, reuses stale DB profile if available to maintain offline capability.
     */
    @Transactional
    public SpeciesCareProfile getPlantDetails(String pid) {
        if (pid == null || pid.trim().isEmpty()) {
            throw new IllegalArgumentException("Plantbook species PID cannot be empty");
        }

        String normalizedPid = pid.trim().toLowerCase();
        Optional<SpeciesCareProfile> cachedOpt = profileRepository.findByPidIgnoreCase(normalizedPid);

        // Check if cache is fresh
        if (cachedOpt.isPresent()) {
            SpeciesCareProfile cached = cachedOpt.get();
            if (cached.getFetchedAt() != null &&
                    cached.getFetchedAt().isAfter(LocalDateTime.now().minusHours(cacheTtlHours))) {
                log.debug("Returning fresh cached SpeciesCareProfile for '{}' (fetched at {})", normalizedPid, cached.getFetchedAt());
                return cached;
            }
        }

        // If credentials are not configured, fallback to cached profile or throw clear error
        if (!isConfigured()) {
            if (cachedOpt.isPresent()) {
                log.warn("OpenPlantbook not configured; returning existing stored profile for '{}'", normalizedPid);
                return cachedOpt.get();
            }
            throw new OpenPlantbookNotConfiguredException(
                    "OpenPlantbook API credentials are not configured. Set OPENPLANTBOOK_CLIENT_ID and OPENPLANTBOOK_CLIENT_SECRET to fetch species care data."
            );
        }

        // Attempt live fetch from OpenPlantbook
        try {
            return fetchAndStorePlantDetails(normalizedPid);
        } catch (Exception e) {
            log.warn("Failed to fetch fresh detail for '{}' from OpenPlantbook: {}. Checking for stored fallback.", normalizedPid, e.getMessage());
            if (cachedOpt.isPresent()) {
                log.info("Using previously stored SpeciesCareProfile as fallback for '{}'", normalizedPid);
                return cachedOpt.get();
            }
            if (e instanceof OpenPlantbookException ope) {
                throw ope;
            }
            throw new OpenPlantbookException("Unable to retrieve plant details for " + normalizedPid + ": " + e.getMessage(), HttpStatus.BAD_GATEWAY);
        }
    }

    /**
     * Executes GET /api/v1/plant/detail/{pid}/?include=care
     * Logs real JSON response at INFO level as requested.
     * Maps confirmed fields and text care guidance safely.
     */
    private SpeciesCareProfile fetchAndStorePlantDetails(String pid) {
        String token = getAccessToken();

        try {
            // Encode PID for URI path (e.g. spaces -> %20)
            String encodedPid = URLEncoder.encode(pid, StandardCharsets.UTF_8).replace("+", "%20");
            URI detailUri = UriComponentsBuilder.fromHttpUrl(baseUrl.replaceAll("/+$", "") + "/plant/detail/" + encodedPid + "/")
                    .queryParam("include", "care")
                    .build(true)
                    .toUri();

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            HttpEntity<Void> request = new HttpEntity<>(headers);

            log.info("Fetching OpenPlantbook plant detail for pid '{}' from {}", pid, detailUri);
            ResponseEntity<String> response = restTemplate.exchange(detailUri, HttpMethod.GET, request, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String rawJson = response.getBody();
                // CONFIRMATION LOG: Real detail response logged for verification
                log.info("OpenPlantbook plant detail response for pid '{}': {}", pid, rawJson);

                JsonNode node = objectMapper.readTree(rawJson);
                SpeciesCareProfile profile = parseSpeciesCareProfile(pid, node);

                return profileRepository.findByPidIgnoreCase(profile.getPid())
                        .map(existing -> {
                            existing.setDisplayPid(profile.getDisplayPid());
                            existing.setAlias(profile.getAlias());
                            existing.setImageUrl(profile.getImageUrl());
                            existing.setMinTemp(profile.getMinTemp());
                            existing.setMaxTemp(profile.getMaxTemp());
                            existing.setMinSoilMoist(profile.getMinSoilMoist());
                            existing.setMaxSoilMoist(profile.getMaxSoilMoist());
                            existing.setMinEnvHumid(profile.getMinEnvHumid());
                            existing.setMaxEnvHumid(profile.getMaxEnvHumid());
                            existing.setFertilizationTip(profile.getFertilizationTip());
                            existing.setCareTips(profile.getCareTips());
                            existing.setFetchedAt(LocalDateTime.now());
                            return profileRepository.save(existing);
                        })
                        .orElseGet(() -> profileRepository.save(profile));
            }

            throw new OpenPlantbookException("Empty response received from OpenPlantbook for pid: " + pid, HttpStatus.BAD_GATEWAY);
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                log.warn("Species pid '{}' not found in OpenPlantbook (404)", pid);
                throw new OpenPlantbookException("Species '" + pid + "' was not found in OpenPlantbook", HttpStatus.NOT_FOUND);
            } else if (e.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                clearTokenCache();
                throw new OpenPlantbookException("OpenPlantbook unauthorized. Please retry.", HttpStatus.UNAUTHORIZED);
            } else if (e.getStatusCode() == HttpStatus.TOO_MANY_REQUESTS) {
                log.warn("OpenPlantbook rate-limited (429) for pid '{}'", pid);
                throw new OpenPlantbookException("OpenPlantbook rate limit exceeded. Please try again later.", HttpStatus.TOO_MANY_REQUESTS);
            }
            log.error("HTTP error fetching OpenPlantbook pid '{}': {}", pid, e.getMessage());
            throw new OpenPlantbookException("OpenPlantbook error: " + e.getMessage(), (HttpStatus) e.getStatusCode());
        } catch (ResourceAccessException e) {
            log.error("Network timeout fetching OpenPlantbook pid '{}': {}", pid, e.getMessage());
            throw new OpenPlantbookException("OpenPlantbook API unreachable: " + e.getMessage(), HttpStatus.SERVICE_UNAVAILABLE);
        } catch (OpenPlantbookException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error fetching detail for pid '{}': {}", pid, e.getMessage(), e);
            throw new OpenPlantbookException("Failed to fetch detail for species " + pid + ": " + e.getMessage(), HttpStatus.BAD_GATEWAY);
        }
    }

    /**
     * Parses the JsonNode into SpeciesCareProfile.
     * Safely checks all numeric and care text fields, storing null if absent.
     */
    public SpeciesCareProfile parseSpeciesCareProfile(String defaultPid, JsonNode node) {
        String pid = node.hasNonNull("pid") ? node.get("pid").asText().trim().toLowerCase() : defaultPid.trim().toLowerCase();
        String displayPid = node.hasNonNull("display_pid") ? node.get("display_pid").asText() : defaultPid;
        String alias = node.hasNonNull("alias") ? node.get("alias").asText() : null;
        String imageUrl = node.hasNonNull("image_url") ? node.get("image_url").asText() : null;

        Double minTemp = getDoubleOrNull(node, "min_temp");
        Double maxTemp = getDoubleOrNull(node, "max_temp");
        Double minSoilMoist = getDoubleOrNull(node, "min_soil_moist");
        Double maxSoilMoist = getDoubleOrNull(node, "max_soil_moist");
        Double minEnvHumid = getDoubleOrNull(node, "min_env_humid");
        Double maxEnvHumid = getDoubleOrNull(node, "max_env_humid");

        // Fertilization tip
        String fertilizationTip = node.hasNonNull("fertilization") ? node.get("fertilization").asText().trim() : null;
        if (fertilizationTip != null && fertilizationTip.isEmpty()) {
            fertilizationTip = null;
        }

        // Care tips (derived from watering, sunlight, soil, pruning, or general care fields)
        String careTips = assembleCareTips(node);

        return SpeciesCareProfile.builder()
                .pid(pid)
                .displayPid(displayPid)
                .alias(alias)
                .imageUrl(imageUrl)
                .minTemp(minTemp)
                .maxTemp(maxTemp)
                .minSoilMoist(minSoilMoist)
                .maxSoilMoist(maxSoilMoist)
                .minEnvHumid(minEnvHumid)
                .maxEnvHumid(maxEnvHumid)
                .fertilizationTip(fertilizationTip)
                .careTips(careTips)
                .fetchedAt(LocalDateTime.now())
                .build();
    }

    private String assembleCareTips(JsonNode node) {
        List<String> tips = new ArrayList<>();

        if (node.hasNonNull("watering")) {
            String w = node.get("watering").asText().trim();
            if (!w.isEmpty()) tips.add("Watering: " + w);
        }
        if (node.hasNonNull("sunlight")) {
            String s = node.get("sunlight").asText().trim();
            if (!s.isEmpty()) tips.add("Sunlight: " + s);
        }
        if (node.hasNonNull("soil")) {
            String sl = node.get("soil").asText().trim();
            if (!sl.isEmpty()) tips.add("Soil: " + sl);
        }
        if (node.hasNonNull("pruning")) {
            String p = node.get("pruning").asText().trim();
            if (!p.isEmpty()) tips.add("Pruning: " + p);
        }
        if (node.hasNonNull("care")) {
            String c = node.get("care").asText().trim();
            if (!c.isEmpty() && !tips.contains(c)) tips.add(c);
        }

        return tips.isEmpty() ? null : String.join("\n", tips);
    }

    private Double getDoubleOrNull(JsonNode node, String fieldName) {
        if (node.hasNonNull(fieldName)) {
            try {
                return node.get(fieldName).asDouble();
            } catch (Exception ignored) {
                return null;
            }
        }
        return null;
    }

    @PostConstruct
    public void seedStandardProfiles() {
        seedProfileIfMissing("monstera deliciosa", "Monstera deliciosa", "Swiss Cheese Plant / Split-leaf Philodendron",
                "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=400&q=80",
                18.0, 30.0, 35.0, 75.0, 50.0, 85.0,
                "Feed monthly during spring and summer with balanced liquid fertilizer diluted to half strength.",
                "Watering: Water when the top 2-3 inches of soil feel dry. Sunlight: Needs bright, indirect sunlight. High humidity preferred.");

        seedProfileIfMissing("ficus lyrata", "Ficus lyrata", "Fiddle Leaf Fig",
                "https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=400&q=80",
                16.0, 28.0, 30.0, 65.0, 40.0, 70.0,
                "Feed every 2-4 weeks during spring and summer with high-nitrogen houseplant fertilizer.",
                "Watering: Water thoroughly when top 2 inches dry out. Sunlight: Needs consistent bright filtered light. Avoid drafts and sudden relocation.");

        seedProfileIfMissing("sansevieria trifasciata", "Sansevieria trifasciata", "Snake Plant / Mother-in-law's Tongue",
                "https://images.unsplash.com/photo-1593482892290-f54927ae1bf6?auto=format&fit=crop&w=400&q=80",
                15.0, 32.0, 15.0, 45.0, 30.0, 60.0,
                "Feed lightly once or twice a year in spring/summer with all-purpose fertilizer.",
                "Watering: Allow soil to dry out completely between waterings. Drought tolerant. Sunlight: Adapts from low light to direct sun.");

        seedProfileIfMissing("epipremnum aureum", "Epipremnum aureum", "Golden Pothos / Devil's Ivy",
                "https://images.unsplash.com/photo-1596724855577-45811776d656?auto=format&fit=crop&w=400&q=80",
                16.0, 30.0, 30.0, 70.0, 40.0, 75.0,
                "Feed every 4-6 weeks in active growing season.",
                "Watering: Water when top 50% of soil feels dry. Sunlight: Thrives in medium to low indirect light. Prune stems to encourage bushy growth.");

        seedProfileIfMissing("calathea orbifolia", "Calathea orbifolia", "Prayer Plant / Peacock Plant",
                "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=400&q=80",
                18.0, 26.0, 40.0, 75.0, 60.0, 85.0,
                "Apply half-strength liquid fertilizer once a month during spring and summer.",
                "Watering: Keep soil consistently moist but never waterlogged. Use distilled or filtered water. Sunlight: Medium indirect light.");

        seedProfileIfMissing("strelitzia nicolai", "Strelitzia nicolai", "Giant White Bird of Paradise",
                "https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?auto=format&fit=crop&w=400&q=80",
                18.0, 32.0, 35.0, 70.0, 50.0, 80.0,
                "Feed bi-weekly in spring and summer with balanced water-soluble fertilizer.",
                "Watering: Allow top 2-3 inches to dry between deep waterings. Sunlight: Needs full sun to bright direct/indirect light.");

        seedProfileIfMissing("nephrolepis exaltata", "Nephrolepis exaltata", "Sword Fern / Boston Fern",
                "https://images.unsplash.com/photo-1610473068565-5d9c222ffce9?auto=format&fit=crop&w=400&q=80",
                16.0, 26.0, 45.0, 80.0, 60.0, 90.0,
                "Feed monthly with liquid houseplant fertilizer diluted to half strength in spring/summer.",
                "Watering: Keep soil consistently moist. Do not let roots dry out. Sunlight: Bright indirect light or partial shade. Enjoys high humidity.");

        seedProfileIfMissing("spathiphyllum wallisii", "Spathiphyllum wallisii", "Peace Lily",
                "https://images.unsplash.com/photo-1593691509543-c55fb32e7355?auto=format&fit=crop&w=400&q=80",
                18.0, 28.0, 40.0, 75.0, 50.0, 80.0,
                "Fertilize every 6 weeks during spring and summer.",
                "Watering: Keep soil evenly moist. Plant will visibly droop when thirsty. Sunlight: Low to medium indirect light.");

        seedProfileIfMissing("zamioculcas zamiifolia", "Zamioculcas zamiifolia", "ZZ Plant",
                "https://images.unsplash.com/photo-1632306230006-25816c276329?auto=format&fit=crop&w=400&q=80",
                15.0, 30.0, 15.0, 45.0, 30.0, 60.0,
                "Feed twice a year with balanced houseplant food.",
                "Watering: Extremely drought tolerant. Allow soil to dry out completely. Sunlight: Tolerates very low light to bright indirect light.");
    }

    private void seedProfileIfMissing(String pid, String displayPid, String alias, String imageUrl,
                                      Double minTemp, Double maxTemp, Double minSoilMoist, Double maxSoilMoist,
                                      Double minEnvHumid, Double maxEnvHumid, String fert, String tips) {
        if (!profileRepository.existsByPidIgnoreCase(pid)) {
            profileRepository.save(SpeciesCareProfile.builder()
                    .pid(pid)
                    .displayPid(displayPid)
                    .alias(alias)
                    .imageUrl(imageUrl)
                    .minTemp(minTemp)
                    .maxTemp(maxTemp)
                    .minSoilMoist(minSoilMoist)
                    .maxSoilMoist(maxSoilMoist)
                    .minEnvHumid(minEnvHumid)
                    .maxEnvHumid(maxEnvHumid)
                    .fertilizationTip(fert)
                    .careTips(tips)
                    .fetchedAt(LocalDateTime.now())
                    .build());
        }
    }

    public List<PlantSearchResultDto> searchLocalProfiles(String query) {
        if (query == null || query.trim().length() < 2) {
            return Collections.emptyList();
        }
        String q = query.trim();
        List<SpeciesCareProfile> profiles = profileRepository
                .findByPidContainingIgnoreCaseOrDisplayPidContainingIgnoreCaseOrAliasContainingIgnoreCase(q, q, q);
        List<PlantSearchResultDto> list = new ArrayList<>();
        for (SpeciesCareProfile p : profiles) {
            list.add(PlantSearchResultDto.builder()
                    .pid(p.getPid())
                    .displayPid(p.getDisplayPid())
                    .alias(p.getAlias())
                    .build());
        }
        return list;
    }

    public boolean isPidMatchingSpecies(String pid, String species) {
        if (pid == null || pid.isBlank() || species == null || species.isBlank()) return false;
        String p = pid.trim().toLowerCase();
        String s = species.trim().toLowerCase();
        if (p.equals(s) || s.contains(p) || p.contains(s)) return true;
        return profileRepository.findByPidIgnoreCase(p)
                .map(profile -> (profile.getAlias() != null && profile.getAlias().toLowerCase().contains(s))
                        || (profile.getDisplayPid() != null && profile.getDisplayPid().toLowerCase().contains(s)))
                .orElse(false);
    }

    @Transactional
    public Optional<SpeciesCareProfile> autoLinkPlantToSpecies(Plant plant) {
        if (plant == null || plant.getSpecies() == null || plant.getSpecies().trim().isEmpty()) {
            return Optional.empty();
        }

        String rawSpecies = plant.getSpecies().trim();
        String normalized = rawSpecies.toLowerCase();

        // 1. Exact PID match in DB
        Optional<SpeciesCareProfile> profileOpt = profileRepository.findByPidIgnoreCase(normalized);

        // 2. Alias or Display name match in DB
        if (profileOpt.isEmpty()) {
            profileOpt = profileRepository.findFirstByAliasContainingIgnoreCase(rawSpecies);
        }
        if (profileOpt.isEmpty()) {
            profileOpt = profileRepository.findFirstByDisplayPidContainingIgnoreCase(rawSpecies);
        }

        // 3. Live search from OpenPlantbook API if configured
        if (profileOpt.isEmpty() && isConfigured()) {
            try {
                SpeciesCareProfile fetched = getPlantDetails(normalized);
                profileOpt = Optional.of(fetched);
            } catch (Exception ignored) {
                try {
                    List<PlantSearchResultDto> results = searchPlants(rawSpecies);
                    if (!results.isEmpty() && results.get(0).getPid() != null) {
                        SpeciesCareProfile fetched = getPlantDetails(results.get(0).getPid());
                        profileOpt = Optional.of(fetched);
                    }
                } catch (Exception e) {
                    log.debug("Live OpenPlantbook search/fetch failed for species '{}': {}", rawSpecies, e.getMessage());
                }
            }
        }

        if (profileOpt.isPresent()) {
            SpeciesCareProfile profile = profileOpt.get();
            plant.setOpenplantbookPid(profile.getPid());
            plantRepository.save(plant);
            log.info("Successfully live-linked plant #{} ({}) to Plantbook species '{}'",
                    plant.getId(), plant.getName(), profile.getPid());
            return Optional.of(profile);
        }

        return Optional.empty();
    }

    /**
     * Links a plant to a species PID.
     * Fetches and stores the profile, then saves openplantbookPid on Plant.
     */
    @Transactional
    public SpeciesCareProfile linkPlantToSpecies(Long plantId, String pid) {
        com.plantcare.model.User currentUser = securityUtils.getCurrentUser();
        Plant plant = plantRepository.findByIdAndUserId(plantId, currentUser.getId())
                .orElseThrow(() -> new OpenPlantbookException("Plant not found with id: " + plantId, HttpStatus.NOT_FOUND));

        return linkPlantToSpecies(plant, pid);
    }

    @Transactional
    public SpeciesCareProfile linkPlantToSpecies(Plant plant, String pid) {
        if (pid == null || pid.trim().isEmpty()) {
            throw new IllegalArgumentException("Plantbook species PID cannot be empty");
        }

        String rawPid = pid.trim();
        String normalizedPid = rawPid.toLowerCase();

        Optional<SpeciesCareProfile> profileOpt = profileRepository.findByPidIgnoreCase(normalizedPid);
        if (profileOpt.isEmpty()) {
            profileOpt = profileRepository.findFirstByAliasContainingIgnoreCase(rawPid);
        }
        if (profileOpt.isEmpty()) {
            profileOpt = profileRepository.findFirstByDisplayPidContainingIgnoreCase(rawPid);
        }

        SpeciesCareProfile profile;
        if (profileOpt.isPresent()) {
            profile = profileOpt.get();
        } else {
            try {
                profile = getPlantDetails(normalizedPid);
            } catch (Exception e) {
                if (isConfigured()) {
                    List<PlantSearchResultDto> results = searchPlants(rawPid);
                    if (!results.isEmpty() && results.get(0).getPid() != null) {
                        profile = getPlantDetails(results.get(0).getPid());
                    } else {
                        throw e;
                    }
                } else {
                    throw e;
                }
            }
        }

        plant.setOpenplantbookPid(profile.getPid());
        plantRepository.save(plant);
        log.info("Linked plant #{} ({}) to OpenPlantbook species '{}'", plant.getId(), plant.getName(), profile.getPid());

        return profile;
    }

    /**
     * Returns the linked SpeciesCareProfile for plantId, or throws 404 if none is linked.
     */
    @Transactional
    public SpeciesCareProfile getCareProfileForPlant(Long plantId) {
        com.plantcare.model.User currentUser = securityUtils.getCurrentUser();
        Plant plant = plantRepository.findByIdAndUserId(plantId, currentUser.getId())
                .orElseThrow(() -> new OpenPlantbookException("Plant not found with id: " + plantId, HttpStatus.NOT_FOUND));

        if (plant.getOpenplantbookPid() == null || plant.getOpenplantbookPid().trim().isEmpty()
                || (plant.getSpecies() != null && !isPidMatchingSpecies(plant.getOpenplantbookPid(), plant.getSpecies()))) {
            autoLinkPlantToSpecies(plant);
        }

        if (plant.getOpenplantbookPid() == null || plant.getOpenplantbookPid().trim().isEmpty()) {
            throw new ProfileNotLinkedException("No OpenPlantbook profile is linked to this plant");
        }

        return profileRepository.findByPidIgnoreCase(plant.getOpenplantbookPid().trim())
                .orElseGet(() -> getPlantDetails(plant.getOpenplantbookPid().trim()));
    }

    /**
     * Compares latest SensorReading to the linked SpeciesCareProfile ranges.
     * Returns LOW, OK, or HIGH for each applicable metric.
     * Skips any metric that has no range for that species.
     */
    @Transactional
    public PlantRangeStatusDto getRangeStatusForPlant(Long plantId) {
        com.plantcare.model.User currentUser = securityUtils.getCurrentUser();
        Plant plant = plantRepository.findByIdAndUserId(plantId, currentUser.getId())
                .orElseThrow(() -> new OpenPlantbookException("Plant not found with id: " + plantId, HttpStatus.NOT_FOUND));

        if (plant.getOpenplantbookPid() == null || plant.getOpenplantbookPid().trim().isEmpty()
                || (plant.getSpecies() != null && !isPidMatchingSpecies(plant.getOpenplantbookPid(), plant.getSpecies()))) {
            autoLinkPlantToSpecies(plant);
        }

        if (plant.getOpenplantbookPid() == null || plant.getOpenplantbookPid().trim().isEmpty()) {
            throw new ProfileNotLinkedException("No OpenPlantbook profile is linked to this plant");
        }

        SpeciesCareProfile profile = profileRepository.findByPidIgnoreCase(plant.getOpenplantbookPid().trim())
                .orElseGet(() -> getPlantDetails(plant.getOpenplantbookPid().trim()));

        Optional<SensorReading> latestReadingOpt = sensorReadingRepository.findFirstByPlantIdOrderByTimestampDesc(plantId);

        List<MetricRangeStatusDto> metrics = new ArrayList<>();
        boolean hasReading = latestReadingOpt.isPresent();
        SensorReading reading = latestReadingOpt.orElse(null);

        // 1. Soil Moisture
        // Confirming units: OpenPlantbook API provides min_soil_moist and max_soil_moist in % (percentage, 0-100),
        // which matches the sensor reading's soilMoisture percentage value directly.
        if (profile.getMinSoilMoist() != null || profile.getMaxSoilMoist() != null) {
            Double val = (hasReading && reading != null) ? reading.getSoilMoisture() : null;
            metrics.add(evaluateMetric(
                    "soilMoisture",
                    "Soil Moisture",
                    val,
                    "%",
                    profile.getMinSoilMoist(),
                    profile.getMaxSoilMoist()
            ));
        }

        // 2. Temperature
        // Units: Celsius (°C), matching the ambient temp from DHT/ESP32 sensor
        if (profile.getMinTemp() != null || profile.getMaxTemp() != null) {
            Double val = (hasReading && reading != null) ? reading.getTemperature() : null;
            metrics.add(evaluateMetric(
                    "temperature",
                    "Temperature",
                    val,
                    "°C",
                    profile.getMinTemp(),
                    profile.getMaxTemp()
            ));
        }

        // 3. Humidity
        // Units: % Relative Humidity (RH), matching the air humidity from DHT/ESP32 sensor
        if (profile.getMinEnvHumid() != null || profile.getMaxEnvHumid() != null) {
            Double val = (hasReading && reading != null) ? reading.getHumidity() : null;
            metrics.add(evaluateMetric(
                    "humidity",
                    "Relative Humidity",
                    val,
                    "%",
                    profile.getMinEnvHumid(),
                    profile.getMaxEnvHumid()
            ));
        }

        String summary = generateStatusSummary(metrics, hasReading);

        return PlantRangeStatusDto.builder()
                .plantId(plant.getId())
                .plantName(plant.getName())
                .species(plant.getSpecies())
                .pid(profile.getPid())
                .hasReading(hasReading)
                .metrics(metrics)
                .summary(summary)
                .build();
    }

    /**
     * Evaluates a single metric against min and max ideal thresholds.
     */
    public MetricRangeStatusDto evaluateMetric(String metric, String label, Double current, String unit, Double min, Double max) {
        if (current == null) {
            String rangeStr = formatRange(min, max, unit);
            return MetricRangeStatusDto.builder()
                    .metric(metric)
                    .label(label)
                    .currentValue(null)
                    .unit(unit)
                    .min(min)
                    .max(max)
                    .status(null)
                    .message("No sensor reading recorded yet (ideal: " + rangeStr + ")")
                    .build();
        }

        String status;
        String message;
        String rangeStr = formatRange(min, max, unit);

        if (min != null && current < min) {
            status = "LOW";
            message = String.format("%s is low at %.1f%s (ideal: %s)", label, current, unit, rangeStr);
        } else if (max != null && current > max) {
            status = "HIGH";
            message = String.format("%s is high at %.1f%s (ideal: %s)", label, current, unit, rangeStr);
        } else {
            status = "OK";
            message = String.format("%s is optimal at %.1f%s (ideal: %s)", label, current, unit, rangeStr);
        }

        return MetricRangeStatusDto.builder()
                .metric(metric)
                .label(label)
                .currentValue(current)
                .unit(unit)
                .min(min)
                .max(max)
                .status(status)
                .message(message)
                .build();
    }

    private String formatRange(Double min, Double max, String unit) {
        if (min != null && max != null) {
            return String.format("%.0f%s - %.0f%s", min, unit, max, unit);
        } else if (min != null) {
            return String.format("min %.0f%s", min, unit);
        } else if (max != null) {
            return String.format("max %.0f%s", max, unit);
        }
        return "any";
    }

    private String generateStatusSummary(List<MetricRangeStatusDto> metrics, boolean hasReading) {
        if (!hasReading) {
            return "Awaiting live sensor reading to evaluate against ideal care ranges.";
        }
        long lowCount = metrics.stream().filter(m -> "LOW".equals(m.getStatus())).count();
        long highCount = metrics.stream().filter(m -> "HIGH".equals(m.getStatus())).count();

        if (lowCount == 0 && highCount == 0) {
            return "All live sensor readings are within the species' ideal care range.";
        }

        List<String> alerts = new ArrayList<>();
        if (lowCount > 0) {
            alerts.add(lowCount + " metric(s) low");
        }
        if (highCount > 0) {
            alerts.add(highCount + " metric(s) high");
        }
        return "Attention needed: " + String.join(", ", alerts) + ".";
    }

    public void clearTokenCache() {
        synchronized (tokenLock) {
            this.cachedAccessToken = null;
            this.tokenExpiresAt = null;
        }
    }
}
