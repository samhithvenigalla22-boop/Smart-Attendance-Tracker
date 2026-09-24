# Smart Attendance Tracker 🎓📊

A modern, responsive, client-side web application designed for college students to track subject-wise and overall attendance, simulate future attendance scenarios ("What-If"), plan required classes to reach targets, manage shortage alerts, view weekly schedules, and print audit reports.

Built strictly in adherence to the guidelines and mandatory architecture defined in **JS-Axios-Project-Ideas-with-Folder-Rules.pdf**.

---

## 🚀 Key Features

1. **Student Profile Management (CRUD)**:
   - Full Create, Read, Update, and Delete operations for student demographic and academic records.
   - Multi-student support with instant profile switching.
   - Centralized validation for roll numbers, names, and emails.

2. **Subject Management (CRUD + Search + Filter)**:
   - Enrolled subjects with custom target attendance thresholds (e.g., 75%, 80%), credit hours, and faculty details.
   - Real-time DOM search across subject names, codes, and faculty.
   - Status filtering (`ALL`, `SAFE`, `SHORTAGE`).

3. **Attendance Recording (Present / Absent)**:
   - One-click daily attendance marking with immediate visual state feedback.
   - Smart date navigator (Previous Day, Today, Next Day, Custom Date Picker).
   - Real-time synchronization with JSON Server (creates new records or updates existing logs).

4. **Mathematical Calculations & Statistics**:
   - **Subject Percentage**: $(\text{Attended} / \text{Conducted}) \times 100$.
   - **Overall Attendance**: $\frac{\sum \text{Attended}}{\sum \text{Conducted}} \times 100$ (never an inaccurate average of percentages).
   - Dynamic evaluation against custom subject targets.

5. **Dashboard & Shortage Warnings**:
   - High-priority Shortage Warning Banner alerting students to subjects below target.
   - Real-time metric counters: Overall %, Subjects Enrolled, Total Conducted, Total Attended, Absences, Safe Count, Shortage Count, and Streak.
   - Today's lecture schedule dynamically derived from the timetable.

6. **Target Attendance Planner**:
   - Calculates the exact number of **consecutive classes needed** to achieve target attendance:
     $$\text{Classes Needed} = \left\lceil \frac{T \cdot C - 100 \cdot A}{100 - T} \right\rceil$$
   - Calculates the exact number of **classes that can be safely missed** while maintaining target:
     $$\text{Classes Can Miss} = \left\lfloor \frac{100 \cdot A - T \cdot C}{T} \right\rfloor$$
   - Complete edge-case protection (guaranteed never to output `NaN`, `Infinity`, or `undefined`).

7. **What-If Attendance Simulator**:
   - Interactive sandboxed simulator allowing students to project: "What happens if I attend next $X$ classes and miss next $Y$ classes?"
   - Side-by-side comparison of current vs projected attendance with percentage difference pills.
   - **Pure simulation**: Guaranteed never to mutate or corrupt actual database records.

8. **Attendance History Log**:
   - Chronological log of all recorded attendance sessions.
   - Multi-filtering: search query, subject dropdown, status dropdown (Present/Absent), and date picker.
   - In-place editing and deletion of individual logs.

9. **Attendance Streaks**:
   - Calculates current consecutive attended class streak and all-time longest streak directly from real history.

10. **Weekly Timetable Schedule**:
    - Day-by-day lecture routine (Monday to Saturday) with start/end times, room numbers, and subject associations.

11. **Printable Attendance Report & Analytics**:
    - Official student progress audit table with overall college compliance metrics.
    - Visual bar charts illustrating subject attendance compared to target markers.
    - Clean `@media print` layout hiding buttons and navigation for clean one-click PDF printing.

---

## 🛠 Technologies Used

- **HTML5**: Semantic layout elements across all views.
- **CSS3**: Responsive flexbox and grid layouts, CSS custom variables, badge styling, animations, and `@media print` rules.
- **Vanilla JavaScript (ES6+)**: Pure client-side application logic without frontend frameworks.
- **DOM Manipulation**: Dynamic event handlers, modal management, and live rendering.
- **Axios**: Promised-based HTTP client for all REST API communication.
- **JSON Server**: Full mock REST API server backed by `db.json`.

> **Notice**: As per specifications, strictly **NO** React, Angular, Vue, Next.js, TypeScript, Firebase, Express, or backend frameworks are used.

---

## 📂 Project Structure

