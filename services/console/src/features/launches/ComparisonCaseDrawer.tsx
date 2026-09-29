import React, { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { queryKeys } from "../../api/query-keys";
import { formatApiError } from "../../api/errors";
import { Button } from "../../components/ui/Primitives";
import { JsonViewer } from "../../components/JsonViewer";

type ComparisonCaseOutput = import("../../api/schema").components["schemas"]["ComparisonCaseOutputResponse"];
type OutputSide = ComparisonCaseOutput["baseline"];

const OutputPanel: React.FC<{ title: string; side: OutputSide }> = ({ title, side }) => (
  <section aria-label={title} className="min-w-0 space-y-2 rounded-lg border border-border p-3">
    <div className="flex items-center justify-between gap-2">
      <h3 className="font-semibold">{title}</h3>
      <span className="rounded bg-canvas px-2 py-1 text-[11px]">{side.output_status}</span>
    </div>
    {side.reason && <p className="text-xs text-muted-foreground">{side.reason}</p>}
    {side.truncated && <p className="text-xs text-amber-700">输出过大，已截断显示。</p>}
    {side.output_status === "AVAILABLE" && <JsonViewer data={side.output} title={`${title} Agent Output`} />}
    <JsonViewer data={side.scores ?? {}} title={`${title} Scores`} />
    {side.trace_url && <a className="inline-block text-xs text-primary hover:underline" href={side.trace_url} target="_blank" rel="noreferrer">打开 Trace</a>}
  </section>
);

export const ComparisonCaseDrawer: React.FC<{
  launchId: string;
  snapshotId: string;
  datasetItemId: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}> = ({ launchId, snapshotId, datasetItemId, triggerRef, onClose }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const query = useQuery({
    queryKey: queryKeys.launches.case(launchId, snapshotId, datasetItemId),
    queryFn: async () => {
      const response = await api.GET("/api/v1/experiment-launches/{launch_id}/comparison/case", {
        params: {
          path: { launch_id: launchId },
          query: { snapshot_id: snapshotId, dataset_item_id: datasetItemId },
        },
      });
      if (response.error) throw response.error;
      if (!response.data) throw new Error("Case output response is empty");
      if (response.data.candidate_snapshot_id !== snapshotId || response.data.dataset_item_id !== datasetItemId) {
        throw new Error("Case output belongs to a different frozen result reference");
      }
      return response.data as ComparisonCaseOutput;
    },
  });

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        requestAnimationFrame(() => triggerRef.current?.focus());
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, triggerRef]);

  const close = () => {
    onClose();
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onMouseDown={(event) => {
      if (event.target === event.currentTarget) close();
    }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="comparison-case-title"
        className="h-full w-full max-w-3xl space-y-4 overflow-y-auto bg-surface p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="comparison-case-title" className="text-base font-bold">Case 双侧结果</h2>
            <p className="mt-1 text-xs text-muted-foreground">{datasetItemId} · Snapshot {snapshotId}</p>
          </div>
          <Button ref={closeButtonRef} variant="secondary" className="text-xs" onClick={close}>关闭</Button>
        </div>
        {query.isPending && <p role="status" className="text-sm text-muted-foreground">正在读取冻结 Observation…</p>}
        {query.error && <div role="alert" className="space-y-2 text-sm text-rose-700">
          <p>读取 Case 详情失败：{formatApiError(query.error)}</p>
          <Button variant="secondary" className="text-xs" onClick={() => query.refetch()} disabled={query.isFetching}>重试</Button>
        </div>}
        {query.data && <>
          <p className="text-sm">{query.data.classification} · {query.data.reason ?? "—"}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <OutputPanel title="Baseline" side={query.data.baseline} />
            <OutputPanel title="Candidate" side={query.data.candidate} />
          </div>
          {(query.data.baseline.retryable || query.data.candidate.retryable) && (
            <Button variant="secondary" className="text-xs" onClick={() => query.refetch()} disabled={query.isFetching}>重试读取不可用输出</Button>
          )}
        </>}
      </div>
    </div>
  );
};
