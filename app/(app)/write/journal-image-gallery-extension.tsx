"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from "@tiptap/react";

import type { JournalImageRef } from "@/lib/entries/content";
import { cn } from "@/lib/utils";

type JournalImageGalleryAttrs = {
  images?: JournalImageRef[];
};

function getImages(attrs: JournalImageGalleryAttrs) {
  return Array.isArray(attrs.images) ? attrs.images : [];
}

function JournalImageFrame({ image }: { image: JournalImageRef }) {
  const src = image.previewUrl;

  return (
    <figure className="aspect-[4/5] w-full overflow-hidden rounded-lg bg-muted">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={image.alt ?? ""}
          className="size-full object-cover"
          draggable={false}
          src={src}
        />
      ) : (
        <div className="flex size-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
          Image preview unavailable
        </div>
      )}
    </figure>
  );
}

function JournalImageGalleryView({ node }: ReactNodeViewProps) {
  const images = getImages(node.attrs as JournalImageGalleryAttrs);
  const hasMultipleImages = images.length > 1;

  return (
    <NodeViewWrapper
      className="my-6"
      data-journal-image-gallery=""
      data-image-count={images.length}
    >
      <div
        className={cn(
          hasMultipleImages
            ? "mx-auto flex max-h-[70vh] max-w-md snap-y snap-mandatory flex-col gap-3 overflow-y-auto pr-2"
            : "mx-auto flex max-w-md justify-center",
        )}
      >
        {images.map((image) => (
          <div className="w-full shrink-0 snap-start" key={image.id}>
            <JournalImageFrame image={image} />
          </div>
        ))}
      </div>
    </NodeViewWrapper>
  );
}

export const JournalImageGallery = Node.create({
  name: "journalImageGallery",

  group: "block",

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      images: {
        default: [],
        parseHTML: (element) => {
          const value = element.getAttribute("data-images");

          if (!value) {
            return [];
          }

          try {
            return JSON.parse(value) as JournalImageRef[];
          } catch {
            return [];
          }
        },
        renderHTML: (attributes) => ({
          "data-images": JSON.stringify(attributes.images ?? []),
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-journal-image-gallery]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-journal-image-gallery": "",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(JournalImageGalleryView);
  },
});
