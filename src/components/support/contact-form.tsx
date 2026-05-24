"use client";

import { Send } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import { firebaseSetupMessage, isFirebaseConfigured } from "@/lib/firebase/client";
import { createFeedback } from "@/lib/firestore/feedback";
import type { FeedbackType } from "@/types/domain";

export function ContactForm() {
  const { user, profile, authReady, loading } = useAuth();
  const { showToast } = useToast();
  const [type, setType] = useState<FeedbackType>("general");
  const [message, setMessage] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!isFirebaseConfigured) {
      setError(firebaseSetupMessage);
      return;
    }
    if (!user) {
      setError("Sign in to send feedback so admins can follow up safely.");
      return;
    }
    if (message.trim().length < 10) {
      setError("Please add at least 10 characters so the admin team has enough context.");
      return;
    }

    setSaving(true);
    try {
      await createFeedback({
        userId: user.uid,
        name: profile?.displayName ?? user.displayName ?? "Quizora Player",
        email: user.email ?? profile?.email ?? "",
        type,
        message: message.trim(),
        pageUrl: pageUrl.trim() || (typeof window !== "undefined" ? window.location.href : "")
      });
      setMessage("");
      setPageUrl("");
      showToast({
        tone: "success",
        title: "Feedback sent",
        description: "Thanks. Admins can review it from the feedback queue."
      });
    } catch (caught) {
      showToast({
        tone: "error",
        title: "Feedback failed",
        description: caught instanceof Error ? caught.message : "Try again."
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6">
      <form className="grid gap-4" onSubmit={submit}>
        <div>
          <h2 className="text-xl font-semibold">Send feedback</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Feedback is admin-only. Please avoid passwords, secrets, or private answer details.
          </p>
        </div>
        <label className="grid gap-2 text-sm font-semibold">
          Type
          <Select onChange={(event) => setType(event.target.value as FeedbackType)} value={type}>
            <option value="general">General</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature idea</option>
            <option value="ui">UI polish</option>
            <option value="quiz-quality">Quiz quality</option>
          </Select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Page URL
          <Input onChange={(event) => setPageUrl(event.target.value)} placeholder="Optional page link" value={pageUrl} />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          Message
          <Textarea onChange={(event) => setMessage(event.target.value)} placeholder="What should admins know?" value={message} />
        </label>
        <FieldError message={error} />
        <Button disabled={saving || loading || !authReady} icon={<Send className="size-4" />} type="submit">
          {saving ? "Sending..." : user ? "Send feedback" : "Sign in to send"}
        </Button>
      </form>
    </Card>
  );
}
