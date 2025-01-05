import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BasicInformationStep } from '../../steps/BasicInformationStep';
import { FormState } from '../../NewPRForm';
import { serviceMocks, resetAllMocks } from './mocks';

const mockFormState: FormState = {
  organization: '1PWR LESOTHO',
  requestor: 'John Doe',
  email: 'john@example.com',
  department: 'IT',
  projectCategory: '',
  description: '',
  site: '',
  expenseType: '',
  vehicle: '',
  estimatedAmount: 0,
  currency: 'USD',
  requiredDate: '',
  approvers: [],
  preferredVendor: '',
  lineItems: [],
  quotes: [],
  isUrgent: false
};

const mockReferenceData = {
  departments: [
    { id: 'IT', name: 'IT', code: 'IT', isActive: true },
    { id: 'FIN', name: 'Finance', code: 'FIN', isActive: true }
  ],
  projectCategories: [
    { id: '1', name: 'Infrastructure', code: 'INFRA', isActive: true },
    { id: '2', name: 'Software', code: 'SW', isActive: true }
  ],
  sites: [
    { id: '1', name: 'Main Office', code: 'HQ', isActive: true },
    { id: '2', name: 'Branch', code: 'BR', isActive: true }
  ],
  expenseTypes: [
    { id: '1', name: 'Capital', code: 'CAP', isActive: true },
    { id: '2', name: 'Operational', code: 'OP', isActive: true },
    { id: 'vehicle', name: 'Vehicle Maintenance', code: 'VM', isActive: true }
  ],
  vehicles: [
    { id: '1', name: 'Toyota Hilux', code: 'TH1', isActive: true }
  ],
  vendors: [
    { id: '1', name: 'Vendor A', code: 'VA', isActive: true }
  ],
  approvers: [
    { id: '1', name: 'Jane Approver', email: 'jane@example.com', role: 'MANAGER' }
  ]
};

describe('BasicInformationStep', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render initial form fields', () => {
    const setFormState = vi.fn();
    
    render(
      <BasicInformationStep
        formState={mockFormState}
        setFormState={setFormState}
        departments={mockReferenceData.departments}
        projectCategories={mockReferenceData.projectCategories}
        sites={mockReferenceData.sites}
        expenseTypes={mockReferenceData.expenseTypes}
        vehicles={mockReferenceData.vehicles}
        vendors={mockReferenceData.vendors}
        approvers={mockReferenceData.approvers}
        loading={false}
      />
    );

    // Check if required fields are rendered using test IDs
    expect(screen.getByLabelText('Organization', { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /requestor/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /department/i })).toBeInTheDocument();
  });

  it('should update form state when fields change', async () => {
    const setFormState = vi.fn();
    
    render(
      <BasicInformationStep
        formState={mockFormState}
        setFormState={setFormState}
        departments={mockReferenceData.departments}
        projectCategories={mockReferenceData.projectCategories}
        sites={mockReferenceData.sites}
        expenseTypes={mockReferenceData.expenseTypes}
        vehicles={mockReferenceData.vehicles}
        vendors={mockReferenceData.vendors}
        approvers={mockReferenceData.approvers}
        loading={false}
      />
    );

    // Find and update description field
    const descriptionField = screen.getByLabelText('Description');
    await userEvent.type(descriptionField, 'Test Description');

    expect(setFormState).toHaveBeenCalled();
  });

  it('should show vehicle selection only for relevant expense types', async () => {
    const setFormState = vi.fn();
    
    render(
      <BasicInformationStep
        formState={{ ...mockFormState, expenseType: '' }}
        setFormState={setFormState}
        departments={mockReferenceData.departments}
        projectCategories={mockReferenceData.projectCategories}
        sites={mockReferenceData.sites}
        expenseTypes={mockReferenceData.expenseTypes}
        vehicles={mockReferenceData.vehicles}
        vendors={mockReferenceData.vendors}
        approvers={mockReferenceData.approvers}
        loading={false}
      />
    );

    // Initially, vehicle field should not be visible
    expect(screen.queryByRole('combobox', { name: /vehicle/i })).not.toBeInTheDocument();

    // Select vehicle-related expense type
    const expenseTypeSelect = screen.getByRole('combobox', { name: /expense type/i });
    fireEvent.mouseDown(expenseTypeSelect);
    const vehicleOption = screen.getByText('Vehicle Maintenance');
    fireEvent.click(vehicleOption);

    // Vehicle field should now be visible
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /vehicle/i })).toBeInTheDocument();
    });
  });

  it('should validate required fields', async () => {
    const setFormState = vi.fn();
    const invalidFormState = { ...mockFormState, requestor: '', email: '' };
    
    render(
      <BasicInformationStep
        formState={invalidFormState}
        setFormState={setFormState}
        departments={mockReferenceData.departments}
        projectCategories={mockReferenceData.projectCategories}
        sites={mockReferenceData.sites}
        expenseTypes={mockReferenceData.expenseTypes}
        vehicles={mockReferenceData.vehicles}
        vendors={mockReferenceData.vendors}
        approvers={mockReferenceData.approvers}
        loading={false}
      />
    );

    // Error messages should be displayed
    expect(screen.getByText('Requestor is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    const setFormState = vi.fn();
    
    render(
      <BasicInformationStep
        formState={mockFormState}
        setFormState={setFormState}
        departments={mockReferenceData.departments}
        projectCategories={mockReferenceData.projectCategories}
        sites={mockReferenceData.sites}
        expenseTypes={mockReferenceData.expenseTypes}
        vehicles={mockReferenceData.vehicles}
        vendors={mockReferenceData.vendors}
        approvers={mockReferenceData.approvers}
        loading={true}
      />
    );

    // Loading indicator should be visible
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });
});
