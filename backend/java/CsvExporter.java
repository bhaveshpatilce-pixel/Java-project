package backend.java;
import java.util.*;


public class CsvExporter {
    public static void main(String[] args) {
        if (args.length == 0) {
            System.out.println("Nothing to export.");
            return;
        }

        // Expected format: Name,Mark,Name,Mark...
        System.out.println("Student Name,Grade");
        
        for (int i = 0; i < args.length; i += 2) {
            if (i + 1 < args.length) {
                String name = args[i];
                String mark = args[i+1];
                System.out.println(name + "," + mark);
            }
        }
    }
}
