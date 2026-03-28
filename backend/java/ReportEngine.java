package backend.java;

import java.util.*;
import java.io.*;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * ReportEngine - The core Java processing logic for Classroom Lite.
 * This component is responsible for:
 * 1. Generating CSV reports for teachers.
 * 2. Calculating student performance metrics (min, max, average).
 * 3. Cleaning and normalizing submission data.
 * 
 * Using Java for this ensures consistent data processing across platforms.
 */
public class ReportEngine {
    
    private List<StudentPerformance> performances = new ArrayList<>();
    
    public static void main(String[] args) {
        System.out.println("--- Classroom Lite Java Report Engine ---");
        
        if (args.length < 2) {
            printUsage();
            return;
        }

        String command = args[0];
        String inputPath = args[1];
        String outputPath = args.length > 2 ? args[2] : "output.csv";

        ReportEngine engine = new ReportEngine();
        try {
            switch (command.toLowerCase()) {
                case "export":
                    engine.exportToCSV(inputPath, outputPath);
                    break;
                case "stats":
                    engine.generateStats(inputPath);
                    break;
                case "verify":
                    engine.verifyData(inputPath);
                    break;
                default:
                    System.err.println("Unknown command: " + command);
            }
        } catch (Exception e) {
            System.err.println("Execution Error: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }

    private static void printUsage() {
        System.out.println("Usage:");
        System.out.println("  java ReportEngine export <input.txt> <output.csv>");
        System.out.println("  java ReportEngine stats <input.txt>");
        System.out.println("  java ReportEngine verify <input.txt>");
    }

    public void exportToCSV(String inputPath, String outputPath) throws IOException {
        System.out.println("Exporting data from " + inputPath + " to " + outputPath);
        List<String> lines = Files.readAllLines(Paths.get(inputPath));
        
        try (PrintWriter writer = new PrintWriter(new FileWriter(outputPath))) {
            for (String line : lines) {
                // Convert Pipe to Comma and handle quotes
                String[] parts = line.split("\\|");
                StringBuilder csvLine = new StringBuilder();
                for (int i = 0; i < parts.length; i++) {
                    String clean = parts[i].trim().replace("\"", "\"\"");
                    if (clean.contains(",") || clean.contains("\"") || clean.contains("\n")) {
                        csvLine.append("\"").append(clean).append("\"");
                    } else {
                        csvLine.append(clean);
                    }
                    if (i < parts.length - 1) csvLine.append(",");
                }
                writer.println(csvLine.toString());
            }
        }
        System.out.println("CSV Export successful.");
    }

    public void generateStats(String inputPath) throws IOException {
        System.out.println("Generating Statistics...");
        loadData(inputPath);
        
        if (performances.isEmpty()) {
            System.out.println("No data found.");
            return;
        }

        double total = 0;
        double max = Double.MIN_VALUE;
        double min = Double.MAX_VALUE;
        String topStudent = "";

        for (StudentPerformance sp : performances) {
            total += sp.marks;
            if (sp.marks > max) {
                max = sp.marks;
                topStudent = sp.name;
            }
            if (sp.marks < min) min = sp.marks;
        }

        double avg = total / performances.size();
        
        System.out.println("=== Statistics Report ===");
        System.out.println("Date: " + LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        System.out.println("Total Students: " + performances.size());
        System.out.println("Average Score: " + String.format("%.2f", avg));
        System.out.println("Highest Score: " + max + " (by " + topStudent + ")");
        System.out.println("Lowest Score: " + min);
        System.out.println("=========================");
    }

    public void verifyData(String inputPath) throws IOException {
        System.out.println("Verifying Data Integrity...");
        List<String> lines = Files.readAllLines(Paths.get(inputPath));
        int errors = 0;
        for (int i = 0; i < lines.size(); i++) {
            String[] parts = lines.get(i).split("\\|");
            if (parts.length < 4) {
                System.err.println("Line " + (i+1) + " is malformed (too few fields).");
                errors++;
            }
        }
        if (errors == 0) System.out.println("Data is valid.");
        else System.out.println("Data has " + errors + " issue(s).");
    }

    private void loadData(String inputPath) throws IOException {
        List<String> lines = Files.readAllLines(Paths.get(inputPath));
        for (String line : lines) {
            String[] p = line.split("\\|");
            if (p.length >= 2) {
                try {
                    String name = p[0];
                    double marks = Double.parseDouble(p[1]);
                    performances.add(new StudentPerformance(name, marks));
                } catch (NumberFormatException e) {
                    // skip header or invalid
                }
            }
        }
    }

    class StudentPerformance {
        String name;
        double marks;
        StudentPerformance(String n, double m) {
            this.name = n;
            this.marks = m;
        }
    }
}
