/**
 * Supply Planning Page
 * 
 * RO role: Create and edit supply lines (resource availability)
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
import { planningApi, SupplyLine, CreateSupplyLine } from '../api/planning';
import { periodsApi, Period } from '../api/periods';
import { adminApi, Resource } from '../api/admin';
import { useToast } from '../hooks/useToast';

const useStyles = makeStyles({
  container: {
    padding: tokens.spacingHorizontalXXL,
    maxWidth: '1200px',
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

export const Supply: React.FC = () => {
  const styles = useStyles();
  const { showSuccess, showError } = useToast();
  
  const [supplies, setSupplies] = useState<SupplyLine[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateSupplyLine>({
    period_id: '',
    resource_id: '',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    fte_percent: 100,
  });
  
  useEffect(() => {
    loadInitialData();
  }, []);
  
  useEffect(() => {
    if (selectedPeriod) {
      loadSupplies();
    }
  }, [selectedPeriod]);
  
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [periodsData, resourcesData] = await Promise.all([
        periodsApi.list(),
        adminApi.listResources(),
      ]);
      
      setPeriods(periodsData);
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
  
  const loadSupplies = async () => {
    try {
      const data = await planningApi.getSupplyLines(selectedPeriod);
      setSupplies(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showError('Failed to load supply lines', message);
    }
  };
  
  const handleCreate = async () => {
    try {
      await planningApi.createSupplyLine({
        ...formData,
        period_id: selectedPeriod,
      });
      showSuccess('Supply line created');
      setIsDialogOpen(false);
      loadSupplies();
      
      // Reset form
      setFormData({
        period_id: selectedPeriod,
        resource_id: '',
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        fte_percent: 100,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showError('Failed to create', message);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this supply line?')) return;
    
    try {
      await planningApi.deleteSupplyLine(id);
      showSuccess('Supply line deleted');
      loadSupplies();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showError('Failed to delete', message);
    }
  };
  
  const getResourceName = (id: string) => resources.find(r => r.id === id)?.display_name || 'Unknown';
  
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
          <Title1>Supply Planning</Title1>
          <Body1>Manage resource availability</Body1>
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
                  Add Supply
                </Button>
              </DialogTrigger>
              <DialogSurface>
                <DialogBody>
                  <DialogTitle>Add Supply Line</DialogTitle>
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
                    
                    <MessageBar intent="info" style={{ marginTop: tokens.spacingVerticalM }}>
                      <MessageBarBody>Supply indicates resource availability (100% = full time)</MessageBarBody>
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
      
      <Card className={styles.card}>
        <CardHeader header={<Body1><strong>Supply Lines ({supplies.length})</strong></Body1>} />
        
        <Table className={styles.table}>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Resource</TableHeaderCell>
              <TableHeaderCell>Period</TableHeaderCell>
              <TableHeaderCell>FTE %</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {supplies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Body1>No supply lines for this period</Body1>
                </TableCell>
              </TableRow>
            ) : (
              supplies.map(s => (
                <TableRow key={s.id}>
                  <TableCell>{getResourceName(s.resource_id)}</TableCell>
                  <TableCell>{s.year}-{String(s.month).padStart(2, '0')}</TableCell>
                  <TableCell>
                    <Badge appearance="filled" color="success">{s.fte_percent}%</Badge>
                  </TableCell>
                  <TableCell>
                    {!isLocked && (
                      <Button
                        icon={<Delete24Regular />}
                        appearance="subtle"
                        onClick={() => handleDelete(s.id)}
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

export default Supply;
