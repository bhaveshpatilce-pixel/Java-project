/* ========================================
   Google Classroom Lite — Application Logic
   LocalStorage-only, no backend
   ======================================== */

// ══════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════

/** Generate a unique ID */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Generate a 6-char course code */
const genCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
};

/** Read from LocalStorage */
const lsGet = (key) => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } };

/** Write to LocalStorage */
const lsSet = (key, data) => localStorage.setItem(key, JSON.stringify(data));

/** Escape HTML */
const esc = (str) => {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
};

/** Format date nicely */
const fmtDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

/** Check if a deadline is expired */
const isExpired = (deadline) => new Date(deadline) < new Date();

/** Get banner color based on index */
const bannerColor = (index) => {
    const colors = ['var(--banner-1)', 'var(--banner-2)', 'var(--banner-3)', 'var(--banner-4)', 'var(--banner-5)', 'var(--banner-6)'];
    return colors[index % colors.length];
};

/** Get initials from a name */
const initials = (name) => (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

// ══════════════════════════════════════════
//  DATA LAYER (LocalStorage)
// ══════════════════════════════════════════

// --- Users ---
function getUsers() { return lsGet('lms_users'); }
function saveUsers(users) { lsSet('lms_users', users); }
function findUserByEmail(email) { return getUsers().find(u => u.email === email.toLowerCase()); }

function createUser(name, email, password, role) {
    const users = getUsers();
    if (users.find(u => u.email === email.toLowerCase())) return null; // already exists
    const user = { id: uid(), name, email: email.toLowerCase(), password, role };
    users.push(user);
    saveUsers(users);
    return user;
}

// --- Session ---
function setSession(user) {
    sessionStorage.setItem('lms_session', JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role }));
}
function getSession() {
    try { return JSON.parse(sessionStorage.getItem('lms_session')); } catch { return null; }
}
function clearSession() { sessionStorage.removeItem('lms_session'); }

// --- Courses ---
function getCourses() { return lsGet('lms_courses'); }
function saveCourses(courses) { lsSet('lms_courses', courses); }

function addCourse(name, description, teacherId) {
    const courses = getCourses();
    const course = { id: uid(), name, description, teacherId, code: genCode(), createdAt: new Date().toISOString() };
    courses.push(course);
    saveCourses(courses);
    return course;
}

function getTeacherCourses(teacherId) {
    return getCourses().filter(c => c.teacherId === teacherId);
}

function findCourseByCode(code) {
    return getCourses().find(c => c.code === code.toUpperCase());
}

function getCourseById(id) {
    return getCourses().find(c => c.id === id);
}

// --- Enrollments ---
function getEnrollments() { return lsGet('lms_enrollments'); }
function saveEnrollments(data) { lsSet('lms_enrollments', data); }

function enrollInCourse(courseId, userId) {
    const enrollments = getEnrollments();
    if (enrollments.find(e => e.courseId === courseId && e.userId === userId)) return false; // already enrolled
    enrollments.push({ courseId, userId });
    saveEnrollments(enrollments);
    return true;
}

function getStudentCourseIds(userId) {
    return getEnrollments().filter(e => e.userId === userId).map(e => e.courseId);
}

function getCourseStudentIds(courseId) {
    return getEnrollments().filter(e => e.courseId === courseId).map(e => e.userId);
}

// --- Assignments ---
function getAssignments(courseId) {
    const all = lsGet('lms_assignments');
    return courseId ? all.filter(a => a.courseId === courseId) : all;
}

function addAssignment(courseId, title, description, deadline, totalMarks) {
    const all = lsGet('lms_assignments');
    const assignment = { id: uid(), courseId, title, description, deadline, totalMarks: Number(totalMarks), createdAt: new Date().toISOString() };
    all.push(assignment);
    lsSet('lms_assignments', all);
    return assignment;
}

function getAssignmentById(id) {
    return lsGet('lms_assignments').find(a => a.id === id);
}

// --- Submissions ---
function getSubmissions(assignmentId) {
    const all = lsGet('lms_submissions');
    return assignmentId ? all.filter(s => s.assignmentId === assignmentId) : all;
}

function getStudentSubmissions(userId) {
    return lsGet('lms_submissions').filter(s => s.studentId === userId);
}

