package backend.java;
import java.util.*;


public class StatsEngine {
    public static void main(String[] args) {
        if (args.length == 0) {
            System.out.println("{\"error\": \"No data provided\"}");
            return;
        }

        try {
            double total = 0;
            double max = Double.MIN_VALUE;
            double min = Double.MAX_VALUE;
            int count = 0;
            int passed = 0;
            double passThreshold = 40.0; // Assume 40% is pass

            for (String arg : args) {
                double val = Double.parseDouble(arg);
                total += val;
                if (val > max) max = val;
                if (val < min) min = val;
                if (val >= passThreshold) passed++;
                count++;
            }

            double average = total / count;
            double passRate = (double) passed / count * 100;

            // Output as JSON-like structure (or simple format JS can parse)
            System.out.printf("{\"count\": %d, \"average\": %.2f, \"max\": %.2f, \"min\": %.2f, \"passRate\": %.2f}%n", 
                count, average, max, min, passRate);

        } catch (NumberFormatException e) {
            System.out.println("{\"error\": \"Invalid number format\"}");
        }
    }
}
