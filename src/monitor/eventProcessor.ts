import { Mutex } from "async-mutex";
import type { AddressLike, Contract, TransactionResponse } from "ethers";

import { PacketProposedEvent, ProposalTrippedEvent, SealedEvent } from "./events";
import type { Chain, ChainId, Context, Event } from "./types";

export class EventProcessor {
  private WaitTime: number = 1;
  private events: Event[] = [];
  private stop: boolean = false;
  private context: Context;
  private numSyncsDone: number = 0;
  private rpcWorkingMap: Map<ChainId, boolean>;
  private chainIds: Set<ChainId>;
  private lock: Mutex;
  private switchboardContractAddresses: AddressLike[];
  private switchboardContracts: Map<ChainId, Map<AddressLike, Contract>>;

  constructor(context: Context) {
    this.context = context;
    this.chainIds = new Set<ChainId>(
      Array.from(this.context.chains.values()).map((chain: Chain) => {
        return chain.chainId;
      }),
    );
    this.lock = new Mutex();
    this.rpcWorkingMap = new Map<ChainId, boolean>();
    this.switchboardContracts = new Map<ChainId, Map<AddressLike, Contract>>();
    const switchboardContracts: Set<AddressLike> = new Set<AddressLike>();
    for (const chain of this.context.chains.values()) {
      const chainSwitchboardContracts = new Map<AddressLike, Contract>();
      const contractAddresses = chain.contracts.slice(1).map((contract) => {
        chainSwitchboardContracts.set(contract.target, contract);
        return contract.target;
      });
      this.switchboardContracts.set(chain.chainId, chainSwitchboardContracts);
      contractAddresses.forEach((address) => {
        switchboardContracts.add(address);
      });
      this.rpcWorkingMap.set(chain.chainId as string, true);
    }
    this.switchboardContractAddresses = Array.from(switchboardContracts);
  }

  getSwitchboardContract(chainId: ChainId, address: AddressLike): Contract {
    return this.switchboardContracts.get(chainId)!.get(address)!;
  }

  getContext(): Context {
    return this.context;
  }

  isSynced(): boolean {
    return this.chainIds.size === this.numSyncsDone;
  }

  addEvents(events: Event[]) {
    this.lock.acquire().then((release) => {
      this.events.push(...events);
      release();
      console.debug("New events", { events: events, source: events[0].chainId });
    });
  }
  markSyncDone() {
    this.lock.acquire().then((release) => {
      this.numSyncsDone++;
      release();
    });
  }
  setRpcWorking(status: boolean, chainId: ChainId) {
    this.rpcWorkingMap.set(chainId, status);
  }

  async runProcessor() {
    this.stop = false;
    console.log("EventProcessor started");
    while (!this.isSynced() && !this.stop) {
      await new Promise((resolve) => setTimeout(resolve, this.WaitTime));
    }
    while (!this.stop) {
      await new Promise((resolve) => setTimeout(resolve, this.WaitTime));
      if (this.events.length > 0) {
        await this.processEvents();
      }
    }
  }

  stopProcessor() {
    this.stop = true;
  }

  async processEvents() {
    let release = await this.lock.acquire();
    const events = this.events;
    release();
    const beforeProcess = performance.now();
    const unprocessedEvents: Event[] = [];
    for (const event of events) {
      if (event instanceof SealedEvent) {
        await this.context.seals.set(event.packetId, event);
      } else if (event instanceof PacketProposedEvent) {
        const oldTrip = await this.context.trips.get(event.getTripId());
        const sealEvent = await this.context.seals.get(event.packetId);
        if (
          this.switchboardContractAddresses.find((address) => {
            return address == event.switchboard;
          }) == undefined
        ) {
          console.log("Used switchboard is not defined in deployment.json", {
            chainId: event.chainId,
            switchboard: event.switchboard,
          });
          continue;
        }
        if (sealEvent === undefined) {
          unprocessedEvents.push(event);
          continue;
        }
        if (!checkSealAndProposalEvent(sealEvent as SealedEvent, event) && oldTrip == undefined) {
          const tripEvent = new ProposalTrippedEvent(
            event.chainId,
            event.switchboard,
            event.packetId,
            event.proposalCount,
          );
          await this.context.trips.set(event.getTripId(), tripEvent);
          console.log("Event mismatch found.", { proposalEvent: event, sealEvent: sealEvent });
          if (!this.rpcWorkingMap.get(event.chainId)) {
            // Rpc is not working keep the event until it starts working
            unprocessedEvents.push(event);
            continue;
          }
          const sent = await this.sendTrip(event);
          if (!sent) {
            console.log("Could not send tripProposal", {
              proposalEvent: event,
              sealEvent: sealEvent,
            });
            await this.context.trips.delete(event.getTripId());
            unprocessedEvents.push(event);
          }
        }
      }
    }
    release = await this.lock.acquire();
    this.events.splice(0, events.length);
    this.events.push(...unprocessedEvents);
    release();
    const afterProcess = performance.now();
    const duration = afterProcess - beforeProcess;
    console.debug("Finished Iteration", {
      duration: duration,
      numEvents: this.events.length,
    });
  }

  async sendTrip(proposalEvent: PacketProposedEvent) {
    const switchboardContract = this.getSwitchboardContract(
      proposalEvent.chainId,
      proposalEvent.switchboard,
    );
    const isTripped: boolean = await switchboardContract.isProposalTripped(
      proposalEvent.packetId,
      proposalEvent.proposalCount,
    );
    if (isTripped) {
      return true;
    }
    try {
      const tx: TransactionResponse = await switchboardContract.tripProposal(
        proposalEvent.packetId,
        proposalEvent.proposalCount,
      );
      const receipt = await tx.wait();
      if (receipt?.status == 0) {
        console.error("Unknown error sending trip", {
          chainId: proposalEvent.chainId,
          tripId: proposalEvent.getTripId(),
        });
        return false;
      }
    } catch (error) {
      console.error("Error sending trip", {
        chainId: proposalEvent.chainId,
        tripId: proposalEvent.getTripId(),
        error: error,
      });
      return false;
    }
    return true;
  }
}

function checkSealAndProposalEvent(
  sealEvent: SealedEvent,
  proposalEvent: PacketProposedEvent,
): boolean {
  return (
    sealEvent.root == proposalEvent.root &&
    sealEvent.transmitter == proposalEvent.transmitter &&
    sealEvent &&
    sealEvent.packetId == proposalEvent.packetId
  );
}
