document.addEventListener('DOMContentLoaded', () => {
    
    // Check Auth State
    const currentUser = DB.getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }
    
    document.getElementById('app-section').style.display = 'flex';
    document.getElementById('user-name-display').innerText = currentUser.name;

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        DB.logout();
    });

    // Sidebar Toggle for Mobile
    window.toggleSidebar = () => {
        const nav = document.querySelector('nav');
        if (nav) {
            nav.classList.toggle('hidden');
            nav.classList.toggle('flex');
        }
    };

    // Navigation setup
    const navLinks = document.querySelectorAll('nav a[data-target]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-target');
            switchTab(target);
            
            // Close sidebar on mobile after clicking
            const nav = document.querySelector('nav');
            if (nav && window.innerWidth < 768) {
                nav.classList.add('hidden');
                nav.classList.remove('flex');
            }
        });
    });

    // Roster search and filter event listeners
    document.getElementById('roster-search')?.addEventListener('input', loadRoster);
    document.getElementById('roster-course-filter')?.addEventListener('change', loadRoster);

    // Initial load
    loadDashboardStats();
});

// Global tab switching
window.switchTab = (target) => {
    const navLinks = document.querySelectorAll('nav a[data-target]');
    const targetLink = Array.from(navLinks).find(l => l.getAttribute('data-target') === target);
    if (!targetLink) return;

    // Remove active styles from all links
    navLinks.forEach(link => {
        link.className = "flex items-center gap-3 px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-surface-container-high transition-colors duration-200 cursor-pointer active:scale-95 w-full";
        const icon = link.querySelector('.material-symbols-outlined');
        if (icon) icon.className = "material-symbols-outlined";
        const textSpan = link.querySelector('span:not(.material-symbols-outlined)');
        if (textSpan) textSpan.className = "font-label-md text-label-md";
    });

    // Add active styles to target link
    targetLink.className = "flex items-center gap-3 px-4 py-3 border-l-4 border-primary bg-surface-container-high text-text-primary cursor-pointer active:scale-95 w-full";
    const activeIcon = targetLink.querySelector('.material-symbols-outlined');
    if (activeIcon) activeIcon.className = "material-symbols-outlined text-primary";
    const activeText = targetLink.querySelector('span:not(.material-symbols-outlined)');
    if (activeText) activeText.className = "font-label-md text-label-md text-primary";

    // Toggle panels
    document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
    const targetPanel = document.getElementById(target);
    if (targetPanel) targetPanel.classList.add('active');

    // Update title
    const titleText = targetLink.querySelector('span:not(.material-symbols-outlined)')?.innerText || target;
    document.getElementById('page-title').innerText = titleText;

    // Load data
    if (target === 'dashboard') {
        loadDashboardStats();
    } else if (target === 'manage-attendance') {
        loadSessions();
    } else if (target === 'chat') {
        loadChat();
    } else if (target === 'roster') {
        loadRoster();
    }
};

// Global Modals
window.showModal = (id) => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
};
window.hideModal = (id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
};

// --- Dashboard Management ---
function loadDashboardStats() {
    const studentsCount = mockRosterData.length;
    document.getElementById('stat-total-students').innerText = studentsCount;
    document.getElementById('stat-total-submissions').innerText = DB.get('attendance').length;
}

// --- Attendance Management ---
window.startSession = () => {
    const courseId = document.getElementById('course-select').value;
    const method = document.getElementById('method-select').value;
    
    const session = DB.startAttendanceSession(courseId, method);
    loadSessions();
    
    if (method === 'QR' || method === 'OTP') {
        document.getElementById('qr-display-code').innerText = method === 'OTP' ? `OTP PIN: ${session.code}` : `QR CODE ACTIVE`;
        showModal('display-qr-modal');
    } else {
        alert(`WiFi Attendance Session Started for ${courseId}`);
    }
};

window.endSession = (sessionId) => {
    const sessions = DB.get('active_sessions');
    const index = sessions.findIndex(s => s.id === sessionId);
    if (index > -1) {
        sessions[index].active = false;
        DB.set('active_sessions', sessions);
        loadSessions();
    }
};