```
smart-attendance-tracker/
│
├── views/                          # ALL HTML files reside exclusively here
│   ├── index.html                  # Main Dashboard
│   ├── student.html                # Student Profile Management
│   ├── subjects.html               # Subject Management (CRUD, Search, Filter)
│   ├── attendance.html             # Daily Attendance Marker (Present / Absent)
│   ├── history.html                # Attendance Logs (Search, Filter, Edit, Delete)
│   ├── planner.html                # Target Planner & What-If Simulator
│   ├── timetable.html              # Weekly Timetable Schedule
│   └── reports.html                # Official Attendance Audit & Printable Report
│
├── css/                            # ALL CSS files reside exclusively here
│   ├── style.css                   # Global theme tokens, sidebar, tables, modals, toast
│   ├── dashboard.css               # Dashboard widgets, stats counters, shortage banner
│   ├── student.css                 # Student card, detail boxes, switcher
│   ├── subjects.css                # Subject cards, search bar, status tabs
│   ├── attendance.css              # Quick attendance buttons, marker cards, history styles
│   ├── planner.css                 # Target planner results and What-If simulator cards
│   ├── timetable.css               # Timetable grid, day tabs, schedule badges
│   └── reports.css                 # Printable report styling (@media print) & analytics
│
├── js/                             # DOM manipulation and application controllers
│   ├── main.js                     # Dashboard controller
│   ├── student.js                  # Student profile controller
│   ├── subjects.js                 # Subject controller
│   ├── attendance.js               # Attendance marker controller
│   ├── history.js                  # History log controller
│   ├── planner.js                  # Planner and simulator controller
│   ├── timetable.js                # Timetable schedule controller
│   ├── reports.js                  # Reports and analytics controller
│   └── utils.js                    # Formulas, calculations, streaks, and UI helpers
│
├── js/service/                     # Axios REST API layer ONLY (Zero DOM manipulation)
│   ├── apiConfig.js                # Axios client setup, baseURL (http://localhost:3000)
│   ├── studentService.js           # Student API (GET, POST, PUT, DELETE)
│   ├── subjectService.js           # Subject API (GET, POST, PUT, DELETE)
│   ├── attendanceService.js        # Attendance API (GET, POST, PUT, DELETE)
│   └── timetableService.js         # Timetable API (GET, POST, PUT, DELETE)
│
├── exception/                      # Centralized error & validation handling
│   ├── apiException.js             # Custom ApiException class & network error handlers
│   └── validationException.js      # Custom ValidationException & field validators
│
├── assets/
│   └── favicon.svg                 # SVG application favicon
│
├── db.json                         # JSON Server database with realistic college data
├── package.json                    # Project dependencies and startup scripts
└── README.md                       # Comprehensive documentation
```

---

## ⚡ Installation & Setup Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (v16.0 or newer recommended)

### 1. Install Dependencies
Open PowerShell or your terminal in the project root directory:

```bash
npm install
```

### 2. Start the Application
Run the start script to launch JSON Server and host the static files:

```bash
npm start
```
*Alternatively, you can run JSON Server explicitly on port 3000:*
```bash
npm run server
```

### 3. Open in Browser
Visit the dashboard in your web browser:
```
http://localhost:3000/views/index.html
```

---

## 📡 REST API Endpoints & CRUD Operations

The application connects to JSON Server running at `http://localhost:3000`:

| Resource | Method | Endpoint | Description | Service Method |
| :--- | :--- | :--- | :--- | :--- |
| **Students** | `GET` | `/students` | Fetch all student profiles | `studentService.getAllStudents()` |
| | `GET` | `/students/:id` | Fetch student by ID | `studentService.getStudentById(id)` |
| | `POST` | `/students` | Create new student profile | `studentService.createStudent(data)` |
| | `PUT` | `/students/:id` | Update student profile | `studentService.updateStudent(id, data)` |
| | `DELETE` | `/students/:id` | Delete student profile | `studentService.deleteStudent(id)` |
| **Subjects** | `GET` | `/subjects?studentId=:id` | Fetch subjects for student | `subjectService.getSubjectsByStudent(id)` |
| | `POST` | `/subjects` | Add new subject | `subjectService.createSubject(data)` |
| | `PUT` | `/subjects/:id` | Update subject | `subjectService.updateSubject(id, data)` |
| | `DELETE` | `/subjects/:id` | Delete subject | `subjectService.deleteSubject(id)` |
| **Attendance** | `GET` | `/attendance?studentId=:id`| Fetch attendance history | `attendanceService.getAttendanceByStudent(id)` |
| | `POST` | `/attendance` | Mark attendance (Present/Absent) | `attendanceService.createAttendance(record)` |
| | `PUT` | `/attendance/:id` | Update logged attendance | `attendanceService.updateAttendance(id, record)` |
| | `DELETE` | `/attendance/:id` | Remove attendance record | `attendanceService.deleteAttendance(id)` |
| **Timetable** | `GET` | `/timetable?studentId=:id` | Fetch weekly schedule | `timetableService.getTimetableByStudent(id)` |
| | `POST` | `/timetable` | Add class schedule slot | `timetableService.createTimetable(entry)` |
| | `PUT` | `/timetable/:id` | Update class schedule slot | `timetableService.updateTimetable(id, entry)` |
| | `DELETE` | `/timetable/:id` | Delete class schedule slot | `timetableService.deleteTimetable(id)` |

