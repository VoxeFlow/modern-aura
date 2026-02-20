import React, { useState } from 'react';
import Login from './Login';
import Signup from './Signup';
import Dashboard from './Dashboard';

import { useStore } from '../../store/useStore';

const MonstroPlatform = () => {
    // Auth State from Global Store (Persisted)
    const { userId, userEmail, userRole, setAuthIdentity } = useStore();
    const [isSignup, setIsSignup] = useState(window.location.pathname.startsWith('/signup'));

    // Derived user object for compatibility
    const user = userId ? { id: userId, email: userEmail, role: userRole } : null;

    if (!user) {
        if (isSignup) {
            return <Signup onNavigateLogin={() => setIsSignup(false)} />;
        }
        return <Login onLogin={() => { }} onNavigateSignup={() => setIsSignup(true)} />;
    }

    return <Dashboard user={user} onLogout={() => setAuthIdentity({ userId: null, userEmail: '' })} />;
};

export default MonstroPlatform;
