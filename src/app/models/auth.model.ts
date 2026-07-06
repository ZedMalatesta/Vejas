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

export interface UserProfile {
  id: string;
  login: string;
  nickname: string | null;
  avatarUrl: string | null;
}

export interface UpdateProfileRequest {
  nickname?: string;
  avatarUrl?: string;
}
