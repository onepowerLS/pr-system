import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PRRequest } from '../../types/pr';

interface PRState {
  currentPR: PRRequest | null;
  userPRs: PRRequest[];
  pendingApprovals: PRRequest[];
  loading: boolean;
  error: string | null;
}

const initialState: PRState = {
  currentPR: null,
  userPRs: [],
  pendingApprovals: [],
  loading: false,
  error: null,
};

const prSlice = createSlice({
  name: 'pr',
  initialState,
  reducers: {
    setCurrentPR: (state, action: PayloadAction<PRRequest | null>) => {
      state.currentPR = action.payload;
      state.error = null;
    },
    setUserPRs: (state, action: PayloadAction<PRRequest[]>) => {
      state.userPRs = action.payload;
      state.error = null;
    },
    setPendingApprovals: (state, action: PayloadAction<PRRequest[]>) => {
      state.pendingApprovals = action.payload;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearPRState: (state) => {
      state.currentPR = null;
      state.userPRs = [];
      state.pendingApprovals = [];
      state.loading = false;
      state.error = null;
    },
    removePR: (state, action: PayloadAction<string>) => {
      state.userPRs = state.userPRs.filter(pr => pr.id !== action.payload);
      state.pendingApprovals = state.pendingApprovals.filter(pr => pr.id !== action.payload);
    },
  },
});

export const {
  setCurrentPR,
  setUserPRs,
  setPendingApprovals,
  setLoading,
  setError,
  clearPRState,
  removePR,
} = prSlice.actions;

export default prSlice.reducer;
