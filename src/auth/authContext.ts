import { createContext, useContext } from 'react';
import type { CmsBackend, SignInResult } from '../backend/types';
import type { UserProfile } from '../cms/types';
import type { Actor } from './permissions';
import type { AuthErrorKind } from './sessionController';

export type AuthStatus = 'loading' | 'unconfigured' | 'signed-out' | 'signed-in' | 'error';

export interface AuthState {
  status: AuthStatus;
  mode: 'supabase' | 'memory-dev' | 'none';
  /** Profile as stored in the database (role/status are authoritative there) */
  profile: UserProfile | null;
  actor: Actor | null;
  backend: CmsBackend | null;
  online: boolean;
  error: string | null;
  errorKind: AuthErrorKind;
  signingIn: boolean;
  signingOut: boolean;
  signIn(): Promise<SignInResult>;
  signOut(): Promise<void>;
  refreshProfile(): Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