function submitAssignment(assignmentId, studentId, studentName, content) {
    const all = lsGet('lms_submissions');
    // Prevent duplicate submissions
    if (all.find(s => s.assignmentId === assignmentId && s.studentId === studentId)) return null;
    const submission = { id: uid(), assignmentId, studentId, studentName, content, submittedAt: new Date().toISOString(), marks: null, feedback: '' };
    all.push(submission);
    lsSet('lms_submissions', all);
    return submission;
}

function gradeSubmission(submissionId, marks, feedback) {
    const all = lsGet('lms_submissions');
    const idx = all.findIndex(s => s.id === submissionId);
    if (idx === -1) return;
    all[idx].marks = Number(marks);
    all[idx].feedback = feedback || '';
    all[idx].gradedAt = new Date().toISOString();
    lsSet('lms_submissions', all);
}

// --- Announcements ---
function getAnnouncements(courseId) {
    const all = lsGet('lms_announcements');
    return courseId ? all.filter(a => a.courseId === courseId) : all;
}

function addAnnouncement(courseId, text, teacherName) {
    const all = lsGet('lms_announcements');
    const announcement = { id: uid(), courseId, text, teacherName, createdAt: new Date().toISOString() };
    all.push(announcement);
    lsSet('lms_announcements', all);
    return announcement;
}

// ══════════════════════════════════════════
//  AUTH LOGIC
// ══════════════════════════════════════════

function toggleAuth(mode) {
    document.getElementById('loginForm').style.display = mode === 'login' ? '' : 'none';
    document.getElementById('signupForm').style.display = mode === 'signup' ? '' : 'none';
}

function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const role = document.querySelector('input[name="signupRole"]:checked').value;

    if (!name || !email || !password) return showToast('All fields are required.', 'error');
    if (password.length < 6) return showToast('Password must be 6+ characters.', 'error');

    const user = createUser(name, email, password, role);
    if (!user) return showToast('An account with this email already exists.', 'error');

    setSession(user);
    showToast(`Welcome, ${user.name}!`);
    enterApp();
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    const user = findUserByEmail(email);
    if (!user || user.password !== password) return showToast('Invalid email or password.', 'error');

    setSession(user);
    showToast(`Welcome back, ${user.name}!`);
    enterApp();
}

function handleLogout() {
    clearSession();
    document.getElementById('appShell').classList.remove('active');
    document.getElementById('authSection').style.display = '';
    // Reset forms
    document.querySelectorAll('#authSection form').forEach(f => f.reset());
    toggleAuth('login');
}

// ══════════════════════════════════════════
//  APP SHELL / NAVIGATION
// ══════════════════════════════════════════

let currentView = '';
let currentCourseId = null;

function enterApp() {
    const session = getSession();
    if (!session) return;

    // Hide auth, show app
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('appShell').classList.add('active');

    // Set avatar
    document.getElementById('topbarAvatar').textContent = initials(session.name);

    // Build sidebar
    buildSidebar(session.role);

    // Navigate to dashboard
    if (session.role === 'teacher') {
        navigateTo('view-dashboard');
    } else {
        navigateTo('view-student-dashboard');
    }
}

function buildSidebar(role) {
    const nav = document.getElementById('sidebarNav');

    if (role === 'teacher') {
        nav.innerHTML = `
      <li class="sidebar-section-label">Teaching</li>
      <li><button class="sidebar-link" data-view="view-dashboard" onclick="navigateTo('view-dashboard')"><span class="icon">📊</span> Dashboard</button></li>
      <li><button class="sidebar-link" data-view="view-courses" onclick="navigateTo('view-courses')"><span class="icon">📚</span> My Courses</button></li>
      <li><button class="sidebar-link" data-view="view-submissions" onclick="navigateTo('view-submissions')"><span class="icon">📝</span> Submissions</button></li>
    `;
    } else {
        nav.innerHTML = `
      <li class="sidebar-section-label">Learning</li>
      <li><button class="sidebar-link" data-view="view-student-dashboard" onclick="navigateTo('view-student-dashboard')"><span class="icon">📊</span> Dashboard</button></li>
      <li><button class="sidebar-link" data-view="view-student-courses" onclick="navigateTo('view-student-courses')"><span class="icon">📚</span> My Courses</button></li>
      <li><button class="sidebar-link" data-view="view-grades" onclick="navigateTo('view-grades')"><span class="icon">📈</span> My Grades</button></li>
      <div class="sidebar-divider"></div>
      <li><button class="sidebar-link" data-view="view-profile" onclick="navigateTo('view-profile')"><span class="icon">👤</span> Profile</button></li>
    `;
    }
}

