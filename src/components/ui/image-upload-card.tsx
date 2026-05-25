"use client";

import { ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { ImageDisplay } from "@/components/ui/image-display";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  deleteImage,
  uploadImage,
  validateImageFile,
  type ImageUploadTarget
} from "@/lib/uploads/images";
import { cn } from "@/lib/utils";

export interface EditableImageMetadata {
  imageUrl: string;
  imagePath: string;
  imageAlt: string;
  imageCaption?: string;
}

export function ImageUploadCard({
  title,
  description,
  metadata,
  onChange,
  target,
  pendingFile,
  onPendingFileChange,
  disabled,
  disabledReason,
  caption = false,
  compact = false
}: {
  title: string;
  description?: string;
  metadata: EditableImageMetadata;
  onChange: (metadata: EditableImageMetadata) => void;
  target?: ImageUploadTarget;
  pendingFile?: File | null;
  onPendingFileChange?: (file: File | null) => void;
  disabled?: boolean;
  disabledReason?: string;
  caption?: boolean;
  compact?: boolean;
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState("");
  const hasPendingMode = Boolean(onPendingFileChange);
  const hasImage = Boolean(metadata.imageUrl || pendingPreviewUrl);
  const blocked = disabled || !user || working || (!target && !hasPendingMode);

  useEffect(() => {
    if (!pendingFile) {
      setPendingPreviewUrl("");
      return;
    }

    const nextUrl = URL.createObjectURL(pendingFile);
    setPendingPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [pendingFile]);

  async function upload(file: File | undefined) {
    if (!file || !user) return;
    const validation = validateImageFile(file);
    if (validation) {
      setError(validation);
      return;
    }
    if (!target && onPendingFileChange) {
      setError("");
      onPendingFileChange(file);
      if (inputRef.current) inputRef.current.value = "";
      showToast({ tone: "success", title: "Image ready", description: "It will upload automatically after you save." });
      return;
    }
    if (!target) return;
    setWorking(true);
    setError("");
    try {
      const result = await uploadImage({
        user,
        file,
        target,
        alt: metadata.imageAlt,
        caption: metadata.imageCaption
      });
      onChange({
        imageUrl: result.imageUrl,
        imagePath: result.imagePath,
        imageAlt: result.imageAlt,
        imageCaption: result.imageCaption ?? ""
      });
      showToast({ tone: "success", title: "Image uploaded" });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Image upload failed. Please try again.";
      setError(message);
      showToast({ tone: "error", title: "Image upload failed", description: message });
    } finally {
      setWorking(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    if (!metadata.imagePath && pendingFile && onPendingFileChange) {
      onPendingFileChange(null);
      if (!metadata.imageUrl) onChange({ imageUrl: "", imagePath: "", imageAlt: "", imageCaption: "" });
      return;
    }
    if (!target || !user || !metadata.imagePath) {
      onChange({ imageUrl: "", imagePath: "", imageAlt: "", imageCaption: "" });
      return;
    }
    setWorking(true);
    setError("");
    try {
      await deleteImage({
        user,
        target,
        imagePath: metadata.imagePath,
        imageUrl: metadata.imageUrl
      });
      onChange({ imageUrl: "", imagePath: "", imageAlt: "", imageCaption: "" });
      showToast({ tone: "success", title: "Image removed" });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Image delete failed. Please try again.";
      setError(message);
      showToast({ tone: "error", title: "Image delete failed", description: message });
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className={cn("rounded-3xl border border-border bg-surface/70 p-4", compact && "p-3")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ImagePlus className="size-4 text-primary" />
            {title}
          </p>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={blocked}
            onChange={(event) => void upload(event.target.files?.[0])}
            ref={inputRef}
            type="file"
          />
          <Button
            disabled={blocked}
            icon={working ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
            onClick={() => inputRef.current?.click()}
            size="sm"
            type="button"
            variant="secondary"
          >
            {!target && hasPendingMode ? (hasImage ? "Replace" : "Choose") : hasImage ? "Replace" : "Upload"}
          </Button>
          {hasImage ? (
            <Button
              disabled={blocked}
              icon={<Trash2 className="size-4" />}
              onClick={() => void remove()}
              size="sm"
              type="button"
              variant="danger"
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      {disabledReason || (!target && !disabledReason && !hasPendingMode) || (!target && hasPendingMode && pendingFile) ? (
        <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/8 px-3 py-2 text-xs text-muted-foreground">
          {disabledReason || (!target && hasPendingMode && pendingFile ? "Image selected. It will upload automatically after you save." : "Save this item first, then upload an image.")}
        </div>
      ) : null}

      {hasImage ? (
        <ImageDisplay
          alt={metadata.imageAlt || pendingFile?.name || title}
          caption={metadata.imageCaption}
          className="mt-4"
          compact={compact}
          imageClassName={compact ? "max-h-44" : "max-h-72"}
          src={metadata.imageUrl || pendingPreviewUrl}
        />
      ) : null}

      <div className={cn("mt-4 grid gap-3", caption && "md:grid-cols-2")}>
        <label className="grid gap-2 text-sm font-semibold">
          Alt text
          <Input
            disabled={disabled || working}
            onChange={(event) => onChange({ ...metadata, imageAlt: event.target.value })}
            placeholder="Describe the image for accessibility"
            value={metadata.imageAlt}
          />
        </label>
        {caption ? (
          <label className="grid gap-2 text-sm font-semibold">
            Caption
            <Textarea
              disabled={disabled || working}
              onChange={(event) => onChange({ ...metadata, imageCaption: event.target.value })}
              placeholder="Optional short caption"
              value={metadata.imageCaption ?? ""}
            />
          </label>
        ) : null}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        JPG, PNG, or WebP only. Maximum file size: 5MB.
      </p>
      <FieldError message={error || undefined} />
    </div>
  );
}
