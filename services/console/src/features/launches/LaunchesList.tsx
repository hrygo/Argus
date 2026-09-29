import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  Copy,
  ExternalLink,
  Filter,
  Plus,
  RefreshCw,
  Rocket,
} from "lucide-react";
import { api } from "../../api/client";
import { queryKeys } from "../../api/query-keys";
import { formatApiError } from "../../api/errors";
import { StatusBadge } from "../../components/StatusBadge";
import { QualityBadge } from "../../components/QualityBadge";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateViews";
import { SyncStatusBadge } from "../../components/SyncStatusBadge";
import { Button, buttonClassName, PageHeader, Panel, SelectInput, TextInput } from "../../components/ui/Primitives";

type LaunchResponse = import("../../api/schema").components["schemas"]["ExperimentLaunchResponse"];
type AgentSummary = import("../../api/schema").components["schemas"]["AgentSummaryResponse"];

export const LAUNCH_STATUSES = [
  "PENDING",
  "QUEUED",
  "RUNNING",
  "COMPLETED",
  "PARTIAL_FAILED",
  "FAILED",
  "CANCELLING",
  "CANCELLED",
] as const;

export type LaunchStatus = (typeof LAUNCH_STATUSES)[number];

export const ACTIVE_LAUNCH_STATUSES = new Set<LaunchStatus>([
  "PENDING",
  "QUEUED",
  "RUNNING",
  "CANCELLING",
]);

export const LAUNCH_STATUS_LABELS: Record<LaunchStatus, string> = {
  PENDING: "PENDING (准备中)",
  QUEUED: "QUEUED (队列中)",
  RUNNING: "RUNNING (运行中)",
  COMPLETED: "COMPLETED (已完成)",
  PARTIAL_FAILED: "PARTIAL_FAILED (部分失败)",
  FAILED: "FAILED (失败)",
  CANCELLING: "CANCELLING (取消中)",
  CANCELLED: "CANCELLED (已取消)",
};

const isSafeLangfuseUrl = (value: unknown): value is string => {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
};

