import { produce } from 'immer';
import type { AppData } from '../../domain/types';
import type { Action } from '../store';

/** Runs an action against plain data, outside React and storage (for tests). */
export const apply = <P,>(d: AppData, a: Action<P>, p: P): AppData => produce(d, (draft) => { a(draft as AppData, p); });
