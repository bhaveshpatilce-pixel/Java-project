/* ========================================
   Google Classroom Lite — Application Logic
   Backend-Connected Version (MongoDB + Node.js)
   ======================================== */

const API_BASE = window.location.origin + '/api';

// ══════════════════════════════════════════
//  UTILITIES & API HELPER
// ══════════════════════════════════════════

/** API Fetch Wrapper with Auth */
async function apiFetch(endpoint, options = {}) {
    const token = sessionStorage.getItem('lms_token');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Something went wrong');
        return data;
    } catch (err) {
        console.error(`API Error (${endpoint}):`, err.message);
        throw err;
    }
}

/** Help normalize MongoDB _id to frontend id */
const norm = (item) => {
    if (!item) return null;
    if (Array.isArray(item)) return item.map(i => ({ ...i, id: i._id || i.id }));
    return { ...item, id: item._id || item.id };
};

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
//  DATA LAYER (Backend API Calls)
// ══════════════════════════════════════════

// --- Session ---
function setSession(user, token) {
    sessionStorage.setItem('lms_token', token);
    sessionStorage.setItem('lms_session', JSON.stringify({ id: user.id || user._id, name: user.name, email: user.email, role: user.role }));
}
function getSession() {
    try { return JSON.parse(sessionStorage.getItem('lms_session')); } catch { return null; }
}
function clearSession() {
    sessionStorage.removeItem('lms_session');
    sessionStorage.removeItem('lms_token');
}

// --- Courses ---
async function fetchTeacherCourses() { return norm(await apiFetch('/courses/my')); }
async function fetchEnrolledCourses() { return norm(await apiFetch('/courses/enrolled/me')); }
async function fetchCourseById(id) { return norm(await apiFetch(`/courses/${id}`)); }
async function fetchCourseStudents(id) { return norm(await apiFetch(`/courses/${id}/students`)); }
async function createCourse(name, description) { 
    return norm(await apiFetch('/courses', { method: 'POST', body: JSON.stringify({ name, description }) })); 
}
async function enrollCourse(code) {
    const course = await apiFetch(`/courses/code/${code}`);
    return await apiFetch(`/courses/${course._id}/enroll`, { method: 'POST' });
}

// --- Assignments ---
async function fetchAssignments(courseId) { return norm(await apiFetch(`/assignments/course/${courseId}`)); }
async function fetchAssignmentById(id) { return norm(await apiFetch(`/assignments/${id}`)); }
async function createAssignment(courseId, title, description, deadline, totalMarks) {
    return norm(await apiFetch('/assignments', { 
        method: 'POST', 
        body: JSON.stringify({ courseId, title, description, deadline, totalMarks: Number(totalMarks) }) 
    }));
}

// --- Submissions ---
async function fetchSubmissionById(id) { return norm(await apiFetch(`/submissions/${id}`)); }
async function fetchTeacherSubmissions() { return norm(await apiFetch('/submissions/teacher')); }
async function fetchAssignmentSubmissions(assignmentId) { return norm(await apiFetch(`/submissions/assignment/${assignmentId}`)); }
async function fetchStudentSubmissions() { return norm(await apiFetch('/submissions/student/me')); }
async function submitWork(assignmentId, content) {
    return norm(await apiFetch('/submissions', { 
        method: 'POST', 
        body: JSON.stringify({ assignmentId, content }) 
    }));
}
async function gradeWork(submissionId, marks, feedback) {
    return await apiFetch(`/submissions/${submissionId}/grade`, { 
        method: 'PUT', 
        body: JSON.stringify({ marks: Number(marks), feedback }) 
    });
}

// --- Announcements ---
async function fetchAnnouncements(courseId) { return norm(await apiFetch(`/announcements/course/${courseId}`)); }
async function createAnnouncement(courseId, text) {
    return norm(await apiFetch('/announcements', { 
        method: 'POST', 
        body: JSON.stringify({ courseId, text }) 
    }));
}

// ══════════════════════════════════════════
//  AUTH LOGIC
// ══════════════════════════════════════════

function toggleAuth(mode) {
    document.getElementById('loginForm').style.display = mode === 'login' ? '' : 'none';
    document.getElementById('signupForm').style.display = mode === 'signup' ? '' : 'none';
}

