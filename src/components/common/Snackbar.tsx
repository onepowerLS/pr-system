import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Snackbar as MuiSnackbar, Alert } from '@mui/material';
import { RootState } from '../../store';
import { closeSnackbar } from '../../store/slices/snackbarSlice';

export const Snackbar = () => {
  const dispatch = useDispatch();
  const { open, message, variant } = useSelector((state: RootState) => state.snackbar);

  const handleClose = () => {
    dispatch(closeSnackbar());
  };

  return (
    <MuiSnackbar
      open={open}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert onClose={handleClose} severity={variant} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </MuiSnackbar>
  );
};
