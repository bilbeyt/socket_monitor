import { ethers } from "ethers";
import fs from "fs";

import { Config } from "../../src/monitor/config";
import { ConfigData, ConfigMissingData } from "../utils/data";

describe("Config", () => {
  it("config does not exist", () => {
    expect(() => new Config("test.conf")).toThrow("Failed to read config file: test.conf");
  });
  it("account file does not exist", () => {
    jest.spyOn(fs, "readFileSync").mockReturnValueOnce(ConfigData);
    expect(() => new Config("test.conf")).toThrow("Failed to read account file: test.json");
  });
  it("account can not be created", () => {
    jest.spyOn(fs, "readFileSync").mockReturnValue(ConfigData);
    expect(() => new Config("test.conf")).toThrow("Failed to create wallet from encrypted JSON");
  });
  it("config has missing field", () => {
    jest.spyOn(fs, "readFileSync").mockReturnValue(ConfigMissingData);
    jest
      .spyOn(ethers.Wallet, "fromEncryptedJsonSync")
      .mockImplementation(() => ethers.Wallet.createRandom(null));
    expect(() => new Config("test.conf")).toThrow('"abi-dir" is required');
  });
  it("successful generation", () => {
    jest.spyOn(fs, "readFileSync").mockReturnValue(ConfigData);
    jest
      .spyOn(ethers.Wallet, "fromEncryptedJsonSync")
      .mockImplementation(() => ethers.Wallet.createRandom(null));
  });
});
