export interface AuthUser {
  id: string;
  login: string;
}

export interface AuthError {
  message: string;
}

export interface AuthResult {
  error: AuthError | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
