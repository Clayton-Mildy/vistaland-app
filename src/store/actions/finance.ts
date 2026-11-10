import type { Expense } from '../../domain/types';
import { ActionError } from '../errors';
import { nextId } from '../ids';
import type { Action } from '../store';

export const addExpense: Action<Omit<Expense, 'id' | 'source'>> = (d, p) => {
  if (!(p.amount > 0)) throw new ActionError('error.amountRequired');
  d.expenses.push({ ...p, id: nextId(d, 'EXP'), source: 'manual' });
};
