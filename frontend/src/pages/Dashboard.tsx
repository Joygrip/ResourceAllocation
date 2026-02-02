/**
 * Dashboard page showing current user info and period status.
 */
import { useEffect, useState } from 'react';
import {
  Card,
  makeStyles,
  tokens,
  Title3,
  Body1,
  Badge,
  Spinner,
  Button,
} from '@fluentui/react-components';
import {
  PersonRegular,
  BuildingRegular,
  ShieldCheckmarkRegular,
  CalendarRegular,
  ArrowSyncRegular,
} from '@fluentui/react-icons';
import { useAuth } from '../auth/AuthProvider';
import { apiClient } from '../api/client';
import { useToast } from '../hooks/useToast';
import { HealthResponse } from '../types';
import { config } from '../config';

const useStyles = makeStyles({
  container: {
    display: 'grid',
    gap: tokens.spacingVerticalXL,
    animation: 'fadeIn 0.3s ease-out',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: tokens.spacingVerticalL,
  },
  card: {
    padding: tokens.spacingHorizontalL,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow8,
    background: 'white',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: tokens.shadow16,
    },
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalM,
  },
  cardIcon: {
    width: '44px',
    height: '44px',
    borderRadius: tokens.borderRadiusMedium,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  iconBlue: {
    background: 'linear-gradient(135deg, #0f6cbd 0%, #0a4c8c 100%)',
    color: 'white',
  },
  iconGreen: {
    background: 'linear-gradient(135deg, #107c10 0%, #0a5a0a 100%)',
    color: 'white',
  },
  iconPurple: {
    background: 'linear-gradient(135deg, #6264a7 0%, #464775 100%)',
    color: 'white',
  },
  iconTeal: {
    background: 'linear-gradient(135deg, #038387 0%, #026467 100%)',
    color: 'white',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${tokens.spacingVerticalS} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    '&:last-child': {
      borderBottom: 'none',
    },
  },
  label: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  value: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  permissionList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS,
    marginTop: tokens.spacingVerticalS,
  },
  welcomeCard: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    color: 'white',
    padding: tokens.spacingHorizontalXL,
  },
  welcomeTitle: {
    color: 'white',
    marginBottom: tokens.spacingVerticalS,
  },
  welcomeSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  actionButton: {
    marginTop: tokens.spacingVerticalM,
  },
});

export function Dashboard() {
  const styles = useStyles();
  const { user } = useAuth();
  const { showSuccess, showApiError } = useToast();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    loadHealth();
  }, []);

  const loadHealth = async () => {
    try {
      const data = await apiClient.getHealth();
      setHealth(data);
    } catch (error) {
      console.error('Failed to load health:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const result = await apiClient.seedDatabase();
      showSuccess('Database Seeded', result.message);
    } catch (error) {
      showApiError(error as Error, 'Failed to seed database');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return <Spinner label="Loading..." />;
  }

  const now = new Date();
  const currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className={styles.container}>
      {/* Welcome Card */}
      <Card className={`${styles.card} ${styles.welcomeCard}`}>
        <Title3 className={styles.welcomeTitle}>
          Welcome back, {user?.display_name}!
        </Title3>
        <Body1 className={styles.welcomeSubtitle}>
          You are logged in as <strong>{user?.role}</strong> for tenant{' '}
          <strong>{user?.tenant_id}</strong>
        </Body1>
        {config.devAuthBypass && (
          <Button
            className={styles.actionButton}
            appearance="secondary"
            icon={<ArrowSyncRegular />}
            onClick={handleSeed}
            disabled={seeding}
          >
            {seeding ? 'Seeding...' : 'Seed Database'}
          </Button>
        )}
      </Card>

      <div className={styles.grid}>
        {/* User Info Card */}
        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIcon} ${styles.iconBlue}`}>
              <PersonRegular />
            </div>
            <Title3>User Information</Title3>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Email</span>
            <span className={styles.value}>{user?.email}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Object ID</span>
            <span className={styles.value} style={{ fontSize: tokens.fontSizeBase200 }}>
              {user?.object_id}
            </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Role</span>
            <Badge appearance="filled" color="brand">
              {user?.role}
            </Badge>
          </div>
        </Card>

        {/* Tenant Info Card */}
        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIcon} ${styles.iconPurple}`}>
              <BuildingRegular />
            </div>
            <Title3>Tenant</Title3>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Tenant ID</span>
            <span className={styles.value} style={{ fontSize: tokens.fontSizeBase200 }}>
              {user?.tenant_id}
            </span>
          </div>
        </Card>

        {/* Current Period Card */}
        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIcon} ${styles.iconTeal}`}>
              <CalendarRegular />
            </div>
            <Title3>Current Period</Title3>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Period</span>
            <span className={styles.value}>{currentMonth}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Status</span>
            <Badge appearance="filled" color="success">
              Open
            </Badge>
          </div>
        </Card>

        {/* System Status Card */}
        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIcon} ${styles.iconGreen}`}>
              <ShieldCheckmarkRegular />
            </div>
            <Title3>System Status</Title3>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>API Status</span>
            <Badge appearance="filled" color={health?.status === 'healthy' ? 'success' : 'danger'}>
              {health?.status || 'Unknown'}
            </Badge>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Version</span>
            <span className={styles.value}>{health?.version || 'N/A'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Environment</span>
            <Badge appearance="outline">{health?.environment || 'N/A'}</Badge>
          </div>
        </Card>
      </div>

      {/* Permissions Card */}
      <Card className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={`${styles.cardIcon} ${styles.iconBlue}`}>
            <ShieldCheckmarkRegular />
          </div>
          <Title3>Your Permissions</Title3>
        </div>
        <div className={styles.permissionList}>
          {user?.permissions.map((perm) => (
            <Badge key={perm} appearance="outline" size="small">
              {perm}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}
