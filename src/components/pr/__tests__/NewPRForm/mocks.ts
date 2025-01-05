import React from 'react';
import { vi } from 'vitest';
import { PRService } from '@/services/pr';
import { ApproverService } from '@/services/approver';
import { ReferenceDataService } from '@/services/referenceData';
import { EmailService } from '@/services/email';
import { StorageService } from '@/services/storage';

// Mock Material UI components
vi.mock('@mui/material', () => ({
  Grid: ({ children }: any) => React.createElement('div', {}, children),
  TextField: ({ label, value, onChange, inputProps, helperText, required, ...props }: any) =>
    React.createElement('div', {},
      React.createElement('label', { htmlFor: inputProps?.id }, label),
      React.createElement('input', {
        'aria-label': label,
        value,
        onChange,
        required,
        ...inputProps,
        ...props
      }),
      helperText && React.createElement('div', {}, helperText)
    ),
  FormControl: ({ children, required }: any) =>
    React.createElement('div', { required }, children),
  InputLabel: ({ children, id }: any) =>
    React.createElement('label', { htmlFor: id }, children),
  Select: ({ labelId, value, onChange, children, label, ...props }: any) =>
    React.createElement('select', {
      'aria-label': label,
      value,
      onChange,
      ...props
    }, children),
  MenuItem: ({ value, children }: any) =>
    React.createElement('option', { value }, children),
  FormHelperText: ({ children }: any) =>
    React.createElement('div', {}, children),
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
  CircularProgress: () => React.createElement('div', { 'data-testid': 'loading-indicator' }, 'Loading...'),
  Dialog: ({ children, open }: any) =>
    open ? React.createElement('div', {}, children) : null,
  DialogTitle: ({ children }: any) => React.createElement('div', {}, children),
  DialogContent: ({ children }: any) => React.createElement('div', {}, children),
  DialogContentText: ({ children }: any) => React.createElement('div', {}, children),
  DialogActions: ({ children }: any) => React.createElement('div', {}, children),
}));

// Mock Firebase config
vi.mock('@/config/firebase', () => ({
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
  deleteFile: vi.fn(),
  getDownloadURL: vi.fn()
};

// Mock service implementations
vi.mock('@/services/pr', () => ({
  PRService: mockPRService
}));

vi.mock('@/services/approver', () => ({
  ApproverService: mockApproverService
}));

vi.mock('@/services/referenceData', () => ({
  ReferenceDataService: mockReferenceDataService
}));

vi.mock('@/services/email', () => ({
  EmailService: mockEmailService
}));

vi.mock('@/services/storage', () => ({
  StorageService: {
    uploadToTempStorage: (...args: unknown[]) => mockStorageService.uploadToTempStorage(...args),
    deleteFile: (...args: unknown[]) => mockStorageService.deleteFile(...args),
    getDownloadURL: (...args: unknown[]) => mockStorageService.getDownloadURL(...args)
  }
}));

const mockFormState = {
  organization: '1PWR LESOTHO',
  requestor: 'John Doe',
  email: 'john@example.com',
  department: 'dept1',
  projectCategory: 'cat1',
  description: 'Test PR',
  site: 'site1',
  expenseType: '1',
  estimatedAmount: 100,
  currency: 'LSL',
  urgencyLevel: 'Normal',
  approvers: [],
  preferredVendor: '',
  vehicle: ''
};

const mockReferenceData = {
  departments: [
    { id: 'dept1', name: 'Department 1', isActive: true },
    { id: 'dept2', name: 'Department 2', isActive: true }
  ],
  projectCategories: [
    { id: 'cat1', name: 'Category 1', isActive: true },
    { id: 'cat2', name: 'Category 2', isActive: true }
  ],
  sites: [
    { id: 'site1', name: 'Site 1', code: 'S1', isActive: true },
    { id: 'site2', name: 'Site 2', code: 'S2', isActive: true }
  ],
  expenseTypes: [
    { id: '1', name: '1 - Type 1', code: '1', isActive: true },
    { id: '4 - Vehicle', name: '4 - Vehicle', code: '4', isActive: true }
  ],
  vehicles: [
    { id: 'v1', name: 'Toyota Hilux', code: 'TH1', isActive: true },
    { id: 'v2', name: 'Land Cruiser', code: 'LC1', isActive: true }
  ],
  vendors: [
    { id: 'vendor1', name: 'Vendor 1', isActive: true },
    { id: 'vendor2', name: 'Vendor 2', isActive: true }
  ],
  approvers: [
    { id: '1', name: 'Jane Approver', role: 'CEO', isActive: true },
    { id: '2', name: 'John Approver', role: 'CFO', isActive: true }
  ]
};

beforeEach(() => {
  vi.clearAllMocks();
  mockStorageService.uploadToTempStorage.mockReset();
  mockStorageService.deleteFile.mockReset();
  mockStorageService.getDownloadURL.mockReset();
});

// Reset all mocks between tests
export const resetAllMocks = () => {
  mockPRService.createPR.mockReset();
  mockPRService.updatePR.mockReset();
  mockPRService.getPR.mockReset();
  mockPRService.listPRs.mockReset();
  mockPRService.deletePR.mockReset();
  mockPRService.submitPR.mockReset();
  mockPRService.approvePR.mockReset();
  mockPRService.rejectPR.mockReset();
  mockStorageService.uploadToTempStorage.mockReset();
  mockStorageService.deleteFile.mockReset();
  mockStorageService.getDownloadURL.mockReset();
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
};
