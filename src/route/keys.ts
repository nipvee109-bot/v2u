/** Stable key for a student's answer to one route checklist item. */
export function checklistKey(requirementId: string, item: string): string {
  return `${requirementId}::${item}`;
}
