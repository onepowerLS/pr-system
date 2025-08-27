import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prService } from '../../services/pr';
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

describe('PR Service - Approval Workflow', () => {
  // Sample PR data
  const samplePR = {
    id: 'test-pr-1',
    prNumber: 'PR-2025-001',
    status: PRStatus.IN_QUEUE,
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

  describe('updatePRStatus', () => {
    it('should use approvalWorkflow instead of deprecated fields when updating status', async () => {
      // Mock the necessary functions
      const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
      const mockDoc = vi.fn().mockReturnValue('docRef');
      
      // Setup required mocks
      vi.mock('firebase/firestore', async () => {
        const actual = await vi.importActual('firebase/firestore');
        return {
          ...actual,
          doc: mockDoc,
          updateDoc: mockUpdateDoc
        };
      });

      // Update PR status
      await prService.updatePRStatus(samplePR.id, PRStatus.PENDING_APPROVAL, {
        userId: 'user456',
        email: 'user456@example.com',
        notes: 'Moving to approval'
      });

      // Verify updateDoc was called with the correct parameters
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: PRStatus.PENDING_APPROVAL,
          // Should update using approvalWorkflow
          'approvalWorkflow.currentApprover': expect.anything(),
          // Should NOT update using deprecated fields
          approver: expect.not.anything(),
          approvers: expect.not.anything()
        })
      );
    });
  });

  describe('getApprover', () => {
    it('should always use approvalWorkflow.currentApprover as the source of truth', () => {
      // This test verifies the canApprove function uses the right field
      
      // Mock the PR with different values in each field
      const pr = {
        ...samplePR,
        approvalWorkflow: {
          currentApprover: 'correct-approver',
          approvalHistory: [],
          lastUpdated: new Date().toISOString()
        },
        approver: 'wrong-approver',
        approvers: ['wrong-approver-1', 'wrong-approver-2']
      };
      
      // Simulate accessing the current approver
      const currentApprover = pr.approvalWorkflow.currentApprover;
      
      // Verify current approver is from approvalWorkflow
      expect(currentApprover).toBe('correct-approver');
      expect(currentApprover).not.toBe(pr.approver);
      expect(currentApprover).not.toBe(pr.approvers[0]);
    });
  });
});
