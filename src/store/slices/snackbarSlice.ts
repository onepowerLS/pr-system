import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SnackbarState {
  open: boolean;
  message: string;
  variant: 'success' | 'error' | 'warning' | 'info';
}

const initialState: SnackbarState = {
  open: false,
  message: '',
  variant: 'info',
};

const snackbarSlice = createSlice({
  name: 'snackbar',
  initialState,
  reducers: {
    enqueueSnackbar: (state, action: PayloadAction<{ message: string; variant: SnackbarState['variant'] }>) => {
      state.open = true;
      state.message = action.payload.message;
      state.variant = action.payload.variant;
    },
    closeSnackbar: (state) => {
      state.open = false;
    },
  },
});

export const { enqueueSnackbar, closeSnackbar } = snackbarSlice.actions;
export default snackbarSlice.reducer;
