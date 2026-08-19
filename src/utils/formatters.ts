export function formatCurrency(amount: number | null | undefined): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0 F CFA';
  }
  const formatted = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} F CFA`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0,00 %';
  }
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function getDaysDifference(targetDateStr: string): number {
  const target = new Date(targetDateStr);
  const today = new Date();
  // reset hours to compare calendar days
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
