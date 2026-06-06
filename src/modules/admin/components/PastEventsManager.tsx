"use client";

import { useState } from "react";
import { Button } from "@/core/ui/Button";
import { useToast } from "@/core/ui/Toast";
import { updatePastEventsConfig } from "@/modules/admin/actions";
import type { PastEventsConfig, PastEventsImage } from "@/core/types/site-content";

interface PastEventsManagerProps {
  initialConfig: PastEventsConfig;
}

export function PastEventsManager({ initialConfig }: PastEventsManagerProps) {
  const { toast } = useToast();
  const [images, setImages] = useState<PastEventsImage[]>(initialConfig.images ?? []);
  const [saving, setSaving] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newCaption, setNewCaption] = useState("");

  function addImage() {
    const url = newUrl.trim();
    if (!url) return;
    setImages([...images, { id: crypto.randomUUID(), url, caption: newCaption.trim() || undefined }]);
    setNewUrl("");
    setNewCaption("");
  }

  function removeImage(id: string) {
    setImages(images.filter((img) => img.id !== id));
  }

  function moveImage(idx: number, dir: -1 | 1) {
    const next = [...images];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setImages(next);
  }

  function updateCaption(id: string, caption: string) {
    setImages(images.map((img) => (img.id === id ? { ...img, caption: caption || undefined } : img)));
  }

  async function handleSave() {
    setSaving(true);
    const result = await updatePastEventsConfig({ images });
    setSaving(false);
    if (result?.error) {
      toast(result.error, "error");
    } else {
      toast("Carousel saved!", "success");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg text-white">
          Past Events Carousel
        </h2>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      {/* Add image row */}
      <div className="rounded-2xl border border-gray-800/60 bg-[#0d1017] p-4 space-y-3">
        <p className="text-[10px] text-gray-500">Add Image</p>
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="Image URL (https://…)"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addImage()}
            className="flex-1 rounded-lg border border-gray-700 bg-[#121620] px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-[var(--color-accent)] focus:outline-none"
          />
          <input
            type="text"
            placeholder="Caption (optional)"
            value={newCaption}
            onChange={(e) => setNewCaption(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addImage()}
            className="w-44 rounded-lg border border-gray-700 bg-[#121620] px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-[var(--color-accent)] focus:outline-none"
          />
          <Button onClick={addImage} disabled={!newUrl.trim()}>
            + Add
          </Button>
        </div>
      </div>

      {/* Image list */}
      {images.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-700 p-12 text-center text-gray-600 text-sm">
          No images yet. Add one above.
        </div>
      ) : (
        <div className="space-y-3">
          {images.map((img, i) => (
            <div
              key={img.id}
              className="flex items-center gap-3 rounded-2xl border border-gray-800/60 bg-[#121620] p-3"
            >
              {/* Thumbnail */}
              <div className="h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-gray-800 bg-gray-900">
                <img
                  src={img.url}
                  alt={img.caption ?? `Image ${i + 1}`}
                  className="h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2"; }}
                />
              </div>

              {/* URL + caption */}
              <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                <input
                  type="url"
                  value={img.url}
                  onChange={(e) =>
                    setImages(images.map((x) => (x.id === img.id ? { ...x, url: e.target.value } : x)))
                  }
                  className="w-full truncate rounded-lg border border-gray-700 bg-[#0d1017] px-3 py-1.5 text-xs text-gray-300 focus:border-[var(--color-accent)] focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Caption (optional)"
                  value={img.caption ?? ""}
                  onChange={(e) => updateCaption(img.id, e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-[#0d1017] px-3 py-1.5 text-xs text-gray-400 placeholder-gray-700 focus:border-[var(--color-accent)] focus:outline-none"
                />
              </div>

              {/* Controls */}
              <div className="flex flex-shrink-0 items-center gap-1">
                <span className="w-7 text-center text-[10px] font-bold text-gray-600">{i + 1}</span>
                <button
                  onClick={() => moveImage(i, -1)}
                  disabled={i === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-800 text-gray-500 hover:text-white disabled:opacity-20"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveImage(i, 1)}
                  disabled={i === images.length - 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-800 text-gray-500 hover:text-white disabled:opacity-20"
                >
                  ↓
                </button>
                <button
                  onClick={() => removeImage(img.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-red-900/50 text-red-500 hover:bg-red-950/40"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : `Save ${images.length} image${images.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      )}
    </div>
  );
}
