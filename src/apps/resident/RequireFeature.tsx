import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { AccessReason } from '../../domain/access';
import type { ResidentFeature } from '../../domain/types';
import { useAccess } from '../../store/hooks';

/** Sends the resident to the Locked screen unless the feature is open (or blocked only for an allowed reason). */
export function RequireFeature({ f, allow = [], children }: { f: ResidentFeature; allow?: AccessReason[]; children: ReactNode }) {
  const access = useAccess()(f);
  if (access.ok || allow.includes(access.reason)) return <>{children}</>;
  return <Navigate to={`/app/locked/${f}`} replace state={{ reason: access.reason }} />;
}
