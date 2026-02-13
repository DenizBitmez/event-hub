import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    const API_URL = 'http://localhost:5181/api/Auth';

    useEffect(() => {
        if (token) {
            // Decode token or trust it until 401
            // Ideally call a /me endpoint, but we don't have one explicitly. 
            // We can decode the JWT to get username/email if needed.
            // For now, just setting a flag.
            setUser({ token });
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
        setLoading(false);
    }, [token]);

    const login = async (email, password) => {
        try {
            const response = await axios.post(`${API_URL}/login`, { email, password });
            const { token, expiration } = response.data;
            localStorage.setItem('token', token);
            setToken(token);
            setUser({ email, token }); // Basic user info
            return { success: true };
        } catch (error) {
            console.error("Login failed", error);
            return { success: false, message: error.response?.data || "Login failed" };
        }
    };

    const register = async (username, email, password) => {
        try {
            await axios.post(`${API_URL}/register`, { username, email, password });
            return { success: true };
        } catch (error) {
            console.error("Register failed", error);
            return { success: false, message: error.response?.data || "Registration failed" };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading, isAuthenticated: !!user }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
