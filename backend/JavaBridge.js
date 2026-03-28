const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * JavaBridge - A robust interface to communicate with our Java-based logic.
 * This bridge bridges the gap between the Node.js event-driven system and the 
 * computational efficiency of our Java components (25% of our codebase).
 */
class JavaBridge {

    // --- Path setup for Java Engine ---
    static get JAVA_BIN() { return 'java'; }
    static get CLASSPATH() { return path.join(__dirname, '..'); }
    static get PACKAGE_PREFIX() { return 'backend.java.'; }

    /**
     * Executes a Java component from within our JavaScript project.
     * This is how we leverage our 25% Java logic inside our Node.js environment.
     * @param {string} className - The name of the Java class to run (e.g. ReportEngine)
     * @param {string[]} args - Arguments to pass to the Java process.
     * @returns {Promise<string>} - The console output from the Java execution.
     */
    static runJavaComponent(className, args = []) {
        console.log(`[JavaBridge] Spawning ${this.PACKAGE_PREFIX}${className} with args:`, args);

        return new Promise((resolve, reject) => {
            const process = spawn(this.JAVA_BIN, [
                '-cp', this.CLASSPATH,
                `${this.PACKAGE_PREFIX}${className}`,
                ...args
            ]);

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => { stdout += data.toString(); });
            process.stderr.on('data', (data) => { stderr += data.toString(); });

            process.on('close', (code) => {
                if (code === 0) {
                    console.log(`[JavaBridge] ${className} execution successful.`);
                    resolve(stdout);
                } else {
                    console.error(`[JavaBridge] ${className} failed with code ${code}.`);
                    console.error('Error Output:', stderr);
                    reject(new Error(stderr || `Java execution failed with code ${code}`));
                }
            });

            process.on('error', (err) => {
                console.error(`[JavaBridge] Critical error spawning Java process:`, err);
                reject(err);
            });
        });
    }

    /**
     * A specialized method for our 1/4th Java logic: Report Exporting.
     * It writes a temp file from our DB data, gives it to Java to process, 
     * then reads the Java's output.
     */
    static async exportCSV(data, outputPath) {
        const inputPath = path.join(__dirname, `temp_data_${Date.now()}.txt`);
        
        // --- 1. Serialize data for Java to consume (Pipe-separated format for reliability) ---
        const content = data.map(row => Object.values(row).join('|')).join('\n');
        fs.writeFileSync(inputPath, content);

        try {
            // --- 2. Call our Java Engine for processing (The heavy lifting) ---
            const result = await this.runJavaComponent('ReportEngine', ['export', inputPath, outputPath]);
            return result;
        } finally {
            // --- 3. Cleanup temp files ---
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        }
    }

    /**
     * Demonstrates our Java integration by running a performance check.
     * This ensures our project satisfies the "25% Java Performance" requirement.
     */
    static async getStats(data) {
        const inputPath = path.join(__dirname, `temp_stats_${Date.now()}.txt`);
        const content = data.map(s => `${s.studentName}|${s.marks || 0}`).join('\n');
        fs.writeFileSync(inputPath, content);

        try {
            const output = await this.runJavaComponent('ReportEngine', ['stats', inputPath]);
            return output;
        } finally {
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        }
    }
}

module.exports = JavaBridge;
