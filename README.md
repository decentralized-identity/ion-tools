# ION Tools

This repo includes tools and utilities to make working with the ION network and using ION DIDs easy for developers integrating DIDs into their apps and services. The packages within are geared toward making interactions with ION maximally accessible for developers, with a primary focus on making their functionality dually available in both client Web and server environments.

## Installation

Run the following commands to use the ION tools in this repo:

1. `npm install`
2. `npm run build`

## ION.js

ION is a high-level library that wraps the lower-level ION SDK to make interfacing with ION components as simple as possible.

### `new ION.DID()`

The `ION.DID` class enables you to generate a fully usable ION DID in a single line of code. The class is invoked as follows:

```js
let authnKeys = await ION.generateKeyPair();
let did = new ION.DID({
  content: {
    publicKeys: [
      {
        id: 'key-1',
        type: 'EcdsaSecp256k1VerificationKey2019',
        publicKeyJwk: authnKeys.publicJwk,
        purposes: [ 'authentication' ]
      }
    ],
    services: [
      {
        id: 'domain-1',
        type: 'LinkedDomains',
        serviceEndpoint: 'https://foo.example.com'
      }
    ]
  }
});
```

The `ION.DID` class provides the following methods:

#### `getURI()` *async*

The `getURI()` method of the `ION.DID` class is an async function that returns the URI string for the DID the class instance represents. There are two forms of ION DID URI, the Long-Form URI, which can be used instantly without anchoring an ION DID, and the Short-Form URI, which is only resolvable after a DID has been published to the ION network.

```js
let did = new ION.DID({ ... });
let longFormURI = await did.getURI();
let shortFormURI = await did.getURI('short');
```

#### `generateRequest()` *async*

The `generateRequest()` method of the `ION.DID` class is an async function that takes either a `number`, in reference to an operation index, or a direct operation payload and returns an operation request object that can be published via an ION node.

```js
let did = new ION.DID({ ... });
let request = await did.generateRequest(0); // 0 = Create

RETURN VALUE:
{
  "type": "create",
  "suffixData": {
    "deltaHash": "EiDuQtYw8kc30k5nnIHcv870qkTCmCC6a4ghcXRjsgZQpw",
    "recoveryCommitment": "EiD9AtwEsDH7p963JPMk2CAzQyu-bT-V49j3_pyw-amSCg"
  },
  "delta": {
    "updateCommitment": "EiDEiLHSm7lcsVmk47wmVNUZASRcv49mSgr4KmW6tG37-w",
    "patches": [
      {
        "action": "replace",
        "document": {
          "publicKeys": [
            {
              "id": "key-1",
              "type": "EcdsaSecp256k1VerificationKey2019",
              "publicKeyJwk": {
                "kty": "EC",
                "crv": "secp256k1",
                "x": "bk7ApbCTcBAcRtfLK8bVFMQyhwLb6Rw47KoYnDeOq90",
                "y": "T8ElVBOT81E_E5jSg0U1iVqCj--brrjROedXFkehDv8"
              },
              "purposes": [
                "authentication"
              ]
            }
          ],
          "services": [
            {
              "id": "domain-1",
              "type": "LinkedDomains",
              "serviceEndpoint": "https://foo.example.com"
            }
          ]
        }
      }
    ]
  }
}
```



#### `getAllOperations()` *async*

The `getAllOperations()` method of the `ION.DID` class is an async function that returns all operations that have been created for the DID the class instance represents. This is useful in storing the key material and source data of operation. (e.g. for wallets that need to output a static data representation of a DID's state)

```js
let did = new ION.DID({ ... });
let operations = await did.getAllOperations();
```

### `ION.generateKeyPair()` *async*

The `generateKeyPair` method is an async function that makes generation of keys effortless. The only currently supported key type is `secp256k1`, but more will be added in the near future.

Example:

```js
let keypair = await ION.generateKeyPair();

RETURN VALUE:
{
  publicJwk: {
    crv: "secp256k1",
    kty: "EC",
    x: "L60Mcg_4uhbAO4RaL1eAJ5CKVqBD8cm6PrBuua4gyGA",
    y: "wwVm2dFCamLZkpGTlRMhdASmPtWuPW9Eg1wLfziwEAs"
  },
  privateJwk: {
    crv: "secp256k1",
    d: "kbnyOrsZGaslyeofzDYqMCibWzsRLJb7ZnnQ2rbdJLA",
    kty: "EC",
    x: "L60Mcg_4uhbAO4RaL1eAJ5CKVqBD8cm6PrBuua4gyGA",
    y: "wwVm2dFCamLZkpGTlRMhdASmPtWuPW9Eg1wLfziwEAs"
  }
}
```

### `new ION.POW()`

The `ION.POW` class enables you submit proof of work requests as following:

#### `submitIonRequest()` *async*
```
const ionDid = new ION.DID()
const request = ionDid.generateRequest() 
const pow = new ION.POW()
await pow.submitIonRequest('https://beta.ion.msidentity.com/api/v1.0/proof-of-work-challenge', 'https://beta.ion.msidentity.com/api/v1.0/operations', request)
```

with request being the JOSN stringified result of the ION.DID.generateRequest() function.
