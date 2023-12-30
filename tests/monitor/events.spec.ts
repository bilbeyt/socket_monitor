import { Contract, JsonRpcProvider, Network } from "ethers";

import { EventFetcher, PacketProposedEvent, SealedEvent } from "../../src/monitor/events";
import type { ChainId } from "../../src/monitor/types";
import { EventsABI, PacketProposedLog, SealedLog } from "../utils/data";

const StartBlock = 100;

function createEventFetcher(): EventFetcher {
  const contract: Contract = new Contract("0x943AC2775928318653e91d350574436A1b9b16f9", EventsABI);
  const startBlock: number = StartBlock;
  const confirmationBlocks: number = 2;
  const chainId: ChainId = "1337";
  const provider: JsonRpcProvider = new JsonRpcProvider(
    "http://test.rpc",
    new Network("test", 1337),
    { staticNetwork: true },
  );
  return new EventFetcher(provider, contract, startBlock, confirmationBlocks, chainId);
}

describe("EventFetcher", () => {
  it("getSyncedBlock()", () => {
    const fetcher = createEventFetcher();
    expect(fetcher.getSyncedBlock()).toEqual(StartBlock - 1);
  });
  describe("fetch()", () => {
    it("can not get current block number", async () => {
      const fetcher = createEventFetcher();
      console.error = jest.fn();
      const events = await fetcher.fetch();
      expect(events.length).toEqual(0);
      expect(console.error).toHaveBeenCalledWith("Can not retrieve current block number");
    });
    it("next block number is bigger than block number", async () => {
      const fetcher = createEventFetcher();
      jest
        .spyOn(JsonRpcProvider.prototype, "getBlockNumber")
        .mockImplementation(() => Promise.resolve(StartBlock - 1));
      const events = await fetcher.fetch();
      expect(events.length).toEqual(0);
    });
    it("rpc content too big for getLogs", async () => {
      const fetcher = createEventFetcher();
      jest
        .spyOn(JsonRpcProvider.prototype, "getBlockNumber")
        .mockImplementation(() => Promise.resolve(StartBlock + 5));
      jest
        .spyOn(JsonRpcProvider.prototype, "getLogs")
        .mockImplementationOnce(() => Promise.reject({ error: { code: -32614 } }))
        .mockImplementationOnce(() => Promise.resolve([SealedLog, PacketProposedLog]));
      console.debug = jest.fn();
      const events = await fetcher.fetch();
      expect(events.length).toEqual(2);
      expect(console.debug).toHaveBeenCalledWith(
        "Failed to get events, reducing number of blocks",
        { error: { error: { code: -32614 } }, new: 200, old: 1000 },
      );
    });
    it("rpc error while fetching logs other than code -32614", async () => {
      const fetcher = createEventFetcher();
      jest
        .spyOn(JsonRpcProvider.prototype, "getBlockNumber")
        .mockImplementation(() => Promise.resolve(StartBlock + 5));
      jest
        .spyOn(JsonRpcProvider.prototype, "getLogs")
        .mockImplementationOnce(() =>
          Promise.reject({ error: { code: -32600, message: "test" } }),
        );
      console.error = jest.fn();
      const events = await fetcher.fetch();
      expect(events.length).toEqual(0);
      expect(console.error).toHaveBeenCalledWith({ error: { code: -32600, message: "test" } });
    });
    it("successful", async () => {
      const fetcher = createEventFetcher();
      jest
        .spyOn(JsonRpcProvider.prototype, "getBlockNumber")
        .mockImplementation(() => Promise.resolve(StartBlock + 5));
      jest
        .spyOn(JsonRpcProvider.prototype, "getLogs")
        .mockImplementation(() => Promise.resolve([SealedLog, PacketProposedLog]));

      const events = await fetcher.fetch();
      expect(events.length).toEqual(2);
      expect(events[0]).toBeInstanceOf(SealedEvent);
      expect(events[1]).toBeInstanceOf(PacketProposedEvent);
    });
    it("slow fetching reducing the number of blocks to fetch", async () => {
      const fetcher = createEventFetcher();
      jest
        .spyOn(JsonRpcProvider.prototype, "getBlockNumber")
        .mockImplementation(() => Promise.resolve(StartBlock + 5));
      jest
        .spyOn(JsonRpcProvider.prototype, "getLogs")
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve([PacketProposedLog]), 5100)),
        );
      const events = await fetcher.fetch();
      expect(events.length).toEqual(1);
      expect(fetcher.getBlocksToFetch()).toEqual(500);
      expect(events[0]).toBeInstanceOf(PacketProposedEvent);
      const event = events[0] as PacketProposedEvent;

      expect(event.getTripId()).toEqual(`${event.packetId}-${event.proposalCount}`);
    });
  });
});
