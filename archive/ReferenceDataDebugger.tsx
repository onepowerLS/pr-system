/**
 * Debug component to inspect reference data
 * Only for development use
 */
import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Accordion, AccordionSummary, AccordionDetails, CircularProgress, Table, TableHead, TableBody, TableCell, TableRow, TableContainer, Chip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { referenceDataService } from '@/services/referenceData';
import Alert from '@mui/material/Alert';

export const ReferenceDataDebugger: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        
        // Define organization ID to test with
        const orgId = '1pwr_lesotho';
        
        // Load all reference data types
        const [
          departments,
          expenseTypes,
          projectCategories,
          sites,
          vehicles,
          vendors,
          currencies,
          organizations
        ] = await Promise.all([
          referenceDataService.getDepartments(orgId),
          referenceDataService.getExpenseTypes(orgId),
          referenceDataService.getProjectCategories(orgId),
          referenceDataService.getSites(orgId),
          referenceDataService.getVehicles(orgId),
          referenceDataService.getVendors(),
          referenceDataService.getCurrencies(),
          referenceDataService.getOrganizations()
        ]);
        
        // Test organization ID normalization
        const normalizedOrgId = referenceDataService.normalizeOrganizationId(orgId);
        
        setData({
          departments,
          expenseTypes,
          projectCategories,
          sites,
          vehicles,
          vendors,
          currencies,
          organizations,
          debug: {
            normalizedOrgId,
            vehicleDetails: vehicles.map(v => ({
              id: v.id,
              name: v.name,
              organizationId: v.organizationId,
              normalizedMatches: v.organizationId === normalizedOrgId,
              active: v.active
            })),
            expenseTypeDetails: expenseTypes.map(et => ({
              id: et.id,
              name: et.name,
              code: et.code,
              isVehicleType: et.code === '4'
            }))
          }
        });
      } catch (error) {
        console.error('Error loading reference data:', error);
        setError(error instanceof Error ? error.message : String(error));
      } finally {
        setLoading(false);
      }
    };
    
    loadAllData();
  }, []);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>Reference Data Debugger</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          This page displays all reference data for debugging purposes. 
          It should not be accessible in production.
        </Typography>
      </Paper>
      
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Vehicles ({data.vehicles?.length || 0})</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Organization ID: {data.debug?.normalizedOrgId}
          </Typography>
          
          {/* Vehicle type expense types */}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Vehicle Expense Types:</Typography>
          <Box sx={{ mb: 2, pl: 2 }}>
            {data.debug?.expenseTypeDetails
              ?.filter(et => et.isVehicleType)
              .map(et => (
                <Typography key={et.id} variant="body2">
                  {et.name} (ID: {et.id}, Code: {et.code})
                </Typography>
              ))}
          </Box>
          
          {/* Enhanced Vehicle Debugging Section */}
          <Typography variant="h6" component="h3" gutterBottom>
            Vehicle Data
          </Typography>

          {data.vehicles.length === 0 ? (
            <Alert severity="warning">No vehicles available</Alert>
          ) : (
            <>
              <Typography variant="body2" gutterBottom>
                Total Vehicles: {data.vehicles.length}
              </Typography>
              
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Filtering Process Debug:
              </Typography>
              
              <Table size="small" sx={{ marginBottom: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Filter Step</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Items Remaining</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Initial</TableCell>
                    <TableCell>All vehicles from database</TableCell>
                    <TableCell align="right">{data.vehicles.length}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Active Filter</TableCell>
                    <TableCell>Only active=true vehicles</TableCell>
                    <TableCell align="right">
                      {data.vehicles.filter(v => v.active).length}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Organization Filter</TableCell>
                    <TableCell>Vehicles matching selected org: {data.debug?.normalizedOrgId}</TableCell>
                    <TableCell align="right">
                      {data.vehicles.filter(v => {
                        const vehicleOrgId = v.organizationId || '';
                        const formOrgId = data.debug?.normalizedOrgId;
                        const normalizedFormOrgId = referenceDataService.normalizeOrganizationId(formOrgId);
                        
                        return v.active && (
                          vehicleOrgId === formOrgId || 
                          vehicleOrgId === normalizedFormOrgId ||
                          referenceDataService.normalizeOrganizationId(vehicleOrgId) === normalizedFormOrgId
                        );
                      }).length}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Expense Type Filter</TableCell>
                    <TableCell>Only shown for vehicle expense type (code='4')</TableCell>
                    <TableCell align="right">
                      {(data.debug?.expenseTypeDetails || []).find(et => et.code === '4') ? 
                        data.vehicles.filter(v => {
                          const vehicleOrgId = v.organizationId || '';
                          const formOrgId = data.debug?.normalizedOrgId;
                          const normalizedFormOrgId = referenceDataService.normalizeOrganizationId(formOrgId);
                          
                          return v.active && (
                            vehicleOrgId === formOrgId || 
                            vehicleOrgId === normalizedFormOrgId ||
                            referenceDataService.normalizeOrganizationId(vehicleOrgId) === normalizedFormOrgId
                          );
                        }).length : 0}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Typography variant="subtitle2" gutterBottom>
                Vehicle Details:
              </Typography>
              
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Organization ID</TableCell>
                      <TableCell>Normalized Org ID</TableCell>
                      <TableCell>Active</TableCell>
                      <TableCell>Available in Dropdown</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.vehicles.slice(0, 10).map(vehicle => {
                      const vehicleOrgId = vehicle.organizationId || '';
                      const formOrgId = data.debug?.normalizedOrgId;
                      const normalizedFormOrgId = referenceDataService.normalizeOrganizationId(formOrgId);
                      const normalizedVehicleOrgId = referenceDataService.normalizeOrganizationId(vehicleOrgId);
                      
                      const orgMatch = 
                        vehicleOrgId === formOrgId || 
                        vehicleOrgId === normalizedFormOrgId ||
                        normalizedVehicleOrgId === normalizedFormOrgId;
                      
                      const isAvailable = 
                        vehicle.active && 
                        orgMatch && 
                        (data.debug?.expenseTypeDetails || []).find(et => et.code === '4');
                        
                      return (
                        <TableRow key={vehicle.id}>
                          <TableCell>{vehicle.id}</TableCell>
                          <TableCell>{vehicle.name}</TableCell>
                          <TableCell>{vehicleOrgId}</TableCell>
                          <TableCell>{normalizedVehicleOrgId}</TableCell>
                          <TableCell>{vehicle.active ? 'Yes' : 'No'}</TableCell>
                          <TableCell>
                            {isAvailable ? (
                              <Chip label="Yes" color="success" size="small" />
                            ) : (
                              <Chip label="No" color="error" size="small" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {data.vehicles.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography variant="caption">
                            Showing 10 of {data.vehicles.length} vehicles
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </AccordionDetails>
      </Accordion>
      
      {Object.entries(data).filter(([key]) => key !== 'vehicles' && key !== 'debug').map(([key, items]) => (
        <Accordion key={key} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>
              {key} ({Array.isArray(items) ? items.length : 0} items)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <pre style={{ overflow: 'auto', maxHeight: '400px' }}>
              {JSON.stringify(items, null, 2)}
            </pre>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default ReferenceDataDebugger;
