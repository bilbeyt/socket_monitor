import type { AddressLike, Contract, Filter, JsonRpcProvider, Log, Provider } from "ethers";

import type { ChainId, PacketId, TripId } from "./types";
import { Event } from "./types";

export class SealedEvent extends Event {
  transmitter: AddressLike;
  packetId: PacketId;
  batchSize: bigint;
  root: string;
  signature: string;

  constructor(
    chainId: ChainId,
    address: AddressLike,
    transmitter: AddressLike,
    packetId: PacketId,
    batchSize: bigint,
    root: string,
    signature: string,
  ) {
    super(chainId, address);
    this.transmitter = transmitter;
    this.packetId = packetId;
    this.root = root;
    this.signature = signature;
    this.batchSize = batchSize;
  }
}

export class PacketProposedEvent extends Event {
  transmitter: AddressLike;
  packetId: PacketId;
  proposalCount: bigint;
  root: string;
  switchboard: AddressLike;

  constructor(
    chainId: ChainId,
    address: AddressLike,
    transmitter: AddressLike,
    packetId: PacketId,
    proposalCount: bigint,
    root: string,
    switchboard: AddressLike,
  ) {
    super(chainId, address);
    this.transmitter = transmitter;
    this.packetId = packetId;
    this.root = root;
    this.proposalCount = proposalCount;
    this.switchboard = switchboard;
  }

  getTripId(): TripId {
    return `${this.packetId}-${this.proposalCount}`;
  }
}

export class ProposalTrippedEvent extends Event {
  packetId: PacketId;
  proposalCount: bigint;

  constructor(chainId: ChainId, address: AddressLike, packetId: PacketId, proposalCount: bigint) {
    super(chainId, address);
    this.packetId = packetId;
    this.proposalCount = proposalCount;
  }
}

export class EventFetcher {
  private DefaultBlocks: number = 1_000;
  private MinBlocks: number = 2;
  private MaxBlocks: number = 100_000;
  private EthGetLogsThresholdFast: number = 2000;
  private EthGetLogsThresholdSlow: number = 5000;
  private confirmationBlocks: number;
  private provider: Provider;
  private contract: Contract;
  private blocksToFetch: number;
  private chainId: ChainId;
  private nextBlockNumber: number;

  constructor(
    provider: JsonRpcProvider,
    contract: Contract,
    startBlock: number,
    confirmationBlocks: number,
    chainId: ChainId,
  ) {
    this.contract = contract;
    this.confirmationBlocks = confirmationBlocks;
    this.provider = provider;
    this.blocksToFetch = this.DefaultBlocks;
    this.chainId = chainId;
    this.nextBlockNumber = startBlock;
  }

  getSyncedBlock(): number {
    return this.nextBlockNumber - 1;
  }

  getBlocksToFetch(): number {
    return this.blocksToFetch;
  }

  private async fetchRange(fromBlock: number, toBlock: number): Promise<Event[] | null> {
    console.debug("Fetching events", {
      address: this.contract.target,
      fromBlock: fromBlock,
      toBlock: toBlock,
      chainId: this.chainId,
    });
    const beforeQuery = performance.now();
    let events: Event[] = [];
    const filter: Filter = {
      address: this.contract.target,
      fromBlock: fromBlock,
      toBlock: toBlock,
    };
    let logs: Log[] = [];
    try {
      logs = await this.provider.getLogs(filter);
      const afterQuery = performance.now();
      const duration = afterQuery - beforeQuery;
      if (duration < this.EthGetLogsThresholdFast) {
        this.blocksToFetch = Math.min(this.MaxBlocks, this.blocksToFetch * 2);
      } else if (duration > this.EthGetLogsThresholdSlow) {
        this.blocksToFetch = Math.max(this.MinBlocks, Math.ceil(this.blocksToFetch / 2));
      }
    } catch (error) {
      // @ts-expect-error JsonRpcError type
      if (error.error.code == -32614) {
        const oldNumbersToFetch = this.blocksToFetch;
        this.blocksToFetch = Math.max(this.MinBlocks, Math.ceil(oldNumbersToFetch / 5));
        console.debug("Failed to get events, reducing number of blocks", {
          old: oldNumbersToFetch,
          new: this.blocksToFetch,
          error: error,
        });
        return null;
      }
      console.error(error);
    }
    events = logs.reduce((accumulatedEvents: Event[], log: Log) => {
      const decodedEvent = this.contract.interface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });
      if (decodedEvent !== null) {
        let event: Event | null = null;
        if (decodedEvent.name === "Sealed") {
          const [transmitter, packetId, batchSize, root, signature] = decodedEvent.args;
          event = new SealedEvent(
            this.chainId,
            this.contract.target,
            transmitter,
            packetId,
            batchSize,
            root,
            signature,
          );
        } else if (decodedEvent.name === "PacketProposed") {
          const [transmitter, packetId, proposalCount, root, switchboard] = decodedEvent.args;
          event = new PacketProposedEvent(
            this.chainId,
            this.contract.target,
            transmitter,
            packetId,
            proposalCount,
            root,
            switchboard,
          );
        }
        if (event !== null) {
          accumulatedEvents.push(event);
        }
      }
      return accumulatedEvents;
    }, []);
    return events;
  }

  async fetch(): Promise<Event[]> {
    let blockNumber: number;
    try {
      blockNumber = (await this.provider.getBlockNumber()) - this.confirmationBlocks;
    } catch {
      console.error("Can not retrieve current block number");
      return [];
    }
    if (blockNumber < this.nextBlockNumber) {
      return [];
    }
    const result: Event[] = [];
    let fromBlock = this.nextBlockNumber;
    while (fromBlock <= blockNumber) {
      const toBlock = Math.min(blockNumber, fromBlock + this.blocksToFetch);
      const events = await this.fetchRange(fromBlock, toBlock);
      if (events != null) {
        result.push(...events);
        fromBlock = toBlock + 1;
      }
    }
    this.nextBlockNumber = fromBlock;
    return result;
  }
}
