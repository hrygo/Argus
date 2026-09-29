import React from "react";
import { AlertCircle, FolderOpen, Loader2 } from "lucide-react";

export const LoadingState: React.FC<{ message?: string }> = ({ message = "正在加载数据..." }) => (
  <div role="status" aria-live="polite" data-testid="loading-state" className="flex flex-col items-center justify-center p-10 text-muted-foreground">
    <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
    <p className="text-sm font-medium">{message}</p>
  </div>
);

export const EmptyState: React.FC<{ title: string; description?: string; action?: React.ReactNode }> = ({
  title,
  description,
  action,
}) => (
  <div data-testid="empty-state" className="ui-panel flex flex-col items-center justify-center border-dashed p-10 text-center">
    <FolderOpen className="w-10 h-10 text-muted-foreground mb-3" />
    <h3 className="text-base font-semibold text-foreground">{title}</h3>
    {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div role="alert" data-testid="error-state" className="flex flex-col items-center justify-center rounded-lg border border-fail-border bg-fail-subtle p-8 text-center">
    <AlertCircle className="w-8 h-8 text-fail mb-2" />
    <h3 className="text-sm font-semibold text-fail-strong">请求失败</h3>
    <p className="text-xs text-fail mt-1 max-w-md">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="ui-button ui-button--danger mt-3"
      >
        重新加载
      </button>
    )}
  </div>
);
