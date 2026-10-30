document.addEventListener('DOMContentLoaded', () => {
    
    // Check Auth State
    const currentUser = DB.getCurrentUser();
    if (currentUser) {
        if (currentUser.role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            showApp();
        }
    } else {
        document.getElementById('auth-section').style.display = 'flex';
    }

    // Login Form Handler
    document.getElementById('login-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        
        const user = DB.login(email, pass);
        if (user) {
            if (user.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                showApp();
            }
        } else {
            alert('Invalid credentials. Try student@ranafhub.com / password');
        }
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        DB.logout();
    });

    // Navigation setup
    const navLinks = document.querySelectorAll('nav a[data-target]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-target');
            switchTab(target);
        });
    });

});

function showApp() {
    document.getElementById('auth-section').style.display = 'none';
    const app = document.getElementById('app-section');
    app.style.display = 'flex';
    
    const user = DB.getCurrentUser();
    document.getElementById('user-name-display').innerText = user.name;
    
    switchTab('dashboard');
}

// Global Tab Switcher
window.switchTab = (target) => {
    const navLinks = document.querySelectorAll('nav a[data-target]');
    const targetLink = Array.from(navLinks).find(l => l.getAttribute('data-target') === target);
    if (!targetLink) return;

    // Remove active styles from all links
    navLinks.forEach(link => {
        link.className = "flex items-center gap-3 text-on-surface-variant hover:text-on-surface px-4 py-3 hover:bg-white/5 transition-all duration-200 rounded cursor-pointer w-full";
        const icon = link.querySelector('.material-symbols-outlined');
        if (icon) icon.style.fontVariationSettings = "'FILL' 0";
    });

    // Add active styles to target link
    targetLink.className = "flex items-center gap-3 text-secondary font-bold border-l-4 border-primary bg-primary/10 px-4 py-3 rounded-r transition-transform translate-x-1 cursor-pointer w-full";
    const activeIcon = targetLink.querySelector('.material-symbols-outlined');
    if (activeIcon) activeIcon.style.fontVariationSettings = "'FILL' 1";

    // Toggle panels
    document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
    const targetPanel = document.getElementById(target);
    if (targetPanel) targetPanel.classList.add('active');

    // Update page title
    const titleText = targetLink.querySelector('span:not(.material-symbols-outlined)')?.innerText || target;
    const pageTitleEl = document.getElementById('page-title');
    if (pageTitleEl) pageTitleEl.innerText = titleText;

    // Load data for section
    loadSectionData(target);
};

// Global Modal Functions
window.showModal = (id) => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
};
window.hideModal = (id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
};

// --- Attendance Handlers ---
window.mockScanQR = () => {
    const activeSessions = DB.get('active_sessions').filter(s => s.active && s.method === 'QR');
    if (activeSessions.length > 0) {
        processAttendance(activeSessions[0].id, 'QR');
        hideModal('qr-modal');
    } else {
        alert('No active QR attendance sessions found right now.');
    }
};

window.submitOTP = () => {
    const code = document.getElementById('otp-input').value;
    const activeSessions = DB.get('active_sessions').filter(s => s.active && s.method === 'OTP');
    
    const session = activeSessions.find(s => s.code === code);
    if (session) {
        processAttendance(session.id, 'OTP');
        hideModal('otp-modal');
        document.getElementById('otp-input').value = '';
    } else {
        alert('Invalid or expired OTP code.');
    }
};

window.verifyWifiAttendance = () => {
    const activeSessions = DB.get('active_sessions').filter(s => s.active && s.method === 'WIFI');
    if (activeSessions.length > 0) {
        processAttendance(activeSessions[0].id, 'WIFI');
        alert('Verified connection to University Secure Network!');
    } else {
        alert('No active WiFi attendance sessions found right now.');
    }
};

function processAttendance(sessionId, method) {
    const user = DB.getCurrentUser();
    const result = DB.markAttendance(user.id, sessionId, method);
    if (result.success) {
        alert(`Successfully marked present via ${method}!`);
        switchTab('attendance');
    } else {
        alert(result.message);
    }
}

