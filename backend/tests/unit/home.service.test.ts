import { beforeEach, describe, expect, it, vi } from "vitest";

const transactionMock = vi.fn();

vi.mock("../../src/prisma/prisma.service.js", () => ({
  prisma: {
    $transaction: transactionMock,
    propertyPost: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    user: {
      count: vi.fn(),
    },
  },
}));

describe("getHomeData", () => {
  beforeEach(() => {
    vi.resetModules();
    transactionMock.mockReset();
  });

  it("shares the same in-flight fetch across concurrent callers", async () => {
    let resolveTransaction: ((value: unknown) => void) | undefined;

    transactionMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveTransaction = resolve;
        }),
    );

    const { clearHomeCache, getHomeData } = await import("../../src/home/home.service.js");

    clearHomeCache();

    const firstRequest = getHomeData();
    const secondRequest = getHomeData();

    expect(transactionMock).toHaveBeenCalledTimes(1);

    resolveTransaction?.([
      [],
      [
        {
          postType: "SELL",
          _count: {
            postType: 2,
          },
        },
        {
          postType: "RENT",
          _count: {
            postType: 1,
          },
        },
      ],
      5,
      [],
      [],
    ]);

    const [firstResult, secondResult] = await Promise.all([firstRequest, secondRequest]);

    expect(firstResult).toMatchObject({
      stats: {
        activePostCount: 3,
        sellPostCount: 2,
        rentPostCount: 1,
        userCount: 5,
      },
    });

    expect(secondResult).toMatchObject({
      stats: {
        activePostCount: 3,
      },
    });
    expect(transactionMock).toHaveBeenCalledTimes(1);
  });
});
