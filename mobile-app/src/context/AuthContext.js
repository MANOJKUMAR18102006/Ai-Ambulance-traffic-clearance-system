import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE } from '../config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on app start
  useEffect(() => {
    (async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        const storedToken = await AsyncStorage.getItem('token');
        if (storedUser && storedToken) {
          const u = JSON.parse(storedUser);
          setUser(u);
          setToken(storedToken);
          axios.defaults.baseURL = API_BASE;
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (userData, jwt) => {
    setUser(userData);
    setToken(jwt);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    await AsyncStorage.setItem('token', jwt);
    axios.defaults.baseURL = API_BASE;
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwt}`;
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
