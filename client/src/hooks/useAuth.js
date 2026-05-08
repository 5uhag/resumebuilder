import { useState } from 'react';

const TOKEN_KEY = 'resume-builder-token';
const USER_KEY = 'resume-builder-user';

function loadStored() {
  try {
    const token = window.localStorage.getItem(TOKEN_KEY);
    const user = JSON.parse(window.localStorage.getItem(USER_KEY) || 'null');
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export function useAuth() {
  const stored = loadStored();
  const [token, setToken] = useState(stored.token);
  const [user, setUser] = useState(stored.user);

  function persist(nextToken, nextUser) {
    window.localStorage.setItem(TOKEN_KEY, nextToken);
    window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }

  function logout() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }

  return { token, user, isLoggedIn: !!token, persist, logout };
}
