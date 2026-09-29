import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Layers } from "lucide-react";
import { api } from "../../api/client";
import { queryKeys } from "../../api/query-keys";
import { formatApiError } from "../../api/errors";
import { FieldHelp } from "../../components/FieldHelp";
import { Button, Field, TextArea, TextInput } from "../../components/ui/Primitives";
import { Modal } from "../../components/ui/Overlay";
import { AGENT_VERSION_FIELD_HELPS } from "./helpDocs";

const FORM_ID = "create-version-form";

interface CreateVersionDialogProps {
  agentId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateVersionDialog: React.FC<CreateVersionDialogProps> = ({
  agentId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [version, setVersion] = useState("");
  const [endpoint, setEndpoint] = useState("http://127.0.0.1:18081/invoke");
  const [timeoutSeconds, setTimeoutSeconds] = useState(30.0);
  const [maxRetries, setMaxRetries] = useState(2);
  const [maxConcurrency, setMaxConcurrency] = useState(4);
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(600);
  const [isIdempotent, setIsIdempotent] = useState(false);
  const [credentialRef, setCredentialRef] = useState("");
  const [artifactRef, setArtifactRef] = useState("");
  const [environment, setEnvironment] = useState("staging");
  const [requestMappingStr, setRequestMappingStr] = useState('{"query": "input.user_message"}');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      let requestMapping = {};
      try {
        if (requestMappingStr.trim()) {
          requestMapping = JSON.parse(requestMappingStr);
        }
      } catch {
        throw new Error("Request Mapping 必须是合法的 JSON 格式");
      }

      const res = await api.POST("/api/v1/agent-versions", {
        body: {
          agent_id: agentId,
          version: version.trim(),
          endpoint: endpoint.trim(),
          protocol: "HTTP_JSON",
          method: "POST",
          request_mapping: requestMapping,
          timeout_seconds: Number(timeoutSeconds),
          max_retries: Number(maxRetries),
          max_concurrency: Number(maxConcurrency),
          rate_limit_per_minute: Number(rateLimitPerMinute),
          is_idempotent: isIdempotent,
          credential_ref: credentialRef.trim() || null,
          artifact_ref: artifactRef.trim() || null,
          environment: environment.trim() || null,
          trace_propagation: "W3C",
        },
      });

      if (res.error) {
        throw res.error;
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.versions(agentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(agentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.list() });
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (err) => {
      setErrorMsg(formatApiError(err));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!version.trim() || !endpoint.trim()) {
      setErrorMsg("请填写版本号与远程 HTTP 端点");
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="创建 AgentVersion 规格快照"
      icon={<Layers aria-hidden="true" className="w-5 h-5 text-primary" />}
      // A half-written version snapshot must not be abandoned mid-flight.
      dismissable={!mutation.isPending}
      className="sm:max-w-modal-lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" form={FORM_ID} disabled={mutation.isPending}>
            <Plus aria-hidden="true" className="w-4 h-4" />
            <span>{mutation.isPending ? "创建中..." : "确认创建版本"}</span>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="版本号 (Tag)"
              required
              labelSuffix={<FieldHelp {...AGENT_VERSION_FIELD_HELPS.version} />}
              hint="创建后将永久冻结且不可变"
            >
              {({ id, ...aria }) => (
                <TextInput
                  {...aria}
                  id={id}
                  type="text"
                  required
                  placeholder="e.g. 1.0.0 或 v2"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full text-sm font-mono"
                />
              )}
            </Field>

            <Field
              label="运行环境"
              labelSuffix={
                <FieldHelp {...AGENT_VERSION_FIELD_HELPS.environment} placement="bottom-right" />
              }
            >
              {({ id }) => (
                <TextInput
                  id={id}
                  type="text"
                  placeholder="e.g. production / staging"
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  className="w-full text-sm"
                />
              )}
            </Field>
          </div>

          <Field
            label="远程调用端点 (HTTP POST)"
            required
            labelSuffix={<FieldHelp {...AGENT_VERSION_FIELD_HELPS.endpoint} />}
          >
            {({ id }) => (
              <TextInput
                id={id}
                type="url"
                required
                placeholder="http://agent-host:8080/invoke"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="w-full text-sm font-mono"
              />
            )}
          </Field>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="超时时间 (秒)">
              {({ id }) => (
                <TextInput
                  id={id}
                  type="number"
                  min={1}
                  max={600}
                  value={timeoutSeconds}
                  onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                  className="w-full font-mono"
                />
              )}
            </Field>

            <Field label="最大重试次数">
              {({ id }) => (
                <TextInput
                  id={id}
                  type="number"
                  min={0}
                  max={10}
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(Number(e.target.value))}
                  className="w-full font-mono"
                />
              )}
            </Field>

            <Field label="最大并发数">
              {({ id }) => (
                <TextInput
                  id={id}
                  type="number"
                  min={1}
                  max={50}
                  value={maxConcurrency}
                  onChange={(e) => setMaxConcurrency(Number(e.target.value))}
                  className="w-full font-mono"
                />
              )}
            </Field>

            <Field label="每分钟限流 (RPM)">
              {({ id }) => (
                <TextInput
                  id={id}
                  type="number"
                  min={1}
                  max={10000}
                  value={rateLimitPerMinute}
                  onChange={(e) => setRateLimitPerMinute(Number(e.target.value))}
                  className="w-full font-mono"
                />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="凭据引用 (SecretRef)"
              labelSuffix={<FieldHelp {...AGENT_VERSION_FIELD_HELPS.credentialRef} />}
              hint="仅存储引用标识，禁止存入明文 Secret"
            >
              {({ id, ...aria }) => (
                <TextInput
                  {...aria}
                  id={id}
                  type="text"
                  placeholder="env://API_TOKEN 或 vault://path"
                  value={credentialRef}
                  onChange={(e) => setCredentialRef(e.target.value)}
                  className="w-full font-mono"
                />
              )}
            </Field>

            <Field
              label="产物标识 (ArtifactRef)"
              labelSuffix={
                <FieldHelp {...AGENT_VERSION_FIELD_HELPS.artifactRef} placement="bottom-right" />
              }
            >
              {({ id }) => (
                <TextInput
                  id={id}
                  type="text"
                  placeholder="git commit SHA 或 docker image digest"
                  value={artifactRef}
                  onChange={(e) => setArtifactRef(e.target.value)}
                  className="w-full font-mono"
                />
              )}
            </Field>
          </div>

          <Field
            label="请求映射关系 (Request Mapping JSON)"
            labelSuffix={
              <FieldHelp {...AGENT_VERSION_FIELD_HELPS.requestMapping} placement="top-left" />
            }
            hint={`点路径映射关系，例如：${'{"query": "input.user_message"}'}`}
          >
            {({ id, ...aria }) => (
              <TextArea
                {...aria}
                id={id}
                rows={3}
                value={requestMappingStr}
                onChange={(e) => setRequestMappingStr(e.target.value)}
                className="w-full text-xs font-mono"
              />
            )}
          </Field>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_idempotent"
              checked={isIdempotent}
              onChange={(e) => setIsIdempotent(e.target.checked)}
              className="rounded border-border-strong text-primary focus:ring-focus"
            />
            <label htmlFor="is_idempotent" className="text-xs text-foreground-secondary select-none">
              该端点为幂等调用（发生 Read Timeout 时允许根据策略重试）
            </label>
          </div>

      </form>
    </Modal>
  );
};
