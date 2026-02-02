/**
 * Main application shell with navigation.
 */
import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  makeStyles,
  tokens,
  Button,
  Avatar,
  Menu,
  MenuTrigger,
  MenuList,
  MenuItem,
  MenuPopover,
  Badge,
  Tooltip,
} from '@fluentui/react-components';
import {
  HomeRegular,
  HomeFilled,
  CalendarRegular,
  CalendarFilled,
  PeopleRegular,
  PeopleFilled,
  ClipboardTaskRegular,
  ClipboardTaskFilled,
  CheckmarkCircleRegular,
  CheckmarkCircleFilled,
  ChartMultipleRegular,
  ChartMultipleFilled,
  SettingsRegular,
  SettingsFilled,
  SignOutRegular,
  PersonRegular,
  bundleIcon,
} from '@fluentui/react-icons';
import { useAuth } from '../auth/AuthProvider';
import { config } from '../config';

const Home = bundleIcon(HomeFilled, HomeRegular);
const Demand = bundleIcon(CalendarFilled, CalendarRegular);
const Supply = bundleIcon(PeopleFilled, PeopleRegular);
const Actuals = bundleIcon(ClipboardTaskFilled, ClipboardTaskRegular);
const Approvals = bundleIcon(CheckmarkCircleFilled, CheckmarkCircleRegular);
const Consolidation = bundleIcon(ChartMultipleFilled, ChartMultipleRegular);
const Admin = bundleIcon(SettingsFilled, SettingsRegular);

const useStyles = makeStyles({
  container: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
  },
  sidebar: {
    width: '240px',
    background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
    display: 'flex',
    flexDirection: 'column',
    padding: tokens.spacingVerticalM,
    boxShadow: tokens.shadow16,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingVerticalL,
    marginBottom: tokens.spacingVerticalL,
    borderBottom: `1px solid rgba(255, 255, 255, 0.1)`,
  },
  logoText: {
    color: 'white',
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: '-0.5px',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    flex: 1,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    borderRadius: tokens.borderRadiusMedium,
    color: 'rgba(255, 255, 255, 0.7)',
    textDecoration: 'none',
    fontSize: tokens.fontSizeBase300,
    transition: 'all 0.2s ease',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.1)',
      color: 'white',
    },
  },
  navLinkActive: {
    background: 'rgba(255, 255, 255, 0.15)',
    color: 'white',
    fontWeight: tokens.fontWeightSemibold,
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      width: '3px',
      height: '24px',
      background: '#4ecdc4',
      borderRadius: '0 4px 4px 0',
    },
  },
  userSection: {
    borderTop: `1px solid rgba(255, 255, 255, 0.1)`,
    paddingTop: tokens.spacingVerticalM,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingHorizontalM,
  },
  userName: {
    color: 'white',
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightMedium,
  },
  userRole: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: tokens.fontSizeBase200,
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalXL}`,
    background: 'white',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    boxShadow: tokens.shadow4,
  },
  pageTitle: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: tokens.spacingHorizontalXL,
    background: '#f8fafc',
  },
});

interface NavItem {
  path: string;
  label: string;
  icon: typeof Home;
  roles?: string[];
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/demand', label: 'Demand', icon: Demand, roles: ['Admin', 'Finance', 'PM', 'RO'] },
  { path: '/supply', label: 'Supply', icon: Supply, roles: ['Admin', 'Finance', 'PM', 'RO'] },
  { path: '/actuals', label: 'Actuals', icon: Actuals, roles: ['Admin', 'Finance', 'RO', 'Employee'] },
  { path: '/approvals', label: 'Approvals', icon: Approvals, roles: ['Admin', 'RO', 'Director'] },
  { path: '/consolidation', label: 'Consolidation', icon: Consolidation, roles: ['Admin', 'Finance', 'Director'] },
  { path: '/admin', label: 'Admin', icon: Admin, roles: ['Admin'] },
];

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/demand': 'Demand Planning',
  '/supply': 'Supply Planning',
  '/actuals': 'Actuals Entry',
  '/approvals': 'Approvals',
  '/consolidation': 'Consolidation',
  '/admin': 'Administration',
};

export function AppShell({ children }: { children: ReactNode }) {
  const styles = useStyles();
  const location = useLocation();
  const { user, logout } = useAuth();

  const visibleNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  const pageTitle = pageTitles[location.pathname] || 'MatKat 2.0';

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <ChartMultipleRegular style={{ fontSize: 28, color: '#4ecdc4' }} />
          <div>
            <span className={styles.logoText}>MatKat 2.0</span>
            {config.devAuthBypass && (
              <Badge appearance="filled" color="warning" size="small" style={{ marginLeft: 8 }}>
                DEV
              </Badge>
            )}
          </div>
        </div>

        <nav className={styles.nav}>
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
              style={{ position: 'relative' }}
            >
              <item.icon style={{ fontSize: 20 }} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.userSection}>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button appearance="subtle" style={{ width: '100%', justifyContent: 'flex-start' }}>
                <div className={styles.userInfo}>
                  <Avatar
                    name={user?.display_name || 'User'}
                    color="colorful"
                    size={36}
                  />
                  <div style={{ textAlign: 'left' }}>
                    <div className={styles.userName}>{user?.display_name}</div>
                    <div className={styles.userRole}>{user?.role}</div>
                  </div>
                </div>
              </Button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem icon={<PersonRegular />}>Profile</MenuItem>
                <MenuItem icon={<SignOutRegular />} onClick={logout}>
                  Sign Out
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.pageTitle}>{pageTitle}</h1>
          <Tooltip content={`Logged in as ${user?.email}`} relationship="description">
            <Badge appearance="outline">{user?.tenant_id}</Badge>
          </Tooltip>
        </header>

        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
