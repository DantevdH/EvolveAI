import {useCallback} from 'react';
import {useAppContext} from '@/context/AppContext';
import {userStorage} from '@/utils/storage';
import {apiClient} from '@/services/apiClient';
import {UserProfile} from '@/types';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData extends LoginCredentials {
  name: string;
  confirmPassword: string;
}

export const useAuth = () => {
  const {state, setUser, setAuthenticated, setLoading} = useAppContext();

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        setLoading(true);
        
        const response = await apiClient.post<{
          user: UserProfile;
          token: string;
        }>('/auth/login', credentials);

        if (response.success) {
          await userStorage.setToken(response.data.token);
          await userStorage.setUserProfile(response.data.user);
          
          setUser(response.data.user);
          setAuthenticated(true);
          
          return {success: true, user: response.data.user};
        } else {
          throw new Error(response.message);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Login failed';
        return {success: false, error: message};
      } finally {
        setLoading(false);
      }
    },
    [setUser, setAuthenticated, setLoading]
  );

  const register = useCallback(
    async (data: RegisterData) => {
      try {
        setLoading(true);
        
        if (data.password !== data.confirmPassword) {
          throw new Error('Passwords do not match');
        }

        const response = await apiClient.post<{
          user: UserProfile;
          token: string;
        }>('/auth/register', {
          name: data.name,
          email: data.email,
          password: data.password,
        });

        if (response.success) {
          await userStorage.setToken(response.data.token);
          await userStorage.setUserProfile(response.data.user);
          
          setUser(response.data.user);
          setAuthenticated(true);
          
          return {success: true, user: response.data.user};
        } else {
          throw new Error(response.message);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Registration failed';
        return {success: false, error: message};
      } finally {
        setLoading(false);
      }
    },
    [setUser, setAuthenticated, setLoading]
  );

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      
      // Call logout endpoint if needed
      try {
        await apiClient.post('/auth/logout');
      } catch (error) {
        // Ignore logout API errors - still clear local data
        console.warn('Logout API call failed:', error);
      }
      
      // Clear local storage
      await userStorage.removeToken();
      await userStorage.removeUserProfile();
      
      // Update app state
      setUser(null);
      setAuthenticated(false);
      
      return {success: true};
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logout failed';
      return {success: false, error: message};
    } finally {
      setLoading(false);
    }
  }, [setUser, setAuthenticated, setLoading]);

  const checkAuthStatus = useCallback(async () => {
    try {
      setLoading(true);
      
      const [token, userProfile] = await Promise.all([
        userStorage.getToken(),
        userStorage.getUserProfile(),
      ]);

      if (token && userProfile) {
        // Optionally verify token with server
        try {
          const response = await apiClient.get<UserProfile>('/auth/me');
          if (response.success) {
            setUser(response.data);
            setAuthenticated(true);
            return {success: true, user: response.data};
          }
        } catch (error) {
          // Token might be expired, clear storage
          await userStorage.removeToken();
          await userStorage.removeUserProfile();
        }
      }
      
      return {success: false, error: 'Not authenticated'};
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Auth check failed';
      return {success: false, error: message};
    } finally {
      setLoading(false);
    }
  }, [setUser, setAuthenticated, setLoading]);

  return {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    login,
    register,
    logout,
    checkAuthStatus,
  };
};
