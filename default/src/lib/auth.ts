import { createContext } from 'react';

export type AuthContextValue = {
  company?: { id: string; name?: string; apiName?: string };
  user?: { id: string; name: string; email: string; role?: string };
  sessionToken?: string;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
