import type { ReactNode } from "react";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export interface DataTableSelection<T> {
  selectedKeys: ReadonlySet<string | number>;
  getKey: (row: T, index: number) => string | number;
  onToggle: (row: T, index: number) => void;
  onToggleAll: () => void;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey?: (row: T, index: number) => string | number;
  selection?: DataTableSelection<T>;
  onRowClick?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onDuplicate?: (row: T) => void;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  loadingMessage?: string;
}