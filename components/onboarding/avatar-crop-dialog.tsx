"use client";

import { LoaderCircle, X } from "lucide-react";
import { useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cropImageToWebp } from "@/lib/onboarding/crop-image";
import { MAX_AVATAR_SIZE } from "@/lib/onboarding/validation";

type AvatarCropDialogProps = {
  onConfirm: (file: File) => void;
  onDiscard: () => void;
  open: boolean;
  sourceUrl: string | null;
};

const INITIAL_CROP: Point = { x: 0, y: 0 };

export function AvatarCropDialog({
  onConfirm,
  onDiscard,
  open,
  sourceUrl,
}: AvatarCropDialogProps) {
  const [crop, setCrop] = useState<Point>(INITIAL_CROP);
  const [cropArea, setCropArea] = useState<Area | null>(null);
  const [cropError, setCropError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoom, setZoom] = useState(1);

  function resetEditor() {
    setCrop(INITIAL_CROP);
    setCropArea(null);
    setCropError(null);
    setZoom(1);
  }

  function handleDiscard() {
    resetEditor();
    onDiscard();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && !isGenerating) {
      handleDiscard();
    }
  }

  async function handleConfirm() {
    if (!sourceUrl || !cropArea) {
      setCropError("Move the image before confirming your crop.");
      return;
    }

    setIsGenerating(true);
    setCropError(null);

    try {
      const croppedFile = await cropImageToWebp(sourceUrl, cropArea);

      if (croppedFile.size > MAX_AVATAR_SIZE) {
        setCropError("The cropped avatar is larger than 2 MB.");
        return;
      }

      resetEditor();
      onConfirm(croppedFile);
    } catch (error) {
      setCropError(
        error instanceof Error
          ? error.message
          : "The cropped image could not be created.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        className="max-w-lg gap-0 overflow-hidden bg-card p-0"
        onEscapeKeyDown={(event) => {
          if (isGenerating) {
            event.preventDefault();
          }
        }}
        onPointerDownOutside={(event) => {
          if (isGenerating) {
            event.preventDefault();
          }
        }}
        scaleAnimation={false}
        showCloseButton={false}
      >
        <DialogHeader className="relative px-5 pt-5 pr-14 pb-4">
          <DialogTitle>Crop your avatar</DialogTitle>
          <DialogDescription>
            Drag to reposition your photo and use the slider to zoom.
          </DialogDescription>
          <Button
            aria-label="Close crop editor"
            className="absolute top-3 right-3"
            disabled={isGenerating}
            onClick={handleDiscard}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <X />
          </Button>
        </DialogHeader>

        <div
          aria-label="Avatar crop area"
          className="relative aspect-square w-full overflow-hidden bg-neutral-950"
        >
          {sourceUrl ? (
            <Cropper
              aspect={1}
              crop={crop}
              cropShape="round"
              cropperProps={{
                "aria-label": "Move and zoom your avatar crop",
              }}
              image={sourceUrl}
              maxZoom={3}
              minZoom={1}
              objectFit="cover"
              onCropChange={setCrop}
              onCropComplete={(_croppedArea, croppedAreaPixels) =>
                setCropArea(croppedAreaPixels)
              }
              onZoomChange={setZoom}
              restrictPosition
              roundCropAreaPixels
              showGrid={true}
              zoom={zoom}
            />
          ) : null}
        </div>

        <div className="space-y-4 px-5 py-4">
          {/* <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" htmlFor="avatar-zoom">
                Zoom
              </label>
              <span className="text-xs text-muted-foreground">
                {zoom.toFixed(1)}×
              </span>
            </div>
            <input
              aria-label="Avatar zoom"
              className="w-full accent-brand"
              disabled={isGenerating}
              id="avatar-zoom"
              max={3}
              min={1}
              onChange={(event) => setZoom(Number(event.target.value))}
              step={0.1}
              type="range"
              value={zoom}
            />
          </div> */}

          {cropError ? (
            <p
              aria-live="polite"
              className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {cropError}
            </p>
          ) : null}
        </div>

        <DialogFooter className="mx-0 mb-0 rounded-none">
          <div className="flex w-full justify-between">
            <Button
              disabled={isGenerating}
              onClick={handleDiscard}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isGenerating || !cropArea}
              onClick={handleConfirm}
              type="button"
            >
              {isGenerating ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Cropping...
                </>
              ) : (
                "Choose"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
