# Manual Testing Guide for ApprovalWorkflow Updates

This guide provides steps to verify that the PR system correctly uses the `approvalWorkflow` as the single source of truth for approval information.

## Prerequisites
- Access to the PR system
- At least two user accounts:
  - One with Procurement permissions (Level 2 or 3)
  - One with Approver permissions

## Test Scenarios

### 1. Creating a New PR

**Steps:**
1. Log in as a regular user
2. Create a new PR with all required information
3. Submit the PR
4. Check the created PR in the Firestore database:
   - Verify that `approvalWorkflow` is initialized correctly
   - Verify that `approvalWorkflow.currentApprover` is set (should be null at this stage)

**Expected Results:**
- PR is created with an `approvalWorkflow` object
- No errors are shown

### 2. Pushing PR to Approver

**Steps:**
1. Log in as a Procurement user
2. Find the PR created in the previous step
3. Click "Push to Approver"
4. Select an approver and provide notes if required
5. Check the PR in Firestore:
   - Verify that `approvalWorkflow.currentApprover` is set to the selected approver's ID
   - Verify that the approver receives a notification email

**Expected Results:**
- PR status changes to PENDING_APPROVAL
- `approvalWorkflow.currentApprover` is updated correctly
- Approver receives notification with correct PR details

### 3. Approval Process

**Steps:**
1. Log in as the approver selected in the previous step
2. Navigate to the PR awaiting approval
3. Verify that you can see the "Approve" and "Reject" buttons
4. Approve the PR
5. Check the PR in Firestore:
   - Verify that an entry is added to `approvalWorkflow.approvalHistory`
   - Verify the PR status changes to APPROVED

**Expected Results:**
- The approver can see and interact with approval buttons
- PR status changes to APPROVED
- Approval history is updated correctly

### 4. Permissions Testing

**Steps:**
1. Log in as a user who is NOT the current approver
2. Navigate to the PR in PENDING_APPROVAL status
3. Verify that the approval buttons are NOT visible or are disabled

**Expected Results:**
- Approval buttons should not be visible or should be disabled for non-approvers

### 5. Debug Logging (For Developers)

Add the following temporary logs to key components to verify field access:

```typescript
// In ApproverActions.tsx or ProcurementActions.tsx
console.log("PR Approval Info:", { 
  workflow: pr.approvalWorkflow, 
  deprecated: { 
    approver: pr.approver, 
    approvers: pr.approvers 
  } 
});
```

Check browser console when interacting with PRs to verify:
- `approvalWorkflow` is always defined
- Components are accessing `approvalWorkflow.currentApprover`
- Components are NOT accessing deprecated `pr.approver` or `pr.approvers`

## Common Issues

1. **Missing approvalWorkflow**: If a PR was created before the migration, it might not have an `approvalWorkflow` object. Check for this and ensure proper validation.

2. **Notification Errors**: If approvers aren't receiving notifications, check that the notification system is using `approvalWorkflow.currentApprover` for recipient determination.

3. **Permission Issues**: If approvers can't see approval buttons, verify that the permission check is using `approvalWorkflow.currentApprover`.

## Browser-based Verification

For a quick check of the approval workflow structure in the browser:

1. Open the PR System in your browser
2. Open the Developer Console (F12 or Right-click > Inspect > Console)
3. Copy the contents of `src/utils/approvalWorkflowChecker.js` into the console
4. Run one of these commands:
   - `checkApprovalWorkflow(pr)` - To check a specific PR object
   - `checkAllPRsInView()` - To check all PRs in the current view (if available in global state)

This will show you if PRs are correctly using the `approvalWorkflow` structure and identify any inconsistencies.

## Conclusion

After completing these tests, you should be confident that the system is correctly using `approvalWorkflow` as the single source of truth for approval information. If any issues are found, identify the specific component or service that needs updating and correct it to use `approvalWorkflow.currentApprover` instead of the deprecated fields.
