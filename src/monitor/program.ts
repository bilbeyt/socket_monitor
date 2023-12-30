import type { Contract } from "ethers";
import { JsonRpcProvider, Network } from "ethers";

import { Config } from "./config";
import { EventMonitor } from "./eventMonitor";
import { EventProcessor } from "./eventProcessor";
import type { ProposalTrippedEvent, SealedEvent } from "./events";
import type { Chain, ChainId, Context, PacketId, TripId } from "./types";
import { DeploymentManager, Tracker } from "./utils";

export class MonitorProgram {
  private config: Config;
  eventMonitors: Map<string, EventMonitor>;
  eventProcessor: EventProcessor | null = null;
  private deploymentManager: DeploymentManager;
  private isRunning: boolean = false;

  constructor(configFile: string) {
    this.config = new Config(configFile);
    this.eventMonitors = new Map<string, EventMonitor>();
    this.deploymentManager = new DeploymentManager(this.config.AddressesFile, this.config.AbiDir);
  }

  private async initChains(supportedChainIds: ChainId[]) {
    const chains: Map<ChainId, Chain> = new Map<ChainId, Chain>();
    for (const [chainName, chainConfig] of this.config.Chains) {
      const provider = new JsonRpcProvider(chainConfig.RpcUrl);
      const network = await provider.getNetwork();
      const chainId = network.chainId.toString();
      provider.destroy();
      if (chains.has(chainId)) {
        continue;
      }
      if (!supportedChainIds.includes(chainId)) {
        continue;
      }
      const staticProvider = new JsonRpcProvider(
        chainConfig.RpcUrl,
        new Network(chainName, chainId),
        {
          staticNetwork: true,
        },
      );
      const account = this.config.Account.connect(staticProvider);
      const contract = this.deploymentManager.getSocketContract(chainId, staticProvider);
      const switchboardContracts = this.deploymentManager.getSwitchboardContracts(
        chainId,
        staticProvider,
      );
      const contracts = [contract, ...(Object.values(switchboardContracts) as Contract[])];
      chains.set(chainId, {
        account: account,
        chainId: chainId,
        name: chainName,
        contracts: contracts,
      });
      const eventMonitor = new EventMonitor(
        staticProvider,
        contract,
        chainConfig.DeploymentBlock,
        [],
        chainConfig.PollPeriod,
        chainConfig.ConfirmationBlocks,
        chainId,
      );
      this.eventMonitors.set(chainId.toString(), eventMonitor);
    }
    return chains;
  }

  async init() {
    this.eventMonitors = new Map<string, EventMonitor>();
    this.eventProcessor = null;
    const supportedChainIds: ChainId[] = this.deploymentManager.getSupportedChainIds();
    const chains = await this.initChains(supportedChainIds);
    if (this.config.Chains.size != supportedChainIds.length) {
      throw new Error("Not all supported chains are configured in the config file");
    }
    this.setupEventProcessor(chains);
  }

  private setupEventProcessor(chains: Map<ChainId, Chain>) {
    const context: Context = {
      seals: new Tracker<PacketId, SealedEvent>(),
      trips: new Tracker<TripId, ProposalTrippedEvent>(),
      chains: chains,
      address: this.config.Account.address,
      config: this.config,
    };
    const eventProcessor = new EventProcessor(context);
    for (const eventMonitor of this.eventMonitors.values()) {
      eventMonitor.subscribe(eventProcessor);
    }
    // One event processor for all chains as we cant differentiate source chain using PacketProposedEvent
    this.eventProcessor = eventProcessor;
  }

  async run() {
    if (this.isRunning) {
      return;
    }
    const ops: Promise<void>[] = [];
    for (const eventMonitor of this.eventMonitors.values()) {
      ops.push(eventMonitor.runMonitor());
    }
    ops.push(this.eventProcessor!.runProcessor());
    this.isRunning = true;
    await Promise.all(ops);
  }

  stop() {
    if (!this.isRunning) {
      return;
    }
    for (const eventMonitor of this.eventMonitors.values()) {
      eventMonitor.stopMonitor();
    }
    this.eventProcessor!.stopProcessor();
    this.isRunning = false;
  }
}
