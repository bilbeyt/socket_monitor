import { ethers } from "ethers";
import fs from "fs";
import Joi from "joi";
import toml from "toml";

import type { ChainConfig, ConfigData } from "./types";

const ConfigSchema = Joi.object({
  "abi-dir": Joi.string().required(),
  "addresses-file": Joi.string().required(),
  "poll-period": Joi.number().optional(),
  "confirmation-blocks": Joi.number().optional(),
  account: {
    path: Joi.string().required(),
    password: Joi.string().required(),
  },
  chains: Joi.object().pattern(Joi.string(), {
    "rpc-url": Joi.string().required(),
    "deployment-block": Joi.number().required(),
    "poll-period": Joi.number().optional(),
    "confirmation-blocks": Joi.number().optional(),
  }),
});

export class Config {
  AbiDir: string;
  AddressesFile: string;
  Chains: Map<string, ChainConfig>;
  Account: ethers.Wallet;

  constructor(confPath: string) {
    let confContent: string = "";
    try {
      confContent = fs.readFileSync(confPath, "utf-8");
    } catch {
      throw new Error(`Failed to read config file: ${confPath}`);
    }
    const readConfig: ConfigData = toml.parse(confContent);
    const validation = ConfigSchema.validate(readConfig);
    if (validation.error) {
      throw new Error(validation.error.message);
    }
    let accountJson: string = "";
    let account: ethers.Wallet;
    try {
      accountJson = fs.readFileSync(readConfig.account.path, "utf-8");
    } catch {
      throw new Error(`Failed to read account file: ${readConfig.account.path}`);
    }
    try {
      account = ethers.Wallet.fromEncryptedJsonSync(
        accountJson,
        readConfig.account.password,
      ) as ethers.Wallet;
    } catch {
      throw new Error(`Failed to create wallet from encrypted JSON`);
    }
    this.AbiDir = readConfig["abi-dir"];
    this.AddressesFile = readConfig["addresses-file"];
    this.Account = account;
    this.Chains = new Map<string, ChainConfig>();
    for (const [chainName, config] of Object.entries(readConfig.chains)) {
      this.Chains.set(chainName, {
        RpcUrl: config["rpc-url"],
        PollPeriod: config["poll-period"] || readConfig["poll-period"] || 5000.0,
        ConfirmationBlocks:
          config["confirmation-blocks"] || readConfig["confirmation-blocks"] || 0,
        DeploymentBlock: config["deployment-block"],
      });
    }
  }
}
