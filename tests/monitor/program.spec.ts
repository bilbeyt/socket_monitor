import { JsonRpcProvider, Network, TransactionResponse, Wallet } from "ethers";
import fs from "fs";

import { EventFetcher } from "../../src/monitor/events";
import { MonitorProgram } from "../../src/monitor/program";
import {
  AddressFileContent,
  ConfigData,
  ConfigDataMissingChain,
  EventsABI,
  getTripProposalTxReceiptWithStatus,
  PacketProposedInstance,
  PacketProposedInstanceRootMismatch,
  PacketProposedInstanceWithUnknownSwitchboard,
  ProposalTrippedInstance,
  SealedEventInstance,
  TripProposalTxResponse,
} from "../utils/data";

function createProgram(): MonitorProgram {
  return new MonitorProgram("test.conf");
}

describe("program", () => {
  function setUpMocks(configData: string) {
    // 1. Reads config
    // 2. Reads account json
    // 3. Reads addresses file
    // 4. Other reads are regarding abi
    jest
      .spyOn(fs, "readFileSync")
      .mockReturnValueOnce(configData)
      .mockReturnValueOnce("")
      .mockReturnValueOnce(AddressFileContent)
      .mockReturnValue(JSON.stringify(EventsABI));
    // Creates mocked wallet for config
    jest
      .spyOn(Wallet, "fromEncryptedJsonSync")
      .mockImplementationOnce(() => Wallet.createRandom(null));
    jest
      .spyOn(JsonRpcProvider.prototype, "getNetwork")
      .mockImplementationOnce(() => Promise.resolve(new Network("test", 1)))
      .mockImplementation(() => Promise.resolve(new Network("test2", 10)));
    jest.spyOn(EventFetcher.prototype, "getSyncedBlock").mockReturnValue(128);
    jest
      .spyOn(JsonRpcProvider.prototype, "getBlockNumber")
      .mockImplementation(() => Promise.resolve(128));
  }
  it("program creation", async () => {
    setUpMocks(ConfigData);
    const program = createProgram();
    expect(program).toBeInstanceOf(MonitorProgram);
    await program.init();
  });
  it("config doesnt have all supported chains", async () => {
    setUpMocks(ConfigDataMissingChain);
    const program = createProgram();
    await expect(() => program.init()).rejects.toThrow(
      "Not all supported chains are configured in the config file",
    );
  });
  it("run", async () => {
    setUpMocks(ConfigData);
    jest
      .spyOn(EventFetcher.prototype, "fetch")
      .mockImplementation(() => Promise.resolve([SealedEventInstance, PacketProposedInstance]));
    const program = createProgram();
    await program.init();
    const callback: Promise<void> = getCallback(program, async () => {
      const seal = await program.eventProcessor
        ?.getContext()
        .seals.get(SealedEventInstance.packetId);
      expect(seal).toEqual(SealedEventInstance);
    });
    await Promise.all([program.run(), callback]);
  });
  it("run with data mismatch", async () => {
    setUpMocks(ConfigData);
    jest
      .spyOn(EventFetcher.prototype, "fetch")
      .mockImplementation(() =>
        Promise.resolve([SealedEventInstance, PacketProposedInstanceRootMismatch]),
      );
    jest
      .spyOn(TransactionResponse.prototype, "wait")
      .mockImplementation(() => Promise.resolve(getTripProposalTxReceiptWithStatus(1)));
    const program = createProgram();
    await program.init();
    const contract = program.eventProcessor!.getSwitchboardContract(
      PacketProposedInstanceRootMismatch.chainId,
      PacketProposedInstanceRootMismatch.switchboard,
    )!;
    jest.spyOn(contract, "isProposalTripped").mockResolvedValue(false);
    jest.spyOn(contract, "tripProposal").mockResolvedValue(TripProposalTxResponse);
    const callback = getCallback(program, async () => {
      const trip = await program.eventProcessor
        ?.getContext()
        .trips.get(PacketProposedInstanceRootMismatch.getTripId());
      expect(trip).toEqual(ProposalTrippedInstance);
    });
    await Promise.all([program.run(), callback]);
  });
  it("run with data mismatch can not send trip", async () => {
    setUpMocks(ConfigData);
    jest
      .spyOn(EventFetcher.prototype, "fetch")
      .mockImplementation(() =>
        Promise.resolve([SealedEventInstance, PacketProposedInstanceRootMismatch]),
      );
    jest
      .spyOn(TransactionResponse.prototype, "wait")
      .mockImplementation(() => Promise.resolve(getTripProposalTxReceiptWithStatus(1)));
    const logSpy = jest.spyOn(console, "error");
    const program = createProgram();

    await program.init();
    const contract = program.eventProcessor!.getSwitchboardContract(
      PacketProposedInstanceRootMismatch.chainId,
      PacketProposedInstanceRootMismatch.switchboard,
    )!;
    jest.spyOn(contract, "isProposalTripped").mockResolvedValue(false);
    jest.spyOn(contract, "tripProposal").mockRejectedValue("can not send");

    const callback: Promise<void> = getCallback(program, () => {
      expect(logSpy).toHaveBeenCalledWith("Error sending trip", {
        chainId: PacketProposedInstanceRootMismatch.chainId,
        tripId: PacketProposedInstanceRootMismatch.getTripId(),
        error: "can not send",
      });
    });
    await Promise.all([program.run(), callback]);
  });
  it("run with data mismatch unknown error status 0", async () => {
    setUpMocks(ConfigData);
    jest
      .spyOn(EventFetcher.prototype, "fetch")
      .mockImplementation(() =>
        Promise.resolve([SealedEventInstance, PacketProposedInstanceRootMismatch]),
      );
    jest
      .spyOn(TransactionResponse.prototype, "wait")
      .mockImplementation(() => Promise.resolve(getTripProposalTxReceiptWithStatus(0)));
    const logSpy = jest.spyOn(console, "error");
    const program = createProgram();

    await program.init();
    const contract = program.eventProcessor!.getSwitchboardContract(
      PacketProposedInstanceRootMismatch.chainId,
      PacketProposedInstanceRootMismatch.switchboard,
    )!;
    jest.spyOn(contract, "isProposalTripped").mockResolvedValue(false);
    jest.spyOn(contract, "tripProposal").mockResolvedValue(TripProposalTxResponse);

    const callback: Promise<void> = getCallback(program, () => {
      expect(logSpy).toHaveBeenCalledWith("Unknown error sending trip", {
        chainId: PacketProposedInstanceRootMismatch.chainId,
        tripId: PacketProposedInstanceRootMismatch.getTripId(),
      });
    });
    await Promise.all([program.run(), callback]);
  });
  it("run with switchboard mismatch", async () => {
    const logSpy = jest.spyOn(console, "log");
    setUpMocks(ConfigData);
    jest
      .spyOn(EventFetcher.prototype, "fetch")
      .mockImplementation(() =>
        Promise.resolve([SealedEventInstance, PacketProposedInstanceWithUnknownSwitchboard]),
      );
    const program = createProgram();
    await program.init();
    const callback: Promise<void> = getCallback(program, () => {
      expect(logSpy).toHaveBeenCalledWith("Used switchboard is not defined in deployment.json", {
        chainId: "10",
        switchboard: "0x09A6e77912a6bcFc3abfDfb841A85380Bb2A8B96",
      });
    });
    await Promise.all([program.run(), callback]);
  });
  it("run with rpc change", async () => {
    const logSpy = jest.spyOn(console, "log");
    setUpMocks(ConfigData);
    jest.spyOn(EventFetcher.prototype, "fetch").mockRejectedValue("rpc error");
    const program = createProgram();
    await program.init();
    const callback: Promise<void> = getCallback(program, () => {
      expect(logSpy).toHaveBeenCalledWith("RPC stopped working", { id: "1" });
    });
    await Promise.all([program.run(), callback]);
  });
});

function getCallback(program: MonitorProgram, checkFn: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        program.stop();
        checkFn();
        resolve();
      } catch (error) {
        reject(error);
      }
    }, 100);
  });
}