function navigateTo(viewId) {
    currentView = viewId;

    // Hide all views, show target
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const view = document.getElementById(viewId);
    if (view) view.classList.add('active');

    // Update sidebar active state
    document.querySelectorAll('.sidebar-link').forEach(l => {
        l.classList.toggle('active', l.getAttribute('data-view') === viewId);
    });

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');

    // Reset tabs to first
    if (view) {
        const firstTab = view.querySelector('.tab-btn');
        if (firstTab) {
            view.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            view.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            firstTab.classList.add('active');
            const paneId = firstTab.getAttribute('data-tab');
            document.getElementById(paneId)?.classList.add('active');
        }
    }

    // Render data for the view
    renderView(viewId);
}

function renderView(viewId) {
    switch (viewId) {
        case 'view-dashboard': renderTeacherDashboard(); break;
        case 'view-courses': renderCourses(); break;
        case 'view-course-detail': renderCourseDetail(); break;
        case 'view-submissions': renderAllSubmissions(); break;
        case 'view-student-dashboard': renderStudentDashboard(); break;
        case 'view-student-courses': renderStudentCourses(); break;
        case 'view-student-course-detail': renderStudentCourseDetail(); break;
        case 'view-grades': renderGrades(); break;
        case 'view-profile': renderProfile(); break;
    }
}

// ══════════════════════════════════════════
//  SIDEBAR & TABS
// ══════════════════════════════════════════

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('active');
}

function switchTab(btn) {
    const tabId = btn.getAttribute('data-tab');
    const container = btn.closest('.view');
    container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    container.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(tabId)?.classList.add('active');
}

// ══════════════════════════════════════════
//  MODAL
// ══════════════════════════════════════════

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
    });
});

// ══════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : ''}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity .3s';
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}

// ══════════════════════════════════════════
//  TEACHER: DASHBOARD
// ══════════════════════════════════════════

function renderTeacherDashboard() {
    const session = getSession();
    const courses = getTeacherCourses(session.id);
    const allAssignments = courses.flatMap(c => getAssignments(c.id));
    const allSubmissions = getSubmissions();
    const mySubs = allSubmissions.filter(s => {
        const assignment = getAssignmentById(s.assignmentId);
        return assignment && courses.some(c => c.id === assignment.courseId);
    });
    const graded = mySubs.filter(s => s.marks !== null).length;
    const pending = mySubs.length - graded;

    // Stats
    document.getElementById('statsRow').innerHTML = `
    <div class="stat-card"><div class="stat-icon">📚</div><div class="stat-value">${courses.length}</div><div class="stat-label">Courses</div></div>
    <div class="stat-card"><div class="stat-icon">📝</div><div class="stat-value">${allAssignments.length}</div><div class="stat-label">Assignments</div></div>
    <div class="stat-card"><div class="stat-icon">📬</div><div class="stat-value">${mySubs.length}</div><div class="stat-label">Submissions</div></div>
    <div class="stat-card"><div class="stat-icon">⏳</div><div class="stat-value">${pending}</div><div class="stat-label">Pending Grading</div></div>
  `;

    // Recent courses (max 3)
    const recent = courses.slice(-3).reverse();
    const grid = document.getElementById('dashRecentCourses');
    if (recent.length === 0) {
        grid.innerHTML = '<div class="empty-state"><div class="empty-icon">📖</div><p>Create your first course to get started.</p></div>';
    } else {
        grid.innerHTML = recent.map((c, i) => courseCardHTML(c, i)).join('');
    }
}

// ══════════════════════════════════════════
//  TEACHER: COURSES
// ══════════════════════════════════════════

function renderCourses() {
    const session = getSession();
    const query = document.getElementById('courseSearch')?.value.toLowerCase() || '';
    let courses = getTeacherCourses(session.id);
    if (query) courses = courses.filter(c => c.name.toLowerCase().includes(query) || c.description.toLowerCase().includes(query));

    const grid = document.getElementById('courseGrid');
    const empty = document.getElementById('coursesEmpty');

    if (courses.length === 0) {
        grid.innerHTML = '';
        empty.style.display = '';
        return;
    }
    empty.style.display = 'none';
    grid.innerHTML = courses.map((c, i) => courseCardHTML(c, i)).join('');
}

