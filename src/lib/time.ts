export const APP_TIMEZONE = "Australia/Sydney";

export function formatSydney(utcIso: string | null): string {
  if (!utcIso) return "Rolling / TBC";
  const date = new Date(utcIso);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(date);
}

export function daysUntil(utcIso: string | null, now = new Date()): number | null {
  if (!utcIso) return null;
  const deadline = new Date(utcIso);
  if (Number.isNaN(deadline.getTime())) return null;
  return Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}
