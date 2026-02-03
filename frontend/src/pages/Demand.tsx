/**
 * Demand Planning Page
 * 
 * PM role: Create and edit demand lines (project + resource/placeholder + FTE)
 * Finance/Admin: Read-only view
 */
import React, { useState, useEffect } from 'react';
import {
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
  TabList,
  Tab,
  Title3,
} from '@fluentui/react-components';
import { Add24Regular, Delete24Regular, CalendarRegular, ChartMultipleRegular } from '@fluentui/react-icons';
import { planningApi, DemandLine, CreateDemandLine, PlanningInsights } from '../api/planning';
import { periodsApi, Period } from '../api/periods';
import { lookupsApi, Project, Resource, Placeholder } from '../api/lookups';
import { useToast } from '../hooks/useToast';
import { formatApiError } from '../utils/errors';
import { useAuth } from '../auth/AuthProvider';
import { ReadOnlyBanner } from '../components/ReadOnlyBanner';
import { PageHeader } from '../components/PageHeader';
import { StatusBanner } from '../components/StatusBanner';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';

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
  const { showSuccess, showApiError, showError } = useToast();
  const { user } = useAuth();
  
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
    fte_percent: 50,
  });
  const [useResource, setUseResource] = useState(true);
  const [activeTab, setActiveTab] = useState<'lines' | 'insights'>('lines');
  const [insights, setInsights] = useState<PlanningInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentPeriod = periods.find(p => p.id === selectedPeriod);
  
  useEffect(() => {
    loadInitialData();
  }, []);
  
  useEffect(() => {
    if (selectedPeriod) {
      loadDemands();
      if (activeTab === 'insights') {
        loadInsights();
      }
    }
  }, [selectedPeriod]);
  
  useEffect(() => {
    if (activeTab === 'insights' && selectedPeriod) {
      loadInsights();
    }
  }, [activeTab, selectedPeriod]);
  
  const loadInsights = async () => {
    if (!selectedPeriod) return;
    try {
      setInsightsLoading(true);
      const data = await planningApi.getInsights(selectedPeriod);
      setInsights(data);
    } catch (err: unknown) {
      showApiError(err as Error, 'Failed to load insights');
    } finally {
      setInsightsLoading(false);
    }
  };
  
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [periodsData, projectsData, resourcesData, placeholdersData] = await Promise.all([
        periodsApi.list(),
        lookupsApi.listProjects(),
        lookupsApi.listResources(),
        lookupsApi.listPlaceholders(),
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
      setError(formatApiError(err, 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  };
  
  const loadDemands = async () => {
    try {
      const data = await planningApi.getDemandLines(selectedPeriod);
      setDemands(data);
    } catch (err: unknown) {
      showApiError(err as Error, 'Failed to load demand lines');
    }
  };
  
  const handleCreate = async () => {
    if (!canEdit) {
      showError('Read-only', 'Only PMs can edit demand lines.');
      return;
    }
    if (!formData.project_id) {
      showError('Missing project', 'Please select a project.');
      return;
    }
    if (useResource && !formData.resource_id) {
      showError('Missing resource', 'Please select a resource.');
      return;
    }
    if (!useResource && !formData.placeholder_id) {
      showError('Missing placeholder', 'Please select a placeholder.');
      return;
    }
    try {
      const data: CreateDemandLine = {
        period_id: selectedPeriod,
        project_id: formData.project_id,
        fte_percent: formData.fte_percent,
      };
      
      // XOR: either resource or placeholder
      if (useResource) {
        data.resource_id = formData.resource_id;
      } else {
        data.placeholder_id = formData.placeholder_id;
      }
      
      await planningApi.createDemandLine(data);
      showSuccess('Demand line created');
      setIsDialogOpen(false);
      loadDemands();
      
      // Reset form
      setFormData({
        period_id: selectedPeriod,
        project_id: '',
        fte_percent: 50,
      });
    } catch (err: unknown) {
      showApiError(err as Error, 'Failed to create demand line');
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this demand line?')) return;
    
    try {
      await planningApi.deleteDemandLine(id);
      showSuccess('Demand line deleted');
      loadDemands();
    } catch (err: unknown) {
      showApiError(err as Error, 'Failed to delete demand line');
    }
  };
  
  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown';
  const getResourceName = (id?: string) => id ? resources.find(r => r.id === id)?.display_name || 'Unknown' : '-';
  const getPlaceholderName = (id?: string) => id ? placeholders.find(p => p.id === id)?.name || 'Unknown' : '-';
  
  const isLocked = currentPeriod?.status === 'locked';
  const canEdit = user?.role === 'PM' || user?.role === 'Finance';
  const isReadOnly = !canEdit && user?.role === 'Admin';
  
  if (loading) {
    return <LoadingState message="Loading demand planning data..." />;
  }
  
  return (
    <div className={styles.container}>
      <PageHeader
        title="Demand Planning"
        subtitle="Manage project resource demand"
        actions={
          <>
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
            {!isLocked && canEdit && (
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
                    {currentPeriod && (
                      <div className={styles.formField} style={{ marginBottom: tokens.spacingVerticalM }}>
                        <label>Period</label>
                        <Body1 style={{ padding: tokens.spacingVerticalS, color: tokens.colorNeutralForeground3 }}>
                          {monthNames[currentPeriod.month - 1]} {currentPeriod.year} ({currentPeriod.status})
                        </Body1>
                      </div>
                    )}
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
                        onChange={(_, data) => {
                          const nextUseResource = data.value === 'resource';
                          setUseResource(nextUseResource);
                          setFormData((prev) => ({
                            ...prev,
                            resource_id: nextUseResource ? prev.resource_id : '',
                            placeholder_id: nextUseResource ? '' : prev.placeholder_id,
                          }));
                        }}
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
                    
                    <div className={styles.formField} style={{ marginTop: tokens.spacingVerticalM }}>
                      <label>FTE %</label>
                      <Select
                        value={String(formData.fte_percent)}
                        onChange={(_, data) => setFormData({ ...formData, fte_percent: parseInt(data.value || '50') })}
                      >
                        {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100].map(val => (
                          <option key={val} value={val}>{val}%</option>
                        ))}
                      </Select>
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
          </>
        }
      />
      
      {isLocked && (
        <StatusBanner
          intent="warning"
          title="Period Locked"
          message="This period is locked. Editing is disabled."
        />
      )}
      
      {isReadOnly && !isLocked && (
        <ReadOnlyBanner message="Only PMs and Finance can edit demand lines. You can view all demand data." />
      )}
      
      {error && (
        <StatusBanner intent="danger" title="Error" message={error} />
      )}

      <TabList 
        selectedValue={activeTab} 
        onTabSelect={(_, data) => setActiveTab(data.value as 'lines' | 'insights')}
        style={{ marginBottom: tokens.spacingVerticalL }}
      >
        <Tab value="lines">Demand Lines</Tab>
        <Tab value="insights" icon={<ChartMultipleRegular />}>Insights</Tab>
      </TabList>

      {activeTab === 'lines' && (
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
                <TableCell colSpan={6} style={{ padding: tokens.spacingVerticalXXL }}>
                  <EmptyState
                    icon={<CalendarRegular style={{ fontSize: 48 }} />}
                    title="No demand lines"
                    message="No demand lines found for this period. Create one to get started."
                    action={
                      !isLocked && canEdit ? (
                        <Button
                          appearance="primary"
                          icon={<Add24Regular />}
                          onClick={() => setIsDialogOpen(true)}
                        >
                          Add Demand Line
                        </Button>
                      ) : undefined
                    }
                  />
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
                    {!isLocked && canEdit && (
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
      )}
      
      {activeTab === 'insights' && (
        <Card className={styles.card}>
          <CardHeader header={<Title3>Planning Insights</Title3>} />
          {insightsLoading ? (
            <LoadingState message="Loading insights..." />
          ) : insights ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: tokens.spacingHorizontalM, marginBottom: tokens.spacingVerticalL }}>
                <div style={{ padding: tokens.spacingHorizontalM, backgroundColor: tokens.colorNeutralBackground2, borderRadius: tokens.borderRadiusMedium }}>
                  <Body1 style={{ fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3 }}>Total Demand</Body1>
                  <Title3>{insights.stats.total_demand}%</Title3>
                </div>
                <div style={{ padding: tokens.spacingHorizontalM, backgroundColor: tokens.colorNeutralBackground2, borderRadius: tokens.borderRadiusMedium }}>
                  <Body1 style={{ fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3 }}>Total Supply</Body1>
                  <Title3>{insights.stats.total_supply}%</Title3>
                </div>
                <div style={{ padding: tokens.spacingHorizontalM, backgroundColor: tokens.colorNeutralBackground2, borderRadius: tokens.borderRadiusMedium }}>
                  <Body1 style={{ fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3 }}>Total Gap</Body1>
                  <Title3 style={{ color: insights.stats.total_gap < 0 ? tokens.colorPaletteRedBackground3 : tokens.colorPaletteGreenBackground3 }}>
                    {insights.stats.total_gap > 0 ? '+' : ''}{insights.stats.total_gap}%
                  </Title3>
                </div>
              </div>
              
              <Title3 style={{ marginBottom: tokens.spacingVerticalM }}>Gaps by Cost Center</Title3>
              <Table className={styles.table}>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Cost Center</TableHeaderCell>
                    <TableHeaderCell>Demand</TableHeaderCell>
                    <TableHeaderCell>Supply</TableHeaderCell>
                    <TableHeaderCell>Gap</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insights.by_cost_center.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} style={{ textAlign: 'center', padding: tokens.spacingVerticalXXL }}>
                        <Body1>No cost center data available</Body1>
                      </TableCell>
                    </TableRow>
                  ) : (
                    insights.by_cost_center.map((cc) => (
                      <TableRow key={cc.cost_center_id}>
                        <TableCell>{cc.cost_center_name}</TableCell>
                        <TableCell>{cc.demand_total}%</TableCell>
                        <TableCell>{cc.supply_total}%</TableCell>
                        <TableCell>
                          <Badge appearance={cc.gap < 0 ? 'filled' : 'outline'} color={cc.gap < 0 ? 'danger' : 'success'}>
                            {cc.gap > 0 ? '+' : ''}{cc.gap}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              
              {insights.orphan_demand.length > 0 && (
                <>
                  <Title3 style={{ marginTop: tokens.spacingVerticalXL, marginBottom: tokens.spacingVerticalM }}>Orphan Demand</Title3>
                  <Table className={styles.table}>
                    <TableHeader>
                      <TableRow>
                        <TableHeaderCell>Project</TableHeaderCell>
                        <TableHeaderCell>Resource/Placeholder</TableHeaderCell>
                        <TableHeaderCell>FTE %</TableHeaderCell>
                        <TableHeaderCell>Reason</TableHeaderCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {insights.orphan_demand.map((orphan) => (
                        <TableRow key={orphan.demand_line_id}>
                          <TableCell>{orphan.project_name}</TableCell>
                          <TableCell>{orphan.resource_or_placeholder}</TableCell>
                          <TableCell>{orphan.fte_percent}%</TableCell>
                          <TableCell>{orphan.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </>
          ) : (
            <EmptyState
              icon={<ChartMultipleRegular />}
              title="No Insights Available"
              description="Select a period to view planning insights."
            />
          )}
        </Card>
      )}
    </div>
  );
};

export default Demand;