function courseCardHTML(course, index) {
    const assignCount = getAssignments(course.id).length;
    const studentCount = getCourseStudentIds(course.id).length;
    return `
    <div class="course-card" onclick="openCourseDetail('${course.id}')">
      <div class="course-card-banner" style="background:${bannerColor(index)};">
        <h3>${esc(course.name)}</h3>
      </div>
      <div class="course-card-body">
        <p>${esc(course.description)}</p>
        <div class="course-card-footer">
          <span>${assignCount} assignment${assignCount !== 1 ? 's' : ''} · ${studentCount} student${studentCount !== 1 ? 's' : ''}</span>
          <span class="course-code" onclick="event.stopPropagation();copyCode('${course.code}')" title="Click to copy">${course.code}</span>
        </div>
      </div>
    </div>
  `;
}

function copyCode(code) {
    navigator.clipboard?.writeText(code);
    showToast(`Code "${code}" copied!`);
}

function handleCreateCourse(e) {
    e.preventDefault();
    const session = getSession();
    const name = document.getElementById('courseName').value.trim();
    const desc = document.getElementById('courseDesc').value.trim();
    if (!name || !desc) return showToast('All fields are required.', 'error');

    const course = addCourse(name, desc, session.id);
    showToast(`Course created! Code: ${course.code}`);
    closeModal('courseModal');
    document.getElementById('courseForm').reset();
    renderView(currentView);
}

// ══════════════════════════════════════════
//  TEACHER: COURSE DETAIL
// ══════════════════════════════════════════

function openCourseDetail(courseId) {
    currentCourseId = courseId;
    navigateTo('view-course-detail');
}

function renderCourseDetail() {
    const course = getCourseById(currentCourseId);
    if (!course) return;

    const index = getCourses().indexOf(course);

    // Banner
    document.getElementById('courseDetailBanner').innerHTML = `
    <div class="course-detail-banner" style="background:${bannerColor(index)};">
      <h2>${esc(course.name)}</h2>
      <p>${esc(course.description)}</p>
      <div class="detail-code">Code: ${course.code}</div>
    </div>
  `;

    renderCourseAnnouncements();
    renderCourseAssignments();
    renderCourseStudents();
}

function renderCourseAnnouncements() {
    const announcements = getAnnouncements(currentCourseId).reverse();
    const list = document.getElementById('announcementList');
    if (announcements.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-icon">📢</div><p>No announcements yet.</p></div>';
        return;
    }
    list.innerHTML = announcements.map(a => `
    <div class="card">
      <div class="announce-card">
        <div class="announce-avatar">${initials(a.teacherName)}</div>
        <div class="announce-body">
          <strong>${esc(a.teacherName)}</strong>
          <p style="margin-top:4px;">${esc(a.text)}</p>
          <div class="announce-meta">${fmtDate(a.createdAt)}</div>
        </div>
      </div>
    </div>
  `).join('');
}

function renderCourseAssignments() {
    const assignments = getAssignments(currentCourseId);
    const list = document.getElementById('assignmentList');
    if (assignments.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><p>No assignments yet.</p></div>';
        return;
    }
    list.innerHTML = assignments.map(a => {
        const subs = getSubmissions(a.id);
        const expired = isExpired(a.deadline);
        return `
      <div class="card">
        <div class="card-row">
          <div>
            <h4>${esc(a.title)}</h4>
            <p>${esc(a.description)}</p>
            <div class="meta ${expired ? 'expired' : ''}">
              Deadline: ${fmtDate(a.deadline)} ${expired ? '· Expired' : ''} · ${a.totalMarks} marks · ${subs.length} submission${subs.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>
    `;
    }).join('');
}

