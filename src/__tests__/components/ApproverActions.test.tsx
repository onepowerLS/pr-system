import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ApproverActions } from '../../components/pr/ApproverActions';
import { PRStatus } from '../../types/pr';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: vi.fn(() => new Date().toISOString()),
  getFirestore: vi.fn()
}));

vi.mock('../../config/firebase', () => ({
  db: {}
}));

// Mock PR Service
vi.mock('../../services/pr', () => ({
  prService: {
    updatePRStatus: vi.fn(),
    canApprove: vi.fn()
  }
}));

// Mock auth context
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: {
      uid: 'user123',
      email: 'user123@example.com'
    }
  })
}));

describe('ApproverActions Component - ApprovalWorkflow Usage', () => {
  // Sample PR data
  const samplePR = {
    id: 'test-pr-1',
    prNumber: 'PR-2025-001',
    status: PRStatus.PENDING_APPROVAL,
    approvalWorkflow: {
      currentApprover: 'user123',
      approvalHistory: [],
      lastUpdated: new Date().toISOString()
    },
    // Deprecated fields - should not be used
    approver: 'should-not-be-used',
    approvers: ['should-not-be-used']
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should check permissions based on approvalWorkflow.currentApprover', () => {
    // Import the actual canApprove function
    const { prService } = require('../../services/pr');
    
    // Mock canApprove to ensure it's called
    prService.canApprove.mockImplementation((pr, userId) => {
      // This should be using approvalWorkflow.currentApprover
      return pr.approvalWorkflow.currentApprover === userId;
    });
    
    // Render component
    render(<ApproverActions pr={samplePR} onStatusChange={vi.fn()} />);
    
    // Verify canApprove was called with the right parameters
    expect(prService.canApprove).toHaveBeenCalledWith(
      expect.objectContaining({
        approvalWorkflow: expect.objectContaining({
          currentApprover: 'user123'
        })
      }),
      'user123'
    );
    
    // Approve button should be visible because currentApprover matches user
    expect(screen.getByText(/Approve/i)).toBeInTheDocument();
  });

  it('should hide approve button if user is not the current approver', () => {
    // Import the actual canApprove function
    const { prService } = require('../../services/pr');
    
    // Mock a different approver
    const prWithDifferentApprover = {
      ...samplePR,
      approvalWorkflow: {
        ...samplePR.approvalWorkflow,
        currentApprover: 'different-user'
      }
    };
    
    // Mock canApprove to check the correct field
    prService.canApprove.mockImplementation((pr, userId) => {
      return pr.approvalWorkflow.currentApprover === userId;
    });
    
    // Render component
    render(<ApproverActions pr={prWithDifferentApprover} onStatusChange={vi.fn()} />);
    
    // Approve button should not be visible
    expect(screen.queryByText(/Approve/i)).not.toBeInTheDocument();
  });
});
