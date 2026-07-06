import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResult, AuthTokens, AuthUser } from '../../models/auth.model';

const ACCESS_TOKEN_KEY = 'vejas.accessToken';
const REFRESH_TOKEN_KEY = 'vejas.refreshToken';

interface JwtPayload {
  userId: string;
  login: string;
  exp: number;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as JwtPayload;
  } catch {
    return null;
  }
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  readonly user = signal<AuthUser | null>(null);

  constructor() {
    this.restoreSession();
  }

  accessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  async signUp(email: string, password: string): Promise<AuthResult> {
    try {
      await firstValueFrom(
        this.http.post(`${this.baseUrl}/signup`, { login: email, password })
      );
    } catch (error) {
      return { error: toAuthError(error) };
    }
    return this.signIn(email, password);
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const tokens = await firstValueFrom(
        this.http.post<AuthTokens>(`${this.baseUrl}/login`, {
          login: email,
          password,
        })
      );
      this.storeTokens(tokens);
      this.restoreSession();
      return { error: null };
    } catch (error) {
      return { error: toAuthError(error) };
    }
  }

  signOut(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.user.set(null);
  }

  async isAuthenticated(): Promise<boolean> {
    return this.user() !== null;
  }

  /** Password recovery needs an email flow the backend does not have yet. */
  async resetPassword(email: string): Promise<AuthResult> {
    void email;
    return { error: { message: 'Password reset is not available yet' } };
  }

  async updatePassword(password: string): Promise<AuthResult> {
    void password;
    return { error: { message: 'Password change is not available yet' } };
  }

  private storeTokens(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }

  private restoreSession(): void {
    const token = this.accessToken();
    const payload = token ? decodeJwtPayload(token) : null;

    if (!payload || payload.exp * 1000 <= Date.now()) {
      if (token) this.signOut();
      return;
    }

    this.user.set({ id: payload.userId, login: payload.login });
  }
}

function toAuthError(error: unknown): { message: string } {
  if (error instanceof HttpErrorResponse && error.status !== 0) {
    const serverMessage = (error.error as { message?: string | string[] })?.message;
    const message = Array.isArray(serverMessage) ? serverMessage[0] : serverMessage;
    return { message: message ?? 'Authentication failed' };
  }
  return { message: 'Authentication service is unreachable' };
}