function renderCourseStudents() {
    const studentIds = getCourseStudentIds(currentCourseId);
    const users = getUsers();
    const list = document.getElementById('studentList');

    if (studentIds.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><p>No students enrolled yet. Share the course code!</p></div>';
        return;
    }

    const students = studentIds.map(id => users.find(u => u.id === id)).filter(Boolean);
    list.innerHTML = `
    <div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Email</th></tr></thead>
      <tbody>${students.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.email)}</td></tr>`).join('')}</tbody>
    </table></div>
  `;
}

// ══════════════════════════════════════════
//  TEACHER: ASSIGNMENTS & ANNOUNCEMENTS
// ══════════════════════════════════════════

function handleAddAssignment(e) {
    e.preventDefault();
    const title = document.getElementById('assignTitle').value.trim();
    const desc = document.getElementById('assignDesc').value.trim();
    const deadline = document.getElementById('assignDeadline').value;
    const marks = document.getElementById('assignMarks').value;
    if (!title || !desc || !deadline) return showToast('All fields are required.', 'error');

    addAssignment(currentCourseId, title, desc, deadline, marks);
    showToast('Assignment added!');
    closeModal('assignmentModal');
    document.getElementById('assignmentForm').reset();
    renderCourseAssignments();
}

function handlePostAnnouncement(e) {
    e.preventDefault();
    const session = getSession();
    const text = document.getElementById('announceText').value.trim();
    if (!text) return showToast('Announcement cannot be empty.', 'error');

    addAnnouncement(currentCourseId, text, session.name);
    showToast('Announcement posted!');
    closeModal('announceModal');
    document.getElementById('announceForm').reset();
    renderCourseAnnouncements();
}

// ══════════════════════════════════════════
//  TEACHER: ALL SUBMISSIONS + GRADING
// ══════════════════════════════════════════

function renderAllSubmissions() {
    const session = getSession();
    const courses = getTeacherCourses(session.id);
    const allAssignments = courses.flatMap(c => getAssignments(c.id));
    const allSubmissions = getSubmissions();

    // Filter to only this teacher's assignments
    const assignMap = {};
    allAssignments.forEach(a => { assignMap[a.id] = a; });

    const subs = allSubmissions.filter(s => assignMap[s.assignmentId]);
    const tableWrap = document.getElementById('submissionsTable');
    const empty = document.getElementById('submissionsEmpty');

    if (subs.length === 0) {
        tableWrap.innerHTML = '';
        empty.style.display = '';
        return;
    }
    empty.style.display = 'none';

    tableWrap.innerHTML = `
    <table>
      <thead>
        <tr><th>Student</th><th>Assignment</th><th>Submitted</th><th>Marks</th><th>Status</th><th>Action</th></tr>
      </thead>
      <tbody>
        ${subs.map(s => {
        const a = assignMap[s.assignmentId];
        const graded = s.marks !== null;
        return `
            <tr>
              <td>${esc(s.studentName)}</td>
              <td>${esc(a?.title || 'Unknown')}</td>
              <td>${fmtDate(s.submittedAt)}</td>
              <td>${graded ? `${s.marks}/${a.totalMarks}` : '—'}</td>
              <td>${graded ? '<span class="badge badge-success">Graded</span>' : '<span class="badge badge-warning">Pending</span>'}</td>
              <td><button class="btn btn-sm btn-secondary" onclick="openGradeModal('${s.id}')">Grade</button></td>
            </tr>
          `;
    }).join('')}
      </tbody>
    </table>
  `;
}

function openGradeModal(submissionId) {
    const sub = getSubmissions().find(s => s.id === submissionId);
    if (!sub) return;
    const assignment = getAssignmentById(sub.assignmentId);

    document.getElementById('gradeSubId').value = submissionId;
    document.getElementById('gradeMarks').max = assignment?.totalMarks || 100;
    document.getElementById('gradeMarks').value = sub.marks ?? '';
    document.getElementById('gradeFeedback').value = sub.feedback || '';
    document.getElementById('gradeSubmissionInfo').innerHTML = `
    <div class="card" style="margin:0;">
      <p><strong>${esc(sub.studentName)}</strong> — ${esc(assignment?.title || '')}</p>
      <p style="margin-top:6px;">${esc(sub.content)}</p>
      <div class="meta" style="margin-top:6px;">Submitted ${fmtDate(sub.submittedAt)}</div>
    </div>
  `;
    openModal('gradeModal');
}

function handleGradeSubmission(e) {
    e.preventDefault();
    const id = document.getElementById('gradeSubId').value;
    const marks = document.getElementById('gradeMarks').value;
    const feedback = document.getElementById('gradeFeedback').value.trim();
    if (marks === '') return showToast('Marks are required.', 'error');

    gradeSubmission(id, marks, feedback);
    showToast('Submission graded!');
    closeModal('gradeModal');
    renderAllSubmissions();
}

// ══════════════════════════════════════════
//  TEACHER: CSV EXPORT
// ══════════════════════════════════════════

function exportCSV() {
    const session = getSession();
    const courses = getTeacherCourses(session.id);
    const allAssignments = courses.flatMap(c => getAssignments(c.id));
    const assignMap = {};
    allAssignments.forEach(a => { assignMap[a.id] = a; });
    const courseMap = {};
    courses.forEach(c => { courseMap[c.id] = c; });

    const subs = getSubmissions().filter(s => assignMap[s.assignmentId]);

    if (subs.length === 0) return showToast('No submissions to export.', 'error');

    const rows = [['Student', 'Email', 'Course', 'Assignment', 'Submitted At', 'Marks', 'Total Marks', 'Feedback']];
    subs.forEach(s => {
        const a = assignMap[s.assignmentId];
        const c = a ? courseMap[a.courseId] : null;
        rows.push([
            s.studentName,
            '',
            c?.name || '',
            a?.title || '',
            s.submittedAt,
            s.marks ?? '',
            a?.totalMarks || '',
            s.feedback || ''
        ]);
    });

    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `classroom_grades_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported!');
}

