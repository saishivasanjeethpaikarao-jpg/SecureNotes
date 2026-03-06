import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  currentUser: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return sessionStorage.getItem('couple_star_user');
  });

  const login = async (username: string, password: string): Promise<boolean> => {
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase.rpc('verify_user_login', {
      p_username: username,
      p_password: password,
    });
    if (error || !data) return false;
    setCurrentUser(username);
    sessionStorage.setItem('couple_star_user', username);
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('couple_star_user');
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
