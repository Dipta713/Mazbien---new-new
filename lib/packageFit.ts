export type FitRule = {
    rule_key: string; package_slug: string; match_all: string[]; match_any: string[];
    dept_min: number | null; dept_max: number | null; points: number; reason: string;
  };
  type PkgRef = { id: string; slug: string; name: string; display_order: number };
  
  // Adds up points per package. Highest score wins. A tie goes to the cheaper package.
  export function suggestPackage(rules: FitRule[], keys: Set<string>, deptCount: number, packages: PkgRef[]) {
    const score = new Map<string, { pts: number; reasons: { pts: number; text: string }[] }>();
    for (const r of rules) {
      if (r.dept_min !== null && deptCount < r.dept_min) continue;
      if (r.dept_max !== null && deptCount > r.dept_max) continue;
      if (!(r.match_all ?? []).every((k) => keys.has(k))) continue;
      const any = r.match_any ?? [];
      if (any.length > 0 && !any.some((k) => keys.has(k))) continue;
      const s = score.get(r.package_slug) ?? { pts: 0, reasons: [] };
      s.pts += r.points;
      s.reasons.push({ pts: r.points, text: r.reason });
      score.set(r.package_slug, s);
    }
    let best: PkgRef | null = null;
    let bestPts = 0;
    for (const p of [...packages].sort((a, b) => a.display_order - b.display_order)) {
      const pts = score.get(p.slug)?.pts ?? 0;
      if (pts > bestPts) { best = p; bestPts = pts; }
    }
    if (!best) return null;
    const reasons = score.get(best.slug)!.reasons.sort((a, b) => b.pts - a.pts).slice(0, 3).map((r) => r.text);
    return { pkg: best, points: bestPts, reasons };
  }