// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("@/lib/onboarding/actions", () => ({
  checkUsernameAvailability: vi.fn(),
  completeOnboarding: vi.fn(async () => ({})),
}));

vi.mock("@/components/onboarding/avatar-crop-dialog", () => ({
  AvatarCropDialog: ({
    onConfirm,
    onDiscard,
    open,
    sourceUrl,
  }: {
    onConfirm: (file: File) => void;
    onDiscard: () => void;
    open: boolean;
    sourceUrl: string | null;
  }) =>
    open ? (
      <div aria-label="Crop avatar" role="dialog">
        <span>{sourceUrl}</span>
        <button
          onClick={() =>
            onConfirm(
              new File(["cropped"], "avatar.webp", { type: "image/webp" }),
            )
          }
          type="button"
        >
          Use photo
        </button>
        <button onClick={onDiscard} type="button">
          Cancel
        </button>
        <button onClick={onDiscard} type="button">
          Delete selection
        </button>
      </div>
    ) : null,
}));

import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { MAX_AVATAR_SIZE } from "@/lib/onboarding/validation";

type FileInputController = {
  getFiles: () => File[];
  setFiles: (files: File[]) => void;
};

function createFileList(files: File[]) {
  return {
    ...files,
    item: (index: number) => files[index] ?? null,
    length: files.length,
    [Symbol.iterator]: function* iterator() {
      yield* files;
    },
  } as unknown as FileList;
}

function controlFileInput(input: HTMLInputElement): FileInputController {
  let files: File[] = [];

  Object.defineProperties(input, {
    files: {
      configurable: true,
      get: () => createFileList(files),
      set: (nextFiles: FileList) => {
        files = Array.from(nextFiles);
      },
    },
    value: {
      configurable: true,
      get: () => (files.length ? `C:\\fakepath\\${files[0]?.name}` : ""),
      set: (nextValue: string) => {
        if (nextValue === "") {
          files = [];
        }
      },
    },
  });

  return {
    getFiles: () => files,
    setFiles: (nextFiles) => {
      files = nextFiles;
    },
  };
}

class DataTransferStub {
  private readonly addedFiles: File[] = [];

  readonly items = {
    add: (file: File) => {
      this.addedFiles.push(file);
    },
  };

  get files() {
    return createFileList(this.addedFiles);
  }
}