async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const role = document.querySelector('input[name="signupRole"]:checked').value;

    if (!name || !email || !password) return showToast('All fields are required.', 'error');
    
    try {
        const data = await apiFetch('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ name, email, password, role })
        });
        setSession(data.user, data.token);
        showToast(`Welcome, ${data.user.name}!`);
        enterApp();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        const data = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        setSession(data.user, data.token);
        showToast(`Welcome back, ${data.user.name}!`);
        enterApp();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function handleLogout() {
    clearSession();
    document.getElementById('appShell').classList.remove('active');
    document.getElementById('authSection').style.display = '';
    document.querySelectorAll('#authSection form').forEach(f => f.reset());
    toggleAuth('login');
}

// ══════════════════════════════════════════
//  APP SHELL / NAVIGATION
// ══════════════════════════════════════════

let currentView = '';
let currentCourseId = null;

async function enterApp() {
    const session = getSession();
    if (!session) return;

    document.getElementById('authSection').style.display = 'none';
    document.getElementById('appShell').classList.add('active');
    document.getElementById('topbarAvatar').textContent = initials(session.name);

    buildSidebar(session.role);

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

async function navigateTo(viewId) {
    currentView = viewId;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const view = document.getElementById(viewId);
    if (view) view.classList.add('active');

    document.querySelectorAll('.sidebar-link').forEach(l => {
        l.classList.toggle('active', l.getAttribute('data-view') === viewId);
    });

    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');

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

    await renderView(viewId);
}

async function renderView(viewId) {
    try {
        switch (viewId) {
            case 'view-dashboard': await renderTeacherDashboard(); break;
            case 'view-courses': await renderCourses(); break;
            case 'view-course-detail': await renderCourseDetail(); break;
            case 'view-submissions': await renderAllSubmissions(); break;
            case 'view-student-dashboard': await renderStudentDashboard(); break;
            case 'view-student-courses': await renderStudentCourses(); break;
            case 'view-student-course-detail': await renderStudentCourseDetail(); break;
            case 'view-grades': await renderGrades(); break;
            case 'view-profile': renderProfile(); break;
        }
    } catch (err) {
        showToast('Failed to load data.', 'error');
    }
}

// ══════════════════════════════════════════
//  UI HELPERS
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

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

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

async function renderTeacherDashboard() {
    const courses = await fetchTeacherCourses();
    const subs = await fetchTeacherSubmissions();
    const pending = subs.filter(s => s.marks === undefined || s.marks === null).length;

    document.getElementById('statsRow').innerHTML = `
    <div class="stat-card"><div class="stat-icon">📚</div><div class="stat-value">${courses.length}</div><div class="stat-label">Courses</div></div>
    <div class="stat-card"><div class="stat-icon">📬</div><div class="stat-value">${subs.length}</div><div class="stat-label">Submissions</div></div>
    <div class="stat-card"><div class="stat-icon">⏳</div><div class="stat-value">${pending}</div><div class="stat-label">Pending Grading</div></div>
  `;

    const recent = courses.slice(0, 3);
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

async function renderCourses() {
    const query = document.getElementById('courseSearch')?.value.toLowerCase() || '';
    let courses = await fetchTeacherCourses();
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
    return `
    <div class="course-card" onclick="openCourseDetail('${course.id}')">
      <div class="course-card-banner" style="background:${bannerColor(index)};">
        <h3>${esc(course.name)}</h3>
      </div>
      <div class="course-card-body">
        <p>${esc(course.description)}</p>
        <div class="course-card-footer">
          <span>Teacher</span>
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

async function handleCreateCourse(e) {
    e.preventDefault();
    const name = document.getElementById('courseName').value.trim();
    const desc = document.getElementById('courseDesc').value.trim();

    try {
        const course = await createCourse(name, desc);
        showToast(`Course created! Code: ${course.code}`);
        closeModal('courseModal');
        document.getElementById('courseForm').reset();
        await renderCourses();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ══════════════════════════════════════════
//  TEACHER: COURSE DETAIL
// ══════════════════════════════════════════

async function openCourseDetail(courseId) {
    currentCourseId = courseId;
    navigateTo('view-course-detail');
}

async function renderCourseDetail() {
    const course = await fetchCourseById(currentCourseId);
    if (!course) return;

    document.getElementById('courseDetailBanner').innerHTML = `
    <div class="course-detail-banner" style="background:${bannerColor(0)};">
      <h2>${esc(course.name)}</h2>
      <p>${esc(course.description)}</p>
      <div class="detail-code">Code: ${course.code}</div>
    </div>
  `;

    await renderCourseAnnouncements();
    await renderCourseAssignments();
    await renderCourseStudents();
}

async function renderCourseAnnouncements() {
    const announces = await fetchAnnouncements(currentCourseId);
    const list = document.getElementById('announcementList');
    if (announces.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-icon">📢</div><p>No announcements yet.</p></div>';
        return;
    }
    list.innerHTML = announces.map(a => `
    <div class="card">
      <div class="announce-card">
        <div class="announce-avatar">${initials(a.teacherName || 'T')}</div>
        <div class="announce-body">
          <strong>${esc(a.teacherName || 'Teacher')}</strong>
          <p style="margin-top:4px;">${esc(a.text)}</p>
          <div class="announce-meta">${fmtDate(a.createdAt)}</div>
        </div>
      </div>
    </div>
  `).join('');
}

async function renderCourseAssignments() {
    const assignments = await fetchAssignments(currentCourseId);
    const list = document.getElementById('assignmentList');
    if (assignments.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><p>No assignments yet.</p></div>';
        return;
    }
    list.innerHTML = assignments.map(a => {
        const expired = isExpired(a.deadline);
        return `
      <div class="card">
        <div class="card-row">
          <div>
            <h4>${esc(a.title)}</h4>
            <p>${esc(a.description)}</p>
            <div class="meta ${expired ? 'expired' : ''}">
              Deadline: ${fmtDate(a.deadline)} ${expired ? '· Expired' : ''} · ${a.totalMarks} marks
            </div>
          </div>
        </div>
      </div>
    `;
    }).join('');
}

async function renderCourseStudents() {
    const students = await fetchCourseStudents(currentCourseId);
    const list = document.getElementById('studentList');

    if (students.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><p>No students enrolled yet.</p></div>';
        return;
    }

    list.innerHTML = `
    <div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Email</th></tr></thead>
      <tbody>${students.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.email)}</td></tr>`).join('')}</tbody>
    </table></div>
  `;
}

async function handleAddAssignment(e) {
    e.preventDefault();
    const title = document.getElementById('assignTitle').value.trim();
    const desc = document.getElementById('assignDesc').value.trim();
    const deadline = document.getElementById('assignDeadline').value;
    const marks = document.getElementById('assignMarks').value;

    try {
        await createAssignment(currentCourseId, title, desc, deadline, marks);
        showToast('Assignment added!');
        closeModal('assignmentModal');
        document.getElementById('assignmentForm').reset();
        await renderCourseAssignments();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handlePostAnnouncement(e) {
    e.preventDefault();
    const text = document.getElementById('announceText').value.trim();
    if (!text) return;

    try {
        await createAnnouncement(currentCourseId, text);
        showToast('Announcement posted!');
        closeModal('announceModal');
        document.getElementById('announceForm').reset();
        await renderCourseAnnouncements();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ══════════════════════════════════════════
//  TEACHER: SUBMISSIONS
// ══════════════════════════════════════════

async function renderAllSubmissions() {
    const subs = await fetchTeacherSubmissions();
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
        const a = s.assignmentId;
        const graded = s.marks !== null && s.marks !== undefined;
        return `
            <tr>
              <td>${esc(s.studentName || 'Student')}</td>
              <td>${esc(a?.title || 'Unknown')}</td>
              <td>${fmtDate(s.submittedAt)}</td>
              <td>${graded ? `${s.marks}/${a?.totalMarks || 100}` : '—'}</td>
              <td>${graded ? '<span class="badge badge-success">Graded</span>' : '<span class="badge badge-warning">Pending</span>'}</td>
              <td><button class="btn btn-sm btn-secondary" onclick="openGradeModal('${s.id}')">Grade</button></td>
            </tr>
          `;
    }).join('')}
      </tbody>
    </table>
  `;
}

async function openGradeModal(submissionId) {
    const sub = await fetchSubmissionById(submissionId);
    const assignment = sub.assignmentId;

    document.getElementById('gradeSubId').value = submissionId;
    document.getElementById('gradeMarks').max = assignment?.totalMarks || 100;
    document.getElementById('gradeMarks').value = sub.marks ?? '';
    document.getElementById('gradeFeedback').value = sub.feedback || '';
    document.getElementById('gradeSubmissionInfo').innerHTML = `
    <div class="card" style="margin:0;">
      <p><strong>${esc(sub.studentId?.name || '')}</strong> — ${esc(assignment?.title || '')}</p>
      <p style="margin-top:6px;">${esc(sub.content)}</p>
    </div>
  `;
    openModal('gradeModal');
}

async function handleGradeSubmission(e) {
    e.preventDefault();
    const id = document.getElementById('gradeSubId').value;
    const marks = document.getElementById('gradeMarks').value;
    const feedback = document.getElementById('gradeFeedback').value.trim();

    try {
        await gradeWork(id, marks, feedback);
        showToast('Submission graded!');
        closeModal('gradeModal');
        await renderAllSubmissions();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ══════════════════════════════════════════
//  STUDENT: DASHBOARD
// ══════════════════════════════════════════

async function renderStudentDashboard() {
    const session = getSession();
    const courses = await fetchEnrolledCourses();
    const mySubs = await fetchStudentSubmissions();
    const graded = mySubs.filter(s => s.marks !== null && s.marks !== undefined);

    document.getElementById('studentStatsRow').innerHTML = `
    <div class="stat-card"><div class="stat-icon">📚</div><div class="stat-value">${courses.length}</div><div class="stat-label">Enrolled</div></div>
    <div class="stat-card"><div class="stat-icon">📝</div><div class="stat-value">${mySubs.length}</div><div class="stat-label">Submissions</div></div>
    <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-value">${graded.length}</div><div class="stat-label">Graded</div></div>
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

async function renderStudentCourses() {
    const query = document.getElementById('studentCourseSearch')?.value.toLowerCase() || '';
    let courses = await fetchEnrolledCourses();
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
    return `
    <div class="course-card" onclick="openStudentCourseDetail('${course.id}')">
      <div class="course-card-banner" style="background:${bannerColor(index)};">
        <h3>${esc(course.name)}</h3>
      </div>
      <div class="course-card-body">
        <p>${esc(course.description)}</p>
        <div class="course-card-footer">
          <span>Teacher ID: ${course.teacherId?.slice(-6) || '...'}</span>
        </div>
      </div>
    </div>
  `;
}

async function handleJoinCourse(e) {
    e.preventDefault();
    const code = document.getElementById('joinCode').value.trim().toUpperCase();
    if (code.length < 6) return;

    try {
        await enrollCourse(code);
        showToast('Joined successfully!');
        closeModal('joinModal');
        await renderStudentDashboard();
        navigateTo('view-student-courses');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function openStudentCourseDetail(courseId) {
    currentCourseId = courseId;
    navigateTo('view-student-course-detail');
}

async function renderStudentCourseDetail() {
    const course = await fetchCourseById(currentCourseId);
    document.getElementById('studentCourseDetailBanner').innerHTML = `
    <div class="course-detail-banner" style="background:${bannerColor(0)};">
      <h2>${esc(course.name)}</h2>
      <p>${esc(course.description)}</p>
    </div>
  `;

    await renderStudentAnnouncements();
    await renderStudentAssignments();
}

async function renderStudentAnnouncements() {
    const announces = await fetchAnnouncements(currentCourseId);
    const list = document.getElementById('studentAnnouncementList');
    if (announces.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>No announcements.</p></div>';
        return;
    }
    list.innerHTML = announces.map(a => `<div class="card"><p><strong>Teacher:</strong> ${esc(a.text)}</p></div>`).join('');
}

async function renderStudentAssignments() {
    const list = document.getElementById('studentAssignmentList');
    const assignments = await fetchAssignments(currentCourseId);
    const mySubs = await fetchStudentSubmissions();

    if (assignments.length === 0) {
        list.innerHTML = '<div class="empty-state"><p>No assignments.</p></div>';
        return;
    }

    list.innerHTML = assignments.map(a => {
        const sub = mySubs.find(s => s.assignmentId?._id === a.id || s.assignmentId === a.id);
        const subStatus = sub ? (sub.marks !== null ? `Graded: ${sub.marks}/${a.totalMarks}` : 'Submitted (Pending)') : 'Not Submitted';
        return `
      <div class="card">
        <div class="card-row">
          <div>
            <h4>${esc(a.title)}</h4>
            <div class="meta">Deadline: ${fmtDate(a.deadline)}</div>
          </div>
          <div>
            ${sub ? `<span class="badge ${sub.marks !== null ? 'badge-success' : 'badge-warning'}">${subStatus}</span>` : `<button class="btn btn-sm btn-primary" onclick="openSubmitModal('${a.id}')">Submit</button>`}
          </div>
        </div>
      </div>
    `;
    }).join('');
}

function openSubmitModal(id) {
    document.getElementById('submitAssignId').value = id;
    openModal('submitModal');
}

async function handleSubmitAssignment(e) {
    e.preventDefault();
    const id = document.getElementById('submitAssignId').value;
    const content = document.getElementById('submissionText').value.trim();

    try {
        await submitWork(id, content);
        showToast('Work submitted!');
        closeModal('submitModal');
        await renderStudentCourseDetail();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ══════════════════════════════════════════
//  STUDENT: GRADES & PROFILE
// ══════════════════════════════════════════

async function renderGrades() {
    const subs = await fetchStudentSubmissions();
    const tableWrap = document.getElementById('gradesTable');
    const empty = document.getElementById('gradesEmpty');

    const graded = subs.filter(s => s.marks !== null && s.marks !== undefined);
    if (graded.length === 0) {
        tableWrap.innerHTML = '';
        empty.style.display = '';
        return;
    }
    empty.style.display = 'none';

    tableWrap.innerHTML = `
    <table>
      <thead><tr><th>Assignment</th><th>Course</th><th>Marks</th><th>Feedback</th></tr></thead>
      <tbody>${graded.map(g => `
        <tr>
          <td>${esc(g.assignmentId?.title || 'Assignment')}</td>
          <td>${esc(g.assignmentId?.courseId?.name || 'Course')}</td>
          <td>${g.marks}/${g.assignmentId?.totalMarks || 100}</td>
          <td>${esc(g.feedback || '—')}</td>
        </tr>
      `).join('')}</tbody>
    </table>
  `;
}

function renderProfile() {
    const session = getSession();
    document.getElementById('profileContent').innerHTML = `
    <div class="card">
      <div style="display:flex;align-items:center;gap:20px;">
        <div class="topbar-avatar" style="width:80px;height:80px;font-size:2rem;">${initials(session.name)}</div>
        <div>
          <h2 style="margin:0;">${esc(session.name)}</h2>
          <p style="color:var(--text-secondary);">${esc(session.email)}</p>
          <span class="badge" style="background:var(--brand-primary);color:white;margin-top:8px;display:inline-block;">${session.role.toUpperCase()}</span>
        </div>
      </div>
    </div>
  `;
}

/** Export Submissions as CSV */
async function exportCSV() {
    try {
        const subs = await fetchTeacherSubmissions();
        if (subs.length === 0) return showToast('No data to export.', 'error');

        const headers = ['Student', 'Email', 'Assignment', 'Marks', 'Total Marks', 'Status', 'Submitted At'];
        const rows = subs.map(s => [
            s.studentName || 'Unknown',
            s.studentId?.email || '',
            s.assignmentId?.title || 'Unknown',
            s.marks ?? '—',
            s.assignmentId?.totalMarks || '—',
            s.marks !== null ? 'Graded' : 'Pending',
            fmtDate(s.submittedAt)
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `submissions_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('CSV exported successfully!');
    } catch (err) {
        showToast('Failed to export CSV.', 'error');
    }
}

/** Export via Java Component (25% Java logic) */
async function exportJava() {
    showToast('Processing via Java Engine...', 'success');
    try {
        const data = await apiFetch('/submissions/export-java');
        const link = document.createElement("a");
        link.href = data.downloadUrl;
        link.download = data.downloadUrl.split('/').pop();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Java Export Successful!');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    const session = getSession();
    if (session) {
        enterApp();
    } else {
        toggleAuth('login');
    }

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
        const root = document.documentElement;
        const current = root.getAttribute('data-theme');
        const next = current === 'light' ? 'dark' : 'light';
        root.setAttribute('data-theme', next);
        document.getElementById('themeToggle').textContent = next === 'light' ? '🌙' : '☀️';
    });
});
