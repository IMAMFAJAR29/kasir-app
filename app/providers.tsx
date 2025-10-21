"use client";

import { ReactNode } from "react";
import { SessionProvider, SessionProviderProps } from "next-auth/react";

interface ProvidersProps {
  children: ReactNode;
  // opsional: kalau mau pass session
  session?: SessionProviderProps["session"];
}

export default function Providers({ children, session }: ProvidersProps) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
