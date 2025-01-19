import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  CircularProgress,
  IconButton,
  Tooltip,
  TableRow,
  styled,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableCell,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, PriorityHigh as PriorityHighIcon } from '@mui/icons-material';
import { RootState } from '../../store';
import { prService } from '../../services/pr';
import { setUserPRs, setPendingApprovals, setLoading, removePR } from '../../store/slices/prSlice';
import { UserRole, PRStatus } from '../../types/pr';
import { OrganizationSelector } from '../common/OrganizationSelector';
import { MetricsPanel } from './MetricsPanel';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { Link } from 'react-router-dom';

const UrgentTableRow = styled(TableRow)(({ theme }) => ({
  backgroundColor: `${theme.palette.error.main}15`,
  '&:hover': {
    backgroundColor: `${theme.palette.error.main}25 !important`,
  },
}));

export const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  const { userPRs, pendingApprovals, loading } = useSelector(
    (state: RootState) => state.pr
  );
  const [selectedOrg, setSelectedOrg] = useState<string | { id: string; name: string }>(
    user?.organization || { id: '1PWR', name: '1PWR LESOTHO' }
  );
  const [selectedStatus, setSelectedStatus] = useState<PRStatus>(PRStatus.SUBMITTED);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [prToDelete, setPrToDelete] = useState<string | null>(null);

  // Initialize selectedOrg with user's organization when component mounts
  useEffect(() => {
    if (user?.organization) {
      console.log('Setting organization from user:', user.organization);
      setSelectedOrg(user.organization);
    }
  }, [user?.organization]);

  // Add real-time update effect
  useEffect(() => {
    if (!user?.id || !selectedOrg) {
      console.log('Dashboard: No user ID or organization available');
      return;
    }

    console.log('Dashboard: Loading data for user:', {
      userId: user.id,
      organization: selectedOrg,
      role: user.role
    });

    const loadDashboardData = async () => {
      dispatch(setLoading(true));
      try {
        // Get organization name
        const orgName = typeof selectedOrg === 'string' ? selectedOrg : selectedOrg.name;

        // Load user's PRs with organization filter
        console.log('Dashboard: Fetching PRs for org:', {
          userId: user.id,
          organization: orgName,
          role: user.role
        });
        const userPRsData = await prService.getUserPRs(user.id, orgName);
        console.log('Dashboard: Received PRs:', {
          count: userPRsData.length,
          prs: userPRsData.map(pr => ({
            id: pr.id,
            prNumber: pr.prNumber,
            status: pr.status,
            organization: pr.organization
          }))
        });
        dispatch(setUserPRs(userPRsData));

        // Load pending approvals if user is an approver
        if (user.role === UserRole.APPROVER || user.role === UserRole.ADMIN) {
          const pendingApprovalsData = await prService.getPendingApprovals(user.id, orgName);
          console.log('Dashboard: Received pending approvals:', {
            count: pendingApprovalsData.length,
            prs: pendingApprovalsData.map(pr => ({
              id: pr.id,
              prNumber: pr.prNumber,
              status: pr.status,
              organization: pr.organization
            }))
          });
          dispatch(setPendingApprovals(pendingApprovalsData));
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Don't rethrow - we want to show empty state rather than crash
      } finally {
        dispatch(setLoading(false));
      }
    };
    loadDashboardData();
  }, [user, selectedOrg, dispatch]);

  const filteredPRs = userPRs.filter(pr => {
    const orgName = typeof selectedOrg === 'string' ? selectedOrg : selectedOrg.name;
    return pr.organization === orgName;
  });

  // Get PRs for the selected status
  const getStatusPRs = () => {
    console.log('Getting status PRs:', {
      selectedStatus,
      filteredPRs: filteredPRs.map(pr => ({
        id: pr.id,
        prNumber: pr.prNumber,
        isUrgent: pr.isUrgent,
        status: pr.status,
        organization: pr.organization
      }))
    });
    
    const statusPRs = filteredPRs.filter(pr => {
      console.log('Filtering PR:', {
        id: pr.id,
        status: pr.status,
        selectedStatus,
        matches: pr.status === selectedStatus
      });
      return pr.status === selectedStatus;
    });
    
    // Log PRs before sorting
    console.log('Status PRs before sorting:', statusPRs.map(pr => ({
      id: pr.id,
      prNumber: pr.prNumber,
      isUrgent: pr.isUrgent,
      status: pr.status,
      organization: pr.organization
    })));
    
    const sortedPRs = statusPRs.sort((a, b) => {
      // First sort by urgency
      if (Boolean(a.isUrgent) !== Boolean(b.isUrgent)) {
        console.log('Sorting by urgency:', {
          a: { id: a.id, prNumber: a.prNumber, isUrgent: a.isUrgent },
          b: { id: b.id, prNumber: b.prNumber, isUrgent: b.isUrgent },
          result: Boolean(a.isUrgent) ? -1 : 1
        });
        return Boolean(a.isUrgent) ? -1 : 1;
      }
      
      // Then sort based on status
      switch (selectedStatus) {
        case PRStatus.SUBMITTED:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case PRStatus.IN_QUEUE:
          const aPos = a.metrics?.queuePosition ?? Number.MAX_SAFE_INTEGER;
          const bPos = b.metrics?.queuePosition ?? Number.MAX_SAFE_INTEGER;
          return aPos - bPos;
        default:
          return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      }
    });

    // Log PRs after sorting
    console.log('Status PRs after sorting:', sortedPRs.map(pr => ({
      id: pr.id,
      prNumber: pr.prNumber,
      isUrgent: pr.isUrgent,
      status: pr.status,
      organization: pr.organization
    })));

    return sortedPRs;
  };

  const statusPRs = getStatusPRs();

  const handleDeleteClick = (event: React.MouseEvent, prId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setPrToDelete(prId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!prToDelete) return;

    try {
      await prService.deletePR(prToDelete);
      dispatch(removePR(prToDelete));
      setDeleteDialogOpen(false);
      setPrToDelete(null);
    } catch (error) {
      console.error('Error deleting PR:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setPrToDelete(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <OrganizationSelector
              value={selectedOrg}
              onChange={(org) => setSelectedOrg(org)}
            />
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => navigate('/pr/new')}
            >
              New PR
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <MetricsPanel prs={filteredPRs} />
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Purchase Requests
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {Object.values(PRStatus).map((status) => (
                  <Chip
                    key={status}
                    label={status}
                    color={selectedStatus === status ? 'primary' : 'default'}
                    onClick={() => setSelectedStatus(status)}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>PR Number</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Submitted By</TableCell>
                    <TableCell>Created Date</TableCell>
                    {selectedStatus === PRStatus.SUBMITTED && (
                      <>
                        <TableCell>Days Open</TableCell>
                        <TableCell>Resubmitted Date</TableCell>
                      </>
                    )}
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {statusPRs.map((pr) => {
                    console.log('Rendering PR row:', {
                      id: pr.id,
                      prNumber: pr.prNumber,
                      isUrgent: pr.isUrgent,
                      status: pr.status
                    });
                    
                    // Ensure boolean conversion for isUrgent
                    const isUrgent = Boolean(pr.isUrgent);
                    console.log('PR urgency state:', {
                      id: pr.id,
                      prNumber: pr.prNumber,
                      rawIsUrgent: pr.isUrgent,
                      convertedIsUrgent: isUrgent
                    });
                    
                    const RowComponent = isUrgent ? UrgentTableRow : TableRow;
                    return (
                      <RowComponent
                        key={pr.id}
                        hover
                        onClick={() => navigate(`/pr/${pr.id}`)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          {pr.prNumber}
                          {isUrgent && (
                            <Tooltip title="Urgent PR">
                              <PriorityHighIcon
                                color="error"
                                sx={{ ml: 1, verticalAlign: 'middle' }}
                              />
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell>{pr.description}</TableCell>
                        <TableCell>
                          {typeof pr.requestor === 'string'
                            ? pr.requestor
                            : pr.requestor?.name || ''}
                        </TableCell>
                        <TableCell>
                          {new Date(pr.createdAt).toLocaleDateString()}
                        </TableCell>
                        {selectedStatus === PRStatus.SUBMITTED && (
                          <>
                            <TableCell>
                              {pr.metrics?.daysOpen || Math.ceil((Date.now() - new Date(pr.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
                            </TableCell>
                            <TableCell>
                              {pr.resubmittedAt ? new Date(pr.resubmittedAt).toLocaleDateString() : '-'}
                            </TableCell>
                          </>
                        )}
                        <TableCell>
                          <IconButton
                            onClick={(e) => handleDeleteClick(e, pr.id)}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </RowComponent>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>
      </Grid>

      <ConfirmationDialog
        open={deleteDialogOpen}
        title="Delete PR"
        content="Are you sure you want to delete this PR? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </Box>
  );
};
