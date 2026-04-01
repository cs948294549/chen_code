// Minimal cron expression parsing and next-run calculation.
//
// Supports the standard 5-field cron subset:
//   minute hour day-of-month month day-of-week
//
// Field syntax: wildcard, N, step (star-slash-N), range (N-M), list (N,M,...).

function parseCronExpression(expr) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const FIELD_RANGES = [
    { min: 0, max: 59 }, // minute
    { min: 0, max: 23 }, // hour
    { min: 1, max: 31 }, // dayOfMonth
    { min: 1, max: 12 }, // month
    { min: 0, max: 6 }, // dayOfWeek (0=Sunday; 7 accepted as Sunday alias)
  ];

  function expandField(field, range) {
    const { min, max } = range;
    const out = new Set();

    for (const part of field.split(',')) {
      // wildcard or star-slash-N
      const stepMatch = part.match(/^\*(?:\/(\d+))?$/);
      if (stepMatch) {
        const step = stepMatch[1] ? parseInt(stepMatch[1], 10) : 1;
        if (step < 1) return null;
        for (let i = min; i <= max; i += step) out.add(i);
        continue;
      }

      // N-M or N-M/S
      const rangeMatch = part.match(/^(\d+)-(\d+)(?:\/(\d+))?$/);
      if (rangeMatch) {
        const lo = parseInt(rangeMatch[1], 10);
        const hi = parseInt(rangeMatch[2], 10);
        const step = rangeMatch[3] ? parseInt(rangeMatch[3], 10) : 1;
        // dayOfWeek: accept 7 as Sunday alias in ranges (e.g. 5-7 = Fri,Sat,Sun → [5,6,0])
        const isDow = min === 0 && max === 6;
        const effMax = isDow ? 7 : max;
        if (lo > hi || step < 1 || lo < min || hi > effMax) return null;
        for (let i = lo; i <= hi; i += step) {
          out.add(isDow && i === 7 ? 0 : i);
        }
        continue;
      }

      // plain N
      const singleMatch = part.match(/^\d+$/);
      if (singleMatch) {
        let n = parseInt(part, 10);
        // dayOfWeek: accept 7 as Sunday alias → 0
        if (min === 0 && max === 6 && n === 7) n = 0;
        if (n < min || n > max) return null;
        out.add(n);
        continue;
      }

      return null;
    }

    if (out.size === 0) return null;
    return Array.from(out).sort((a, b) => a - b);
  }

  const expanded = [];
  for (let i = 0; i < 5; i++) {
    const result = expandField(parts[i], FIELD_RANGES[i]);
    if (!result) return null;
    expanded.push(result);
  }

  return {
    minute: expanded[0],
    hour: expanded[1],
    dayOfMonth: expanded[2],
    month: expanded[3],
    dayOfWeek: expanded[4],
  };
}

function computeNextCronRun(fields, from) {
  const minuteSet = new Set(fields.minute);
  const hourSet = new Set(fields.hour);
  const domSet = new Set(fields.dayOfMonth);
  const monthSet = new Set(fields.month);
  const dowSet = new Set(fields.dayOfWeek);

  // Is the field wildcarded (full range)?
  const domWild = fields.dayOfMonth.length === 31;
  const dowWild = fields.dayOfWeek.length === 7;

  // Round up to the next whole minute (strictly after `from`)
  const t = new Date(from.getTime());
  t.setSeconds(0, 0);
  t.setMinutes(t.getMinutes() + 1);

  const maxIter = 366 * 24 * 60;
  for (let i = 0; i < maxIter; i++) {
    const month = t.getMonth() + 1;
    if (!monthSet.has(month)) {
      // Jump to start of next month
      t.setMonth(t.getMonth() + 1, 1);
      t.setHours(0, 0, 0, 0);
      continue;
    }

    const dom = t.getDate();
    const dow = t.getDay();
    // When both dom/dow are constrained, either match is sufficient (OR semantics)
    const dayMatches = 
      domWild && dowWild
        ? true
        : domWild
          ? dowSet.has(dow)
          : dowWild
            ? domSet.has(dom)
            : domSet.has(dom) || dowSet.has(dow);

    if (!dayMatches) {
      // Jump to start of next day
      t.setDate(t.getDate() + 1);
      t.setHours(0, 0, 0, 0);
      continue;
    }

    if (!hourSet.has(t.getHours())) {
      t.setHours(t.getHours() + 1, 0, 0, 0);
      continue;
    }

    if (!minuteSet.has(t.getMinutes())) {
      t.setMinutes(t.getMinutes() + 1);
      continue;
    }

    return t;
  }

  return null;
}

function cronToHuman(cron) {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const DAY_NAMES = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  function formatLocalTime(minute, hour) {
    const d = new Date(2000, 0, 1, hour, minute);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  // Every N minutes: step/N * * * *
  const everyMinMatch = minute.match(/^\*(?:\/(\d+))?$/);
  if (everyMinMatch && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const n = parseInt(everyMinMatch[1], 10) || 1;
    return n === 1 ? 'Every minute' : `Every ${n} minutes`;
  }

  // Every hour: 0 * * * *
  if (minute.match(/^\d+$/) && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const m = parseInt(minute, 10);
    if (m === 0) return 'Every hour';
    return `Every hour at :${m.toString().padStart(2, '0')}`;
  }

  // Daily at specific time: M H * * *
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const m = parseInt(minute, 10);
    const h = parseInt(hour, 10);
    return `Every day at ${formatLocalTime(m, h)}`;
  }

  // Specific day of week: M H * * D
  if (dayOfMonth === '*' && month === '*' && dayOfWeek.match(/^\d$/)) {
    const dayIndex = parseInt(dayOfWeek, 10) % 7; // normalize 7 (Sunday alias) -> 0
    const dayName = DAY_NAMES[dayIndex];
    const m = parseInt(minute, 10);
    const h = parseInt(hour, 10);
    if (dayName) return `Every ${dayName} at ${formatLocalTime(m, h)}`;
  }

  // Weekdays: M H * * 1-5
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '1-5') {
    const m = parseInt(minute, 10);
    const h = parseInt(hour, 10);
    return `Weekdays at ${formatLocalTime(m, h)}`;
  }

  return cron;
}

export {
  parseCronExpression,
  computeNextCronRun,
  cronToHuman
};
