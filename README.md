# ION Tools

This repo includes tools and utilities to make working with the ION network and using ION DIDs easy for developers integrating DIDs into their apps and services. The packages within are geared toward making interactions with ION maximally accessible for developers, with a primary focus on making their functionality dually available in both client Web and server environments.

## Installation
```bash
npm install @decentralized-identity/ion-tools
```

>💡 Note: Browser bundles are included in package under `dist/browser`.


## Additional Setup
This package depends on the [`@noble/ed25519`](https://github.com/paulmillr/noble-ed25519#usage) and [`@noble/secp256k1`](https://github.com/paulmillr/noble-secp256k1#usage) v2, thus additional steps are needed for some environments:

```ts
// node.js 18 and earlier, needs globalThis.crypto polyfill
import { webcrypto } from 'node:crypto';
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

// React Native needs crypto.getRandomValues polyfill and sha256 for `@noble/secp256k1`
import 'react-native-get-random-values';
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
secp.etc.hmacSha256Sync = (k, ...m) => hmac(sha256, k, secp.etc.concatBytes(...m));
secp.etc.hmacSha256Async = (k, ...m) => Promise.resolve(secp.etc.hmacSha256Sync(k, ...m));

// React Native needs crypto.getRandomValues polyfill and sha512 for `@noble/ed25519`
import 'react-native-get-random-values';
import { sha512 } from '@noble/hashes/sha512';
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));
ed.etc.sha512Async = (...m) => Promise.resolve(ed.etc.sha512Sync(...m));
```


## Usage

### Create ION DID

```javascript
import { anchor, DID, generateKeyPair } from '@decentralized-identity/ion-tools';
import { writeFile } from 'fs/promises';

// Generate keys and ION DID
let authnKeys = await generateKeyPair();
let did = new DID({
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

// Generate and publish create request to an ION node
let createRequest = await did.generateRequest(0);
let anchorResponse = await anchor(createRequest);

// Store the key material and source data of all operations that have been created for the DID
let ionOps = await did.getAllOperations();
await writeFile('./ion-did-ops-v1.json', JSON.stringify({ ops: ionOps }));
```

### Update ION DID

```javascript
import { anchor, DID, generateKeyPair } from '@decentralized-identity/ion-tools';
import { readFile, writeFile } from 'fs/promises';

// Generate new keys
let authnKeys2 = await generateKeyPair();

// Instantiate DID using previously saved state
let ionOps;
await readFile('./ion-did-ops-v1.json', { encoding: 'utf8' })
  .then((data) => {
    ionOps = JSON.parse(data);
  })
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
let did = new DID(ionOps);

// Generate update operation to remove key-1, add key-2, remove some-service-1, and add some-service-2.
let updateOperation = await did.generateOperation('update', {
  removePublicKeys: ['key-1'],
  addPublicKeys: [
    {
      id: 'key-2',
      type: 'EcdsaSecp256k1VerificationKey2019',
      publicKeyJwk: authnKeys2.publicJwk,
      purposes: [ 'authentication' ]
    }
  ],
  removeServices: ['some-service-1'],
  addServices: [
    {
      'id': 'some-service-2',
      'type': 'SomeServiceType',
      'serviceEndpoint': 'http://www.example.com'
    }
  ]
});

// Generate and publish update request to an ION node
let updateRequest = await did.generateRequest(updateOperation);
let anchorRespons = await anchor(updateRequest);

// Store the revised key material and source data for the DID
ionOps = await did.getAllOperations();
await writeFile('./ion-did-ops-v2.json', JSON.stringify({ ops: ionOps }), { encoding: 'utf8' });
```

## Contributing
```bash
git clone https://github.com/decentralized-identity/ion-tools
cd ion-tools
npm install
```

### Available npm scripts
run `npm run <script_name>` to use any of the scripts listed in the table below:

| script     | description                                                     |
| ---------- | --------------------------------------------------------------- |
| `bundle`   | generates  and saves browser bundle to `dist/browser-bundle.js` |
| `lint`     | runs linter without auto-fixing                                 |
| `lint:fix` | runs linter and automatically fixes issues                      |

## API Reference

ION is a high-level library that wraps the lower-level ION SDK to make interfacing with ION components as simple as possible.

### `new DID()`

The `ION.DID` class enables you to generate a fully usable ION DID in a single line of code. The class is invoked as follows:

```js
import { DID, generateKeyPair } from '@decentralized-identity/ion-tools';

let authnKeys = await generateKeyPair();
let did = new DID({
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

The `DID` class provides the following methods:

#### `getURI()` *async*

The `getURI` method of the `DID` class is an async function that returns the URI string for the DID the class instance represents. There are two forms of ION DID URI, the Long-Form URI, which can be used instantly without anchoring an ION DID, and the Short-Form URI, which is only resolvable after a DID has been published to the ION network.

```js
let did = new DID();
let longFormURI = await did.getURI();
let shortFormURI = await did.getURI('short');
```

#### `getSuffix()` *async*

The `getSuffix` method of the `DID` class is an async function that returns the suffix portion of the DID string for the DID URI the class instance represents.

```js
let did = new DID();
// Example DID URI --> "did:ion:EiCZws6U61LV3YmvxmOIlt4Ap5RSJdIkb_lJXhuUPqQYBg"
let suffix = await did.getSuffix();
// Example suffix value --> "EiCZws6U61LV3YmvxmOIlt4Ap5RSJdIkb_lJXhuUPqQYBg"
```

#### `generateOperation(TYPE, CONTENTS, COMMIT)` *async*

The `generateOperation` method of the `DID` class is an async function that generates `update`, `recover`, and `deactivate` operations based on the current lineage of the DID instance. The method returns an operation entry that is appended to the DID operation lineage managed within the class. The function takes the following arguments:

- `type` - String, *required*: the type of operation you want to generate. Supported operations are `update`, `recover`, `deactivate`.
- `contents` - Object, *optional*: the content of a given operation type that should be reflected in the new DID state (examples below).
- `commit` - Boolean, *default: true*: generated operations are automatically appended to the operation chain of the DID instance. If you do not want the operation added to the DID's chain of retained operations, pass an explicit `false` to leave the operation uncommitted.

```js
let did = new DID();
let authnKeys2 = await generateKeyPair();

// UPDATE EXAMPLE

let updateOperation = await did.generateOperation('update', {
  removePublicKeys: ["key-1"],
  addPublicKeys: [
    {
      id: 'key-2',
      type: 'EcdsaSecp256k1VerificationKey2019',
      publicKeyJwk: authnKeys2.publicJwk,
      purposes: [ 'authentication' ]
    }
  ],
  removeServices: ['some-service-1'],
  addServices: [
    {
      'id': 'some-service-2',
      'type': 'SomeServiceType',
      'serviceEndpoint': 'http://www.example.com'
    }
  ]
});

// RECOVERY EXAMPLE

let authnKeys3 = await generateKeyPair();
let recoverOperation = await did.generateOperation('recover', {
  removePublicKeys: ['key-2'],
  addPublicKeys: [
    {
      id: 'key-3',
      type: 'EcdsaSecp256k1VerificationKey2019',
      publicKeyJwk: authnKeys3.publicJwk,
      purposes: [ 'authentication' ]
    }
  ],
  removeServices: ['some-service-2'],
  addServices: [
    {
      'id': 'some-service-3',
      'type': 'SomeServiceType',
      'serviceEndpoint': 'http://www.example.com'
    }
  ]
});

// DEACTIVATE EXAMPLE

let deactivateOperation = await did.generateOperation('deactivate');
```


#### `generateRequest()` *async*

The `generateRequest` method of the `DID` class is an async function that takes either a `number`, in reference to an operation index, or a direct operation payload and returns an operation request object that can be published via an ION node.

```js
let did = new DID({ ... });
let request = await did.generateRequest(0); // 0 = Create, same as did.#ops[0]

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

#### `getState()` *async*

The `getState` method of the `DID` class is an async function that returns the exported state of the DID instance, a JSON object composed of the following values:

- `shortForm` - String: Short hash-based version of the DID URI string (only resolvable when anchored).
- `longForm` - String: Fully self-resolving payload-embedded version of the DID URI string.
- `ops` - Array: Exported array of all operations that have been included in the state chain of the DID (NOTE: reflection of operations in the network subject to inclusion via broadcast and anchoring).

#### `getAllOperations()` *async*

The `getAllOperations` method of the `DID` class is an async function that returns all operations that have been created for the DID the class instance represents. This is useful in storing the key material and source data of operation. (e.g. for wallets that need to output a static data representation of a DID's state)

```js
let did = new DID({ ... });
let operations = await did.getAllOperations();
```

### `generateKeyPair()` *async*

The `generateKeyPair` method is an async function that makes generation of keys effortless. The currently supported key types are `secp256k1` and `Ed25519` (more are in the process of being added).

Example:

```js
let secp256k1KeyPair = await generateKeyPair('secp256k1');

RETURN VALUE:
{
  "publicJwk": {
    "crv": "secp256k1",
    "kty": "EC",
    "x": "L60Mcg_4uhbAO4RaL1eAJ5CKVqBD8cm6PrBuua4gyGA",
    "y": "wwVm2dFCamLZkpGTlRMhdASmPtWuPW9Eg1wLfziwEAs"
  },
  "privateJwk": {
    "crv": "secp256k1",
    "d": "kbnyOrsZGaslyeofzDYqMCibWzsRLJb7ZnnQ2rbdJLA",
    "kty": "EC",
    "x": "L60Mcg_4uhbAO4RaL1eAJ5CKVqBD8cm6PrBuua4gyGA",
    "y": "wwVm2dFCamLZkpGTlRMhdASmPtWuPW9Eg1wLfziwEAs"
  }
}

let Ed25519KeyPair = await generateKeyPair('Ed25519');

RETURN VALUE:
{
  "publicJwk": {
    "crv": "Ed25519",
    "x": "WfrBXcm2vliqsQtHBr6xIBXZHEtangbUnmxs2KT0VD0",
    "kty": "OKP"
  },
  "privateJwk": {
    "crv": "Ed25519",
    "d": "CsUUtvDcTM7EmoNuhLyeGQqSBmrpml1bUdjUAVJvj1I",
    "x": "WfrBXcm2vliqsQtHBr6xIBXZHEtangbUnmxs2KT0VD0",
    "kty": "OKP"
  }
}
```

### `sign(PARAMS)`

The `sign` method generates a signed JWS output of a provided payload, and accepts the following parameters:

1. `PARAMS` - Object, *required*: An object for passing the following properties used in the resolution request:
    - `payload` - *required*: The payload to be signed
    - `privateJwk` - Object, *required*: The JWK object for the private key that will be used to sign
    - `header` - Object, *optional*: Additional JWK header values.

```javascript
import { generateKeyPair, sign } from '@decentralized-identity/ion-tools';

const { privateJwk } = await generateKeyPair();

const jws = await sign({ payload: 'hello world', privateJwk });

// RESULT
// eyJhbGciOiJFUzI1NksifQ.ImhlbGxvIHdvcmxkIg.NKRJVCjK2...
```

### `verify(PARAMS)`

The `verify` method verifies a signed JWS output, and accepts the following parameters:

1. `PARAMS` - Object, *required*: An object for passing the following properties used in the resolution request:
    - `jws` - String, *required*: The JWS to be verified.
    - `publicJwk` - Object, *required*: The JWK object for the public key that will be used to verify the JWS.

```javascript
import { generateKeyPair, sign, verify } from '@decentralized-identity/ion-tools';

const { privateJwk, publicJwk } = await generateKeyPair();

const jws = await sign({ payload: 'hello world', privateJwk });
const isLegit = await verify({ jws, publicJwk }); // true/false
```

#### `resolve(DID_URI, OPTIONS)` *async*

The `resolve` library method resolves a DID URI string and returns the associated DID resolution response object. The method arguments are as follows:

1. `DID_URI` - URI String, *required*
2. `OPTIONS` - Object, *optional*: An object for passing the following options used in the resolution request:
    - `nodeEndpoint` - String, *optional*: URI of the node you desire to contact for resolution. If you are running your own node, use this to pass in your node's resolution endpoint.

```js
import { DID, resolve } from '@decentralized-identity/ion-tools';

const did = new DID();
const longFormDID = await did.getURI();

const didDoc = await resolve(longFormDID);
console.log(didDoc);

/*
RETURN VALUE: 
{
  '@context': 'https://w3id.org/did-resolution/v1',
  didDocument: {
    id: 'did:ion:EiDERULqAU2ndqI2ha1RRrdJUf6Un0HpVqKhbNMJNUm0Rw:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnt9fV0sInVwZGF0ZUNvbW1pdG1lbnQiOiJFaUMtUHptOGpPcFh6TGJtbDNWdmNBcUVzOUFXRTQxSEF0WWdLXzd1Qm95R013In0sInN1ZmZpeERhdGEiOnsiZGVsdGFIYXNoIjoiRWlCSzFITU1rVmhoSkxpQ3k3OWFUd0tnam9mRDBOOHViQ19McmU2c2ZxZDRHdyIsInJlY292ZXJ5Q29tbWl0bWVudCI6IkVpQkhPU0hxZmFFaERjRDNtcFFLd0Y2aV9WTl9XclNwRmhlQlFyZ3ZCQ3FSVVEifX0',
    '@context': [ 'https://www.w3.org/ns/did/v1', [Object] ]
  },
  didDocumentMetadata: {
    method: {
      published: false,
      recoveryCommitment: 'EiBHOSHqfaEhDcD3mpQKwF6i_VN_WrSpFheBQrgvBCqRUQ',
      updateCommitment: 'EiC-Pzm8jOpXzLbml3VvcAqEs9AWE41HAtYgK_7uBoyGMw'
    },
    equivalentId: [ 'did:ion:EiDERULqAU2ndqI2ha1RRrdJUf6Un0HpVqKhbNMJNUm0Rw' ]
  }
}
*/
```

### `anchor(REQUEST_BODY, OPTIONS)`

The `anchor` function is used to submit an ION operation for anchoring with an ION node that implements a challenge and response gated ION node endpoint. The class instantiation arguments are as follows:

1. `REQUEST_BODY` - Object, *required*
2. `OPTIONS` - Object, *optional*: An object for passing the following options used in the resolution request:
    - `challengeEndpoint` - URI String, *optional*: URI of the challenge endpoint for the ION node you are submitting to.
    - `solutionEndpoint` - URI String, *optional*: URI of the solution endpoint for the ION node you are submitting your completed challenge to.

> NOTE: Endpoint URIs will default to `https://beta.ion.msidentity.com` if not supplied

```javascript
const did = new DID();
const anchorRequest = await did.generateRequest();
const respone = await anchor(anchorRequest);
```

> NOTE: The `requestBody` value above is the JSON representation of the ION operation produced by the DID class's `generateRequest()` function.
