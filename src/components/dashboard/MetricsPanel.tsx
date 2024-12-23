import { Grid, Paper, Typography } from '@mui/material';
import { PRRequest } from '../../types/pr';

interface MetricsPanelProps {
  prs: PRRequest[];
}

export const MetricsPanel = ({ prs }: MetricsPanelProps) => {
  const calculateMetrics = () => {
    const totalPRs = prs.length;
    const urgentPRs = prs.filter(pr => pr.metrics?.isUrgent).length;
    const avgDaysOpen = prs.reduce((acc, pr) => acc + (pr.metrics?.daysOpen || 0), 0) / totalPRs || 0;
    const overduePRs = prs.filter(pr => pr.metrics?.isOverdue).length;
    const quotesRequired = prs.filter(pr => pr.metrics?.quotesRequired).length;
    const adjudicationRequired = prs.filter(pr => pr.metrics?.adjudicationRequired).length;
    const customsClearanceRequired = prs.filter(pr => pr.metrics?.customsClearanceRequired).length;
    const avgCompletionRate = prs.reduce((acc, pr) => acc + (pr.metrics?.completionPercentage || 0), 0) / totalPRs || 0;

    return {
      totalPRs,
      urgentPRs,
      avgDaysOpen: Math.round(avgDaysOpen * 10) / 10,
      overduePRs,
      quotesRequired,
      adjudicationRequired,
      customsClearanceRequired,
      completionRate: Math.round(avgCompletionRate)
    };
  };

  const metrics = calculateMetrics();

  const MetricItem = ({ label, value }: { label: string; value: number | string }) => (
    <Grid item xs={12} sm={6} md={3}>
      <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h4">{value}</Typography>
        <Typography variant="body2" color="textSecondary">
          {label}
        </Typography>
      </Paper>
    </Grid>
  );

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Key Metrics
      </Typography>
      <Grid container spacing={2}>
        <MetricItem label="Total PRs" value={metrics.totalPRs} />
        <MetricItem label="Urgent PRs" value={metrics.urgentPRs} />
        <MetricItem label="Avg Days Open" value={metrics.avgDaysOpen} />
        <MetricItem label="Overdue PRs" value={metrics.overduePRs} />
        <MetricItem label="Quotes Required" value={metrics.quotesRequired} />
        <MetricItem label="Adjudication Required" value={metrics.adjudicationRequired} />
        <MetricItem label="Customs Required" value={metrics.customsClearanceRequired} />
        <MetricItem label="Completion Rate" value={`${metrics.completionRate}%`} />
      </Grid>
    </Paper>
  );
};
