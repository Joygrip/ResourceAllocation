/**
 * Demand Planning Page
 * 
 * PM role: Create and edit demand lines (project + resource/placeholder + FTE)
 * Finance/Admin: Read-only view
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
} from '@fluentui/react-components';
import { Add24Regular, Delete24Regular } from '@fluentui/react-icons';
import { planningApi, DemandLine, CreateDemandLine } from '../api/planning';
import { periodsApi, Period } from '../api/periods';
import { adminApi, Project, Resource, Placeholder } from '../api/admin';
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
});

export const Demand: React.FC = () => {
  const styles = useStyles();
  const { showSuccess, showError } = useToast();
  
  const [demands, setDemands] = useState<DemandLine[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateDemandLine>({
    period_id: '',
    project_id: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    fte_percent: 50,
  });
  const [useResource, setUseResource] = useState(true);
  
  useEffect(() => {
    loadInitialData();
  }, []);
  
  useEffect(() => {
    if (selectedPeriod) {
      loadDemands();
    }
  }, [selectedPeriod]);
  
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [periodsData, projectsData, resourcesData, placeholdersData] = await Promise.all([
        periodsApi.list(),
        adminApi.listProjects(),
        adminApi.listResources(),
        adminApi.listPlaceholders(),
      ]);
      
      setPeriods(periodsData);
      setProjects(projectsData);
      setResources(resourcesData);
      setPlaceholders(placeholdersData);
      
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
  
  const loadDemands = async () => {
    try {
      const data = await planningApi.getDemandLines(selectedPeriod);
      setDemands(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showError('Failed to load demand lines', message);
    }
  };
  
  const handleCreate = async () => {
    try {
      const data: CreateDemandLine = {
        ...formData,
        period_id: selectedPeriod,
      };
      
      // XOR: either resource or placeholder
      if (useResource) {
        delete data.placeholder_id;
      } else {
        delete data.resource_id;
      }
      
      await planningApi.createDemandLine(data);
      showSuccess('Demand line created');
      setIsDialogOpen(false);
      loadDemands();
      
      // Reset form
      setFormData({
        period_id: selectedPeriod,
        project_id: '',
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        fte_percent: 50,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showError('Failed to create', message);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this demand line?')) return;
    
    try {
      await planningApi.deleteDemandLine(id);
      showSuccess('Demand line deleted');
      loadDemands();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showError('Failed to delete', message);
    }
  };
  
  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown';
  const getResourceName = (id?: string) => id ? resources.find(r => r.id === id)?.display_name || 'Unknown' : '-';
  const getPlaceholderName = (id?: string) => id ? placeholders.find(p => p.id === id)?.name || 'Unknown' : '-';
  
  const currentPeriod = periods.find(p => p.id === selectedPeriod);
  const isLocked = currentPeriod?.status === 'locked';
  
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
          <Title1>Demand Planning</Title1>
          <Body1>Manage project resource demand</Body1>
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
                  Add Demand
                </Button>
              </DialogTrigger>
              <DialogSurface>
                <DialogBody>
                  <DialogTitle>Add Demand Line</DialogTitle>
                  <DialogContent>
                    <div className={styles.formField}>
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
                    
                    <div className={styles.formField} style={{ marginTop: tokens.spacingVerticalM }}>
                      <label>Assignment Type</label>
                      <Select
                        value={useResource ? 'resource' : 'placeholder'}
                        onChange={(_, data) => setUseResource(data.value === 'resource')}
                      >
                        <option value="resource">Named Resource</option>
                        <option value="placeholder">Placeholder (TBD)</option>
                      </Select>
                    </div>
                    
                    {useResource ? (
                      <div className={styles.formField} style={{ marginTop: tokens.spacingVerticalM }}>
                        <label>Resource</label>
                        <Select
                          value={formData.resource_id || ''}
                          onChange={(_, data) => setFormData({ ...formData, resource_id: data.value })}
                        >
                          <option value="">Select resource...</option>
                          {resources.map(r => (
                            <option key={r.id} value={r.id}>{r.display_name}</option>
                          ))}
                        </Select>
                      </div>
                    ) : (
                      <div className={styles.formField} style={{ marginTop: tokens.spacingVerticalM }}>
                        <label>Placeholder</label>
                        <Select
                          value={formData.placeholder_id || ''}
                          onChange={(_, data) => setFormData({ ...formData, placeholder_id: data.value })}
                        >
                          <option value="">Select placeholder...</option>
                          {placeholders.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </Select>
                        <MessageBar intent="warning">
                          <MessageBarBody>Placeholders forbidden in 4-month forecast window</MessageBarBody>
                        </MessageBar>
                      </div>
                    )}
                    
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
                      <div className={styles.formField}>
                        <label>FTE %</label>
                        <Input
                          type="number"
                          min={5}
                          max={100}
                          step={5}
                          value={String(formData.fte_percent)}
                          onChange={(_, data) => setFormData({ ...formData, fte_percent: parseInt(data.value) })}
                        />
                      </div>
                    </div>
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
      
      <Card className={styles.card}>
        <CardHeader header={<Body1><strong>Demand Lines ({demands.length})</strong></Body1>} />
        
        <Table className={styles.table}>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Project</TableHeaderCell>
              <TableHeaderCell>Resource</TableHeaderCell>
              <TableHeaderCell>Placeholder</TableHeaderCell>
              <TableHeaderCell>Period</TableHeaderCell>
              <TableHeaderCell>FTE %</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {demands.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Body1>No demand lines for this period</Body1>
                </TableCell>
              </TableRow>
            ) : (
              demands.map(d => (
                <TableRow key={d.id}>
                  <TableCell>{getProjectName(d.project_id)}</TableCell>
                  <TableCell>{getResourceName(d.resource_id)}</TableCell>
                  <TableCell>
                    {d.placeholder_id && (
                      <Badge appearance="outline" color="warning">
                        {getPlaceholderName(d.placeholder_id)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{d.year}-{String(d.month).padStart(2, '0')}</TableCell>
                  <TableCell>
                    <Badge appearance="filled" color="informative">{d.fte_percent}%</Badge>
                  </TableCell>
                  <TableCell>
                    {!isLocked && (
                      <Button
                        icon={<Delete24Regular />}
                        appearance="subtle"
                        onClick={() => handleDelete(d.id)}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Demand;
