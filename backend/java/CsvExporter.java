package backend.java;

import java.io.*;
import java.util.*;

/**
 * CsvExporter - A Java component that takes structured input and 
 * generates a formatted CSV representation for submission reports.
 */
public class CsvExporter {

    public static void main(String[] args) {
        if (args.length < 1) {
            System.err.println("Usage: java CsvExporter <input_file_path> <output_file_path>");
            System.exit(1);
        }

        String inputPath = args[0];
        String outputPath = args.length > 1 ? args[1] : null;

        try {
            processCsv(inputPath, outputPath);
            System.out.println("Processing complete.");
        } catch (Exception e) {
            System.err.println("Fatal Error during CSV export: " + e.getMessage());
            System.exit(1);
        }
    }

    private static void processCsv(String in, String out) throws IOException {
        BufferedReader reader = new BufferedReader(new FileReader(in));
        PrintWriter writer = (out != null) ? new PrintWriter(new FileWriter(out)) : new PrintWriter(System.out);

        String line;
        // The first line is header: Student|Email|Assignment|Marks|Total|Status|Date
        if ((line = reader.readLine()) != null) {
            writer.println(line.replace("|", ","));
        }

        while ((line = reader.readLine()) != null) {
            // Basic sanitization for CSV
            String[] fields = line.split("\\|");
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < fields.length; i++) {
                String field = fields[i].replace(",", ";"); // Avoid commas in field
                if (field.contains(" ") || field.contains("\"")) {
                    field = "\"" + field.replace("\"", "\"\"") + "\"";
                }
                sb.append(field);
                if (i < fields.length - 1) sb.append(",");
            }
            writer.println(sb.toString());
        }

        reader.close();
        writer.close();
    }
}
