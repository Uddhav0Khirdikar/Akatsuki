export interface CampusUser {
  id: string;
  name: string;
  department: string;
  roll_number: string;
  erp_verified: boolean;
}

export interface CampusSession {
  token: string;
  user: CampusUser;
}

export class SignInError extends Error {
  constructor(message: string, public kind: 'credentials' | 'service' | 'network' | 'account') {
    super(message);
    this.name = 'SignInError';
  }
}

export async function signIn(username: string, password: string, request: typeof fetch = fetch): Promise<CampusSession> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await request('/api/auth/erp-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ username: username.trim(), password }),
      signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 400) {
        throw new SignInError('Those ERP details didn’t work. Check your username and password, then try again.', 'credentials');
      }
      if (response.status === 409 || response.status === 403) {
        throw new SignInError('Your account needs a little help. Contact your campus administrator to check your ERP access.', 'account');
      }
      if (response.status === 429) {
        throw new SignInError('Too many attempts just now. Give it a moment, then try again.', 'service');
      }
      throw new SignInError('The campus sign-in service is unavailable right now. Please try again shortly.', 'service');
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new SignInError('We couldn’t confirm your session. Please try signing in again.', 'service');
    }
    if (!data || typeof data !== 'object' || !('token' in data) || typeof data.token !== 'string' || !data.token ||
      !('user' in data) || !data.user || typeof data.user !== 'object' ||
      !('name' in data.user) || typeof data.user.name !== 'string' ||
      !('id' in data.user) || typeof data.user.id !== 'string') {
      throw new SignInError('We couldn’t confirm your session. Please try signing in again.', 'service');
    }
    return data as CampusSession;
  } catch (error) {
    if (error instanceof SignInError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new SignInError('The college ERP is taking longer than expected. Please try again.', 'service');
    }
    throw new SignInError('We couldn’t connect. Check your internet connection and try again.', 'network');
  } finally {
    clearTimeout(timeout);
  }
}
