import { Mutex } from "async-mutex";
import type { AddressLike, JsonRpcProvider, Provider } from "ethers";
import { Contract } from "ethers";
import fs from "fs";

import type { AddressFile, ChainId } from "./types";

export class DeploymentManager {
  private abiDir: string;
  private addressFile: string;
  private addressFileJson: AddressFile;

  constructor(addressFile: string, abiDir: string) {
    this.addressFile = addressFile;
    this.abiDir = abiDir;
    let fileContent = "";
    try {
      fileContent = fs.readFileSync(this.addressFile, "utf-8");
    } catch {
      throw new Error(`Failed to read address file: ${this.addressFile}`);
    }
    this.addressFileJson = JSON.parse(fileContent);
  }

  getDeploymentAddress(chainId: ChainId, contractName: string) {
    return this.addressFileJson[chainId][contractName];
  }

  getAbi(contractName: string) {
    const filename = `${this.abiDir}/${contractName}.json`;
    let fileContent = "";
    try {
      fileContent = fs.readFileSync(filename, "utf-8");
    } catch {
      throw new Error(`Failed to read ABI file: ${filename}`);
    }
    return JSON.parse(fileContent);
  }

  getSwitchboardContracts(chainId: ChainId, provider: Provider) {
    const contractsMap: Map<AddressLike, Contract> = new Map<AddressLike, Contract>();
    const abi = this.getAbi("SwitchboardBase");
    for (const typeAddresses of Object.values(this.addressFileJson[chainId]["integrations"])) {
      for (const addresses of Object.values(typeAddresses)) {
        if (contractsMap.has(addresses["switchboard"])) {
          continue;
        }
        contractsMap[addresses["switchboard"]] = new Contract(
          addresses["switchboard"],
          abi,
          provider,
        );
      }
    }
    return contractsMap;
  }

  getSocketContract(chainId: ChainId, provider: JsonRpcProvider) {
    const abi = this.getAbi("Socket");
    const address = this.getDeploymentAddress(chainId, "Socket");
    return new Contract(address, abi, provider);
  }

  getSupportedChainIds(): ChainId[] {
    return Object.keys(this.addressFileJson);
  }
}

export class Tracker<T1, T2> {
  private data: Map<T1, T2>;
  private lock: Mutex;

  constructor() {
    this.data = new Map<T1, T2>();
    this.lock = new Mutex();
  }

  async set(key: T1, val: T2) {
    const release = await this.lock.acquire();
    this.data.set(key, val);
    release();
  }

  async get(key: T1) {
    const release = await this.lock.acquire();
    const value = this.data.get(key);
    release();
    return value;
  }

  async delete(key: T1) {
    const release = await this.lock.acquire();
    this.data.delete(key);
    release();
  }

  async size() {
    const release = await this.lock.acquire();
    const size = this.data.size;
    release();
    return size;
  }
}
