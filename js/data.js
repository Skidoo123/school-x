// Mock LocalStorage Database for Ranaf Hub
const initDB = () => {
    if (!localStorage.getItem('eduhub_users')) {
        const users = [
            { id: 'u1', name: 'Student One', email: 'student@ranafhub.com', role: 'student', password: 'password' },
            { id: 'u2', name: 'Dr. Lecturer', email: 'lecturer@ranafhub.com', role: 'admin', password: 'password' }
        ];
        localStorage.setItem('eduhub_users', JSON.stringify(users));
    }

    if (!localStorage.getItem('eduhub_courses')) {
        const courses = [
            { id: 'c1', code: 'CS101', name: 'Introduction to Computer Science' },
            { id: 'c2', code: 'MATH201', name: 'Advanced Calculus' }
        ];
        localStorage.setItem('eduhub_courses', JSON.stringify(courses));
    }

    if (!localStorage.getItem('eduhub_materials')) {
        localStorage.setItem('eduhub_materials', JSON.stringify([]));
    }

    if (!localStorage.getItem('eduhub_assessments')) {
        localStorage.setItem('eduhub_assessments', JSON.stringify([]));
    }

    if (!localStorage.getItem('eduhub_attendance')) {
        localStorage.setItem('eduhub_attendance', JSON.stringify([]));
    }

    if (!localStorage.getItem('eduhub_messages')) {
        localStorage.setItem('eduhub_messages', JSON.stringify([]));
    }

    if (!localStorage.getItem('eduhub_active_sessions')) {
        localStorage.setItem('eduhub_active_sessions', JSON.stringify([]));
    }
};

const DB = {
    get: (key) => JSON.parse(localStorage.getItem(`eduhub_${key}`) || '[]'),
    set: (key, data) => localStorage.setItem(`eduhub_${key}`, JSON.stringify(data)),
    
    // Auth
    login: (email, password) => {
        const users = DB.get('users');
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            localStorage.setItem('eduhub_current_user', JSON.stringify(user));
            return user;
        }
        return null;
    },
    logout: () => {
        localStorage.removeItem('eduhub_current_user');
        window.location.href = 'index.html';
    },
    getCurrentUser: () => {
        return JSON.parse(localStorage.getItem('eduhub_current_user') || 'null');
    },

    // Utilities
    generateId: () => '_' + Math.random().toString(36).substr(2, 9),
    
    // Attendance
    startAttendanceSession: (courseId, method) => {
        const sessions = DB.get('active_sessions');
        const newSession = {
            id: DB.generateId(),
            courseId,
            method, // 'QR', 'WIFI', 'OTP'
            code: method === 'OTP' ? Math.floor(100000 + Math.random() * 900000).toString() : DB.generateId(),
            timestamp: new Date().toISOString(),
            active: true
        };
        sessions.push(newSession);
        DB.set('active_sessions', sessions);
        return newSession;
    },
    
    markAttendance: (studentId, sessionId, method) => {
        const attendance = DB.get('attendance');
        const sessions = DB.get('active_sessions');
        const session = sessions.find(s => s.id === sessionId && s.active);
        
        if (!session) throw new Error('Session not active or found');
        
        // Avoid duplicates
        if (attendance.find(a => a.studentId === studentId && a.sessionId === sessionId)) {
            return { success: false, message: 'Already marked present' };
        }

        const record = {
            id: DB.generateId(),
            studentId,
            sessionId,
            courseId: session.courseId,
            method,
            timestamp: new Date().toISOString()
        };
        attendance.push(record);
        DB.set('attendance', attendance);
        return { success: true, record };
    }
};

initDB();
