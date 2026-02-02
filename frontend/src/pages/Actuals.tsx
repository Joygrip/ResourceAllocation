/**
 * Actuals Entry Page
 * 
 * Employee: Enter and sign actuals
 * RO: View and proxy sign for absent employees
 */
import React, { useState, useEffect } from 'react';
import {
  Title1,
  Body1,
  Card,
  CardHeader,
  Button,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Spinner,
  Badge,
  tokens,
  makeStyles,
  Input,
  Select,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  MessageBar,
  MessageBarBody,
  Textarea,
  ProgressBar,
} from '@fluentui/react-components';
import { 
  Add24Regular, 
  Delete24Regular, 
  Signature24Regular,
  CheckmarkCircle24Regular,
} from '@fluentui/react-icons';
import { actualsApi, ActualLine, CreateActualLine } from '../api/actuals';
import { periodsApi, Period } from '../api/periods';
import { adminApi, Project, Resource } from '../api/admin';
import { useToast } from '../hooks/useToast';

const useStyles = makeStyles({
  container: {
    padding: tokens.spacingHorizontalXXL,
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacingVerticalXL,
  },
  card: {
    marginBottom: tokens.spacingVerticalL,
  },
  table: {
    width: '100%',
  },
  formRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    alignItems: 'flex-end',
    marginBottom: tokens.spacingVerticalM,
  },
  formField: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    padding: tokens.spacingVerticalXXL,
  },
  totalBar: {
    padding: tokens.spacingVerticalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    marginBottom: tokens.spacingVerticalM,
  },
});