export const LaunchesList: React.FC = () => {
  const [filterAgent, setFilterAgent] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterQuality, setFilterQuality] = useState<string>("");
  const [copiedLaunchId, setCopiedLaunchId] = useState<string | null>(null);

  // Non-blocking enrichment: fetch registered agents to display readable names
  const { data: agents = [] } = useQuery<AgentSummary[]>({
    queryKey: queryKeys.agents.list(),
    queryFn: async () => {
      try {
        const res = await api.GET("/api/v1/agents");
        if (res.error || !res.data) return [];
        return Array.isArray(res.data) ? res.data : [res.data];
      } catch {
        return [];
      }
    },
  });

  const agentNameById = useMemo(
    () => new Map(agents.map((agent) => [agent.id, agent.name])),
    [agents]
  );

  const { data: launches, isLoading, error, refetch, isFetching } = useQuery<LaunchResponse[]>({
    queryKey: queryKeys.launches.list({
      agent_id: filterAgent || undefined,
      status: filterStatus || undefined,
      quality_conclusion: filterQuality || undefined,
    }),
    queryFn: async () => {
      const res = await api.GET("/api/v1/experiment-launches", {
        params: {
          query: {
            agent_id: filterAgent || undefined,
            status: (filterStatus as any) || undefined,
            quality_conclusion: (filterQuality as any) || undefined,
          },
        },
      });
      if (res.error) throw res.error;
      const list = Array.isArray(res.data) ? res.data : [res.data];
      return list as LaunchResponse[];
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasActive = data?.some((l) =>
        ACTIVE_LAUNCH_STATUSES.has(l.status.toUpperCase() as LaunchStatus)
      );
      return hasActive ? 2000 : false;
    },
  });

  const handleCopyId = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopiedLaunchId(id);
      setTimeout(() => {
        setCopiedLaunchId((curr) => (curr === id ? null : curr));
      }, 2000);
    } catch {
      // Clipboard access denied or failed; do not fake success
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="评测发射台 (Experiment Launches)"
        description="查看、检索与触发 Agent 自动化评测任务，所有历史记录均严格锁定不可变快照 (Frozen Manifest)。"
        actions={(
          <>
            <Button variant="secondary" onClick={() => refetch()} disabled={isFetching} aria-label="刷新列表">
              <RefreshCw aria-hidden="true" className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Link to="/launches/new" className={buttonClassName("primary")}>
              <Plus aria-hidden="true" className="size-4" />
              <span>新建评测</span>
            </Link>
          </>
        )}
      />

      {/* Filter Bar */}
      <div className="ui-panel flex flex-wrap items-center gap-2.5 p-3 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground font-semibold uppercase tracking-wider text-micro mr-1">
          <Filter className="w-3.5 h-3.5" />
          <span>过滤筛选:</span>
        </div>

        {/* Agent Filter */}
        <div className="relative min-w-col-xl">
          <TextInput
            type="text"
            placeholder="按 Agent ID 过滤..."
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="w-full text-xs"
          />
        </div>

        {/* Status Filter */}
        <SelectInput
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-auto min-w-col-lg text-xs"
        >
          <option value="">全部执行状态 (Status)</option>
          {LAUNCH_STATUSES.map((status) => (
            <option key={status} value={status}>
              {LAUNCH_STATUS_LABELS[status]}
            </option>
          ))}
        </SelectInput>

        {/* Quality Filter */}
        <SelectInput
          value={filterQuality}
          onChange={(e) => setFilterQuality(e.target.value)}
          className="w-auto min-w-col-lg text-xs"
        >
          <option value="">全部质量结论 (Quality)</option>
          <option value="pass">PASS (通过)</option>
          <option value="fail">FAIL (未通过)</option>
          <option value="unknown">UNKNOWN (未知/未测)</option>
        </SelectInput>

        {(filterAgent || filterStatus || filterQuality) && (
          <Button
            type="button"
            variant="quiet"
            onClick={() => {
              setFilterAgent("");
              setFilterStatus("");
              setFilterQuality("");
            }}
            className="ml-auto min-h-7 px-2 text-xs underline underline-offset-2"
          >
            重置筛选
          </Button>
        )}
      </div>

      {/* Content Area */}
      {isLoading && <LoadingState message="正在加载评测记录..." />}
      {error && <ErrorState message={formatApiError(error)} onRetry={() => refetch()} />}

      {!isLoading && !error && launches && launches.length === 0 && (
        <EmptyState
          title="暂无评测记录"
          description={
            filterAgent || filterStatus || filterQuality
              ? "未匹配到符合当前过滤条件的评测任务，请尝试重置筛选。"
              : "尚未发起过任何评测任务。点击上方按钮发起第一次评测吧！"
          }
          action={
            <Link
              to="/launches/new"
              className={buttonClassName("primary", "text-xs")}
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>新建评测</span>
            </Link>
          }
        />
      )}

      {!isLoading && !error && launches && launches.length > 0 && (
        <Panel className="ui-table-shell">
          <div className="overflow-x-auto">
            <table className="ui-table min-w-table-lg table-fixed text-sm text-foreground-secondary">
              <colgroup>
                <col className="w-col-xs" />
                <col className="w-col-lg" />
                <col className="w-col-sm" />
                <col className="w-col-md" />
                <col className="w-col-3xs" />
                <col className="w-col-2xs" />
                <col className="w-col-sm" />
                <col className="w-col-xl" />
              </colgroup>
              <thead className="bg-surface-muted border-b border-border text-micro font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">Launch</th>
                  <th className="px-3 py-2.5">Agent</th>
                  <th className="px-3 py-2.5">Dataset</th>
                  <th className="px-3 py-2.5">状态</th>
                  <th className="px-3 py-2.5">质量</th>
                  <th className="px-3 py-2.5">Langfuse</th>
                  <th className="px-3 py-2.5">创建时间</th>
                  <th className="px-3 py-2.5 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {launches.map((launch) => {
                  const agentName = agentNameById.get(launch.agent_id);
                  const isCopied = copiedLaunchId === launch.id;

                  return (
                    <tr key={launch.id} className="hover:bg-surface-muted/80 transition-colors">
                      {/* Launch ID */}
                      <td className="px-3 py-2.5">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <Link
                            to={`/launches/${launch.id}`}
                            className="min-w-0 flex-1 truncate font-mono text-xs font-bold text-primary hover:text-primary-strong hover:underline block"
                            title={launch.id}
                          >
                            {launch.id}
                          </Link>
                          <button
                            type="button"
                            onClick={(e) => handleCopyId(launch.id, e)}
                            className="size-7 shrink-0 inline-flex items-center justify-center text-muted-foreground hover:text-foreground-secondary hover:bg-surface-muted rounded-md transition-colors cursor-pointer"
                            title={isCopied ? "已复制" : "复制完整 Launch ID"}
                            aria-label={`复制 Launch ID ${launch.id}`}
                          >
                            {isCopied ? (
                              <Check className="size-3.5 text-pass" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Agent */}
                      <td className="px-3 py-2.5">
                        <div className="min-w-0 text-xs">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span
                              className="min-w-0 flex-1 truncate font-semibold text-foreground"
                              title={agentName || launch.agent_id}
                            >
                              {agentName || launch.agent_id}
                            </span>
                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-surface-muted text-foreground-secondary font-mono text-2xs whitespace-nowrap">
                              {launch.agent_version}
                            </span>
                          </div>
                          {agentName && agentName !== launch.agent_id && (
                            <div
                              className="truncate font-mono text-micro text-muted-foreground mt-0.5"
                              title={launch.agent_id}
                            >
                              {launch.agent_id}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Dataset */}
                      <td className="px-3 py-2.5">
                        <div className="min-w-0 text-xs">
                          <span
                            className="min-w-0 block truncate font-semibold text-foreground"
                            title={launch.dataset_name}
                          >
                            {launch.dataset_name}
                          </span>
                          <span
                            className="text-muted-foreground font-mono text-micro block truncate mt-0.5"
                            title={launch.dataset_version || ""}
                          >
                            {launch.dataset_version || "-"}
                          </span>
                        </div>
                      </td>

                      {/* Status + Progress (Contained within 165px column, overflow safe) */}
                      <td className="px-3 py-2.5">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <StatusBadge status={launch.status} />
                          {launch.progress && launch.progress.total > 0 && (
                            <span
                              className="min-w-0 truncate font-mono text-micro text-muted-foreground"
                              title={`${launch.progress.percentage}% · ${launch.progress.completed}/${launch.progress.total}`}
                            >
                              {launch.progress.percentage}% · {launch.progress.completed}/{launch.progress.total}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Quality */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <QualityBadge quality={launch.quality_conclusion} />
                      </td>

                      {/* Langfuse */}
                      <td className="px-3 py-2.5 text-xs font-mono whitespace-nowrap">
                        <SyncStatusBadge status={launch.langfuse_sync_status} />
                      </td>

                      {/* Created At */}
                      <td
                        className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap truncate"
                        title={new Date(launch.created_at).toLocaleString("zh-CN", { hour12: false })}
                      >
                        {new Date(launch.created_at).toLocaleString("zh-CN", { hour12: false })}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/launches/${launch.id}`}
                            aria-label={`查看 Launch ${launch.id} 详情`}
                            className="text-xs font-semibold text-primary hover:text-primary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded"
                          >
                            详情
                          </Link>
                          {isSafeLangfuseUrl(launch.langfuse_experiment_url) ? (
                            <a
                              href={launch.langfuse_experiment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="在 Langfuse 中查看"
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus rounded"
                              title="在 Langfuse UI 中查看"
                            >
                              Langfuse
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span
                              className="text-xs text-muted-foreground"
                              title={launch.langfuse_experiment_url ? "Langfuse 地址无效" : "尚未创建 Langfuse 链接"}
                            >
                              Langfuse 未就绪
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
};
