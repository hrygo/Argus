import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Bot } from "lucide-react";
import { api } from "../../api/client";
import { queryKeys } from "../../api/query-keys";
import { formatApiError } from "../../api/errors";
import { Field, IconButton } from "../../components/ui/Primitives";

interface RegisterAgentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (agentId: string) => void;
}

export const RegisterAgentDialog: React.FC<RegisterAgentDialogProps> = ({ isOpen, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const res = await api.POST("/api/v1/agents", {
        body: {
          id: id.trim(),
          name: name.trim(),
          description: description.trim() || null,
          owner: owner.trim() || null,
        },
      });

      if (res.error) {
        throw res.error;
      }
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.list() });
      onClose();
      if (data && onSuccess) {
        onSuccess(data.id);
      }
    },
    onError: (err) => {
      setErrorMsg(formatApiError(err));
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !name.trim()) {
      setErrorMsg("请填写 Agent ID 与名称");
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/50 backdrop-blur-xs p-4">
      <div className="bg-surface rounded-xl shadow-xl border border-border w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2 text-foreground">
            <Bot className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold">注册新 Agent</h2>
          </div>
          <IconButton label="关闭" onClick={onClose}>
            <X aria-hidden="true" className="w-4 h-4" />
          </IconButton>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs bg-fail-subtle border border-fail-border rounded-lg text-fail font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <Field
              label="Agent ID"
              required
              hint="全局唯一标识符，建议小写字母加中划线"
            >
              {({ id: fieldId, ...aria }) => (
                <input
                  {...aria}
                  id={fieldId}
                  type="text"
                  required
                  placeholder="e.g. banking-agent"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="ui-control w-full text-sm font-mono"
                />
              )}
            </Field>
          </div>

          <div>
            <Field label="显示名称" required>
              {({ id: fieldId }) => (
                <input
                  id={fieldId}
                  type="text"
                  required
                  placeholder="e.g. 银行核心业务助手"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="ui-control w-full text-sm"
                />
              )}
            </Field>
          </div>

          <div>
            <Field label="负责人 / 所属团队">
              {({ id: fieldId }) => (
                <input
                  id={fieldId}
                  type="text"
                  placeholder="e.g. retail-ai-team"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="ui-control w-full text-sm"
                />
              )}
            </Field>
          </div>

          <div>
            <Field label="详细描述">
              {({ id: fieldId }) => (
                <textarea
                  id={fieldId}
                  rows={3}
                  placeholder="简要说明该 Agent 的业务职责与评测重点..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="ui-control w-full text-sm"
                />
              )}
            </Field>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-muted rounded-lg transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{mutation.isPending ? "注册中..." : "确认注册"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
