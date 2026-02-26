"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Entry point obrigatório do App Router.
 * Redirecciona para /tarefas.
 */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/tarefas");
  }, [router]);

  return null;
}
