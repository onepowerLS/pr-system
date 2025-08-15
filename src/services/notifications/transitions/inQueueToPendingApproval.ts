import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { NotificationContext, Recipients, EmailContent, StatusTransitionHandler } from '../types';
import { getBaseUrl } from '../../../utils/environment';
import { generatePendingApprovalEmail } from '../templates/pendingApprovalTemplate';
import { PRRequest } from '../../../types/pr';
import { generateEmailHeaders } from '../types/emailHeaders';

export class InQueueToPendingApprovalHandler implements StatusTransitionHandler {
  async getRecipients(context: NotificationContext): Promise<Recipients> {
    const recipients: Recipients = {
      to: [],
      cc: []
    };

    // Get PR data to find approver and requestor
    const prRef = doc(db, 'purchaseRequests', context.prId);
    const prDoc = await getDoc(prRef);
    
    if (!prDoc.exists()) {
      throw new Error('PR not found');
    }

    const pr = prDoc.data() as PRRequest;

    // Add current approver as primary recipient - prioritize pr.approver as the single source of truth
    if (pr.approver) {
      // According to PR type definition, approver is a string (email)
      recipients.to.push(pr.approver);
    } 
    // Fallback to approvalWorkflow.currentApprover only if pr.approver is not available
    else if (pr.approvalWorkflow?.currentApprover) {
      // Handle currentApprover which could be a string or an object
      if (typeof pr.approvalWorkflow.currentApprover === 'string') {
        recipients.to.push(pr.approvalWorkflow.currentApprover);
      } else if (typeof pr.approvalWorkflow.currentApprover === 'object' && pr.approvalWorkflow.currentApprover?.email) {
        recipients.to.push(pr.approvalWorkflow.currentApprover.email);
      }
    }

    // Add requestor in CC
    if (pr.requestor?.email) {
      if (!recipients.cc) {
        recipients.cc = [];
      }
      recipients.cc.push(pr.requestor.email);
    }

    // Add procurement team to CC
    if (!recipients.cc) {
      recipients.cc = [];
    }
    recipients.cc.push('procurement@1pwrafrica.com');

    return recipients;
  }

  async getEmailContent(context: NotificationContext): Promise<EmailContent> {
    // Make sure we have a PR object in the context
    if (!context.pr) {
      // Fetch PR data if not provided in context
      const prRef = doc(db, 'purchaseRequests', context.prId);
      const prDoc = await getDoc(prRef);
      
      if (!prDoc.exists()) {
        throw new Error('PR not found');
      }
      
      // Add PR data to context
      const prData = prDoc.data() as PRRequest;
      context.pr = {
        ...prData,
        id: prDoc.id
      };
    }
    
    // Ensure baseUrl is set
    if (!context.baseUrl) {
      context.baseUrl = getBaseUrl();
    }
    
    // Convert to template-compatible format
    const templateContext = {
      pr: {
        id: context.pr.id,
        prNumber: context.pr.prNumber,
        requestor: context.pr.requestor,
        site: context.pr.site,
        category: context.pr.category,
        expenseType: context.pr.expenseType,
        estimatedAmount: context.pr.estimatedAmount,
        currency: context.pr.currency,
        preferredVendor: context.pr.preferredVendor,
        requiredDate: context.pr.requiredDate,
        isUrgent: context.pr.isUrgent
      },
      prNumber: context.prNumber,
      user: context.user ? {
        firstName: context.user.firstName || '',
        lastName: context.user.lastName || '',
        email: context.user.email,
        name: context.user.name || `${context.user.firstName || ''} ${context.user.lastName || ''}`.trim()
      } : null,
      notes: context.notes,
      baseUrl: context.baseUrl,
      isUrgent: context.isUrgent || false
    };
    
    // Get email content from template
    const emailContent = generatePendingApprovalEmail(templateContext);
    
    // Convert to service-compatible format
    return {
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
      headers: generateEmailHeaders({
        prId: context.prId,
        prNumber: context.prNumber,
        subject: emailContent.subject,
        notificationType: 'PENDING_APPROVAL'
      })
    };
  }
}
