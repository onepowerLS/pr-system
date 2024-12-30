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
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { RootState } from '../../store';
import { prService } from '../../services/pr';
import { setUserPRs, setPendingApprovals, setLoading, removePR } from '../../store/slices/prSlice';
import { UserRole, PRStatus } from '../../types/pr';
import { OrganizationSelector } from '../common/OrganizationSelector';
import { MetricsPanel } from './MetricsPanel';
import { Link } from 'react-router-dom';
import { ConfirmationDialog } from '../common/ConfirmationDialog';

export const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  const { userPRs, pendingApprovals, loading } = useSelector(
    (state: RootState) => state.pr
  );
  const [selectedOrg, setSelectedOrg] = useState<string>('1PWR LESOTHO');
  const [selectedStatus, setSelectedStatus] = useState<PRStatus>(PRStatus.SUBMITTED);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [prToDelete, setPrToDelete] = useState<string | null>(null);

  // Add real-time update effect
  useEffect(() => {
    if (!user) return;

    console.log('Dashboard: Loading data for user:', user.id);
    const loadDashboardData = async () => {
      dispatch(setLoading(true));
      try {
        // Load user's PRs with organization filter
        console.log('Dashboard: Fetching PRs for org:', selectedOrg);
        const userPRsData = await prService.getUserPRs(user.id, selectedOrg);
        console.log('Dashboard: Received PRs:', userPRsData);
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

  // Add dependency on location to refresh when navigating back
  useEffect(() => {
    console.log('Dashboard: Location changed:', location.pathname);
    if (user) {
      const loadData = async () => {
        dispatch(setLoading(true));
        try {
          console.log('Dashboard: Reloading data after navigation');
          const userPRsData = await prService.getUserPRs(user.id, selectedOrg);
          console.log('Dashboard: Received updated PRs:', userPRsData);
          dispatch(setUserPRs(userPRsData));

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
      loadData();
    }
  }, [location.pathname, user, selectedOrg]);

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

  const getColumns = (status: PRStatus): GridColDef[] => {
    const baseColumns: GridColDef[] = [
      {
        field: 'prNumber',
        headerName: 'PR Number',
        width: 130,
        renderCell: (params) => (
          <Link to={`/pr/${params.row.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            {params.value || `#${params.row.id.slice(-6)}`}
          </Link>
        ),
      },
      {
        field: 'description',
        headerName: 'Description',
        width: 300,
      },
      {
        field: 'requestor',
        headerName: 'Submitted By',
        width: 150,
        valueGetter: (params) => {
          if (typeof params.row.requestor === 'string') {
            return params.row.requestor;
          }
          return params.row.requestor?.name || '';
        },
      },
      {
        field: 'createdAt',
        headerName: 'Submitted Date',
        width: 150,
        valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString() : '',
      },
    ];

    // Add status-specific columns
    switch (status) {
      case PRStatus.SUBMITTED:
        return [
          ...baseColumns,
          {
            field: 'resubmittedAt',
            headerName: 'Resubmitted Date',
            width: 150,
            valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString() : '',
          },
          {
            field: 'metrics.daysOpen',
            headerName: 'Days Open',
            width: 100,
            valueGetter: (params) => params.row.metrics?.daysOpen || 0,
          },
          {
            field: 'metrics.daysResubmission',
            headerName: 'Days Since Resubmission',
            width: 180,
            valueGetter: (params) => params.row.metrics?.daysResubmission || 0,
          },
        ];
      
      case PRStatus.IN_QUEUE:
        return [
          {
            field: 'metrics.queuePosition',
            headerName: 'Queue Position',
            width: 130,
            valueGetter: (params) => params.row.metrics?.queuePosition || '',
          },
          ...baseColumns,
          {
            field: 'confirmedAt',
            headerName: 'Confirmed Date',
            width: 150,
            valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString() : '',
          },
          {
            field: 'metrics.daysOpen',
            headerName: 'Days Open',
            width: 100,
            valueGetter: (params) => params.row.metrics?.daysOpen || 0,
          },
          {
            field: 'metrics.completionPercentage',
            headerName: '% Completed',
            width: 120,
            valueGetter: (params) => params.row.metrics?.completionPercentage || 0,
            valueFormatter: (params) => `${params.value}%`,
          },
        ];

      case PRStatus.ORDERED:
        return [
          ...baseColumns,
          {
            field: 'orderedAt',
            headerName: 'Ordered Date',
            width: 150,
            valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString() : '',
          },
          {
            field: 'metrics.daysOrdered',
            headerName: 'Days Since Ordered',
            width: 150,
            valueGetter: (params) => params.row.metrics?.daysOrdered || 0,
          },
          {
            field: 'metrics.expectedLandingDate',
            headerName: 'Expected Landing Date',
            width: 180,
            valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString() : '',
          },
          {
            field: 'metrics.daysOverdue',
            headerName: 'Days Overdue',
            width: 120,
            valueGetter: (params) => params.row.metrics?.daysOverdue || 0,
          },
          {
            field: 'metrics.completionPercentage',
            headerName: '% Completed',
            width: 120,
            valueGetter: (params) => params.row.metrics?.completionPercentage || 0,
            valueFormatter: (params) => `${params.value}%`,
          },
        ];

      case PRStatus.COMPLETED:
        return [
          ...baseColumns,
          {
            field: 'completedAt',
            headerName: 'Completed Date',
            width: 150,
            valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString() : '',
          },
          {
            field: 'metrics.timeToClose',
            headerName: 'Time to Close [Days]',
            width: 180,
            valueGetter: (params) => params.row.metrics?.timeToClose || 0,
          },
        ];

      case PRStatus.REVISION_REQUIRED:
        return [
          ...baseColumns,
          {
            field: 'revisionAt',
            headerName: 'R&R Date',
            width: 150,
            valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString() : '',
          },
          {
            field: 'procComments',
            headerName: 'PROC Comments',
            width: 300,
          },
          {
            field: 'metrics.daysOpen',
            headerName: 'Days Open',
            width: 100,
            valueGetter: (params) => params.row.metrics?.daysOpen || 0,
          },
        ];

      case PRStatus.REJECTED:
        return [
          ...baseColumns,
          {
            field: 'rejectedAt',
            headerName: 'Rejected Date',
            width: 150,
            valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString() : '',
          },
          {
            field: 'procComments',
            headerName: 'PROC Comments',
            width: 300,
          },
        ];

      case PRStatus.CANCELED:
        return [
          ...baseColumns,
          {
            field: 'canceledAt',
            headerName: 'Canceled Date',
            width: 150,
            valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString() : '',
          },
          {
            field: 'comments',
            headerName: 'Comments',
            width: 300,
          },
        ];

      default:
        return baseColumns;
    }
  };

  const columns = getColumns(selectedStatus);

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
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Purchase Requests
        </Typography>
        <Box display="flex" gap={2}>
          <OrganizationSelector
            value={selectedOrg}
            onChange={setSelectedOrg}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/pr/new')}
            startIcon={<AddIcon />}
          >
            New PR
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <MetricsPanel prs={filteredPRs} />
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" gap={2} mb={2}>
              {Object.values(PRStatus).map((status) => (
                <Button
                  key={status}
                  variant={selectedStatus === status ? 'contained' : 'outlined'}
                  onClick={() => setSelectedStatus(status)}
                >
                  {status}
                </Button>
              ))}
            </Box>

            {loading ? (
              <CircularProgress />
            ) : statusPRs.length === 0 ? (
              <Typography variant="body1" color="textSecondary">
                No PRs with status: {selectedStatus}
              </Typography>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    {columns.map((column) => (
                      <TableCell key={column.field}>
                        {column.headerName}
                      </TableCell>
                    ))}
                    <TableCell />
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
                        <TableCell key={column.field}>
                          {column.renderCell ? 
                            column.renderCell({ row: pr, value: pr[column.field] }) :
                            column.valueGetter ?
                              column.valueFormatter ?
                                column.valueFormatter({ value: column.valueGetter({ row: pr }) }) :
                                column.valueGetter({ row: pr }) :
                            column.valueFormatter ? 
                              column.valueFormatter({ value: pr[column.field] }) :
                              pr[column.field]
                          }
                        </TableCell>
                      ))}
                      <TableCell>
                        <Tooltip title="Delete PR">
                          <IconButton onClick={(e) => handleDeleteClick(e, pr.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>
      </Grid>
      <ConfirmationDialog
        open={deleteDialogOpen}
        title="Delete Purchase Request"
        message="Are you sure you want to delete this purchase request? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </Box>
  );
};
