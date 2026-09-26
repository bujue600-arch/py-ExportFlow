/**
 * SSE 实时更新接入（bullet ①② 的 React 落点）。
 * 页面挂载即启动连接状态机；卸载/页面隐藏自动断连。返回当前连接相位供 UI 展示。
 */

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "@/api/client";
import { jobsKeys } from "../keys";
import { applyJobEventToCaches } from "../lib/jobVersion";
import { createSseConnection, type SsePhase } from "../lib/sseConnection";

export function useJobUpdates(): SsePhase {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<SsePhase>("idle");

  useEffect(() => {
    const connection = createSseConnection({
      url: `${API_BASE_URL}/api/events`,
      onEvent: (ev) => applyJobEventToCaches(queryClient, ev),
      // snapshot：全量校准走 HTTP（「SSE 仅通知、HTTP 校准」的最终一致策略）
      onSnapshot: () => {
        void queryClient.invalidateQueries({ queryKey: jobsKeys.root });
      },
      // 降级轮询的数据源：refetch 当前在订阅的任务查询（仅活跃任务在页面上）
      pollActive: () =>
        queryClient.refetchQueries({
          queryKey: jobsKeys.root,
          type: "active",
        }) as Promise<unknown>,
      onPhaseChange: setPhase,
    });
    connection.start();
    return () => connection.stop();
  }, [queryClient]);

  return phase;
}

export const SSE_PHASE_TEXT: Record<SsePhase, string> = {
  idle: "未连接",
  connecting: "连接中…",
  connected: "实时",
  degraded: "轮询降级",
};