// ══════════════════════════════════════════
//  STUDENT: DASHBOARD
// ══════════════════════════════════════════

function renderStudentDashboard() {
    const session = getSession();
    const courseIds = getStudentCourseIds(session.id);
    const courses = courseIds.map(id => getCourseById(id)).filter(Boolean);
    const mySubs = getStudentSubmissions(session.id);
    const graded = mySubs.filter(s => s.marks !== null);
    const avg = graded.length > 0 ? Math.round(graded.reduce((sum, s) => {
        const a = getAssignmentById(s.assignmentId);
        return sum + (a ? (s.marks / a.totalMarks) * 100 : 0);
    }, 0) / graded.length) : 0;

    document.getElementById('studentStatsRow').innerHTML = `
    <div class="stat-card"><div class="stat-icon">📚</div><div class="stat-value">${courses.length}</div><div class="stat-label">Enrolled Courses</div></div>
    <div class="stat-card"><div class="stat-icon">📝</div><div class="stat-value">${mySubs.length}</div><div class="stat-label">Submissions</div></div>
    <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-value">${graded.length}</div><div class="stat-label">Graded</div></div>
    <div class="stat-card"><div class="stat-icon">📈</div><div class="stat-value">${avg}%</div><div class="stat-label">Average Score</div></div>
  `;

    const grid = document.getElementById('studentDashCourses');
    const empty = document.getElementById('studentDashCoursesEmpty');
    if (courses.length === 0) {
        grid.innerHTML = '';
        empty.style.display = '';
    } else {
        empty.style.display = 'none';
        grid.innerHTML = courses.map((c, i) => studentCourseCardHTML(c, i)).join('');
    }
}

// ══════════════════════════════════════════
//  STUDENT: COURSES
// ══════════════════════════════════════════

function renderStudentCourses() {
    const session = getSession();
    const courseIds = getStudentCourseIds(session.id);
    const query = document.getElementById('studentCourseSearch')?.value.toLowerCase() || '';
    let courses = courseIds.map(id => getCourseById(id)).filter(Boolean);
    if (query) courses = courses.filter(c => c.name.toLowerCase().includes(query) || c.description.toLowerCase().includes(query));

    const grid = document.getElementById('studentCourseGrid');
    const empty = document.getElementById('studentCoursesEmpty');

    if (courses.length === 0) {
        grid.innerHTML = '';
        empty.style.display = '';
        return;
    }
    empty.style.display = 'none';
    grid.innerHTML = courses.map((c, i) => studentCourseCardHTML(c, i)).join('');
}

function studentCourseCardHTML(course, index) {
    const assignCount = getAssignments(course.id).length;
    const teacher = getUsers().find(u => u.id === course.teacherId);
    return `
    <div class="course-card" onclick="openStudentCourseDetail('${course.id}')">
      <div class="course-card-banner" style="background:${bannerColor(index)};">
        <h3>${esc(course.name)}</h3>
      </div>
      <div class="course-card-body">
        <p>${esc(course.description)}</p>
        <div class="course-card-footer">
          <span>${teacher ? esc(teacher.name) : 'Teacher'}</span>
          <span>${assignCount} assignment${assignCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  `;
}

