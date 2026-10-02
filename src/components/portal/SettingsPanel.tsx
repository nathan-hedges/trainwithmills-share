"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Card } from "./primitives";
import { Button } from "@/components/ui/Button";
import { AvatarUpload } from "./AvatarUpload";

const inputCls =
  "h-11 w-full rounded-xl border border-line bg-paper px-3.5 text-sm text-ink transition-colors focus:border-royal-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-royal-500/10";
const labelCls = "mb-1.5 block text-sm font-medium text-ink";

function Toggle({
  checked,
  onChange,
  label,
  desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <div className="text-sm font-medium text-ink">{label}</div>
        {desc && <div className="text-xs text-muted">{desc}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors",
          checked ? "bg-royal-600" : "bg-line",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

export function SettingsPanel({
  role,
  firstName,
  lastName,
  email,
  notifyMessages,
  notifySummary,
  notifyReminders,
  notifyForms,
  userId,
  hasAvatar,
}: {
  role: "coach" | "client";
  firstName: string;
  lastName: string;
  email: string;
  notifyMessages: boolean;
  notifySummary: boolean;
  notifyReminders: boolean;
  notifyForms: boolean;
  /** For the profile picture (upload + display). */
  userId?: string;
  hasAvatar?: boolean;
}) {
  // Start the form from the values the page loaded out of the database.
  const [profileFirst, setProfileFirst] = useState(firstName);
  const [profileLast, setProfileLast] = useState(lastName);
  const [notifMessages, setNotifMessages] = useState(notifyMessages);
  const [notifSummary, setNotifSummary] = useState(notifySummary);
  const [notifReminders, setNotifReminders] = useState(notifyReminders);
  const [notifForms, setNotifForms] = useState(notifyForms);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarSet, setAvatarSet] = useState(Boolean(hasAvatar));

  // Password change (its own little form).
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  // Any edit clears the "Saved" confirmation.
  function touch() {
    if (saved) setSaved(false);
  }

  async function changePassword() {
    setPwMsg(null);
    if (newPw.length < 8) return setPwMsg({ type: "error", text: "Use at least 8 characters." });
    if (newPw !== confirmPw) return setPwMsg({ type: "error", text: "Those passwords don't match." });
    setPwSaving(true);
    try {
      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      if (res.ok) {
        setPwMsg({ type: "ok", text: "Password updated." });
        setCurrentPw("");
        setNewPw("");
        setConfirmPw("");
      } else {
        setPwMsg({ type: "error", text: (await res.text()) || "Could not update your password." });
      }
    } finally {
      setPwSaving(false);
    }
  }

  // Send the form to PATCH /api/me.
  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: profileFirst.trim(),
          lastName: profileLast.trim(),
          notifyMessages: notifMessages,
          notifySummary: notifSummary,
          notifyReminders: notifReminders,
          notifyForms: notifForms,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="p-5 sm:p-6">
        <h3 className="font-display text-lg">Profile</h3>

        {userId && (
          <div className="mb-5 mt-4 border-b border-line pb-5">
            <span className="mb-2 block text-sm font-medium text-ink">Profile picture</span>
            <AvatarUpload
              initials={`${profileFirst?.[0] ?? ""}${profileLast?.[0] ?? ""}`.toUpperCase() || "?"}
              userId={userId}
              hasAvatar={avatarSet}
              onChanged={setAvatarSet}
            />
            <p className="mt-2 text-xs text-muted">
              Shown on your messages. Leave it and your initials are used instead.
            </p>
          </div>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="set-first" className={labelCls}>First name</label>
            <input
              id="set-first"
              value={profileFirst}
              onChange={(e) => { setProfileFirst(e.target.value); touch(); }}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="set-last" className={labelCls}>Last name</label>
            <input
              id="set-last"
              value={profileLast}
              onChange={(e) => { setProfileLast(e.target.value); touch(); }}
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="set-email" className={labelCls}>Email</label>
            <input
              id="set-email"
              type="email"
              value={email}
              readOnly
              disabled
              className={cn(inputCls, "cursor-not-allowed opacity-60")}
            />
            <p className="mt-1 text-xs text-muted">Your email is your login and can&apos;t be changed here.</p>
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h3 className="font-display text-lg">Email Notifications</h3>
        <div className="mt-2 divide-y divide-line">
          <Toggle
            checked={notifMessages}
            onChange={(v) => { setNotifMessages(v); touch(); }}
            label="New messages"
            desc="When I get a new message."
          />
          <Toggle
            checked={notifSummary}
            onChange={(v) => { setNotifSummary(v); touch(); }}
            label="Weekly summary"
            desc="A digest of progress every Monday."
          />
          <Toggle
            checked={notifReminders}
            onChange={(v) => { setNotifReminders(v); touch(); }}
            label={role === "client" ? "Session reminders" : "Missed-session alerts"}
            desc={role === "client" ? "Remind me about today's workout." : "Alert me when a client misses a session."}
          />
          <Toggle
            checked={notifForms}
            onChange={(v) => { setNotifForms(v); touch(); }}
            label={role === "client" ? "Form reminders" : "Form answered"}
            desc={role === "client" ? "Remind me about today's form." : "Alert me when a client has filled in a form."}
          />
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h3 className="font-display text-lg">Password</h3>
        <p className="text-sm text-muted">Change your password. Leave the current field blank if you signed up with Google.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="pw-current" className={labelCls}>Current</label>
            <input
              id="pw-current"
              type="password"
              autoComplete="current-password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="pw-new" className={labelCls}>New</label>
            <input
              id="pw-new"
              type="password"
              autoComplete="new-password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="At least 8 characters"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="pw-confirm" className={labelCls}>Confirm</label>
            <input
              id="pw-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button variant="secondary" onClick={changePassword} disabled={pwSaving || !newPw}>
            {pwSaving ? "Updating…" : "Change password"}
          </Button>
          {pwMsg && (
            <span className={cn("text-sm", pwMsg.type === "ok" ? "text-emerald-600" : "text-red-600")}>
              {pwMsg.text}
            </span>
          )}
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h3 className="font-display text-lg">Account</h3>
          <p className="text-sm text-muted">Sign out of the portal.</p>
        </div>
        <button
          type="button"
          onClick={() => signOut({ redirectTo: "/" })}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-medium text-ink transition-colors hover:bg-royal-50"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
        </Button>
        {error && <span className="text-sm text-red-600">{error}</span>}
        {saved && !error && <span className="text-sm text-muted">Your settings are up to date.</span>}
      </div>
    </div>
  );
}
