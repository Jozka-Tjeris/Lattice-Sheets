export const LIMITS = {
  TEXT: 50,
  NUM: 15,
  ROW: 1000,
  COL: 20,
  VIEW: 5,
  TABLE: 5,
  BASE: 2,
  CELL: 20_000,
} as const;

export type LimitKey = keyof typeof LIMITS;
export type LimitValue = typeof LIMITS[LimitKey];

// human readable labels
export const LIMIT_LABELS: Record<LimitKey, string> = {
  TEXT: "text characters",
  NUM: "numeric characters",
  ROW: "rows",
  COL: "columns",
  VIEW: "views",
  TABLE: "tables",
  BASE: "bases",
  CELL: "cells",
};

export function warnLimitReached(limit: LimitKey) {
  const value = LIMITS[limit];
  const label = LIMIT_LABELS[limit];
  alert(`The maximum number of ${label} (max: ${value}) has been reached. Remove some before trying to add more.`);
}
