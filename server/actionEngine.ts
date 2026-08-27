export type CrmActionSignal = {
  kind: "open_opportunity" | "stale_opportunity" | "webinar_lead" | "follow_up_lead";
  title: string;
  description: string;
  signal: string;
  urgency: number;
  estimatedValue: number;
  conversionLikelihood: number;
  contactIds: string[];
  contactUrls: string[];
};

export type GeneratedBusinessAction = CrmActionSignal & { priorityScore: number; recommendedAction: string };

export function scoreActionSignal(signal: Pick<CrmActionSignal, "urgency" | "estimatedValue" | "conversionLikelihood">) {
  const revenueBand = signal.estimatedValue >= 20000 ? 3 : signal.estimatedValue >= 5000 ? 2 : 1;
  return Math.max(1, signal.urgency) * revenueBand * Math.max(1, signal.conversionLikelihood);
}

export function generateNextActions(signals: CrmActionSignal[]): GeneratedBusinessAction[] {
  return signals
    .map(signal => ({
      ...signal,
      priorityScore: scoreActionSignal(signal),
      recommendedAction: signal.title,
    }))
    .sort((left, right) => right.priorityScore - left.priorityScore || right.estimatedValue - left.estimatedValue)
    .slice(0, 2);
}

function asRecords(value: unknown) {
  return Array.isArray(value) ? value.filter(item => item && typeof item === "object") as Record<string, unknown>[] : [];
}

function monetaryValue(value: Record<string, unknown>) {
  const candidate = value.monetaryValue ?? value.value ?? value.amount ?? 0;
  const parsed = typeof candidate === "number" ? candidate : Number(candidate);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function timestamp(value: Record<string, unknown>) {
  const candidate = value.updatedAt ?? value.lastStatusChangeAt ?? value.dateUpdated ?? value.createdAt ?? value.dateAdded;
  if (typeof candidate === "number") return candidate;
  return typeof candidate === "string" ? Date.parse(candidate) || 0 : 0;
}

function contactRef(value: Record<string, unknown>, locationId?: string) {
  const id = String(value.contactId ?? value.id ?? "").trim();
  const suppliedUrl = String(value.contactUrl ?? value.url ?? "").trim();
  const url = suppliedUrl || (id && locationId ? `https://app.gohighlevel.com/v2/location/${encodeURIComponent(locationId)}/contacts/detail/${encodeURIComponent(id)}` : "");
  return { id, url };
}

export function buildHighLevelActionSignals(
  contactsPayload: Record<string, unknown>,
  opportunitiesPayload: Record<string, unknown>,
  now: number,
  locationId?: string,
): CrmActionSignal[] {
  const contacts = asRecords(contactsPayload.contacts);
  const opportunities = asRecords(opportunitiesPayload.opportunities);
  const staleAfter = 14 * 24 * 60 * 60 * 1000;
  const open = opportunities.filter(item => !["won", "lost", "abandoned", "closed"].includes(String(item.status ?? "open").toLowerCase()));
  const stale = open.filter(item => timestamp(item) > 0 && now - timestamp(item) > staleAfter);
  const webinar = contacts.filter(item => JSON.stringify(item.tags ?? "").toLowerCase().includes("webinar"));
  const recentlyAdded = contacts.filter(item => timestamp(item) > 0 && now - timestamp(item) <= 3 * 24 * 60 * 60 * 1000);
  const followUpNeeded = contacts.filter(item => timestamp(item) > 0 && now - timestamp(item) > 7 * 24 * 60 * 60 * 1000 && !JSON.stringify(item.tags ?? "").toLowerCase().includes("webinar"));
  const contactFor = (items: Record<string, unknown>[]) => items.map(item => contactRef(item, locationId));
  const summarize = (items: Record<string, unknown>[]) => ({
    ids: contactFor(items).map(item => item.id).filter(Boolean).slice(0, 8),
    urls: contactFor(items).map(item => item.url).filter(Boolean).slice(0, 8),
    value: items.reduce((sum, item) => sum + monetaryValue(item), 0),
  });
  const signals: CrmActionSignal[] = [];
  if (open.length) {
    const summary = summarize(open);
    signals.push({
      kind: "open_opportunity",
      title: `Follow up with ${Math.min(open.length, 8)} open opportunity${open.length === 1 ? "" : "ies"}`,
      description: "These open opportunities are the closest verified path to revenue today.",
      signal: `${open.length} open opportunity records with $${summary.value.toLocaleString()} in reported value.`,
      urgency: 2,
      estimatedValue: summary.value,
      conversionLikelihood: 3,
      contactIds: summary.ids,
      contactUrls: summary.urls,
    });
  }
  if (stale.length) {
    const summary = summarize(stale);
    signals.push({
      kind: "stale_opportunity",
      title: `Review ${Math.min(stale.length, 8)} stalled opportunit${stale.length === 1 ? "y" : "ies"}`,
      description: "These opportunities have had no recent recorded update and need a deliberate next step or dismissal.",
      signal: `${stale.length} open opportunities are stale for more than 14 days.`,
      urgency: 3,
      estimatedValue: summary.value,
      conversionLikelihood: 2,
      contactIds: summary.ids,
      contactUrls: summary.urls,
    });
  }
  if (webinar.length) {
    const summary = summarize(webinar);
    signals.push({
      kind: "webinar_lead",
      title: `Follow up with ${Math.min(webinar.length, 8)} webinar lead${webinar.length === 1 ? "" : "s"}`,
      description: "These contacts are explicitly tagged as webinar leads and warrant a concise relevance-first follow-up.",
      signal: `${webinar.length} contacts carry an explicit webinar tag.`,
      urgency: 3,
      estimatedValue: summary.value,
      conversionLikelihood: 2,
      contactIds: summary.ids,
      contactUrls: summary.urls,
    });
  }
  if (followUpNeeded.length) {
    const summary = summarize(followUpNeeded);
    signals.push({
      kind: "follow_up_lead",
      title: `Follow up with ${Math.min(followUpNeeded.length, 8)} lead${followUpNeeded.length === 1 ? "" : "s"} needing attention`,
      description: "These contacts have no recent recorded update and should be advanced or released intentionally.",
      signal: `${followUpNeeded.length} contacts have had no recorded update in more than 7 days.`,
      urgency: 2,
      estimatedValue: summary.value,
      conversionLikelihood: 2,
      contactIds: summary.ids,
      contactUrls: summary.urls,
    });
  }
  if (recentlyAdded.length) {
    const summary = summarize(recentlyAdded);
    signals.push({
      kind: "follow_up_lead",
      title: `Contact ${Math.min(recentlyAdded.length, 8)} new lead${recentlyAdded.length === 1 ? "" : "s"}`,
      description: "These are recently created contacts and are most valuable while their interest is current.",
      signal: `${recentlyAdded.length} contacts were added in the last 3 days.`,
      urgency: 3,
      estimatedValue: summary.value,
      conversionLikelihood: 2,
      contactIds: summary.ids,
      contactUrls: summary.urls,
    });
  }
  return signals;
}
