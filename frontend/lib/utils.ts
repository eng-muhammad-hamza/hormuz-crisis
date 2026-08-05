export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

export function formatFuel(tons: number): string {
  return `${Math.round(tons)}t`;
}

export function formatETA(iso: string | null): string {
  if (!iso) return 'N/A';
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return 'Overdue';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 48) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })} ${d.toLocaleTimeString('en-US', { hour12: false })}`;
}

export function interpolatePosition(
  prev: [number, number],
  current: [number, number],
  alpha: number // 0-1
): [number, number] {
  return [
    prev[0] + (current[0] - prev[0]) * alpha,
    prev[1] + (current[1] - prev[1]) * alpha,
  ];
}

export function headingToCardinal(heading: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(heading / 22.5) % 16];
}

export function fuelPercent(fuel: number, capacity: number): number {
  return Math.min(100, Math.max(0, (fuel / capacity) * 100));
}

export function fuelColor(percent: number): string {
  if (percent > 60) return '#00c853';
  if (percent > 30) return '#ff9500';
  return '#ff3b3b';
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'var(--color-danger)';
    case 'warning': return 'var(--color-warning)';
    case 'info': return 'var(--color-accent)';
    case 'success': return 'var(--color-success)';
    default: return 'var(--color-ink-3)';
  }
}

export function generateRadarPoints(n: number = 60): { x: number; y: number; intensity: number }[] {
  return Array.from({ length: n }, () => ({
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1,
    intensity: Math.random(),
  }));
}
