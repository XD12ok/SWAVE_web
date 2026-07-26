"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const url = charmFilter
          ? `/api/inventory/logs?charmId=${charmFilter}`
          : "/api/inventory/logs";
        const res = await fetch(url);
        const data = await res.json();
        setLogs(data.logs || []);
      } catch (err) {
        console.error("Failed to load inventory logs:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [charmFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Inventory Logs</h1>
        <input
          placeholder="Filter by Charm ID"
          value={charmFilter}
          onChange={(e) => setCharmFilter(e.target.value)}
          className="h-10 w-64 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-sm outline-none placeholder:text-neutral-500 focus:border-white/30"
        />
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
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
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
