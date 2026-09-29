import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Bot } from "lucide-react";
import { api } from "../../api/client";
import { queryKeys } from "../../api/query-keys";
import { formatApiError } from "../../api/errors";
import { Button, Field } from "../../components/ui/Primitives";
import { Modal } from "../../components/ui/Overlay";

const FORM_ID = "register-agent-form";

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !name.trim()) {
      setErrorMsg("请填写 Agent ID 与名称");
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="注册新 Agent"
      icon={<Bot aria-hidden="true" className="w-5 h-5 text-primary" />}
      // A half-applied registration must not be abandoned by a stray click.
      dismissable={!mutation.isPending}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" form={FORM_ID} disabled={mutation.isPending}>
            <Plus aria-hidden="true" className="w-4 h-4" />
            <span>{mutation.isPending ? "注册中..." : "确认注册"}</span>
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="p-6 space-y-4">
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

      </form>
    </Modal>
  );
};
