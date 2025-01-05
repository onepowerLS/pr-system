import React from 'react';
import { vi } from 'vitest';

// Mock Material-UI Components
export const MaterialUIComponentMocks = {
  TextField: ({ label, onChange }: any) => (
    <input data-testid={`mui-textfield-${label}`} onChange={onChange} />
  ),
  Button: ({ children, onClick }: any) => (
    <button data-testid={`mui-button-${children}`} onClick={onClick}>
      {children}
    </button>
  ),
  Select: ({ label, onChange }: any) => (
    <select data-testid={`mui-select-${label}`} onChange={onChange} />
  ),
  CircularProgress: () => <div data-testid="mui-loading">Loading...</div>,
};

// Mock Form Steps
export const MockBasicInformationStep = vi.fn(() => (
  <div data-testid="basic-info-step">Basic Information Step</div>
));

export const MockLineItemsStep = vi.fn(() => (
  <div data-testid="line-items-step">Line Items Step</div>
));

export const MockReviewStep = vi.fn(() => (
  <div data-testid="review-step">Review Step</div>
));

// Reset all mocks helper
export const resetAllMocks = () => {
  MockBasicInformationStep.mockClear();
  MockLineItemsStep.mockClear();
  MockReviewStep.mockClear();
  Object.values(MaterialUIComponentMocks).forEach(mock => {
    if (vi.isMockFunction(mock)) {
      mock.mockClear();
    }
  });
};
