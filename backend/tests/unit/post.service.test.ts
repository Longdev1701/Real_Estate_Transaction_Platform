import { describe, expect, it } from "vitest";

import { parseImageMetadata } from "../../src/posts/post.service.js";

describe("parseImageMetadata", () => {
  it("normalizes valid metadata items", () => {
    const result = parseImageMetadata(
      JSON.stringify([
        { caption: "  Front view  ", order: 0 },
        { caption: "", order: 1 },
      ]),
    );

    expect(result).toEqual([
      { caption: "Front view", order: 0 },
      { caption: undefined, order: 1 },
    ]);
  });

  it("rejects malformed JSON payloads", () => {
    expect(() => parseImageMetadata("{invalid-json")).toThrow("imageMetadata must be valid JSON.");
  });
});
