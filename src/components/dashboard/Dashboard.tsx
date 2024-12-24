import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { RootState } from '../../store';
import { prService } from '../../services/pr';
import { setUserPRs, setPendingApprovals, setLoading } from '../../store/slices/prSlice';
import { UserRole, PRStatus } from '../../types/pr';
import { OrganizationSelector } from '../common/OrganizationSelector';
import { MetricsPanel } from './MetricsPanel';

export const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { userPRs, pendingApprovals, loading } = useSelector(
    (state: RootState) => state.pr
  );
  const [selectedOrg, setSelectedOrg] = useState<string>('1PWR LESOTHO');
  const [selectedStatus, setSelectedStatus] = useState<PRStatus>(PRStatus.SUBMITTED);

  // Add real-time update effect
  useEffect(() => {
    if (!user) return;

    const loadDashboardData = async () => {
      dispatch(setLoading(true));
      try {
        // Load user's PRs with organization filter
        const userPRsData = await prService.getUserPRs(user.id, selectedOrg);
        dispatch(setUserPRs(userPRsData));

        // Load pending approvals if user is an approver
        if (user.role === UserRole.APPROVER || user.role === UserRole.ADMIN) {
          const pendingApprovalsData = await prService.getPendingApprovals(user.id, selectedOrg);
          dispatch(setPendingApprovals(pendingApprovalsData));
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        dispatch(setLoading(false));
      }
    };

    loadDashboardData();

    // Set up interval to refresh data
    const refreshInterval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [dispatch, user, selectedOrg]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  const filteredPRs = userPRs.filter(pr => pr.organization === selectedOrg);

  // Get PRs for the selected status
  const getStatusPRs = () => {
    const statusPRs = filteredPRs.filter(pr => pr.status === selectedStatus);
    
    // Sort based on status
    switch (selectedStatus) {
      case PRStatus.SUBMITTED:
        return statusPRs.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case PRStatus.IN_QUEUE:
        return statusPRs.sort((a, b) => 
          (a.metrics?.queuePosition || 0) - (b.metrics?.queuePosition || 0)
        );
      default:
        return statusPRs.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    }
  };

  const statusPRs = getStatusPRs();

  // Get status-specific columns
  const getStatusColumns = () => {
    const commonColumns = [
      { id: 'prNumber', label: 'PR #', align: 'left' as const },
      { id: 'description', label: 'Description', align: 'left' as const },
      { id: 'requestor', label: 'Submitted By', align: 'left' as const },
      { id: 'createdAt', label: 'Submitted Date', align: 'right' as const },
    ];

    switch (selectedStatus) {
      case PRStatus.SUBMITTED:
        return [
          ...commonColumns,
          { id: 'resubmittedAt', label: 'Resubmitted Date', align: 'right' as const },
          { id: 'daysOpen', label: 'Days Open', align: 'right' as const },
          { id: 'daysResubmission', label: 'Days Since Resubmission', align: 'right' as const },
        ];
      case PRStatus.IN_QUEUE:
        return [
          { id: 'queuePosition', label: 'Queue Position', align: 'right' as const },
          ...commonColumns,
          { id: 'confirmedAt', label: 'Confirmed Date', align: 'right' as const },
          { id: 'daysOpen', label: 'Days Open', align: 'right' as const },
          { id: 'completionPercentage', label: '% Completed', align: 'right' as const },
        ];
      case PRStatus.ORDERED:
        return [
          ...commonColumns,
          { id: 'orderedAt', label: 'Ordered Date', align: 'right' as const },
          { id: 'daysOrdered', label: 'Days Since Ordered', align: 'right' as const },
          { id: 'expectedLandingDate', label: 'Expected Landing Date', align: 'right' as const },
          { id: 'daysOverdue', label: 'Days Overdue', align: 'right' as const },
          { id: 'completionPercentage', label: '% Completed', align: 'right' as const },
        ];
      case PRStatus.COMPLETED:
        return [
          ...commonColumns,
          { id: 'completedAt', label: 'Completed Date', align: 'right' as const },
          { id: 'timeToClose', label: 'Time to Close [Days]', align: 'right' as const },
        ];
      case PRStatus.REVISION_REQUIRED:
        return [
          ...commonColumns,
          { id: 'revisionAt', label: 'R&R Date', align: 'right' as const },
          { id: 'procComments', label: 'PROC Comments', align: 'left' as const },
          { id: 'daysOpen', label: 'Days Open', align: 'right' as const },
        ];
      case PRStatus.REJECTED:
        return [
          ...commonColumns,
          { id: 'rejectedAt', label: 'Rejected Date', align: 'right' as const },
          { id: 'procComments', label: 'PROC Comments', align: 'left' as const },
        ];
      case PRStatus.CANCELED:
        return [
          ...commonColumns,
          { id: 'canceledAt', label: 'Canceled Date', align: 'right' as const },
          { id: 'comments', label: 'Comments', align: 'left' as const },
        ];
      default:
        return commonColumns;
    }
  };

  const columns = getStatusColumns();

  // Get cell value based on column ID
  const getCellValue = (pr: PR, columnId: string) => {
    switch (columnId) {
      case 'prNumber':
        return `#${pr.id.slice(-6)}`;
      case 'description':
        return pr.description;
      case 'requestor':
        return pr.requestor.name;
      case 'createdAt':
        return new Date(pr.createdAt).toLocaleDateString();
      case 'resubmittedAt':
        return pr.resubmittedAt ? new Date(pr.resubmittedAt).toLocaleDateString() : 'N/A';
      case 'daysOpen':
        return Math.ceil((Date.now() - new Date(pr.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      case 'daysResubmission':
        return pr.resubmittedAt
          ? Math.ceil((Date.now() - new Date(pr.resubmittedAt).getTime()) / (1000 * 60 * 60 * 24))
          : 'N/A';
      case 'queuePosition':
        return pr.metrics?.queuePosition || 'N/A';
      case 'confirmedAt':
        return pr.confirmedAt ? new Date(pr.confirmedAt).toLocaleDateString() : 'N/A';
      case 'completionPercentage':
        return pr.metrics?.completionPercentage ? `${pr.metrics.completionPercentage}%` : 'N/A';
      case 'orderedAt':
        return pr.orderedAt ? new Date(pr.orderedAt).toLocaleDateString() : 'N/A';
      case 'daysOrdered':
        return pr.orderedAt
          ? Math.ceil((Date.now() - new Date(pr.orderedAt).getTime()) / (1000 * 60 * 60 * 24))
          : 'N/A';
      case 'expectedLandingDate':
        return pr.metrics?.expectedLandingDate
          ? new Date(pr.metrics.expectedLandingDate).toLocaleDateString()
          : 'N/A';
      case 'daysOverdue':
        return pr.metrics?.expectedLandingDate && new Date(pr.metrics.expectedLandingDate) < new Date()
          ? Math.ceil(
              (Date.now() - new Date(pr.metrics.expectedLandingDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 'N/A';
      case 'completedAt':
        return pr.completedAt ? new Date(pr.completedAt).toLocaleDateString() : 'N/A';
      case 'timeToClose':
        return pr.completedAt
          ? Math.ceil(
              (new Date(pr.completedAt).getTime() - new Date(pr.createdAt).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 'N/A';
      case 'revisionAt':
        return pr.revisionAt ? new Date(pr.revisionAt).toLocaleDateString() : 'N/A';
      case 'procComments':
        return pr.procComments || 'N/A';
      case 'rejectedAt':
        return pr.rejectedAt ? new Date(pr.rejectedAt).toLocaleDateString() : 'N/A';
      case 'canceledAt':
        return pr.canceledAt ? new Date(pr.canceledAt).toLocaleDateString() : 'N/A';
      case 'comments':
        return pr.comments || 'N/A';
      default:
        return 'N/A';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Dashboard</Typography>
        <Box display="flex" gap={2}>
          <Box width={200}>
            <OrganizationSelector
              value={selectedOrg}
              onChange={setSelectedOrg}
            />
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/pr/new')}
          >
            New PR
          </Button>
        </Box>
      </Box>

      {/* Metrics Panel */}
      <MetricsPanel prs={filteredPRs} />

      <Grid container spacing={3}>
        {/* PR Status Summary */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              PR Status Summary
            </Typography>
            <Grid container spacing={2}>
              {Object.values(PRStatus).map((status) => {
                const count = filteredPRs.filter((pr) => pr.status === status).length;
                return (
                  <Grid item xs={6} sm={4} md={3} key={status}>
                    <Paper
                      sx={{
                        p: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        bgcolor: status === selectedStatus ? 'primary.main' : 'grey.100',
                        color: status === selectedStatus ? 'primary.contrastText' : 'text.primary',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: status === selectedStatus ? 'primary.dark' : 'action.hover',
                        },
                      }}
                      onClick={() => setSelectedStatus(status as PRStatus)}
                    >
                      <Typography variant="body1" color="inherit">
                        {status}
                      </Typography>
                      <Typography variant="h6" sx={{ ml: 1 }} color="inherit">
                        {count}
                      </Typography>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        </Grid>

        {/* PR List */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              {selectedStatus} PRs
            </Typography>
            {statusPRs.length === 0 ? (
              <Typography color="textSecondary">
                No PRs with status: {selectedStatus}
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {columns.map((column) => (
                      <TableCell key={column.id} align={column.align}>
                        {column.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {statusPRs.map((pr) => (
                    <TableRow
                      key={pr.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/pr/${pr.id}`)}
                    >
                      {columns.map((column) => (
                        <TableCell key={column.id} align={column.align}>
                          {getCellValue(pr, column.id)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>

        {/* Pending Approvals */}
        {(user?.role === UserRole.APPROVER || user?.role === UserRole.ADMIN) && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Pending Approvals
              </Typography>
              {pendingApprovals.length === 0 ? (
                <Typography color="textSecondary">
                  No pending approvals
                </Typography>
              ) : (
                pendingApprovals.slice(0, 5).map((pr) => (
                  <Box
                    key={pr.id}
                    sx={{
                      p: 1,
                      mb: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                    onClick={() => navigate(`/pr/${pr.id}`)}
                  >
                    <Typography variant="subtitle1">
                      PR #{pr.id.slice(-6)} - {pr.requestor.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total: {pr.currency} {pr.totalAmount}
                    </Typography>
                  </Box>
                ))
              )}
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};
