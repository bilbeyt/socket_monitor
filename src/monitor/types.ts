import type { AddressLike, Contract, Wallet } from "ethers";

import type { Config } from "./config";
import type { ProposalTrippedEvent, SealedEvent } from "./events";
import type { Tracker } from "./utils";

export type ChainId = string;

export type Chain = {
  account: Wallet;
  chainId: ChainId;
  name: string;
  contracts: Contract[];
};

export type ChainConfig = {
  RpcUrl: string;
  PollPeriod: number;
  ConfirmationBlocks: number;
  DeploymentBlock: number;
};

export type Context = {
  seals: Tracker<PacketId, SealedEvent>;
  trips: Tracker<TripId, ProposalTrippedEvent>;
  chains: Map<ChainId, Chain>;
  address: AddressLike;
  config: Config;
};

export type PacketId = string;
export type TripId = string;

export type ConfigData = {
  "abi-dir": string;
  "addresses-file": string;
  "poll-period"?: number;
  "confirmation-blocks"?: number;
  account: {
    path: string;
    password: string;
  };
  chains: {
    [name: string]: {
      "rpc-url": string;
      "deployment-block": number;
      "poll-period"?: number;
      "confirmation-blocks"?: number;
    };
  };
};

export abstract class Event {
  chainId: ChainId;
  address: AddressLike;

  protected constructor(chainId: ChainId, address: AddressLike) {
    this.address = address;
    this.chainId = chainId;
  }
}

export type AddressFile = {
  [chainId: string]: {
    Socket: string;
    integrations: {
      [integratedChainId: string]: {
        [switchboardType: string]: {
          switchboard: string;
        };
      };
    };
  };
};
