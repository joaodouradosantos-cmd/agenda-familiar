"use client";

import { useEffect } from "react";

/**
 * Regista o Service Worker (PWA) no lado do cliente.
 *
 * - Não corre no servidor.
 * - Se o SW já estiver registado, o browser gere a actualização.
 */
export default function SwRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.error("ServiceWorker registration failed:", err));
    };

    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
