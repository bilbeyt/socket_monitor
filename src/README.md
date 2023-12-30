# Socket Monitor Technical Reference

## Introduction

This app is tracking Sealed and PacketProposed events on 
[Socket contracts](https://github.com/SocketDotTech/socket-DL/blob/master/contracts/socket/Socket.sol).

If it detects a data mismatch sends a [trip transaction](https://github.com/SocketDotTech/socket-DL/blob/master/contracts/switchboard/default-switchboards/SwitchboardBase.sol#L232) 
on switchboard contract indicated on PacketProposed event.

## Architecture

This app has 3 main components to mention:

### EventFetcher

Main component to handle fetching Sealed and PacketProposed events. It automatically adapts the speed according to event fetching times, and if rpc is limiting the log size it reacts to that.
Also, it can be configured against reorgs that might occur.

### EventMonitor

This component is using EventFetcher and creating a bridge to event handler component EventProcessor. Every chain has its own EventMonitor.

It is notifying 3 things:
1. New events
2. Sync done
3. Rpc status changes

### EventProcessor

This component is handling events came from EventMonitors. There is only 1 EventProcessor as by looking at the PacketProposed event we can not detect the source chain.

It starts operating events after chains are synced, and enables/disables the chain using EventMonitors.

#### Detection algorithm

It is matching Sealed event `packetId`, `root` and `transmitter` with PacketProposed event. If there is a mismatch, it sends trip transaction.
If there is a problem sending the trip transaction, it is trying to send it.

## Configuration File Reference

| Configuration section/key                     |                                                                                        Description                                                                                         |
|-----------------------------------------------|:------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------:|
| [account]<br>path = PATH                      |                                                                                Path to the account keyfile.                                                                                |
| [account]<br>password = PASSWORD              |                                                                         The password needed to unlock the account.                                                                         |
| addresses-file = PATH                         |                                                                                  The addresses file path                                                                                   |
| abi-dir = DIR                                 |                                                                        The directory containing contract abi files.                                                                        |
| confirmation-blocks = BLOCKS                  |                                                   Number of confirmation blocks to consider the block ready for processing. Default: 0.                                                    |
| poll-period = TIME                            | Time in milliseconds to wait between two consecutive RPC requests for new events. The value applies to all chains that don’t have the chain-specific poll period defined. Default: 5000.0. |
| [chains.NAME]<br>poll-period = TIME           |           Time in milliseconds to wait between two consecutive RPC requests for new events. The value applies only to chain NAME, taking precedence over the global poll period.           |
| [chains.NAME]<br>confirmation-blocks = BLOCKS |         Number of confirmation blocks to consider the block ready for processing. This value only applies to chain NAME and taking the precedence over global confirmation blocks.         |
| [chains.NAME]<br>deployment-block = BLOCK     |                                                                The block number of creation transaction of Socket contract.                                                                |


