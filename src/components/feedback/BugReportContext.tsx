'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { BugReportAnnouncement } from '@/components/feedback/BugReportAnnouncement';
import { BugReportDialog } from '@/components/feedback/BugReportDialog';
import { useAuth } from '@/lib/auth';
import type { BugReportCategory } from '@/lib/bugReport';
import type { SafeErrorLogEntry } from '@/lib/errorSanitizer';

export interface OpenBugReportOptions {
  lessonId?: string | null;
  category?: BugReportCategory;
  diagnostics?: SafeErrorLogEntry[];
}

interface BugReportContextValue {
  openBugReport: (options?: OpenBugReportOptions) => void;
  isOpen: boolean;
}

const BugReportContext = createContext<BugReportContextValue>({
  openBugReport: () => {},
  isOpen: false,
});

export function BugReportProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [options, setOptions] = useState<OpenBugReportOptions>({});

  const openBugReport = useCallback((nextOptions?: OpenBugReportOptions) => {
    setOptions(nextOptions ?? {});
    setSessionKey((k) => k + 1);
    setOpen(true);
  }, []);

  return (
    <BugReportContext.Provider value={{ openBugReport, isOpen: open }}>
      {children}
      <BugReportAnnouncement onOpenBugReport={() => openBugReport()} />
      <BugReportDialog
        key={sessionKey}
        open={open}
        onOpenChange={setOpen}
        defaultLessonId={options.lessonId}
        defaultCategory={options.category}
        diagnostics={options.diagnostics}
        defaultEmail={user?.email ?? null}
      />
    </BugReportContext.Provider>
  );
}

export function useBugReport() {
  return useContext(BugReportContext);
}