function loadSessions() {
    const sessions = DB.get('active_sessions');
    const tbody = document.getElementById('active-sessions-list');
    tbody.innerHTML = '';
    
    if (sessions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-text-secondary">No active or past sessions.</td></tr>';
        return;
    }

    // Sort newest first
    sessions.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    sessions.forEach(s => {
        const time = new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let methodIcon = 'qr_code';
        let methodName = 'QR Code';
        if (s.method === 'OTP') {
            methodIcon = 'pin';
            methodName = 'OTP Pin';
        } else if (s.method === 'WIFI') {
            methodIcon = 'wifi';
            methodName = 'WiFi Location';
        }

        const codeDisplay = s.active
            ? (s.method === 'OTP' ? `<span class="font-mono bg-surface-container-high px-2 py-1 rounded text-primary text-sm font-semibold tracking-wider">${s.code}</span>` : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-container text-text-primary">Active</span>`)
            : (s.method === 'OTP' ? `<span class="font-mono text-text-secondary text-sm">${s.code}</span>` : `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-container-highest text-text-secondary">Ended</span>`);

        const actionBtn = s.active 
            ? `<button onclick="endSession('${s.id}')" class="text-error hover:text-red-400 transition-colors flex items-center justify-end w-full">
                   <span class="material-symbols-outlined">stop_circle</span>
               </button>`
            : `<span class="text-xs text-text-secondary">Closed</span>`;
        
        tbody.innerHTML += `
            <tr class="table-row-hover border-b border-glass-border transition-colors">
                <td class="py-4 px-6 font-medium text-text-primary">${s.courseId}</td>
                <td class="py-4 px-6 text-text-primary">
                    <span class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-[16px] text-text-secondary">${methodIcon}</span>
                        ${methodName}
                    </span>
                </td>
                <td class="py-4 px-6 text-text-secondary">${time}</td>
                <td class="py-4 px-6">${codeDisplay}</td>
                <td class="py-4 px-6 text-right">${actionBtn}</td>
            </tr>
        `;
    });
}

// --- Materials Management ---
window.uploadMaterial = () => {
    const title = document.getElementById('mat-title').value;
    const course = document.getElementById('mat-course').value;
    const week = document.getElementById('mat-week').value;

    if(!title) return alert('Please enter a title');

    const materials = DB.get('materials');
    materials.push({
        id: DB.generateId(),
        title,
        courseId: course,
        week,
        timestamp: new Date().toISOString()
    });
    DB.set('materials', materials);
    
    alert('Material Published Successfully!');
    document.getElementById('mat-title').value = '';
};

// --- Assessments Management ---
window.createAssessment = () => {
    const title = document.getElementById('ass-title').value;
    const course = document.getElementById('ass-course').value;
    const deadline = document.getElementById('ass-deadline').value;

    if(!title || !deadline) return alert('Please enter title and deadline');

    const assessments = DB.get('assessments');
    assessments.push({
        id: DB.generateId(),
        title,
        courseId: course,
        deadline,
        timestamp: new Date().toISOString()
    });
    DB.set('assessments', assessments);
    
    alert('Assessment Created Successfully!');
    document.getElementById('ass-title').value = '';
    document.getElementById('ass-deadline').value = '';
};

// --- Chat Management ---
function loadChat() {
    const messages = DB.get('messages');
    const container = document.getElementById('chat-messages');
    container.innerHTML = '';
    const user = DB.getCurrentUser();
    
    if (messages.length === 0) {
        container.innerHTML = '<div class="text-center text-text-secondary my-8">No messages yet. Start the conversation!</div>';
        return;
    }

    messages.forEach(msg => {
        const isMine = msg.senderId === user.id;
        
        if (isMine) {
            container.innerHTML += `
                <div class="flex gap-4 flex-row-reverse">
                    <img alt="Me" class="w-8 h-8 rounded-full object-cover border border-glass-border shrink-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4YvyfkajIlBlM0yoxZsmju1q5IUr3EePDuEnzySqDgszoYiJXL65L9ppJcDBkI6Fgncj76QRBUYezRk-4vLFPP9y2b6iyU5IS5zzolLsZ9SzmQWwLdw41VN0-iX6ifuPzbLuT-fO5XUKkU1m2qh6V7b2WHyQ-wdLjBnKSPep2pOOcocXvVrCiyqXIldvqsLxfRAnj17jAxl1W5PKSsLDb4-PINdC-o_oxKtdekXMBGI3C23VvD_jZ"/>
                    <div class="flex flex-col items-end">
                        <div class="flex items-baseline gap-2 flex-row-reverse">
                            <span class="font-label-md text-label-md font-bold text-text-primary">${msg.senderName}</span>
                            <span class="font-label-md text-[10px] text-text-secondary">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <p class="font-body-md text-body-md text-text-primary bg-primary-container p-3 rounded-lg rounded-tr-none mt-1 shadow-sm inline-block max-w-[80%]">
                            ${msg.text}
                        </p>
                    </div>
                </div>
            `;
        } else {
            const initial = msg.senderName.charAt(0);
            container.innerHTML += `
                <div class="flex gap-4">
                    <div class="w-8 h-8 rounded-full bg-surface-container-high text-text-primary border border-glass-border flex items-center justify-center font-bold text-xs shrink-0">${initial}</div>
                    <div>
                        <div class="flex items-baseline gap-2">
                            <span class="font-label-md text-label-md font-bold text-text-primary">${msg.senderName}</span>
                            <span class="font-label-md text-[10px] text-text-secondary">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <p class="font-body-md text-body-md text-text-primary bg-surface-container-high p-3 rounded-lg rounded-tl-none mt-1 shadow-sm inline-block max-w-[80%] border border-glass-border">
                            ${msg.text}
                        </p>
                    </div>
                </div>
            `;
        }
    });
    container.scrollTop = container.scrollHeight;
}

window.sendMessage = () => {
    const input = document.getElementById('chat-input-text');
    const text = input.value.trim();
    if (!text) return;
    
    const user = DB.getCurrentUser();
    const messages = DB.get('messages');
    
    messages.push({
        id: DB.generateId(),
        senderId: user.id,
        senderName: user.name,
        text: text,
        timestamp: new Date().toISOString()
    });
    
    DB.set('messages', messages);
    input.value = '';
    loadChat();
};

// --- Roster Management ---
const mockRosterData = [
    { id: 'u1', name: 'Student One', studentId: '2023001', course: 'CS101', attendance: 95, gpa: '3.8', assignments: '12/12', emergency: 'Sarah Johnson (Mother) • +1 (555) 012-3456' },
    { id: 'u3', name: 'Maria Garcia', studentId: '2023042', course: 'CS101', attendance: 88, gpa: '3.5', assignments: '10/12', emergency: 'Carlos Garcia (Father) • +1 (555) 987-6543' },
    { id: 'u4', name: 'Liam Smith', studentId: '2023015', course: 'MATH201', attendance: 92, gpa: '3.9', assignments: '11/12', emergency: 'John Smith (Father) • +1 (555) 456-7890' }
];

window.showStudentModal = (studentId) => {
    const student = mockRosterData.find(s => s.studentId === studentId);
    if (!student) return;

    document.getElementById('modal-student-avatar').innerText = student.name.split(' ').map(n => n[0]).join('');
    document.getElementById('modal-student-name').innerText = student.name;
    document.getElementById('modal-student-id').innerText = `Student ID: ${student.studentId}`;
    document.getElementById('modal-student-course-badge').innerText = student.course;
    document.getElementById('modal-student-attendance-stat').innerText = `${student.attendance}%`;
    document.getElementById('modal-perf-course').innerText = `${student.course} Performance`;
    document.getElementById('modal-perf-pct').innerText = `${student.attendance}%`;
    document.getElementById('modal-perf-bar').style.width = `${student.attendance}%`;
    
    const emergencyEl = document.querySelector('#student-profile-modal p.text-body-md');
    if (emergencyEl) emergencyEl.innerText = student.emergency;

    showModal('student-profile-modal');
};

function loadRoster() {
    const list = document.getElementById('roster-list');
    const searchVal = document.getElementById('roster-search')?.value.toLowerCase() || '';
    const courseVal = document.getElementById('roster-course-filter')?.value || 'all';
    
    if (!list) return;
    list.innerHTML = '';
    
    const filtered = mockRosterData.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchVal) || s.studentId.includes(searchVal);
        const matchesCourse = courseVal === 'all' || s.course === courseVal;
        return matchesSearch && matchesCourse;
    });

    if (filtered.length === 0) {
        list.innerHTML = '<tr><td colspan="6" class="py-6 text-center text-text-secondary">No students found.</td></tr>';
        return;
    }

    filtered.forEach(s => {
        const initials = s.name.split(' ').map(n => n[0]).join('');
        list.innerHTML += `
            <tr class="table-row-hover border-b border-glass-border transition-colors">
                <td class="py-4 px-6 flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-surface-container-high border border-glass-border text-text-primary flex items-center justify-center font-bold text-xs">${initials}</div>
                    <span class="font-medium text-text-primary">${s.name}</span>
                </td>
                <td class="py-4 px-6 text-text-secondary">${s.studentId}</td>
                <td class="py-4 px-6 text-text-secondary">${s.course}</td>
                <td class="py-4 px-6">
                    <div class="flex items-center gap-2">
                        <div class="w-16 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                            <div class="bg-primary h-full" style="width: ${s.attendance}%"></div>
                        </div>
                        <span class="text-xs font-medium text-text-primary">${s.attendance}%</span>
                    </div>
                </td>
                <td class="py-4 px-6">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-container text-text-primary">Active</span>
                </td>
                <td class="py-4 px-6 text-right">
                    <div class="flex justify-end gap-2">
                        <button onclick="showStudentModal('${s.studentId}')" class="text-text-secondary hover:text-primary p-1">
                            <span class="material-symbols-outlined text-[20px]">visibility</span>
                        </button>
                        <a href="mailto:${s.name.toLowerCase().replace(' ', '')}@ranafhub.com" class="text-text-secondary hover:text-primary p-1 flex items-center">
                            <span class="material-symbols-outlined text-[20px]">mail</span>
                        </a>
                    </div>
                </td>
            </tr>
        `;
    });
}
