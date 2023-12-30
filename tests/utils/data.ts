import {
  JsonRpcProvider,
  Log,
  Signature,
  toBigInt,
  TransactionReceipt,
  TransactionResponse,
} from "ethers";

import { PacketProposedEvent, ProposalTrippedEvent, SealedEvent } from "../../src/monitor/events";

export const EventsABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "transmitter",
        type: "address",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "packetId",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "batchSize",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "root",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "signature",
        type: "bytes",
      },
    ],
    name: "Sealed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "transmitter",
        type: "address",
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "packetId",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "proposalCount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "root",
        type: "bytes32",
      },
      {
        indexed: false,
        internalType: "address",
        name: "switchboard",
        type: "address",
      },
    ],
    name: "PacketProposed",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "isProposalTripped",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "nonce_",
        type: "uint256",
      },
      {
        internalType: "bytes32",
        name: "packetId_",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "proposalCount_",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "signature_",
        type: "bytes",
      },
    ],
    name: "tripProposal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

export const SealedLog = new Log(
  {
    transactionHash: "0x03f982aa088f2bcb64f15177b9b4f491b977895bc8416a864432d5bb78f5258b",
    blockHash: "0xc7630d2375e85c3cdf3ee7786c27544887d0fcf7b90424ff6b9d329bb44f084f",
    blockNumber: 18862496,
    removed: false,
    address: "0x943AC2775928318653e91d350574436A1b9b16f9",
    data: "0x000000000000000000000000000000000000000000000000000000000000000012fbf633bd9769b4d385d06e49f18849c61c34ab2da08e63aa3556ac5efccbe0000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000412a460bcd24fa8b409fc2b2247a676468664b1d148a04ae9cd2b71062bd28b94e7617d7f228d1398032e5563f4164fb2a17fa14dbf7c0b007b8df415100b028831b00000000000000000000000000000000000000000000000000000000000000",
    topics: [
      "0x4bf575a0e4ff12a13816954b1ce8b1e53f30e121ea4f107ac086ec29da524abe",
      "0x000000000000000000000000fbc5ea2525bb827979e4c33b237cd47bcb8f81c5",
      "0x000000015a1576356c264ad1fcdd1d014e207c74858dafc4000000000000009a",
    ],
    index: 65,
    transactionIndex: 44,
  },
  new JsonRpcProvider(),
);

export const PacketProposedLog = new Log(
  {
    transactionHash: "0x1bdfe6e4241f765e0b4fcea18234877883b42fd84b068591b28404a1f4a75680",
    blockHash: "0x5987686ff60148c6a0c8c8dbde94eb56420311e1208b24a9afcb48414400fe9e",
    blockNumber: 18809788,
    removed: false,
    address: "0x943AC2775928318653e91d350574436A1b9b16f9",
    data: "0x00000000000000000000000000000000000000000000000000000000000000000d75af04d51b4210c439b1421508df6907a8ef09d09a1542512f0faf5426f97f000000000000000000000000d5a83a40f262e2247e6566171f9adc76b745f5cd",
    topics: [
      "0x4b8e305abfc214d75df6e3d0b37dc1b2e6e93726d472df847f312d190dcf8704",
      "0x000000000000000000000000fbc5ea2525bb827979e4c33b237cd47bcb8f81c5",
      "0x000003bd40aae25992b0a734bee0ab70bdd55d856ab498a20000000000000005",
    ],
    index: 101,
    transactionIndex: 69,
  },
  new JsonRpcProvider(),
);

export const ConfigDataMissingChain: string = `
    abi-dir = "./data/artifacts/abi"
    addresses-file = "./data/dist/deployments/addresses.json"
    poll-period = 5
    [account]
    path = "test.json"
    password = "pass"
    [chains.test]
    rpc-url = "http://test.rpc"
    deployment-block = 123
`;

export const ConfigData: string =
  ConfigDataMissingChain +
  `
    [chains.test2]
    rpc-url = "http://test.rpc2"
    deployment-block = 123
`;

export const ConfigMissingData: string = ConfigDataMissingChain.replace(
  `abi-dir = "./data/artifacts/abi"`,
  "",
);

export const AddressFileContent = `
  {
    "1": {
      "Socket": "0x943AC2775928318653e91d350574436A1b9b16f9",
      "integrations": {
        "10": {
          "FAST": {
            "switchboard": "0xD5a83a40F262E2247e6566171f9ADc76b745F5cD"
          }
        }
      }
    },
    "10": {
      "Socket": "0x301bD265F0b3C16A58CbDb886Ad87842E3A1c0a4",
      "integrations": {
        "1": {
          "FAST": {
            "switchboard": "0x09A6e77912a6bcFc3abfDfb841A85380Bb2A8B97"
          }
        }
      }
    }
  }
`;

