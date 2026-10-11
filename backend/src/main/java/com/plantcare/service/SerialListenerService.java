package com.plantcare.service;

import com.fazecast.jSerialComm.SerialPort;
import com.plantcare.model.Plant;
import com.plantcare.model.SensorReading;
import com.plantcare.repository.PlantRepository;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "esp32.serial.enabled", havingValue = "true", matchIfMissing = false)
@Service
@Slf4j
@lombok.Getter
@lombok.Setter
public class SerialListenerService {

    private final CsvSensorParser csvSensorParser;
    private final SensorReadingService sensorReadingService;
    private final PlantRepository plantRepository;

    @Value("${esp32.serial.port:/dev/ttyUSB0}")
    private String portName = "/dev/ttyUSB0";

    @Value("${esp32.serial.baud-rate:9600}")
    private int baudRate = 9600;

    @Value("${esp32.serial.default-plant-id:1}")
    private Long defaultPlantId = 1L;

    @Value("${esp32.serial.reconnect-interval-ms:5000}")
    private long reconnectIntervalMs = 5000L;

    @Value("${esp32.serial.enabled:true}")
    private boolean enabled = true;

    private volatile boolean running = false;
    private Thread listenerThread;
    private SerialPort activeSerialPort;

    public SerialListenerService(
            CsvSensorParser csvSensorParser,
            SensorReadingService sensorReadingService,
            PlantRepository plantRepository) {
        this.csvSensorParser = csvSensorParser;
        this.sensorReadingService = sensorReadingService;
        this.plantRepository = plantRepository;
    }

    @PostConstruct
    public void start() {
        if (!enabled) {
            log.info("ESP32 serial listener is disabled via configuration.");
            return;
        }
        running = true;
        listenerThread = new Thread(this::runListenerLoop, "esp32-serial-listener");
        listenerThread.setDaemon(true);
        listenerThread.start();
        log.info("Started ESP32 Serial Listener background thread for port: {}", portName);
    }

    @PreDestroy
    public void stop() {
        running = false;
        if (activeSerialPort != null && activeSerialPort.isOpen()) {
            activeSerialPort.closePort();
            log.info("Closed ESP32 serial port: {}", portName);
        }
        if (listenerThread != null) {
            listenerThread.interrupt();
        }
    }

    private void runListenerLoop() {
        while (running) {
            try {
                activeSerialPort = SerialPort.getCommPort(portName);
                activeSerialPort.setBaudRate(baudRate);
                activeSerialPort.setComPortTimeouts(SerialPort.TIMEOUT_READ_SEMI_BLOCKING, 2000, 0);

                if (activeSerialPort.openPort()) {
                    log.info("Successfully connected to ESP32 on port: {} at {} baud", portName, baudRate);
                    readFromSerialPort(activeSerialPort);
                } else {
                    log.warn("ESP32 serial port [{}] is not available. Retrying in {} ms...", portName, reconnectIntervalMs);
                }
            } catch (Exception e) {
                log.warn("Error communicating on serial port [{}]: {}. Retrying in {} ms...", portName, e.getMessage(), reconnectIntervalMs);
            } finally {
                if (activeSerialPort != null && activeSerialPort.isOpen()) {
                    activeSerialPort.closePort();
                }
            }

            if (running) {
                try {
                    Thread.sleep(reconnectIntervalMs);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
    }

    private void readFromSerialPort(SerialPort serialPort) {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(serialPort.getInputStream(), StandardCharsets.UTF_8))) {

            String line;
            while (running && (line = reader.readLine()) != null) {
                processLine(line);
            }
        } catch (Exception e) {
            log.warn("Disconnected or read error from serial port [{}]: {}", portName, e.getMessage());
        }
    }

    public void processLine(String line) {
        try {
            if (line == null || line.trim().isEmpty()) {
                return;
            }
            log.debug("Received serial line: {}", line);
            CsvSensorParser.ParsedSensorData data = csvSensorParser.parse(line);

            Optional<Plant> plantOpt = plantRepository.findById(defaultPlantId);
            if (plantOpt.isEmpty()) {
                // If default plant doesn't exist yet, find first available or wait
                var plants = plantRepository.findAll();
                if (!plants.isEmpty()) {
                    plantOpt = Optional.of(plants.get(0));
                }
            }

            if (plantOpt.isPresent()) {
                SensorReading reading = SensorReading.builder()
                        .plant(plantOpt.get())
                        .soilMoisture(data.soilMoisture())
                        .temperature(data.temperature())
                        .humidity(data.humidity())
                        .rainDetected(data.rainDetected())
                        .build();

                sensorReadingService.saveReading(reading);
                log.info("Saved SensorReading from ESP32 for plant '{}': moisture={}% temp={}C hum={}% rain={}",
                        plantOpt.get().getName(), data.soilMoisture(), data.temperature(), data.humidity(), data.rainDetected());
            } else {
                log.warn("No plant available to associate with incoming ESP32 sensor reading.");
            }
        } catch (IllegalArgumentException e) {
            log.warn("Failed to parse incoming telemetry line [{}]: {}", line, e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error processing telemetry line [{}]: {}", line, e.getMessage(), e);
        }
    }
}
