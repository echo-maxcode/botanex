package com.plantcare.service;

import com.plantcare.model.Plant;
import com.plantcare.model.PlantStatus;
import com.plantcare.model.SensorReading;
import com.plantcare.repository.PlantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SerialListenerServiceTest {

    @Mock
    private SensorReadingService sensorReadingService;

    @Mock
    private PlantRepository plantRepository;

    private CsvSensorParser csvSensorParser;
    private SerialListenerService serialListenerService;
    private Plant samplePlant;

    @BeforeEach
    void setUp() {
        csvSensorParser = new CsvSensorParser();
        serialListenerService = new SerialListenerService(csvSensorParser, sensorReadingService, plantRepository);

        samplePlant = Plant.builder()
                .id(1L)
                .name("Monstera")
                .status(PlantStatus.RECENTLY_WATERED)
                .build();
    }

    @Test
    void testProcessLineSuccessfullyParsesAndSavesReading() {
        when(plantRepository.findById(1L)).thenReturn(Optional.of(samplePlant));

        String telemetryLine = "34.5,23.8,61.2,false";
        serialListenerService.processLine(telemetryLine);

        ArgumentCaptor<SensorReading> captor = ArgumentCaptor.forClass(SensorReading.class);
        verify(sensorReadingService, times(1)).saveReading(captor.capture());

        SensorReading saved = captor.getValue();
        assertEquals(34.5, saved.getSoilMoisture());
        assertEquals(23.8, saved.getTemperature());
        assertEquals(61.2, saved.getHumidity());
        assertFalse(saved.isRainDetected());
        assertEquals(samplePlant, saved.getPlant());
    }

    @Test
    void testProcessLineWithRainDetected() {
        when(plantRepository.findById(1L)).thenReturn(Optional.of(samplePlant));

        String telemetryLine = "22.0,19.5,88.0,1";
        serialListenerService.processLine(telemetryLine);

        ArgumentCaptor<SensorReading> captor = ArgumentCaptor.forClass(SensorReading.class);
        verify(sensorReadingService).saveReading(captor.capture());

        SensorReading saved = captor.getValue();
        assertTrue(saved.isRainDetected());
    }

    @Test
    void testProcessInvalidLineDoesNotCrashAndDoesNotSave() {
        serialListenerService.processLine("invalid,line");
        verify(sensorReadingService, never()).saveReading(any());

        serialListenerService.processLine(null);
        verify(sensorReadingService, never()).saveReading(any());

        serialListenerService.processLine("");
        verify(sensorReadingService, never()).saveReading(any());
    }
}