// --- Data Loaders ---
function loadSectionData(section) {
    if (section === 'attendance') {
        const attendance = DB.get('attendance').filter(a => a.studentId === DB.getCurrentUser().id);
        const tbody = document.getElementById('attendance-list');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (attendance.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-text-secondary">No records found.</td></tr>';
            return;
        }
        
        attendance.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        attendance.forEach(record => {
            const date = new Date(record.timestamp).toLocaleString();
            tbody.innerHTML += `
                <tr class="table-row-hover border-b border-glass-border transition-colors">
                    <td class="py-4 px-6 text-text-secondary">${date}</td>
                    <td class="py-4 px-6 font-medium text-text-primary">${record.courseId}</td>
                    <td class="py-4 px-6 text-text-secondary">${record.method}</td>
                    <td class="py-4 px-6 text-right">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-container text-text-primary">
                            Present
                        </span>
                    </td>
                </tr>
            `;
        });
    }
    else if (section === 'materials') {
        const materials = DB.get('materials');
        const container = document.getElementById('materials-list');
        if (!container) return;
        container.innerHTML = '';
        
        if (materials.length === 0) {
            container.innerHTML = '<div class="col-span-full py-12 text-center text-text-secondary">No materials uploaded yet.</div>';
            return;
        }
        
        materials.forEach(mat => {
            container.innerHTML += `
                <div class="glass-panel rounded-xl p-6 flex flex-col justify-between gap-4">
                    <div class="flex gap-4 items-start">
                        <div class="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center text-primary flex-shrink-0">
                            <span class="material-symbols-outlined text-[28px]">picture_as_pdf</span>
                        </div>
                        <div>
                            <h4 class="font-medium text-text-primary text-body-lg mb-1">${mat.title}</h4>
                            <p class="text-xs text-text-secondary">${mat.courseId} • Week ${mat.week}</p>
                        </div>
                    </div>
                    <a href="#" class="w-full bg-surface-container-high border border-glass-border hover:bg-surface-container-highest transition-colors rounded-lg py-2 flex items-center justify-center gap-2 text-text-primary text-sm font-medium">
                        <span class="material-symbols-outlined text-[18px]">download</span>
                        Download Material
                    </a>
                </div>
            `;
        });
    }
    else if (section === 'assessments') {
        const assessments = DB.get('assessments');
        const tbody = document.getElementById('assessments-list');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (assessments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-center text-text-secondary">No upcoming assessments.</td></tr>';
            return;
        }
        
        assessments.forEach(ass => {
            const date = new Date(ass.deadline).toLocaleDateString();
            tbody.innerHTML += `
                <tr class="table-row-hover border-b border-glass-border transition-colors">
                    <td class="py-4 px-6 font-medium text-text-primary">${ass.title}</td>
                    <td class="py-4 px-6 text-text-secondary">${ass.courseId}</td>
                    <td class="py-4 px-6 text-text-secondary">
                        <span class="flex items-center gap-1.5 text-secondary">
                            <span class="material-symbols-outlined text-[16px]">schedule</span>
                             ${date}
                        </span>
                    </td>
                    <td class="py-4 px-6 text-right">
                        <button onclick="alert('Submission system active.')" class="bg-primary-container text-text-primary hover:brightness-110 px-4 py-1.5 rounded text-xs font-medium transition-all">
                            Submit Work
                        </button>
                    </td>
                </tr>
            `;
        });
    }
    else if (section === 'chat') {
        loadChat();
    }
}

// --- Chat functions ---
function loadChat() {
    const messages = DB.get('messages');
    const container = document.getElementById('chat-messages');
    if (!container) return;
    container.innerHTML = '';
    const user = DB.getCurrentUser();
    
    if (messages.length === 0) {
        container.innerHTML = '<div class="text-center text-text-secondary my-8">Welcome to the community! Start the conversation.</div>';
        return;
    }

    messages.forEach(msg => {
        const isMine = msg.senderId === user.id;
        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (isMine) {
            container.innerHTML += `
                <div class="flex justify-end group">
                    <div class="max-w-[70%] flex flex-col items-end">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-label-sm text-label-sm text-text-secondary">${time}</span>
                            <span class="font-label-md text-label-md text-text-primary">You</span>
                        </div>
                        <div class="glass-panel !border-tactical-accent/30 bg-primary-container/10 p-4 rounded-xl rounded-tr-none shadow-[0_0_15px_rgba(94,105,49,0.05)] text-text-primary font-body-md text-body-md">
                            <p>${msg.text}</p>
                        </div>
                    </div>
                </div>
            `;
        } else {
            const isLecturer = msg.senderName.includes('Dr.') || msg.senderName.includes('Lecturer');
            const badge = isLecturer ? '<span class="px-1.5 py-0.5 rounded text-[9px] bg-secondary/10 text-secondary border border-secondary/20 tracking-wider">ADMIN</span>' : '';
            const avatarSrc = isLecturer 
                ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuDfjDeqtT63jVfXobDPvYw2GiZVrGBo1NTFtqYT8TDLRdUDcFqPNSUpFd8v8JaTuh9VDXJEznZGgu8qJG3ipkDIISKY4LdkQnz7r9Lr5TOVUHMKYG_1UJU3IoG_ZFyiAuIeqaI51x3zp1GmtCgCPuQWl1IKf_Pc-VZtibq6t-16QYXQzhw3ow1fJH1J_KX0xMNSX2xDMAeXRWvt4zgAXMEyuTyB4tLhgiPb_j9vF6i9fplUqDgNfS_6'
                : 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_t3Uib1ZdNvDygJFjG2LYHODYCe2dadi0o28RHyi327g3KZwgEIGS5u4pNgVe7O9utO2N25o1ItHXeJmUBgFSrVxc-tiDsprbqADA3cR73S-Om6VitMUp3fIFSbW9YiLnbmj8s23sr2yWOkyWeXhHtyiJCg1Kd7pB9KIn_JVLfJwC6NeUfhQX6sYQVnflzRVDKjutJ0tUgZuCG3Zd2cIbK8uO5d3txcrrxPFc1yara2OIbElbstIg';
            
            container.innerHTML += `
                <div class="flex justify-start group">
                    <div class="flex gap-4 max-w-[70%]">
                        <img class="w-10 h-10 rounded border border-glass-border object-cover mt-1 flex-shrink-0" src="${avatarSrc}"/>
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <span class="font-label-md text-label-md text-secondary">${msg.senderName}</span>
                                ${badge}
                                <span class="font-label-sm text-label-sm text-text-secondary ml-2">${time}</span>
                            </div>
                            <div class="glass-panel p-4 rounded-xl rounded-tl-none text-text-primary font-body-md text-body-md">
                                <p>${msg.text}</p>
                            </div>
                        </div>
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
