import { LABEL_MAX, type ActionItem, type Focus } from '@tend/core';

/** Matches the send-week cap so a saved goal still fits the week email. */
export const MAX_GOAL_ACTIONS = 50;

export interface GoalDraftAction {
  id: string;
  label: string;
}

export interface GoalDraft {
  title: string;
  actions: GoalDraftAction[];
}

export function draftFromFocus(goal: Focus): GoalDraft {
  return {
    title: goal.title,
    actions: goal.actions.map((action) => ({ id: action.id, label: action.label })),
  };
}

export function goalNameError(title: string): string | null {
  const name = title.trim();
  if (!name) return 'Add a goal name.';
  if (name.length > LABEL_MAX) return 'Keep the goal name under 200 characters.';
  return null;
}

export function actionNameError(label: string): string | null {
  const name = label.trim();
  if (!name) return 'Add an action name.';
  if (name.length > LABEL_MAX) return 'Keep the action name under 200 characters.';
  return null;
}

/** An action already chosen or given a time on this week. */
export function actionIsOnWeek(action: ActionItem | undefined): boolean {
  return Boolean(action && (action.checked || action.slots.length > 0));
}

export function focusForAction(focuses: readonly Focus[], actionId: string): Focus | undefined {
  return focuses.find((focus) => focus.actions.some((action) => action.id === actionId));
}

export function replaceFocus(focuses: readonly Focus[], next: Focus): Focus[] {
  return focuses.map((focus) => (focus.id === next.id ? next : focus));
}

export function isGoalDraftDirty(goal: Focus, draft: GoalDraft, pendingAdd = ''): boolean {
  if (pendingAdd.trim()) return true;
  if (draft.title.trim() !== goal.title) return true;
  if (draft.actions.length !== goal.actions.length) return true;
  return draft.actions.some((action, index) => {
    const current = goal.actions[index];
    return !current || current.id !== action.id || current.label !== action.label.trim();
  });
}

export function goalDraftError(draft: GoalDraft, pendingAdd = ''): string | null {
  const titleError = goalNameError(draft.title);
  if (titleError) return titleError;
  if (draft.actions.length > MAX_GOAL_ACTIONS) return "That's a lot of actions for one goal.";
  for (const action of draft.actions) {
    const error = actionNameError(action.label);
    if (error) return error;
  }
  const pending = pendingAdd.trim();
  if (pending && draft.actions.length >= MAX_GOAL_ACTIONS) return "That's a lot of actions for one goal.";
  if (pending) return actionNameError(pending);
  return null;
}

/**
 * Applies a draft onto the existing goal. Surviving actions keep their id,
 * checked state, slots, and lane order. Actions added in the editor join the
 * week with no day, so they land in Unscheduled.
 */
export function applyGoalDraft(goal: Focus, draft: GoalDraft): Focus {
  const existing = new Map(goal.actions.map((action) => [action.id, action]));
  return {
    id: goal.id,
    title: draft.title.trim(),
    actions: draft.actions.map((action) => {
      const previous = existing.get(action.id);
      const label = action.label.trim();
      if (!previous) return { id: action.id, label, checked: true, slots: [] };
      if (previous.label === label) return previous;
      return { ...previous, label };
    }),
  };
}
