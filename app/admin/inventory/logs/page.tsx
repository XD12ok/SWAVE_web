"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtime } from "@/hooks/use-realtime";
import { EventChannels } from "@/lib/events";

interface LogEntry {
  _id: string;
  charmId: { _id: string; name: string; slug: string } | null;
  before: number;
  after: number;
  change: number;
  reason: string;
  reference?: string;
  createdAt: string;
}

const REASON_COLORS: Record<string, string> = {
  ORDER: "bg-blue-500/20 text-blue-400",
  RESTOCK: "bg-green-500/20 text-green-400",
  MANUAL: "bg-purple-500/20 text-purple-400",
  EXPIRED: "bg-yellow-500/20 text-yellow-400",
  ADJUSTMENT: "bg-orange-500/20 text-orange-400",
};

export default function InventoryLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [charmFilter, setCharmFilter] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const url = charmFilter
        ? `/api/inventory/logs?charmId=${charmFilter}`
        : "/api/inventory/logs";
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error("Failed to load inventory logs:", err);
    } finally {
      setLoading(false);
    }
  }, [charmFilter]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const silentReload = useCallback(() => {
    void load({ silent: true });
  }, [load]);

  useRealtime(
    [EventChannels.CHARM_UPDATED],
    {
      intervalMs: 10000,
      onEvent: silentReload,
      onPoll: silentReload,
    },
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold">Inventory Logs</h1>
        <div className="flex gap-3 items-center">
          <button
            onClick={handleRefresh}
            aria-label="Refresh"
            title="Refresh"
            className="h-10 w-10 shrink-0 rounded-full border border-white/20 flex items-center justify-center text-neutral-400 hover:text-white hover:border-white/40 transition-colors"
          >
            {refreshing ? (
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <polyline points="21 3 21 9 15 9" />
              </svg>
            )}
          </button>
          <input
            placeholder="Filter by Charm ID"
            value={charmFilter}
            onChange={(e) => setCharmFilter(e.target.value)}
            className="h-10 w-full md:w-64 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-sm outline-none placeholder:text-neutral-500 focus:border-white/30"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-24 text-neutral-500">
          <p className="text-lg">No inventory logs yet</p>
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-white/10 text-neutral-500">
                <th className="text-left px-6 py-4 font-medium">Charm</th>
                <th className="text-right px-6 py-4 font-medium">Before</th>
                <th className="text-right px-6 py-4 font-medium">After</th>
                <th className="text-right px-6 py-4 font-medium">Change</th>
                <th className="text-left px-6 py-4 font-medium">Reason</th>
                <th className="text-left px-6 py-4 font-medium">Reference</th>
                <th className="text-right px-6 py-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log._id}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-4">
                    {log.charmId?.name ?? "Deleted Charm"}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm">
                    {log.before}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm">
                    {log.after}
                  </td>
                  <td
                    className={`px-6 py-4 text-right font-mono text-sm ${
                      log.change < 0 ? "text-red-400" : "text-green-400"
                    }`}
                  >
                    {log.change > 0 ? "+" : ""}
                    {log.change}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        REASON_COLORS[log.reason] ?? "bg-neutral-500/20 text-neutral-400"
                      }`}
                    >
                      {log.reason}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-neutral-500 font-mono">
                    {log.reference ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-right text-xs text-neutral-400">
                    {new Date(log.createdAt).toLocaleString("id-ID")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
