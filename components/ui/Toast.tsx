"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  onClose: () => void;
}

export default function Toast({ message, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onClose, 400);
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-[999] -translate-x-1/2 transition-all duration-400 ease-out ${
        visible && !exiting
          ? "translate-y-0 opacity-100"
          : "translate-y-6 opacity-0"
      }`}
    >
      <div className="flex items-center gap-3 bg-gradient-to-r from-[#9b111e] to-[#6b0c14] text-white px-5 py-3 rounded-2xl shadow-[0_8px_32px_rgba(155,17,30,0.4)] backdrop-blur-sm border border-white/10">
        <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <span className="text-sm font-semibold tracking-wide whitespace-nowrap">{message}</span>
        <button
          onClick={() => {
            setExiting(true);
            setTimeout(onClose, 400);
          }}
          className="ml-2 text-white/60 hover:text-white transition-colors shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

let toastId = 0;
let toastRoot: HTMLDivElement | null = null;

function getRoot() {
  if (toastRoot) return toastRoot;
  toastRoot = document.createElement("div");
  document.body.appendChild(toastRoot);
  return toastRoot;
}

export function showToast(message: string) {
  const root = getRoot();
  const id = ++toastId;

  const wrapper = document.createElement("div");
  wrapper.dataset.toastId = String(id);
  root.appendChild(wrapper);

  function unmount() {
    wrapper.remove();
    if (root && root.children.length === 0) {
      root.remove();
      toastRoot = null;
    }
  }

  // Dynamic import to avoid SSR issues
  import("react-dom/client").then(({ createRoot }) => {
    const r = createRoot(wrapper);
    r.render(<Toast message={message} onClose={() => { r.unmount(); unmount(); }} />);
  });
}
