import React from 'react';
import { vi } from 'vitest';
import { PRService } from '../../../../services/pr';
import { ApproverService } from '../../../../services/approver';
import { ReferenceDataService } from '../../../../services/referenceData';
import { EmailService } from '../../../../services/email';
import { StorageService } from '../../../../services/storage';

// Mock Material UI components
vi.mock('@mui/material', () => ({
  Grid: ({ children }: any) => React.createElement('div', {}, children),
  TextField: ({ value, onChange, inputProps, ...props }: any) =>
    React.createElement('input', { value, onChange, ...inputProps, ...props }),
  IconButton: ({ children, onClick, ...props }: any) =>
    React.createElement('button', { onClick, ...props }, children),
  Button: ({ children, onClick, ...props }: any) =>
    React.createElement('button', { onClick, ...props }, children),
  Typography: ({ children }: any) => React.createElement('div', {}, children),
  Table: ({ children }: any) => React.createElement('table', {}, children),
  TableBody: ({ children }: any) => React.createElement('tbody', {}, children),
  TableCell: ({ children }: any) => React.createElement('td', {}, children),
  TableContainer: ({ children }: any) => React.createElement('div', {}, children),
  TableHead: ({ children }: any) => React.createElement('thead', {}, children),
  TableRow: ({ children }: any) => React.createElement('tr', {}, children),
  Paper: ({ children }: any) => React.createElement('div', {}, children),
  Box: ({ children }: any) => React.createElement('div', {}, children),
  Tooltip: ({ children }: any) => React.createElement('div', {}, children),
  CircularProgress: () => React.createElement('div', {}, 'Loading...'),
  Dialog: ({ children, open }: any) =>
    open ? React.createElement('div', {}, children) : null,
  DialogTitle: ({ children }: any) => React.createElement('div', {}, children),
  DialogContent: ({ children }: any) => React.createElement('div', {}, children),
  DialogContentText: ({ children }: any) => React.createElement('div', {}, children),
  DialogActions: ({ children }: any) => React.createElement('div', {}, children),
}));

// Mock Firebase config
vi.mock('../../../config/firebase', () => ({
  storage: {}
}));

// Mock Firebase storage
vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
  deleteObject: vi.fn()
}));

// Mock services
export const mockPRService = {
  createPR: vi.fn(),
  updatePR: vi.fn(),
  getPR: vi.fn(),
  listPRs: vi.fn(),
  deletePR: vi.fn(),
  submitPR: vi.fn(),
  approvePR: vi.fn(),
  rejectPR: vi.fn(),
};

export const mockApproverService = {
  getApprovers: vi.fn(),
  addApprover: vi.fn(),
  removeApprover: vi.fn(),
  updateApprover: vi.fn(),
};

export const mockReferenceDataService = {
  getDepartments: vi.fn(),
  getProjectCategories: vi.fn(),
  getSites: vi.fn(),
  getExpenseTypes: vi.fn(),
  getVehicles: vi.fn(),
  getVendors: vi.fn(),
  getCategories: vi.fn(),
  getUOMs: vi.fn(),
};

export const mockEmailService = {
  sendEmail: vi.fn(),
  sendNotification: vi.fn(),
};

export const mockStorageService = {
  uploadToTempStorage: vi.fn(),
  moveToPermanentStorage: vi.fn(),
  deleteFile: vi.fn(),
};

// Mock service implementations
vi.mock('../../../../services/pr', () => ({
  PRService: mockPRService
}));

vi.mock('../../../../services/approver', () => ({
  ApproverService: mockApproverService
}));

vi.mock('../../../../services/referenceData', () => ({
  ReferenceDataService: mockReferenceDataService
}));

vi.mock('../../../../services/email', () => ({
  EmailService: mockEmailService
}));

vi.mock('../../../../services/storage', () => ({
  StorageService: mockStorageService,
  uploadToTempStorage: mockStorageService.uploadToTempStorage,
  moveToPermanentStorage: mockStorageService.moveToPermanentStorage,
  deleteFile: mockStorageService.deleteFile,
}));

// Reset all mocks between tests
export function resetAllMocks() {
  mockPRService.createPR.mockReset();
  mockPRService.updatePR.mockReset();
  mockPRService.getPR.mockReset();
  mockPRService.listPRs.mockReset();
  mockPRService.deletePR.mockReset();
  mockPRService.submitPR.mockReset();
  mockPRService.approvePR.mockReset();
  mockPRService.rejectPR.mockReset();
  mockStorageService.uploadToTempStorage.mockReset();
  mockStorageService.moveToPermanentStorage.mockReset();
  mockStorageService.deleteFile.mockReset();
  mockApproverService.getApprovers.mockReset();
  mockApproverService.addApprover.mockReset();
  mockApproverService.removeApprover.mockReset();
  mockApproverService.updateApprover.mockReset();
  mockReferenceDataService.getDepartments.mockReset();
  mockReferenceDataService.getProjectCategories.mockReset();
  mockReferenceDataService.getSites.mockReset();
  mockReferenceDataService.getExpenseTypes.mockReset();
  mockReferenceDataService.getVehicles.mockReset();
  mockReferenceDataService.getVendors.mockReset();
  mockReferenceDataService.getCategories.mockReset();
  mockReferenceDataService.getUOMs.mockReset();
  mockEmailService.sendEmail.mockReset();
  mockEmailService.sendNotification.mockReset();
}
