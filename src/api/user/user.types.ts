export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  googleId?: string | null;
  loginAt?: string | null;
  loggedOut?: string | null;
}
