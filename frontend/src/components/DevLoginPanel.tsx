/**
 * Development-only login panel for testing different roles.
 */
import {
  Card,
  Button,
  Dropdown,
  Option,
  Input,
  Label,
  makeStyles,
  tokens,
  Title2,
  Body1,
  Badge,
} from '@fluentui/react-components';
import { PersonRegular, BuildingRegular, KeyRegular } from '@fluentui/react-icons';
import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { UserRole, DevAuthState } from '../types';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: tokens.spacingHorizontalXXL,
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: tokens.spacingHorizontalXL,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow64,
    background: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(10px)',
  },
  header: {
    textAlign: 'center',
    marginBottom: tokens.spacingVerticalXL,
  },
  title: {
    color: '#0f3460',
    marginBottom: tokens.spacingVerticalS,
  },
  subtitle: {
    color: tokens.colorNeutralForeground3,
  },
  devBadge: {
    marginLeft: tokens.spacingHorizontalS,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  button: {
    marginTop: tokens.spacingVerticalM,
    height: '44px',
    background: 'linear-gradient(135deg, #0f3460 0%, #16213e 100%)',
  },
  warning: {
    padding: tokens.spacingHorizontalM,
    background: tokens.colorPaletteYellowBackground1,
    borderRadius: tokens.borderRadiusMedium,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorPaletteYellowForeground2,
    marginTop: tokens.spacingVerticalM,
  },
});

const roles: UserRole[] = ['Admin', 'Finance', 'PM', 'RO', 'Director', 'Employee'];

export function DevLoginPanel() {
  const styles = useStyles();
  const { setDevAuth } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('Admin');
  const [tenantId, setTenantId] = useState('dev-tenant-001');
  const [email, setEmail] = useState('dev@example.com');
  const [displayName, setDisplayName] = useState('Dev User');

  const handleLogin = () => {
    const auth: DevAuthState = {
      role: selectedRole,
      tenantId,
      userId: `${selectedRole.toLowerCase()}-001`,
      email,
      displayName,
    };
    setDevAuth(auth);
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <Title2 className={styles.title}>
            MatKat 2.0
            <Badge className={styles.devBadge} appearance="filled" color="warning">
              DEV
            </Badge>
          </Title2>
          <Body1 className={styles.subtitle}>Resource Allocation System</Body1>
        </div>

        <div className={styles.form}>
          <div className={styles.field}>
            <Label htmlFor="role">
              <PersonRegular /> Role
            </Label>
            <Dropdown
              id="role"
              value={selectedRole}
              selectedOptions={[selectedRole]}
              onOptionSelect={(_, data) => setSelectedRole(data.optionValue as UserRole)}
            >
              {roles.map((role) => (
                <Option key={role} value={role}>
                  {role}
                </Option>
              ))}
            </Dropdown>
          </div>

          <div className={styles.field}>
            <Label htmlFor="tenant">
              <BuildingRegular /> Tenant ID
            </Label>
            <Input
              id="tenant"
              value={tenantId}
              onChange={(_, data) => setTenantId(data.value)}
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(_, data) => setEmail(data.value)}
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={displayName}
              onChange={(_, data) => setDisplayName(data.value)}
            />
          </div>

          <Button
            className={styles.button}
            appearance="primary"
            size="large"
            icon={<KeyRegular />}
            onClick={handleLogin}
          >
            Login as {selectedRole}
          </Button>

          <div className={styles.warning}>
            ⚠️ This is a development-only login. In production, Azure AD authentication is used.
          </div>
        </div>
      </Card>
    </div>
  );
}
