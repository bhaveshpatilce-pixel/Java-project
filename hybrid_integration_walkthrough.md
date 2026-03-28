# Hybrid Java-JavaScript Integration Walkthrough

I have integrated **Java components (20-25% of backend logic)** into your Classroom Management System. This approach combines the performance and structure of Java for data processing with the agility of Node.js for API routing.

## 🏗️ New Project Structure
The Java components are housed in a dedicated `backend/java` directory:
- `backend/java/StatsEngine.java`: Handles complex grade calculations (Average, Pass Rate, Max/Min).
- `backend/java/CsvExporter.java`: Formats submission data into professional CSV reports.

## 🌉 How it works (The Bridge)
In `routes/submissions.js`, I've added a `runJava` helper that uses Node.js `child_process.spawn` to execute the compiled Java classes and capture their output.

## 🚀 New Hybrid Endpoints

### 1. Assignment Statistics (Java Powered)
**Endpoint:** `GET /api/submissions/assignment/:assignmentId/stats`
- **Logic:** Calls the `StatsEngine.java` component.
- **Output:** Returns a JSON object with `count`, `average`, `max`, `min`, and `passRate`.

### 2. CSV Export (Java Powered)
**Endpoint:** `GET /api/submissions/assignment/:assignmentId/export`
- **Logic:** Calls the `CsvExporter.java` component.
- **Output:** A downloadable `.csv` file containing student names and their respective grades.

## 🛠️ How to Compile/Update
If you modify the Java code, you must re-compile it from the project root:
```powershell
javac backend/java/*.java
```

## 🧪 Testing
1. Ensure your MongoDB server is running.
2. Start the Node.js server: `npm start` (or `node server.js`).
3. Grade some submissions for an assignment.
4. Hit the `/api/submissions/assignment/:id/stats` endpoint using Postman or a browser to see the Java-generated stats!