function handleJoinCourse(e) {
    e.preventDefault();
    const session = getSession();
    const code = document.getElementById('joinCode').value.trim().toUpperCase();
    if (!code) return showToast('Enter a course code.', 'error');

    const course = findCourseByCode(code);
    if (!course) return showToast('Invalid course code.', 'error');

    const enrolled = enrollInCourse(course.id, session.id);
    if (!enrolled) return showToast('Already enrolled in this course.', 'error');

    showToast(`Joined "${course.name}"!`);
    closeModal('joinModal');
    document.getElementById('joinForm').reset();
    renderView(currentView);
}

// ══════════════════════════════════════════
//  STUDENT: COURSE DETAIL
// ══════════════════════════════════════════

function openStudentCourseDetail(courseId) {
    currentCourseId = courseId;
    navigateTo('view-student-course-detail');
}

function renderStudentCourseDetail() {
    const course = getCourseById(currentCourseId);
    if (!course) return;
    const index = getCourses().indexOf(course);
    const teacher = getUsers().find(u => u.id === course.teacherId);

    document.getElementById('studentCourseDetailBanner').innerHTML = `
    <div class="course-detail-banner" style="background:${bannerColor(index)};">
      <h2>${esc(course.name)}</h2>
      <p>${esc(course.description)}</p>
      <p style="font-size:.8rem;opacity:.8;margin-top:4px;">by ${esc(teacher?.name || 'Unknown')}</p>
    </div>
  `;

    renderStudentCourseAnnouncements();
    renderStudentCourseAssignments();
}

function renderStudentCourseAnnouncements() {
    const announcements = getAnnouncements(currentCourseId).reverse();
    const list = document.getElementById('studentAnnouncementList');
    if (announcements.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-icon">📢</div><p>No announcements.</p></div>';
        return;
    }
    list.innerHTML = announcements.map(a => `
    <div class="card">
      <div class="announce-card">
        <div class="announce-avatar">${initials(a.teacherName)}</div>
        <div class="announce-body">
          <strong>${esc(a.teacherName)}</strong>
          <p style="margin-top:4px;">${esc(a.text)}</p>
          <div class="announce-meta">${fmtDate(a.createdAt)}</div>
        </div>
      </div>
    </div>
  `).join('');
}

function renderStudentCourseAssignments() {
    const session = getSession();
    const assignments = getAssignments(currentCourseId);
    const list = document.getElementById('studentAssignmentList');
    if (assignments.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><p>No assignments yet.</p></div>';
        return;
    }

    const mySubs = getStudentSubmissions(session.id);

    list.innerHTML = assignments.map(a => {
        const expired = isExpired(a.deadline);
        const sub = mySubs.find(s => s.assignmentId === a.id);
        const submitted = !!sub;
        const graded = sub && sub.marks !== null;

        let statusHTML = '';
        if (graded) {
            statusHTML = `<span class="badge badge-success">${sub.marks}/${a.totalMarks}</span>`;
        } else if (submitted) {
            statusHTML = '<span class="badge badge-info">Submitted</span>';
        } else {
            statusHTML = '<span class="badge badge-warning">Pending</span>';
        }

        return `
      <div class="card">
        <div class="card-row">
          <div style="flex:1;">
            <h4>${esc(a.title)}</h4>
            <p>${esc(a.description)}</p>
            <div class="meta ${expired ? 'expired' : ''}">
              Deadline: ${fmtDate(a.deadline)} ${expired ? '· Expired' : ''} · ${a.totalMarks} marks
            </div>
            ${graded && sub.feedback ? `<div style="margin-top:8px;padding:8px 12px;background:var(--bg-hover);border-radius:var(--radius);font-size:.82rem;"><strong>Feedback:</strong> ${esc(sub.feedback)}</div>` : ''}
            ${submitted ? `<div class="meta" style="margin-top:6px;">Submitted: ${esc(sub.content.length > 100 ? sub.content.slice(0, 100) + '…' : sub.content)}</div>` : ''}
          </div>
          <div style="text-align:right;min-width:90px;">
            ${statusHTML}
            ${!submitted ? `<br><button class="btn btn-primary btn-sm" style="margin-top:8px;" onclick="openSubmitModal('${a.id}')">Submit</button>` : ''}
          </div>
        </div>
      </div>
    `;
    }).join('');
}