export const Actuals: React.FC = () => {
  const styles = useStyles();
  const { showSuccess, showError } = useToast();
  
  const [actuals, setActuals] = useState<ActualLine[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
  const [selectedActual, setSelectedActual] = useState<ActualLine | null>(null);
  const [proxyReason, setProxyReason] = useState('');
  const [isProxySign, setIsProxySign] = useState(false);
  
  const [formData, setFormData] = useState<CreateActualLine>({
    period_id: '',
    resource_id: '',
    project_id: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    planned_fte_percent: 0,
    actual_fte_percent: 50,
  });
  
  useEffect(() => {
    loadInitialData();
  }, []);
  
  useEffect(() => {
    if (selectedPeriod) {
      loadActuals();
    }
  }, [selectedPeriod]);
  
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [periodsData, projectsData, resourcesData] = await Promise.all([
        periodsApi.list(),
        adminApi.listProjects(),
        adminApi.listResources(),
      ]);
      
      setPeriods(periodsData);
      setProjects(projectsData);
      setResources(resourcesData);
      
      if (periodsData.length > 0) {
        const openPeriod = periodsData.find((p: Period) => p.status === 'open');
        setSelectedPeriod(openPeriod?.id || periodsData[0].id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
    } finally {
      setLoading(false);
    }
  };
  
  const loadActuals = async () => {
    try {
      const data = await actualsApi.getActualLines(selectedPeriod);
      setActuals(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showError('Failed to load actuals', message);
    }
  };
  
  const handleCreate = async () => {
    try {
      await actualsApi.createActualLine({
        ...formData,
        period_id: selectedPeriod,
      });
      showSuccess('Actual line created');
      setIsDialogOpen(false);
      loadActuals();
      
      // Reset form
      setFormData({
        period_id: selectedPeriod,
        resource_id: '',
        project_id: '',
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        planned_fte_percent: 0,
        actual_fte_percent: 50,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showError('Failed to create', message);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this actual line?')) return;
    
    try {
      await actualsApi.deleteActualLine(id);
      showSuccess('Actual line deleted');
      loadActuals();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showError('Failed to delete', message);
    }
  };
  
  const handleSign = async () => {
    if (!selectedActual) return;
    
    try {
      if (isProxySign) {
        if (!proxyReason.trim()) {
          showError('Reason is required for proxy signing');
          return;
        }
        await actualsApi.proxySignActuals(selectedActual.id, proxyReason);
        showSuccess('Proxy signed successfully');
      } else {
        await actualsApi.signActuals(selectedActual.id);
        showSuccess('Signed successfully');
      }
      
      setIsSignDialogOpen(false);
      setSelectedActual(null);
      setProxyReason('');
      setIsProxySign(false);
      loadActuals();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showError('Failed to sign', message);
    }
  };
  
  const openSignDialog = (actual: ActualLine, proxy: boolean = false) => {
    setSelectedActual(actual);
    setIsProxySign(proxy);
    setIsSignDialogOpen(true);
  };
  
  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown';
  const getResourceName = (id: string) => resources.find(r => r.id === id)?.display_name || 'Unknown';
  
  const currentPeriod = periods.find(p => p.id === selectedPeriod);
  const isLocked = currentPeriod?.status === 'locked';
  
  // Calculate total by resource
  const totalsByResource: Record<string, number> = {};
  actuals.forEach(a => {
    if (!totalsByResource[a.resource_id]) {
      totalsByResource[a.resource_id] = 0;
    }
    totalsByResource[a.resource_id] += a.actual_fte_percent;
  });
  
  if (loading) {
    return (
      <div className={styles.loading}>
        <Spinner size="large" label="Loading..." />
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <Title1>Actuals Entry</Title1>
          <Body1>Record actual time spent on projects</Body1>
        </div>
        
        <div style={{ display: 'flex', gap: tokens.spacingHorizontalM, alignItems: 'center' }}>
          <Select
            value={selectedPeriod}
            onChange={(_, data) => setSelectedPeriod(data.value)}
          >
            {periods.map(p => (
              <option key={p.id} value={p.id}>
                {p.year}-{String(p.month).padStart(2, '0')} ({p.status})
              </option>
            ))}
          </Select>
          
          {!isLocked && (
            <Dialog open={isDialogOpen} onOpenChange={(_, data) => setIsDialogOpen(data.open)}>
              <DialogTrigger>
                <Button appearance="primary" icon={<Add24Regular />}>
                  Add Actual
                </Button>
              </DialogTrigger>
              <DialogSurface>
                <DialogBody>
                  <DialogTitle>Add Actual Line</DialogTitle>
                  <DialogContent>
                    <div className={styles.formField}>
                      <label>Resource</label>
                      <Select
                        value={formData.resource_id}
                        onChange={(_, data) => setFormData({ ...formData, resource_id: data.value })}
                      >
                        <option value="">Select resource...</option>
                        {resources.map(r => (
                          <option key={r.id} value={r.id}>{r.display_name}</option>
                        ))}
                      </Select>
                    </div>
                    
                    <div className={styles.formField} style={{ marginTop: tokens.spacingVerticalM }}>
                      <label>Project</label>
                      <Select
                        value={formData.project_id}
                        onChange={(_, data) => setFormData({ ...formData, project_id: data.value })}
                      >
                        <option value="">Select project...</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </Select>
                    </div>
                    
                    <div className={styles.formRow} style={{ marginTop: tokens.spacingVerticalM }}>
                      <div className={styles.formField}>
                        <label>Year</label>
                        <Input
                          type="number"
                          value={String(formData.year)}
                          onChange={(_, data) => setFormData({ ...formData, year: parseInt(data.value) })}
                        />
                      </div>
                      <div className={styles.formField}>
                        <label>Month</label>
                        <Input
                          type="number"
                          min={1}
                          max={12}
                          value={String(formData.month)}
                          onChange={(_, data) => setFormData({ ...formData, month: parseInt(data.value) })}
                        />
                      </div>
                    </div>
                    
                    <div className={styles.formRow} style={{ marginTop: tokens.spacingVerticalM }}>
                      <div className={styles.formField}>
                        <label>Planned FTE %</label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={5}
                          value={String(formData.planned_fte_percent)}
                          onChange={(_, data) => setFormData({ ...formData, planned_fte_percent: parseInt(data.value) })}
                        />
                      </div>
                      <div className={styles.formField}>
                        <label>Actual FTE %</label>
                        <Input
                          type="number"
                          min={5}
                          max={100}
                          step={5}
                          value={String(formData.actual_fte_percent)}
                          onChange={(_, data) => setFormData({ ...formData, actual_fte_percent: parseInt(data.value) })}
                        />
                      </div>
                    </div>
                    
                    <MessageBar intent="warning" style={{ marginTop: tokens.spacingVerticalM }}>
                      <MessageBarBody>Total actuals per resource cannot exceed 100%</MessageBarBody>
                    </MessageBar>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button appearance="primary" onClick={handleCreate}>Create</Button>
                  </DialogActions>
                </DialogBody>
              </DialogSurface>
            </Dialog>
          )}
        </div>
      </div>
      
      {isLocked && (
        <MessageBar intent="warning" style={{ marginBottom: tokens.spacingVerticalM }}>
          <MessageBarBody>Period is locked. Editing is disabled.</MessageBarBody>
        </MessageBar>
      )}
      
      {error && (
        <MessageBar intent="error" style={{ marginBottom: tokens.spacingVerticalM }}>
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}
      
      {/* Resource totals */}
      {Object.keys(totalsByResource).length > 0 && (
        <Card className={styles.card}>
          <CardHeader header={<Body1><strong>Resource Totals</strong></Body1>} />
          <div style={{ padding: tokens.spacingVerticalM }}>
            {Object.entries(totalsByResource).map(([resourceId, total]) => (
              <div key={resourceId} className={styles.totalBar}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: tokens.spacingVerticalXS }}>
                  <Body1>{getResourceName(resourceId)}</Body1>
                  <Badge 
                    appearance="filled" 
                    color={total > 100 ? 'danger' : total === 100 ? 'success' : 'informative'}
                  >
                    {total}% / 100%
                  </Badge>
                </div>
                <ProgressBar 
                  value={Math.min(total, 100) / 100} 
                  color={total > 100 ? 'error' : total === 100 ? 'success' : 'brand'}
                />
              </div>
            ))}
          </div>
        </Card>
      )}
      
      <Card className={styles.card}>
        <CardHeader header={<Body1><strong>Actual Lines ({actuals.length})</strong></Body1>} />
        
        <Table className={styles.table}>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Resource</TableHeaderCell>
              <TableHeaderCell>Project</TableHeaderCell>
              <TableHeaderCell>Period</TableHeaderCell>
              <TableHeaderCell>Planned</TableHeaderCell>
              <TableHeaderCell>Actual</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actuals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Body1>No actuals for this period</Body1>
                </TableCell>
              </TableRow>
            ) : (
              actuals.map(a => (
                <TableRow key={a.id}>
                  <TableCell>{getResourceName(a.resource_id)}</TableCell>
                  <TableCell>{getProjectName(a.project_id)}</TableCell>
                  <TableCell>{a.year}-{String(a.month).padStart(2, '0')}</TableCell>
                  <TableCell>{a.planned_fte_percent}%</TableCell>
                  <TableCell>
                    <Badge appearance="filled" color="informative">{a.actual_fte_percent}%</Badge>
                  </TableCell>
                  <TableCell>
                    {a.employee_signed_at ? (
                      <Badge appearance="filled" color="success" icon={<CheckmarkCircle24Regular />}>
                        {a.is_proxy_signed ? 'Proxy Signed' : 'Signed'}
                      </Badge>
                    ) : (
                      <Badge appearance="outline" color="warning">Unsigned</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div style={{ display: 'flex', gap: tokens.spacingHorizontalXS }}>
                      {!a.employee_signed_at && !isLocked && (
                        <>
                          <Button
                            icon={<Signature24Regular />}
                            appearance="subtle"
                            title="Sign"
                            onClick={() => openSignDialog(a, false)}
                          />
                          <Button
                            icon={<Signature24Regular />}
                            appearance="subtle"
                            title="Proxy Sign (RO)"
                            onClick={() => openSignDialog(a, true)}
                          />
                        </>
                      )}
                      {!a.employee_signed_at && !isLocked && (
                        <Button
                          icon={<Delete24Regular />}
                          appearance="subtle"
                          onClick={() => handleDelete(a.id)}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
      
      {/* Sign Dialog */}
      <Dialog open={isSignDialogOpen} onOpenChange={(_, data) => setIsSignDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{isProxySign ? 'Proxy Sign Actuals' : 'Sign Actuals'}</DialogTitle>
            <DialogContent>
              {isProxySign ? (
                <>
                  <MessageBar intent="warning" style={{ marginBottom: tokens.spacingVerticalM }}>
                    <MessageBarBody>
                      You are signing on behalf of an absent employee. This action will be audited.
                    </MessageBarBody>
                  </MessageBar>
                  <div className={styles.formField}>
                    <label>Reason for proxy signing (required)</label>
                    <Textarea
                      value={proxyReason}
                      onChange={(_, data) => setProxyReason(data.value)}
                      placeholder="e.g., Employee on extended leave"
                    />
                  </div>
                </>
              ) : (
                <Body1>
                  Confirm that the actuals are accurate and ready for approval.
                </Body1>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setIsSignDialogOpen(false)}>Cancel</Button>
              <Button appearance="primary" onClick={handleSign}>
                {isProxySign ? 'Proxy Sign' : 'Sign'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

export default Actuals;