let objectUrlIndex = 0;
const createObjectURL = vi.fn(() => `blob:test-${++objectUrlIndex}`);
const revokeObjectURL = vi.fn();
const resolvedOptions = Intl.DateTimeFormat().resolvedOptions();
let resolvedOptionsSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  objectUrlIndex = 0;
  resolvedOptionsSpy = vi
    .spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
    .mockReturnValue({
      ...resolvedOptions,
      timeZone: "America/New_York",
    });
  vi.stubGlobal("DataTransfer", DataTransferStub);
  Object.defineProperties(URL, {
    createObjectURL: {
      configurable: true,
      value: createObjectURL,
    },
    revokeObjectURL: {
      configurable: true,
      value: revokeObjectURL,
    },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderForm(
  timezones = ["America/New_York", "Europe/London", "UTC"],
) {
  const view = render(
    <OnboardingForm
      initialDisplayName="Ada Lovelace"
      timezones={timezones}
    />,
  );

  const input = screen.getByLabelText("Choose avatar") as HTMLInputElement;
  return {
    input,
    files: controlFileInput(input),
    rerenderWithTimezones(nextTimezones: string[]) {
      view.rerender(
        <OnboardingForm
          initialDisplayName="Ada Lovelace"
          timezones={nextTimezones}
        />,
      );
    },
  };
}

function chooseFile(
  input: HTMLInputElement,
  controller: FileInputController,
  file: File,
) {
  controller.setFiles([file]);
  fireEvent.change(input);
}

describe("OnboardingForm timezone field", () => {
  it("server-renders New York before browser detection runs", () => {
    resolvedOptionsSpy.mockReturnValue({
      ...resolvedOptions,
      timeZone: "Europe/London",
    });

    const markup = renderToString(
      <OnboardingForm
        initialDisplayName="Ada Lovelace"
        timezones={["America/New_York", "Europe/London", "UTC"]}
      />,
    );

    expect(markup).toContain("New York");
    expect(markup).toContain('value="America/New_York"');
  });

  it("uses a supported browser timezone after hydration", async () => {
    resolvedOptionsSpy.mockReturnValue({
      ...resolvedOptions,
      timeZone: "Europe/London",
    });
    renderForm();
    const trigger = screen.getByRole("combobox", {
      name: "Preferred timezone",
    });

    await waitFor(() => {
      expect(
        document.querySelector<HTMLInputElement>(
          'input[name="preferredTimezone"]',
        )?.value,
      ).toBe("Europe/London");
    });
    expect(trigger.textContent).toContain("London");
  });

  it("keeps New York when browser detection is unsupported or unavailable", () => {
    resolvedOptionsSpy.mockReturnValue({
      ...resolvedOptions,
      timeZone: "Invalid/Timezone",
    });
    renderForm();

    expect(
      document.querySelector<HTMLInputElement>(
        'input[name="preferredTimezone"]',
      )?.value,
    ).toBe("America/New_York");

    cleanup();
    resolvedOptionsSpy.mockImplementation(() => {
      throw new Error("Timezone detection unavailable");
    });
    renderForm();

    expect(
      document.querySelector<HTMLInputElement>(
        'input[name="preferredTimezone"]',
      )?.value,
    ).toBe("America/New_York");
  });

  it("searches friendly labels and submits the selected IANA timezone", async () => {
    const user = userEvent.setup();
    renderForm();
    const trigger = screen.getByRole("combobox", {
      name: "Preferred timezone",
    });

    await user.click(trigger);
    const searchInput = await screen.findByPlaceholderText(
      "Search cities or timezones",
    );

    await user.type(searchInput, "London");
    await user.click(await screen.findByRole("option", { name: "London" }));

    expect(
      document.querySelector<HTMLInputElement>(
        'input[name="preferredTimezone"]',
      )?.value,
    ).toBe("Europe/London");
  });

  it("does not overwrite a manual selection when detection reruns", async () => {
    const user = userEvent.setup();
    resolvedOptionsSpy.mockReturnValue({
      ...resolvedOptions,
      timeZone: "Europe/London",
    });
    const { rerenderWithTimezones } = renderForm();

    await waitFor(() => {
      expect(
        document.querySelector<HTMLInputElement>(
          'input[name="preferredTimezone"]',
        )?.value,
      ).toBe("Europe/London");
    });

    await user.click(
      screen.getByRole("combobox", { name: "Preferred timezone" }),
    );
    const searchInput = await screen.findByPlaceholderText(
      "Search cities or timezones",
    );
    await user.type(searchInput, "New York");
    await user.click(
      await screen.findByRole("option", { name: "New York" }),
    );

    rerenderWithTimezones([
      "America/New_York",
      "Europe/London",
      "Asia/Tokyo",
      "UTC",
    ]);

    await waitFor(() => {
      expect(
        document.querySelector<HTMLInputElement>(
          'input[name="preferredTimezone"]',
        )?.value,
      ).toBe("America/New_York");
    });
  });
});

describe("OnboardingForm avatar flow", () => {
  it("opens the crop dialog for valid images and rejects invalid selections", () => {
    const { files, input } = renderForm();

    chooseFile(
      input,
      files,
      new File(["plain"], "avatar.txt", { type: "text/plain" }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain(
      "Upload a JPEG, PNG, or WebP image.",
    );

    chooseFile(
      input,
      files,
      new File([new Uint8Array(MAX_AVATAR_SIZE + 1)], "large.png", {
        type: "image/png",
      }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain(
      "Avatar must be 2 MB or smaller.",
    );

    chooseFile(
      input,
      files,
      new File(["image"], "avatar.png", { type: "image/png" }),
    );
    expect(screen.getByRole("dialog", { name: "Crop avatar" })).toBeTruthy();
  });

  it("submits the confirmed crop and removes it on request", async () => {
    const user = userEvent.setup();
    const { files, input } = renderForm();

    chooseFile(
      input,
      files,
      new File(["image"], "source.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("button", { name: "Use photo" }));

    expect(files.getFiles()).toEqual([
      expect.objectContaining({
        name: "avatar.webp",
        type: "image/webp",
      }),
    ]);
    expect(screen.getByAltText("Avatar preview")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(files.getFiles()).toEqual([]);
    expect(screen.queryByAltText("Avatar preview")).toBeNull();
    expect(screen.getByText("AL")).toBeTruthy();
  });

  it("keeps a confirmed avatar when a replacement is cancelled or deleted", async () => {
    const user = userEvent.setup();
    const { files, input } = renderForm();

    chooseFile(
      input,
      files,
      new File(["first"], "first.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("button", { name: "Use photo" }));
    const confirmedFile = files.getFiles()[0];
    const confirmedPreview = screen.getByAltText("Avatar preview").getAttribute(
      "src",
    );

    chooseFile(
      input,
      files,
      new File(["second"], "second.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(files.getFiles()[0]).toBe(confirmedFile);
    expect(screen.getByAltText("Avatar preview").getAttribute("src")).toBe(
      confirmedPreview,
    );

    chooseFile(
      input,
      files,
      new File(["third"], "third.webp", { type: "image/webp" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Delete selection" }),
    );

    expect(files.getFiles()[0]).toBe(confirmedFile);
    expect(screen.getByAltText("Avatar preview").getAttribute("src")).toBe(
      confirmedPreview,
    );
  });

  it("revokes source and preview URLs when discarded, removed, or unmounted", async () => {
    const user = userEvent.setup();
    const { files, input } = renderForm();

    chooseFile(
      input,
      files,
      new File(["first"], "first.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("button", { name: "Use photo" }));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test-1");

    chooseFile(
      input,
      files,
      new File(["second"], "second.png", { type: "image/png" }),
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test-3");

    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test-2");

    chooseFile(
      input,
      files,
      new File(["third"], "third.png", { type: "image/png" }),
    );
    cleanup();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test-4");
  });
});
