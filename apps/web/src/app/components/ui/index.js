// ── BeOneOfUs 2.0 UI kit — barrel ─────────────────────────────────────────
// import { Button, Card, PageHeader, DataTable… } from '@/app/components/ui';

export { cn } from './cn';

export {
  Button, IconButton, Card, CardHeader, CardBody,
  Badge, StatusBadge, Chip, Avatar, ProgressBar, Spinner, Kbd,
} from './primitives';

export {
  Field, Input, Textarea, Select, SearchInput, PasswordInput, Toggle, Checkbox,
} from './forms';

export {
  Modal, ConfirmDialog, Drawer, Menu, MenuItem, MenuDivider, Tooltip,
} from './overlays';

export {
  ToastProvider, useToast,
  Skeleton, SkeletonText, CardSkeleton, TableSkeleton,
  EmptyState, ErrorState, LoadingState,
} from './feedback';

export {
  PageHeader, Breadcrumbs, SectionHeader, Tabs, SegmentedControl, Toolbar,
} from './layout';

export {
  Table, THead, TBody, Th, Tr, Td, RowActions, BulkBar, Pagination,
  KpiCard, KpiRow,
} from './data';

export {
  BarChart, LineChart, Sparkline, DonutChart, ChartLegend,
} from './charts';

export { ThemeToggle } from './ThemeToggle';
export { ProfileModal } from './ProfileModal';
