"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="fatal-error">
      <span><AlertTriangle size={24} /></span>
      <h1>工作台暂时无法显示</h1>
      <p>你的浏览器数据没有被删除。可以重新加载当前界面。</p>
      <button onClick={reset}><RotateCcw size={15} /> 重新加载</button>
    </main>
  );
}
