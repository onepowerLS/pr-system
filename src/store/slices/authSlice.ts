import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../types/user';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      console.log('Auth: Setting user:', action.payload);
      state.user = action.payload;
      state.loading = false;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      console.log('Auth: Setting loading:', action.payload);
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      console.log('Auth: Setting error:', action.payload);
      state.error = action.payload;
      state.loading = false;
    },
    clearAuth: (state) => {
      console.log('Auth: Clearing auth state');
      state.user = null;
      state.loading = false;
      state.error = null;
    },
  },
});

export const { setUser, setLoading, setError, clearAuth } = authSlice.actions;
export default authSlice.reducer;
