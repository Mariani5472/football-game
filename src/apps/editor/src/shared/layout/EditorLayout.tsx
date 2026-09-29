import type { ReactNode } from "react";

import type { EditorRoute } from "../../app/routes";
import { EditorHeader } from "./EditorHeader";
import { EditorSidebar } from "./EditorSidebar";

interface EditorLayoutProps {
  activeRoute: EditorRoute;
  onNavigate: (route: EditorRoute) => void;
  children: ReactNode;
}

export function EditorLayout({
  activeRoute,
  onNavigate,
  children,
}: EditorLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[#0b0f14] text-slate-200">
      <EditorSidebar
        activeRoute={activeRoute}
        onNavigate={onNavigate}
      />

      <main className="min-w-0 flex-1">
        <EditorHeader
          activeRoute={activeRoute}
        />

        <div className="min-h-[calc(100vh-4rem)] px-8 py-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}