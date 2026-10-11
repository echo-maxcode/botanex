package com.plantcare.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.*;

class CsvSensorParserTest {

    private CsvSensorParser parser;

    @BeforeEach
    void setUp() {
        parser = new CsvSensorParser();
    }

    @Test
    void testParseValidCsvLine() {
        String line = "42.5,23.1,65.8,false";
        CsvSensorParser.ParsedSensorData data = parser.parse(line);

        assertEquals(42.5, data.soilMoisture(), 0.001);
        assertEquals(23.1, data.temperature(), 0.001);
        assertEquals(65.8, data.humidity(), 0.001);
        assertFalse(data.rainDetected());
    }

    @Test
    void testParseWithWhitespace() {
        String line = "  28.0 ,  26.4 ,  50.2 , true  ";
        CsvSensorParser.ParsedSensorData data = parser.parse(line);

        assertEquals(28.0, data.soilMoisture(), 0.001);
        assertEquals(26.4, data.temperature(), 0.001);
        assertEquals(50.2, data.humidity(), 0.001);
        assertTrue(data.rainDetected());
    }

    @ParameterizedTest
    @ValueSource(strings = {"true", "TRUE", "1", "yes", "YES"})
    void testRainDetectedTrueVariations(String rainVal) {
        String line = "30.0,22.0,60.0," + rainVal;
        CsvSensorParser.ParsedSensorData data = parser.parse(line);
        assertTrue(data.rainDetected());
    }

    @ParameterizedTest
    @ValueSource(strings = {"false", "FALSE", "0", "no", "NO"})
    void testRainDetectedFalseVariations(String rainVal) {
        String line = "30.0,22.0,60.0," + rainVal;
        CsvSensorParser.ParsedSensorData data = parser.parse(line);
        assertFalse(data.rainDetected());
    }

    @Test
    void testNullOrEmptyLineThrowsException() {
        assertThrows(IllegalArgumentException.class, () -> parser.parse(null));
        assertThrows(IllegalArgumentException.class, () -> parser.parse(""));
        assertThrows(IllegalArgumentException.class, () -> parser.parse("   "));
    }

    @Test
    void testIncorrectNumberOfFieldsThrowsException() {
        assertThrows(IllegalArgumentException.class, () -> parser.parse("30.0,22.0,60.0"));
        assertThrows(IllegalArgumentException.class, () -> parser.parse("30.0,22.0,60.0,false,extra"));
    }

    @Test
    void testInvalidNumberFormatThrowsException() {
        assertThrows(IllegalArgumentException.class, () -> parser.parse("not_a_number,22.0,60.0,false"));
        assertThrows(IllegalArgumentException.class, () -> parser.parse("30.0,invalid,60.0,false"));
    }

    @Test
    void testInvalidBooleanFormatThrowsException() {
        assertThrows(IllegalArgumentException.class, () -> parser.parse("30.0,22.0,60.0,maybe"));
    }
}
