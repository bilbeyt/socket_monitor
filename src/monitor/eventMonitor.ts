import type { Contract, JsonRpcProvider } from "ethers";

import type { EventProcessor } from "./eventProcessor";
import { EventFetcher } from "./events";
import type { ChainId, Event } from "./types";

export class EventMonitor {
  id: string;
  private provider: JsonRpcProvider;
  private chainId: ChainId;
  private contract: Contract;
  private deploymentBlock: number;
  private eventProcessors: EventProcessor[];
  private pollPeriod: number;
  private confirmationBlocks: number;
  private rpcWorking: boolean;
  private stop: boolean;

  constructor(
    provider: JsonRpcProvider,
    contract: Contract,
    deploymentBlock: number,
    eventProcessors: EventProcessor[],
    pollPeriod: number,
    confirmationBlocks: number,
    chainId: ChainId,
    rpcWorking?: boolean,
    stop?: boolean,
  ) {
    this.eventProcessors = eventProcessors;
    this.contract = contract;
    this.provider = provider;
    this.deploymentBlock = deploymentBlock;
    this.pollPeriod = pollPeriod;
    this.confirmationBlocks = confirmationBlocks;
    this.chainId = chainId;
    this.id = chainId.toString();
    this.rpcWorking = rpcWorking ?? true;
    this.stop = stop ?? false;
  }

  subscribe(eventProcessor: EventProcessor) {
    this.eventProcessors.push(eventProcessor);
  }

  async runMonitor() {
    this.stop = false;
    console.log("EventMonitor started", {
      address: this.contract.target,
      id: this.id,
    });
    const fetcher = new EventFetcher(
      this.provider,
      this.contract,
      this.deploymentBlock,
      this.confirmationBlocks,
      this.chainId,
    );
    const currentBlockNumber = await this.provider.getBlockNumber();
    let events: Event[] = [];
    while (fetcher.getSyncedBlock() < currentBlockNumber) {
      events.push(...(await this.fetch(fetcher)));
    }
    if (events.length != 0) {
      this.callOnNewEvents(events);
    }
    this.callOnSyncDone();
    console.log("Sync done", { id: this.id });
    while (!this.stop) {
      events = await this.fetch(fetcher);
      if (events.length != 0) {
        this.callOnNewEvents(events);
      }
      await new Promise((resolve) => setTimeout(resolve, this.pollPeriod));
    }
    console.log("EventMonitor stopped", { id: this.id });
  }

  stopMonitor() {
    this.stop = true;
  }

  callOnNewEvents(events: Event[]) {
    for (const eventProcessor of this.eventProcessors) {
      eventProcessor.addEvents(events);
    }
  }

  callOnSyncDone() {
    for (const eventProcessor of this.eventProcessors) {
      eventProcessor.markSyncDone();
    }
  }

  callOnRpcStatusChange(status: boolean) {
    for (const eventProcessor of this.eventProcessors) {
      eventProcessor.setRpcWorking(status, this.chainId);
    }
  }

  async fetch(fetcher: EventFetcher): Promise<Event[]> {
    const wasWorking = this.rpcWorking;
    let events: Event[] = [];
    try {
      events = await fetcher.fetch();
      this.rpcWorking = true;
    } catch (error) {
      this.rpcWorking = false;
    }
    if (wasWorking != this.rpcWorking) {
      this.callOnRpcStatusChange(this.rpcWorking);
      if (wasWorking) {
        console.log("RPC stopped working", { id: this.id });
      } else {
        console.log("RPC started working", { id: this.id });
      }
    }
    return events;
  }
}
