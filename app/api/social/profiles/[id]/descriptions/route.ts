import { NextResponse } from "next/server";
import { getProfileDescription, listProfiles, saveProfileDescription, saveProfilePreferences, type ProfileDescription } from "@/lib/social";

export const runtime = "nodejs";

function defaultDescription(profile: { id: string; firstName?: string; lastName?: string; nationalities?: string[]; birthdate?: string; sex?: string; relationshipStatus?: string; languages?: string[]; location?: string; bio: string }): ProfileDescription {
  const identity = Object.fromEntries(Object.entries({
    firstName: profile.firstName ?? "",
    lastName: profile.lastName ?? "",
    nationalities: profile.nationalities?.join(", ") ?? "",
    birthdate: profile.birthdate ?? "",
    sex: profile.sex ?? "",
    relationshipStatus: profile.relationshipStatus ?? "",
    languages: profile.languages?.join(", ") ?? "",
    location: profile.location ?? ""
  }).map(([key, value]) => [key, { value, enabled: Boolean(value) }]));
  return { profileId: profile.id, visibility: "ghost", relationship: "friends", text: profile.bio ?? "", textEnabled: Boolean(profile.bio), identity, themes: {} };
}

const durationMs: Record<string, number> = { "1h": 60 * 60_000, "1d": 24 * 60 * 60_000, "1w": 7 * 24 * 60 * 60_000 };
const validDuration = (value: unknown) => typeof value === "string" && (value === "permanent" || value in durationMs);
const expiresAt = (duration: string, now: number) => duration === "permanent" ? undefined : new Date(now + durationMs[duration]).toISOString();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = (await listProfiles()).find((item) => item.id === id);
  if (!profile) return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });
  const description = (await getProfileDescription(id)) ?? defaultDescription(profile);
  return NextResponse.json({ description });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const profile = (await listProfiles()).find((item) => item.id === id);
  if (!profile) return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });
  if (!body || typeof body.text !== "string" || !["ghost", "relatives", "other"].includes(body.visibility) || typeof body.identity !== "object" || typeof body.themes !== "object") {
    return NextResponse.json({ error: "Description invalide." }, { status: 400 });
  }
  const settings = body.profileSettings;
  const allowedFilters = ["forbidden", "commercial", "sexual", "shocking", "aggressive"];
  if (!validDuration(body.textDuration ?? "permanent") || Object.values(body.identity).some((field) => !field || typeof field !== "object" || ((field as { duration?: unknown }).duration !== undefined && !validDuration((field as { duration?: unknown }).duration))) || Object.values(body.themes).some((theme) => !theme || typeof theme !== "object" || ((theme as { duration?: unknown }).duration !== undefined && !validDuration((theme as { duration?: unknown }).duration)) || Object.values((theme as { fieldDurations?: Record<string, unknown> }).fieldDurations ?? {}).some((duration) => !validDuration(duration)))) {
    return NextResponse.json({ error: "Choose a valid visibility duration for every enabled description item." }, { status: 400 });
  }
  if (!settings || !["ghost", "relatives", "all"].includes(settings.visibility) || ![0, 1, 2].includes(settings.socialDistance) || typeof settings.anonymous !== "boolean" || !Array.isArray(settings.contentFilters) || settings.contentFilters.some((filter: unknown) => typeof filter !== "string" || !allowedFilters.includes(filter)) || typeof settings.locationLabel !== "string" || typeof settings.dynamicLocationEnabled !== "boolean" || typeof settings.dynamicLocationCircleId !== "string" || !["all", "circles", "none"].includes(settings.contactsVisibility) || !Array.isArray(settings.contactCircleIds) || settings.contactCircleIds.some((circleId: unknown) => typeof circleId !== "string")) {
    return NextResponse.json({ error: "Invalid profile research settings." }, { status: 400 });
  }
  const now = Date.now();
  const textDuration = typeof body.textDuration === "string" ? body.textDuration : "permanent";
  const description: ProfileDescription = {
    profileId: id,
    visibility: body.visibility,
    relationship: typeof body.relationship === "string" ? body.relationship : "friends",
    text: body.text,
    textEnabled: Boolean(body.textEnabled),
    textDuration,
    textExpiresAt: body.textEnabled ? expiresAt(textDuration, now) : undefined,
    identity: Object.fromEntries(Object.entries(body.identity).map(([key, field]) => {
      const value = field as ProfileDescription["identity"][string];
      const duration = value.duration ?? "permanent";
      return [key, { ...value, duration, expiresAt: value.enabled ? expiresAt(duration, now) : undefined }];
    })),
    themes: Object.fromEntries(Object.entries(body.themes).map(([key, theme]) => {
      const value = theme as ProfileDescription["themes"][string];
      const duration = value.duration ?? "permanent";
      const fieldDurations = Object.fromEntries(Object.keys(value.fields ?? {}).map((fieldKey) => [fieldKey, value.fieldDurations?.[fieldKey] ?? "permanent"]));
      const fieldExpiresAt: Record<string, string> = {};
      for (const [fieldKey, fieldDuration] of Object.entries(fieldDurations)) {
        const expiry = value.fieldStates?.[fieldKey] === false ? undefined : expiresAt(fieldDuration, now);
        if (expiry) fieldExpiresAt[fieldKey] = expiry;
      }
      return [key, { ...value, duration, expiresAt: value.enabled ? expiresAt(duration, now) : undefined, fieldDurations, fieldExpiresAt }];
    }))
  };
  const preferencesSaved = await saveProfilePreferences(id, {
    visibility: settings.visibility,
    socialDistance: settings.socialDistance,
    anonymous: settings.anonymous,
    contentFilters: settings.contentFilters,
    locationLabel: settings.locationLabel,
    dynamicLocationEnabled: settings.dynamicLocationEnabled,
    dynamicLocationCircleId: settings.dynamicLocationEnabled ? settings.dynamicLocationCircleId : "",
    contactsVisibility: settings.contactsVisibility,
    contactCircleIds: settings.contactCircleIds
  });
  if (!preferencesSaved) return NextResponse.json({ error: "Profile not found or Circle not accessible." }, { status: 404 });
  return NextResponse.json({ description: await saveProfileDescription(description) });
}
