"use client";

import { Save, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminDataState } from "@/components/admin/admin-data-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { writeAdminLogBestEffort } from "@/lib/firestore/admin-logs";
import {
  defaultSiteSettings,
  getSiteSettings,
  saveSiteSettings
} from "@/lib/firestore/admin-content-controls";
import type { SiteSettings } from "@/types/domain";

export function AdminSettings() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!isFirebaseConfigured) {
        setError(firebaseSetupMessage);
        setLoading(false);
        return;
      }
      try {
        setSettings(await getSiteSettings());
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not load settings.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  function update<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      await saveSiteSettings(settings);
      await writeAdminLogBestEffort({
        adminId: user?.uid ?? "unknown",
        adminName: profile?.displayName ?? "Admin",
        action: "site_settings_updated",
        targetType: "siteSettings",
        targetId: settings.id,
        targetLabel: "Site settings",
        details: "Safe Phase 11 settings updated."
      });
      showToast({ tone: "success", title: "Settings saved" });
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Settings save failed",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase text-primary">Settings</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold">Site settings</h1>
        <p className="mt-4 max-w-3xl text-muted-foreground">
          Safe launch settings for support copy, feature flags, and default quiz room values. Dangerous production controls remain future server-side work.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Settings className="size-5" />} label="Settings doc" value={settings.id} helper="siteSettings collection" />
        <StatCard label="Quick match" value={settings.allowQuickMatch ? "On" : "Off"} helper="Public feature flag" />
        <StatCard label="Maintenance" value={settings.maintenanceMode ? "On" : "Off"} helper="UI placeholder only" />
      </div>

      <AdminDataState empty={false} emptyDescription="" emptyTitle="" error={error} loading={loading} />

      {!loading && !error ? (
        <>
          <Card className="p-5">
            <SectionHeader className="mb-4" title="General" />
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                Support email
                <Input onChange={(event) => update("supportEmail", event.target.value)} value={settings.supportEmail} />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Featured quiz limit
                <Input min={1} onChange={(event) => update("featuredQuizLimit", Number(event.target.value))} type="number" value={settings.featuredQuizLimit} />
              </label>
            </div>
            <label className="mt-4 grid gap-2 text-sm font-semibold">
              App announcement
              <Textarea onChange={(event) => update("appAnnouncement", event.target.value)} value={settings.appAnnouncement} />
            </label>
          </Card>

          <Card className="p-5">
            <SectionHeader className="mb-4" title="Feature flags" />
            <div className="grid gap-4 md:grid-cols-2">
              <Switch checked={settings.allowPublicRooms} label="Public rooms" description="Allow public room discovery in the UI." onCheckedChange={(checked) => update("allowPublicRooms", checked)} />
              <Switch checked={settings.allowQuickMatch} label="Quick Match" description="Allow casual matchmaking UI." onCheckedChange={(checked) => update("allowQuickMatch", checked)} />
              <Switch checked={settings.allowChallengeLinks} label="Challenge links" description="Allow challenge invite creation." onCheckedChange={(checked) => update("allowChallengeLinks", checked)} />
              <Switch checked={settings.leaderboardEnabled} label="Leaderboards" description="Show public leaderboard surfaces." onCheckedChange={(checked) => update("leaderboardEnabled", checked)} />
              <Switch checked={settings.dailyChallengeEnabled} label="Daily challenge" description="Show daily challenge callouts." onCheckedChange={(checked) => update("dailyChallengeEnabled", checked)} />
              <Switch checked={settings.maintenanceMode} label="Maintenance mode placeholder" description="Documents intent only until server enforcement exists." onCheckedChange={(checked) => update("maintenanceMode", checked)} />
            </div>
          </Card>

          <Card className="p-5">
            <SectionHeader className="mb-4" title="Defaults" />
            <div className="grid gap-4 lg:grid-cols-3">
              <label className="grid gap-2 text-sm font-semibold">
                Question timer
                <Input min={5} onChange={(event) => update("defaultQuestionTimer", Number(event.target.value))} type="number" value={settings.defaultQuestionTimer} />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Room max players
                <Input min={2} onChange={(event) => update("defaultRoomMaxPlayers", Number(event.target.value))} type="number" value={settings.defaultRoomMaxPlayers} />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Bot fill delay
                <Input min={5} onChange={(event) => update("defaultBotFillDelay", Number(event.target.value))} type="number" value={settings.defaultBotFillDelay} />
              </label>
            </div>
          </Card>

          <Button disabled={saving} icon={<Save className="size-4" />} onClick={() => void save()}>
            {saving ? "Saving..." : "Save settings"}
          </Button>
        </>
      ) : null}
    </div>
  );
}
