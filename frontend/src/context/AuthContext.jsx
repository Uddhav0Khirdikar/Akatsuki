import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';
import { getDefaultAvatar, AKATSUKI_AVATARS } from '../constants/avatars';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('akatsuki_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('akatsuki_token') || null);
  const [profileStats, setProfileStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAvatarId, setSelectedAvatarId] = useState(() => {
    return localStorage.getItem('akatsuki_avatar_id') || 'itachi';
  });

  // Fetch full student profile and dashboard counts
  const refreshUser = useCallback(async () => {
    const currentToken = localStorage.getItem('akatsuki_token');
    if (!currentToken) {
      setUser(null);
      setProfileStats(null);
      setLoading(false);
      return null;
    }

    try {
      const data = await authApi.getMe();
      setUser(data.user);
      setProfileStats({
        postedJobsCount: data.posted_jobs_count,
        applicationsCount: data.applications_count,
        activeChatsCount: data.active_chats_count,
      });
      localStorage.setItem('akatsuki_user', JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
      if (err.response && err.response.status === 401) {
        logout();
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, [token, refreshUser]);

  const handleAuthSuccess = (authData, preferredAvatarId) => {
    localStorage.setItem('akatsuki_token', authData.token);
    localStorage.setItem('akatsuki_user', JSON.stringify(authData.user));
    setToken(authData.token);
    setUser(authData.user);

    if (preferredAvatarId) {
      localStorage.setItem('akatsuki_avatar_id', preferredAvatarId);
      setSelectedAvatarId(preferredAvatarId);
    } else if (authData.user?.roll_number) {
      const def = getDefaultAvatar(authData.user.roll_number);
      localStorage.setItem('akatsuki_avatar_id', def.id);
      setSelectedAvatarId(def.id);
    }
  };

  const login = async (email, password, avatarId) => {
    const data = await authApi.login({ email, password });
    handleAuthSuccess(data, avatarId);
    return data;
  };

  const erpLogin = async (username, password, avatarId) => {
    const data = await authApi.erpLogin({ username, password });
    handleAuthSuccess(data, avatarId);
    return data;
  };

  const register = async (userData, avatarId) => {
    const data = await authApi.register(userData);
    handleAuthSuccess(data, avatarId);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('akatsuki_token');
    localStorage.removeItem('akatsuki_user');
    setUser(null);
    setToken(null);
    setProfileStats(null);
  };

  const setAvatar = (avatarId) => {
    localStorage.setItem('akatsuki_avatar_id', avatarId);
    setSelectedAvatarId(avatarId);
  };

  const currentAvatar = AKATSUKI_AVATARS.find((a) => a.id === selectedAvatarId) || 
    (user ? getDefaultAvatar(user.roll_number || user.name) : AKATSUKI_AVATARS[1]);

  const value = {
    user,
    token,
    profileStats,
    loading,
    currentAvatar,
    selectedAvatarId,
    login,
    erpLogin,
    register,
    logout,
    refreshUser,
    setAvatar,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
