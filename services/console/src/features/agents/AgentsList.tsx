import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bot, ChevronRight, Layers, Plus, Trash2, User } from "lucide-react";
import { api } from "../../api/client";
import { queryKeys } from "../../api/query-keys";
import { formatApiError } from "../../api/errors";
import { RegisterAgentDialog } from "./RegisterAgentDialog";
import { DeleteAgentModal } from "./DeleteAgentModal";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateViews";
import { Badge } from "../../components/Badge";
import { Button, buttonClassName, PageHeader, Panel } from "../../components/ui/Primitives";

export const AgentsList: React.FC = () => {
  const navigate = useNavigate();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<{
    id: string;
    name: string;
    version_count?: number;
    launch_count?: number;
    active_launch_count?: number;
  } | null>(null);

  const { data: agents, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.agents.list(),
    queryFn: async () => {
      const res = await api.GET("/api/v1/agents");
      if (res.error) throw res.error;
      return Array.isArray(res.data) ? res.data : [res.data];
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent Registry"
        description="被测业务 Agent 的治理目录与多版本执行契约快照"
        actions={(
          <Button onClick={() => setIsRegisterOpen(true)}>
            <Plus aria-hidden="true" className="size-4" />
            <span>注册 Agent</span>
          </Button>
        )}
      />

      {/* Content */}
      {isLoading && <LoadingState message="正在拉取 Agent 注册清单..." />}
      {error && <ErrorState message={formatApiError(error)} onRetry={() => refetch()} />}

      {!isLoading && !error && agents && agents.length === 0 && (
        <EmptyState
          title="暂无已注册 Agent"
          description="尚未注册任何业务 Agent。请点击右上角按钮进行首次注册。"
          action={
            <Button onClick={() => setIsRegisterOpen(true)} className="text-xs">
              <Plus className="w-3.5 h-3.5" />
              <span>注册首个 Agent</span>
            </Button>
          }
        />
      )}

      {!isLoading && !error && agents && agents.length > 0 && (
        <Panel className="ui-table-shell">
          <div className="overflow-x-auto">
            <table className="ui-table w-full text-sm text-foreground-secondary">
              <thead className="bg-surface-muted border-b border-border text-micro font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">Agent / ID</th>
                  <th className="px-3 py-2.5">负责人 / 团队</th>
                  <th className="px-3 py-2.5">状态</th>
                  <th className="px-3 py-2.5">最新可用版本</th>
                  <th className="px-3 py-2.5">历史版本数</th>
                  <th className="px-3 py-2.5">评测记录</th>
                  <th className="px-3 py-2.5">更新时间</th>
                  <th className="px-3 py-2.5 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {agents.map((agent) => (
                  <tr
                    key={agent.id}
                    onClick={() => navigate(`/agents/${agent.id}`)}
                    className="hover:bg-surface-muted/80 transition-colors cursor-pointer group"
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary-subtle border border-primary-border flex items-center justify-center text-primary font-semibold flex-shrink-0">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {agent.name}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">{agent.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-2.5 text-xs">
                      {agent.owner ? (
                        <span className="inline-flex items-center gap-1 text-foreground-secondary font-medium">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{agent.owner}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>

                    <td className="px-3 py-2.5">
                      <Badge tone={agent.status.toUpperCase() === "ACTIVE" ? "pass" : "neutral"}>
                        {agent.status.toUpperCase()}
                      </Badge>
                    </td>

                    <td className="px-3 py-2.5">
                      {agent.latest_version ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-surface-muted text-foreground border border-border">
                          {agent.latest_version}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">无激活版本</span>
                      )}
                    </td>

                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 text-xs text-foreground-secondary font-medium">
                        <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{agent.version_count ?? 0}</span>
                      </span>
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-foreground-secondary font-medium">
                        <span>{agent.launch_count ?? 0}</span>
                        {(agent.active_launch_count ?? 0) > 0 && (
                          <Badge
                            tone="running"
                            title="活跃评测包含待执行、排队中、运行中、取消中等尚未结束状态的 Launch。"
                            className="rounded-full px-1.5 text-2xs"
                          >
                            {agent.active_launch_count} 条活跃评测
                          </Badge>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {new Date(agent.updated_at).toLocaleString("zh-CN", { hour12: false })}
                    </td>

                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex items-center justify-end gap-3">
                        <Link
                          to={`/agents/${agent.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className={buttonClassName("quiet", "min-h-7 px-2 text-xs")}
                        >
                          <span>管理</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAgentToDelete({
                              id: agent.id,
                              name: agent.name,
                              version_count: agent.version_count,
                              launch_count: agent.launch_count,
                              active_launch_count: agent.active_launch_count,
                            });
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-fail transition-colors cursor-pointer"
                          title="删除 Agent"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>删除</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Register Agent Dialog */}
      <RegisterAgentDialog
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSuccess={(id) => navigate(`/agents/${id}`)}
      />

      {/* Delete Agent Modal */}
      <DeleteAgentModal
        isOpen={Boolean(agentToDelete)}
        agent={agentToDelete}
        onClose={() => setAgentToDelete(null)}
      />
    </div>
  );
};
