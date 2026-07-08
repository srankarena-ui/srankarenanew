"use client";

import { useEffect, useRef, useId } from "react";

declare global {
  interface Window {
    hcaptcha?: {
      render: (container: string, opts: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_ID = "hcaptcha-script";
const SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!;

function loadScript(): Promise<void> {
  if (window.hcaptcha) return Promise.resolve();
  return new Promise((resolve) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://js.hcaptcha.com/1/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

// Visible hCaptcha checkbox widget. No React wrapper package — hCaptcha's
// vanilla script + explicit render is enough for a single checkbox per form.
export function HCaptchaWidget({ onVerify }: { onVerify: (token: string | null) => void }) {
  const containerId = `hcaptcha-${useId().replace(/:/g, "")}`;
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !window.hcaptcha) return;
      widgetId.current = window.hcaptcha.render(containerId, {
        sitekey: SITE_KEY,
        callback: (token: string) => onVerify(token),
        "expired-callback": () => onVerify(null),
        "error-callback": () => onVerify(null),
      });
    });
    return () => {
      cancelled = true;
      if (widgetId.current && window.hcaptcha) window.hcaptcha.remove(widgetId.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div id={containerId} />;
}
