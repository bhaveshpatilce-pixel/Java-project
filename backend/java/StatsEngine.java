package backend.java;

import java.util.*;
import java.io.*;

/**
 * StatsEngine - A Java component to process student performance statistics.
 * This is used by the Node.js backend to provide heavy-duty calculation 
 * that leverages Java's robust data structures.
 */
public class StatsEngine {
    
    public static void main(String[] args) {
        if (args.length < 1) {
            System.err.println("Usage: java StatsEngine <data_file_path>");
            System.exit(1);
        }

        String filePath = args[0];
        try {
            List<Submission> submissions = loadSubmissions(filePath);
            if (submissions.isEmpty()) {
                System.out.println("{}"); // Return empty JSON
                return;
            }

            double average = calculateAverage(submissions);
            Submission topStudent = findTopScorer(submissions);
            Map<String, Integer> distribution = getGradeDistribution(submissions);

            // Output results as JSON (simplified manual JSON generation)
            System.out.println("{");
            System.out.println("  \"average\": " + String.format("%.2f", average) + ",");
            System.out.println("  \"totalSubmissions\": " + submissions.size() + ",");
            System.out.println("  \"topScorer\": \"" + topStudent.studentName + "\",");
            System.out.println("  \"topScore\": " + topStudent.marks + ",");
            System.out.println("  \"distribution\": {");
            int count = 0;
            for (Map.Entry<String, Integer> entry : distribution.entrySet()) {
                System.out.print("    \"" + entry.getKey() + "\": " + entry.getValue());
                if (++count < distribution.size()) System.out.println(",");
                else System.out.println("");
            }
            System.out.println("  }");
            System.out.println("}");

        } catch (Exception e) {
            System.err.println("Error processing statistics: " + e.getMessage());
            System.exit(1);
        }
    }

    private static List<Submission> loadSubmissions(String path) throws IOException {
        List<Submission> list = new ArrayList<>();
        BufferedReader reader = new BufferedReader(new FileReader(path));
        String line;
        // Skip header
        reader.readLine();
        while ((line = reader.readLine()) != null) {
            String[] parts = line.split("\\|"); // Expecting pipe-separated: name|marks|total
            if (parts.length >= 2) {
                try {
                    String name = parts[0];
                    double marks = Double.parseDouble(parts[1]);
                    list.add(new Submission(name, marks));
                } catch (NumberFormatException e) {
                    // Skip invalid lines
                }
            }
        }
        reader.close();
        return list;
    }

    private static double calculateAverage(List<Submission> list) {
        return list.stream().mapToDouble(s -> s.marks).average().orElse(0.0);
    }

    private static Submission findTopScorer(List<Submission> list) {
        return list.stream().max(Comparator.comparingDouble(s -> s.marks)).orElse(new Submission("None", 0));
    }

    private static Map<String, Integer> getGradeDistribution(List<Submission> list) {
        Map<String, Integer> dist = new LinkedHashMap<>();
        dist.put("90+", 0);
        dist.put("75-89", 0);
        dist.put("60-74", 0);
        dist.put("40-59", 0);
        dist.put("<40", 0);

        for (Submission s : list) {
            if (s.marks >= 90) dist.put("90+", dist.get("90+") + 1);
            else if (s.marks >= 75) dist.put("75-89", dist.get("75-89") + 1);
            else if (s.marks >= 60) dist.put("60-74", dist.get("60-74") + 1);
            else if (s.marks >= 40) dist.put("40-59", dist.get("40-59") + 1);
            else dist.put("<40", dist.get("<40") + 1);
        }
        return dist;
    }

    static class Submission {
        String studentName;
        double marks;
        Submission(String name, double marks) {
            this.studentName = name;
            this.marks = marks;
        }
    }
}
