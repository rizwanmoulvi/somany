````markdown
# EIP-5792 Documentation

## Introduction

### What is EIP-5792?
[EIP-5792](https://eips.ethereum.org/EIPS/eip-5792) enables applications to ask a wallet to process a batch of onchain write calls and check their status.  

Key points:
- Introduces `wallet_sendCalls` for batched calls.
- Apps can specify `atomicRequired`.
- Wallets declare support for atomic execution via the `atomic` capability.
- `wallet_getCapabilities` allows apps to query supported features.

### Benefits
- **Users:** No need to execute multiple transactions (e.g., ERC-20 approve + transfer). Simplifies UX.  
- **Apps:** Simpler integration, no guessing wallet features.  
- **Wallets:** More context → better confirmation dialogs.  

Atomic execution capability:
- `supported`: All calls executed atomically.
- `ready`: Upgradeable to supported (via [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702)).
- `unsupported`: No atomicity guarantee.

### Why now?
With [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702) in the [Pectra upgrade](https://ethereum.org/en/roadmap/pectra), EOAs can adopt batching through delegation. Apps need a standard → EIP-5792.

### Status
- Currently in **Last Call** (deadline: May 5, 2025).
- Supported by major wallets and tools.

### Get Involved
- Review the [EIP](https://eips.ethereum.org/EIPS/eip-5792).
- Join [Ethereum Magicians discussion](https://ethereum-magicians.org/t/eip-5792-wallet-function-call-api/11374).

---

## Getting Started

### For Wallets
Implement support for:
1. `wallet_getCapabilities`
2. `wallet_sendCalls`
3. `wallet_getCallsStatus`
4. `wallet_showCallsStatus`

#### `wallet_getCapabilities`
Indicates supported capabilities.

Example response:
```json
{
  "atomic": "supported",
  "paymasterService": {
    "supported": true
  }
}
````

#### `wallet_sendCalls`

Processes a batch of calls.

Example request:

```json
{
  "method": "wallet_sendCalls",
  "params": [{
    "version": "2.0.0",
    "chainId": "0x1",
    "from": "0x...",
    "calls": [
      { "to": "0x...", "data": "0x...", "value": "0x0" }
    ],
    "capabilities": {
      "atomic": { "required": true }
    }
  }]
}
```

Example response:

```json
{
  "id": "0x...",
  "capabilities": {
    "atomic": { "status": "supported" }
  }
}
```

#### `wallet_getCallsStatus`

Check batch status. Codes:

| Code | Description                |
| ---- | -------------------------- |
| 100  | Pending                    |
| 200  | Confirmed (all successful) |
| 400  | Offchain failure           |
| 500  | Full revert                |
| 600  | Partial revert             |

Example response:

```json
{
  "status": 200,
  "receipts": [
    {
      "logs": [],
      "status": "0x1",
      "blockHash": "0x...",
      "blockNumber": "0x...",
      "gasUsed": "0x...",
      "transactionHash": "0x..."
    }
  ]
}
```

#### `wallet_showCallsStatus`

Displays call info to users.

Example request:

```json
{
  "method": "wallet_showCallsStatus",
  "params": [{
    "chainId": "0x1",
    "calls": [{ "to": "0x...", "data": "0x...", "value": "0x0" }],
    "status": 200,
    "receipts": [{ "status": "0x1", "blockHash": "0x...", "transactionHash": "0x..." }]
  }]
}
```

---

### For Apps

Libraries that support EIP-5792:

* [Wagmi](https://wagmi.sh/react/api/hooks/useCapabilities)
* [Viem](https://viem.sh/docs/actions/wallet/sendCalls)
* [thirdweb](https://portal.thirdweb.com/references/typescript/v5/hooks#eip5792)

Example with Wagmi:

```tsx
import { useCapabilities } from 'wagmi'

function App() {
  const { data: capabilities } = useCapabilities()
  return <div>{JSON.stringify(capabilities)}</div>
}
```

Example with Viem fallback:

```ts
try {
  const { id } = await walletClient.sendCalls({ account, calls, forceAtomic: true })
  return id
} catch (error) {
  if (error.code === 4200) {
    // Fallback: sendTransaction for each call
  }
}
```

---

## Reference

### wallet\_getCapabilities

Query wallet-supported capabilities.

Params:

* `[Address, string[]]`

Returns:

```json
{
  "0x0": { "flow-control": { "supported": true } },
  "0x2105": { "paymasterService": { "supported": true } }
}
```

---

### wallet\_sendCalls

Submit a batch of calls.

Parameters:

* `version`: `"2.0.0"`
* `id`: optional unique identifier
* `chainId`: hex
* `from`: optional address
* `atomicRequired`: boolean
* `calls`: array of calls
* `capabilities`: requested capabilities

Returns:

```json
{ "id": "0x...", "capabilities": { "atomic": true } }
```

---

### wallet\_getCallsStatus

Check batch execution status.

Returns:

* `version`
* `chainId`
* `id`
* `status` (100–600)
* `atomic`
* `receipts[]`

---

### wallet\_showCallsStatus

Displays status to users.

Params:

* `[string]` → batch ID

---

## Migration to v2.0.0

Key changes:

1. Version from `"1.0"` → `"2.0.0"`.
2. `atomicBatch` replaced by `atomic`.
3. Status codes: strings → numbers (100, 200, etc).
4. New request structure: `chainId` top-level, `id`, `atomicRequired`.
5. Responses are structured objects.
6. `wallet_getCapabilities` accepts chain IDs.
7. `wallet_getCallsStatus` includes `version` + `atomic`.

---

## Capabilities

### atomic

Defines execution guarantees:

* `supported`, `ready`, `unsupported`.

Apps can set `atomicRequired: true | false`.

---

### paymasterService

* Defined in [ERC-7677](https://eips.ethereum.org/EIPS/eip-7677).
* Apps provide `paymasterService.url` in requests.
* Wallets must interact via ERC-7677 endpoints:

  * `pm_getPaymasterStubData`
  * `pm_getPaymasterData`

---

### auxiliaryFunds

* Defined in [ERC-7682](https://ethereum-magicians.org/t/erc-7682-auxiliary-funds-capability/19599).
* Wallets declare `auxiliaryFunds: { supported: true }`.
* Apps should not block actions solely on balance checks.


Wallets
The following wallets support EIP-5792.

This list is not exhaustive. If you know of a wallet that supports EIP-5792, please open a PR to add it.

Coinbase Smart Wallet
Safe{Wallet}
Ambire Wallet
Metamask
Reown AppKit Embedded Wallet
thirdweb In-App and Smart Wallets
Openfort
Abstract Global Wallet

---

```