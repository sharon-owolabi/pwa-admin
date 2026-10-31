"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { isNotFound, errorMessage } from "@/shared/api/errors";
import { useRun } from "@/shared/api/hooks";
import { ADMIN_PERMISSION } from "@/shared/api/permissions";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PageHeader } from "@/shared/components/page-header";
import { RowsSkeleton } from "@/shared/components/skeleton";
import { StatusBadge } from "@/shared/components/status-badge";
import { linkClass, outlineButton } from "@/shared/components/styles";
import { Recorded, TimeCell } from "@/shared/components/time-cell";
import { formatDuration } from "@/shared/lib/dates";
import { gatewayLabel, isLaunchGateway } from "@/shared/lib/gateways";
import { formatCount } from "@/shared/lib/number";
import { titleCase } from "@/shared/lib/status";
import { RequirePermission } from "@/modules/auth/components/require-permission";
import { errorCategoryLabel } from "../lib/labels";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-ink-2">{children}</dd>
    </div>
  );
}

function RunDetail({ id }: { id: string }) {
  const { data: run, isPending, isError, error, refetch } = useRun(id);

  if (isPending) {
    return (
      <div className="rounded-card border border-line bg-card px-5 shadow-card">
        <RowsSkeleton label="Loading the sync run…" rows={9} />
      </div>
    );
  }
  if (isError) {
    return isNotFound(error) ? (
      <NoticePanel
        title="This sync run isn't here"
        action={
          <Link href="/sync-runs" className={outlineButton}>
            Back to sync runs
          </Link>
        }
      >
        It may have been removed, or the link is wrong.
      </NoticePanel>
    ) : (
      <NoticePanel
        title="Could not load this sync run"
        action={
          <button type="button" className={outlineButton} onClick={() => void refetch()}>
            Try again
          </button>
        }
      >
        {errorMessage(error)}
      </NoticePanel>
    );
  }
  if (!isLaunchGateway(run.gateway)) {
    return <NoticePanel title="This sync run isn't available">It belongs to a gateway this console doesn&apos;t cover.</NoticePanel>;
  }

  const duration = formatDuration(run.startedAt, run.finishedAt);
  return (
    <section className="rounded-card border border-line bg-card px-5 shadow-card" aria-label="Sync run details">
      <dl className="divide-y divide-line text-sm">
        <Row label="Status">
          <StatusBadge status={run.status} />
        </Row>
        <Row label="Gateway">{gatewayLabel(run.gateway)}</Row>
        <Row label="Merchant">
          <Link href={`/merchants/${run.workspaceId}`} className={linkClass}>
            <code className="font-mono text-xs">{run.workspaceId}</code>
          </Link>
        </Row>
        <Row label="Connection">
          <code className="font-mono text-xs">{run.connectionId}</code>
        </Row>
        <Row label="Resource and mode">
          {titleCase(run.resource)} · {titleCase(run.mode)}
        </Row>
        <Row label="Records fetched">
          <span className="tabular-nums">{formatCount(run.recordsFetched)}</span>
        </Row>
        <Row label="New records">
          <span className="tabular-nums">
            <Recorded value={run.recordsNew === null ? null : formatCount(run.recordsNew)} />
          </span>
        </Row>
        <Row label="Pages">
          <span className="tabular-nums">{formatCount(run.pages)}</span>
        </Row>
        <Row label="Connector version">
          <Recorded value={run.connectorVersion} />
        </Row>
        <Row label="Started">
          <TimeCell value={run.startedAt} absolute />
        </Row>
        <Row label="Finished">{run.finishedAt ? <TimeCell value={run.finishedAt} absolute /> : "Still running"}</Row>
        <Row label="Duration">{duration ?? (run.finishedAt ? <Recorded value={null} /> : "Still running")}</Row>
        {run.status === "failed" ? (
          <Row label="Error category">{errorCategoryLabel(run.errorCategory)}</Row>
        ) : null}
      </dl>
    </section>
  );
}

export function RunDetailPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  return (
    <>
      <p className="mb-4 text-sm">
        <Link href="/sync-runs" className={linkClass}>
          ← Sync runs
        </Link>
      </p>
      <PageHeader title="Sync run" description={<code className="font-mono text-xs">{id}</code>} />
      <RequirePermission permission={ADMIN_PERMISSION.RUNS_VIEW}>
        <RunDetail id={id} />
      </RequirePermission>
    </>
  );
}