function openSubmitModal(assignmentId) {
    document.getElementById('submitAssignId').value = assignmentId;
    openModal('submitModal');
}

function handleSubmitAssignment(e) {
    e.preventDefault();
    const session = getSession();
    const assignId = document.getElementById('submitAssignId').value;
    const content = document.getElementById('submissionText').value.trim();
    if (!content) return showToast('Submission cannot be empty.', 'error');

    const result = submitAssignment(assignId, session.id, session.name, content);
    if (!result) return showToast('Already submitted this assignment.', 'error');

    showToast('Assignment submitted!');
    closeModal('submitModal');
    document.getElementById('submitForm').reset();
    renderStudentCourseAssignments();
}

// ══════════════════════════════════════════
//  STUDENT: GRADES
// ══════════════════════════════════════════

function renderGrades() {
    const session = getSession();
    const subs = getStudentSubmissions(session.id);
    const tableWrap = document.getElementById('gradesTable');
    const empty = document.getElementById('gradesEmpty');

    if (subs.length === 0) {
        tableWrap.innerHTML = '';
        empty.style.display = '';
        return;
    }
    empty.style.display = 'none';

    tableWrap.innerHTML = `
    <table>
      <thead><tr><th>Assignment</th><th>Course</th><th>Submitted</th><th>Marks</th><th>Status</th></tr></thead>
      <tbody>
        ${subs.map(s => {
        const a = getAssignmentById(s.assignmentId);
        const c = a ? getCourseById(a.courseId) : null;
        const graded = s.marks !== null;
        return `
            <tr>
              <td>${esc(a?.title || 'Unknown')}</td>
              <td>${esc(c?.name || 'Unknown')}</td>
              <td>${fmtDate(s.submittedAt)}</td>
              <td>${graded ? `${s.marks}/${a?.totalMarks || '?'}` : '—'}</td>
              <td>${graded ? '<span class="badge badge-success">Graded</span>' : '<span class="badge badge-warning">Pending</span>'}</td>
            </tr>
          `;
    }).join('')}
      </tbody>
    </table>
  `;
}

// ══════════════════════════════════════════
//  STUDENT: PROFILE
// ══════════════════════════════════════════

function renderProfile() {
    const session = getSession();
    const courseIds = getStudentCourseIds(session.id);
    const mySubs = getStudentSubmissions(session.id);
    const graded = mySubs.filter(s => s.marks !== null);
    const avg = graded.length > 0 ? Math.round(graded.reduce((sum, s) => {
        const a = getAssignmentById(s.assignmentId);
        return sum + (a ? (s.marks / a.totalMarks) * 100 : 0);
    }, 0) / graded.length) : 0;

    document.getElementById('profileContent').innerHTML = `
    <div class="profile-header">
      <div class="profile-avatar">${initials(session.name)}</div>
      <div class="profile-info">
        <h3>${esc(session.name)}</h3>
        <p>${esc(session.email)} · Student</p>
      </div>
    </div>
    <div class="stats-row">
      <div class="stat-card"><div class="stat-icon">📚</div><div class="stat-value">${courseIds.length}</div><div class="stat-label">Enrolled Courses</div></div>
      <div class="stat-card"><div class="stat-icon">📝</div><div class="stat-value">${mySubs.length}</div><div class="stat-label">Total Submissions</div></div>
      <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-value">${graded.length}</div><div class="stat-label">Graded</div></div>
      <div class="stat-card"><div class="stat-icon">📈</div><div class="stat-value">${avg}%</div><div class="stat-label">Average Score</div></div>
    </div>
  `;
}

// ══════════════════════════════════════════
//  DARK / LIGHT THEME
// ══════════════════════════════════════════

const themeBtn = document.getElementById('themeToggle');

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('lms_theme', theme);
}

themeBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
});

// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════

(function init() {
    // Restore theme
    applyTheme(localStorage.getItem('lms_theme') || 'light');

    // Restore session
    const session = getSession();
    if (session) {
        enterApp();
    }
})();
