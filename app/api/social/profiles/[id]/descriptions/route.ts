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

function deactivateExpired(description: ProfileDescription): ProfileDescription {
  const now = Date.now();
  const identity = Object.fromEntries(Object.entries(description.identity).map(([key, field]) => [key, {
    ...field,
    enabled: field.expiresAt && Date.parse(field.expiresAt) <= now ? false : field.enabled
  }]));
  const themes = Object.fromEntries(Object.entries(description.themes).map(([key, theme]) => [key, {
    ...theme,
    enabled: theme.expiresAt && Date.parse(theme.expiresAt) <= now ? false : theme.enabled
  }]));
  return {
    ...description,
    textEnabled: description.textExpiresAt && Date.parse(description.textExpiresAt) <= now ? false : description.textEnabled,
    identity,
    themes
  };
}

function expirationFor(duration: string | undefined): string | undefined {
  const durationMs: Record<string, number> = { "1h": 60 * 60 * 1000, "1d": 24 * 60 * 60 * 1000, "1w": 7 * 24 * 60 * 60 * 1000 };
  return duration && durationMs[duration] ? new Date(Date.now() + durationMs[duration]).toISOString() : undefined;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = (await listProfiles()).find((item) => item.id === id);
  if (!profile) return NextResponse.json({ error: "Profil introuvable." }, { status: 404 });
  const description = (await getProfileDescription(id)) ?? defaultDescription(profile);
  return NextResponse.json({ description: deactivateExpired(description) });
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
  if (!settings || !["ghost", "relatives", "all"].includes(settings.visibility) || ![0, 1, 2].includes(settings.socialDistance) || typeof settings.anonymous !== "boolean" || !Array.isArray(settings.contentFilters) || settings.contentFilters.some((filter: unknown) => typeof filter !== "string" || !allowedFilters.includes(filter)) || typeof settings.locationLabel !== "string" || typeof settings.dynamicLocationEnabled !== "boolean" || typeof settings.dynamicLocationCircleId !== "string") {
    return NextResponse.json({ error: "Invalid profile research settings." }, { status: 400 });
  }
  const description: ProfileDescription = {
    profileId: id,
    visibility: body.visibility,
    relationship: typeof body.relationship === "string" ? body.relationship : "friends",
    text: body.text,
    textEnabled: Boolean(body.textEnabled),
    textDuration: body.textDuration ?? "permanent",
    textExpiresAt: body.textEnabled ? expirationFor(body.textDuration) : undefined,
    identity: Object.fromEntries(Object.entries(body.identity).map(([key, field]) => {
      const value = field as ProfileDescription["identity"][string];
      return [key, { ...value, duration: value.duration ?? "permanent", expiresAt: value.enabled ? expirationFor(value.duration) : undefined }];
    })),
    themes: Object.fromEntries(Object.entries(body.themes).map(([key, theme]) => {
      const value = theme as ProfileDescription["themes"][string];
      return [key, { ...value, duration: value.duration ?? "permanent", expiresAt: value.enabled ? expirationFor(value.duration) : undefined }];
    }))
  };
  const preferencesSaved = await saveProfilePreferences(id, {
    visibility: settings.visibility,
    socialDistance: settings.socialDistance,
    anonymous: settings.anonymous,
    contentFilters: settings.contentFilters,
    locationLabel: settings.locationLabel,
    dynamicLocationEnabled: settings.dynamicLocationEnabled,
    dynamicLocationCircleId: settings.dynamicLocationEnabled ? settings.dynamicLocationCircleId : ""
  });
  if (!preferencesSaved) return NextResponse.json({ error: "Profile not found or Circle not accessible." }, { status: 404 });
  return NextResponse.json({ description: await saveProfileDescription(description) });
}
