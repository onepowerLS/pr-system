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

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;
      
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
        // Clear the data on error to avoid showing stale data
        dispatch(setUserPRs([]));
        dispatch(setPendingApprovals([]));
      } finally {
        dispatch(setLoading(false));
      }
    };

    loadDashboardData();
  }, [dispatch, user, selectedOrg]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  const filteredPRs = userPRs.filter(pr => pr.organization === selectedOrg);

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
        {/* Recent PRs */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent PRs
            </Typography>
            {filteredPRs.length === 0 ? (
              <Typography color="textSecondary">No recent PRs</Typography>
            ) : (
              filteredPRs.slice(0, 5).map((pr) => (
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
                    PR #{pr.id.slice(-6)} - {pr.status}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total: {pr.currency} {pr.totalAmount}
                  </Typography>
                </Box>
              ))
            )}
          </Paper>
        </Grid>

        {/* Pending Approvals */}
        {(user?.role === UserRole.APPROVER || user?.role === UserRole.ADMIN) && (
          <Grid item xs={12} md={6}>
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
                        p: 2,
                        textAlign: 'center',
                        bgcolor: 'grey.100',
                      }}
                    >
                      <Typography variant="h4">{count}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {status}
                      </Typography>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