export const SealedEventInstance = new SealedEvent(
  "1",
  "0x943AC2775928318653e91d350574436A1b9b16f9",
  "0xFBC5eA2525Bb827979e4c33B237CD47bCb8f81c5",
  "0x0000A4B13B529DEC494E1954BA4F2ED89CFE3A87F699DAEC0000000000000000",
  toBigInt(0),
  "0x511E628C1C42BE1CCB62FA460A6CD4D1E827B2A8A8DB65251219479DF1E1E5F4",
  "0xD3D7937BA7EAE6DD53FEDCE8A2AE40FF8A0B3729740C8467F5AAD09A136BCCD254908E206538215E4DC4A6BBE1ABBCBA9C4ABB06551AE15F144C9E528DA40A331B",
);

export const PacketProposedInstance = new PacketProposedEvent(
  "10",
  "0x301bD265F0b3C16A58CbDb886Ad87842E3A1c0a4",
  "0xFBC5eA2525Bb827979e4c33B237CD47bCb8f81c5",
  "0x0000A4B13B529DEC494E1954BA4F2ED89CFE3A87F699DAEC0000000000000000",
  toBigInt(0),
  "0x511E628C1C42BE1CCB62FA460A6CD4D1E827B2A8A8DB65251219479DF1E1E5F4",
  "0x09A6e77912a6bcFc3abfDfb841A85380Bb2A8B97",
);

export const PacketProposedInstanceWithUnknownSwitchboard = new PacketProposedEvent(
  "10",
  "0x301bD265F0b3C16A58CbDb886Ad87842E3A1c0a4",
  "0xFBC5eA2525Bb827979e4c33B237CD47bCb8f81c5",
  "0x0000A4B13B529DEC494E1954BA4F2ED89CFE3A87F699DAEC0000000000000000",
  toBigInt(0),
  "0x511E628C1C42BE1CCB62FA460A6CD4D1E827B2A8A8DB65251219479DF1E1E5F4",
  "0x09A6e77912a6bcFc3abfDfb841A85380Bb2A8B96",
);

export const PacketProposedInstanceRootMismatch = new PacketProposedEvent(
  "10",
  "0x301bD265F0b3C16A58CbDb886Ad87842E3A1c0a4",
  "0xFBC5eA2525Bb827979e4c33B237CD47bCb8f81c5",
  "0x0000A4B13B529DEC494E1954BA4F2ED89CFE3A87F699DAEC0000000000000000",
  toBigInt(0),
  "0x511E628C1C42BE1CCB62FA460A6CD4D1E827B2A8A8DB65251219479DF1E1E5F5",
  "0x09A6e77912a6bcFc3abfDfb841A85380Bb2A8B97",
);

export const ProposalTrippedInstance = new ProposalTrippedEvent(
  "10",
  "0x09A6e77912a6bcFc3abfDfb841A85380Bb2A8B97",
  "0x0000A4B13B529DEC494E1954BA4F2ED89CFE3A87F699DAEC0000000000000000",
  toBigInt(0),
);

export const TripProposalTxResponse = new TransactionResponse(
  {
    accessList: null,
    blockHash: null,
    blockNumber: null,
    chainId: 0n,
    data: "",
    from: "",
    gasLimit: 0n,
    gasPrice: 0n,
    hash: "",
    index: 0,
    maxFeePerGas: null,
    maxPriorityFeePerGas: null,
    nonce: 0,
    signature: Signature.from(undefined),
    to: null,
    type: 0,
    value: 0n,
  },
  new JsonRpcProvider(),
);

export function getTripProposalTxReceiptWithStatus(status: number) {
  return new TransactionReceipt(
    {
      blockHash: "",
      blockNumber: 0,
      contractAddress: null,
      cumulativeGasUsed: 0n,
      gasUsed: 0n,
      hash: "",
      index: 0,
      logs: [],
      logsBloom: "",
      root: null,
      status: status,
      type: 0,
      to: "0x09A6e77912a6bcFc3abfDfb841A85380Bb2A8B97",
      from: "0x09A6e77912a6bcFc3abfDfb841A85380Bb2A8B97",
    },
    new JsonRpcProvider(),
  );
}
