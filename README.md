# ION Tools

This repo includes tools and utilities to make working with the ION network and using ION DIDs easy for developers integrating DIDs into their apps and services. The packages within are geared toward making interactions with ION maximally accessible for developers, with a primary focus on making their functionality dually available in both client Web and server environments.

## Installation

Run the following commands to use the ION tools in this repo:

1. `npm install`

If you want to generate the browser bundle, continue with these steps:

> Note for noobs: first clone the `ion-tools` project from github to your local machine, then `npm install -g browserify; npm install esmify --save-dev`

2. `cd` into the `@decentralized-identity/ion-tools` directory
3. `npm install`
4. `npm run build`
5. Files are output to `/dist` as `ion.js` and `ion.min.js`

To use the ION.js library in your code, you have two options based on whether you're operating in a browser or Node.js environment:

**Browser**

Simply include the js library's file from `/dist` in your web app the way you would any other module, using either `<script src="ion.js" type="module">` or `import 'ion.js'`. The module will add the `ION` variable to the global scope.

> Note for noobs: Create and index.html to include `<script src="ion.js" type="module">` within the body tag, for example

```
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>A First DID app</title>
   </head>
  <body>
    <div id="app">
    </div>
    <script src="ion.js" type="module"></script>
  </body>
</html>`
```


**Node.js**

For use in Node.js, you can include the package via `const ION = require('@decentralized-identity/ion-tools')`.

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

The `getURI` method of the `ION.DID` class is an async function that returns the URI string for the DID the class instance represents. There are two forms of ION DID URI, the Long-Form URI, which can be used instantly without anchoring an ION DID, and the Short-Form URI, which is only resolvable after a DID has been published to the ION network.

```js
let did = new ION.DID({ ... });
let longFormURI = await did.getURI();
let shortFormURI = await did.getURI('short');
```

#### `getSuffix()` *async*

The `getSuffix` method of the `ION.DID` class is an async function that returns the suffix portion of the DID string for the DID URI the class instance represents.

```js
let did = new ION.DID({ ... });
// Example DID URI --> "did:ion:EiCZws6U61LV3YmvxmOIlt4Ap5RSJdIkb_lJXhuUPqQYBg"
let suffix = await did.getSuffix();
// Example suffix value --> "EiCZws6U61LV3YmvxmOIlt4Ap5RSJdIkb_lJXhuUPqQYBg"
```

#### `generateOperation(TYPE, CONTENTS, COMMIT)` *async*

The `generateOperation` method of the `ION.DID` class is an async function that generates `update`, `recover`, and `deactivate` operations based on the current lineage of the DID instance. The method returns an operation entry that is appended to the DID operation lineage managed within the class. The function takes the following arguments:

- `type` - String, *required*: the type of operation you want to generate. Supported operations are `update`, `recover`, `deactivate`.
- `contents` - Object, *optional*: the content of a given operation type that should be reflected in the new DID state (examples below).
- `commit` - Boolean, *default: true*: generated operations are automatically appended to the operation chain of the DID instance. If you do not want the operation added to the DID's chain of retained operations, pass an explicit `false` to leave the operation uncommitted.

```js
let did = new ION.DID({ ... });
let authnKeys2 = await ION.generateKeyPair();

// UPDATE EXAMPLE

let updateOperation = await did.generateOperation('update', {
  removePublicKeys: ["key-1"],
  addPublicKeys: [{
    {
      id: 'key-2',
      type: 'EcdsaSecp256k1VerificationKey2019',
      publicKeyJwk: authnKeys2.publicJwk,
      purposes: [ 'authentication' ]
    }
  }],
  removeServices: ["some-service-1"],
  addServices: [{
    "id": "some-service-2",
    "type": "SomeServiceType",
    "serviceEndpoint": "http://www.example.com"
  }]
});

// RECOVERY EXAMPLE

let authnKeys3 = await ION.generateKeyPair();
let recoverOperation = await did.generateOperation('recover', {
  removePublicKeys: ["key-2"],
  addPublicKeys: [{
    {
      id: 'key-3',
      type: 'EcdsaSecp256k1VerificationKey2019',
      publicKeyJwk: authnKeys3.publicJwk,
      purposes: [ 'authentication' ]
    }
  }],
  removeServices: ["some-service-2"],
  addServices: [{
    "id": "some-service-3",
    "type": "SomeServiceType",
    "serviceEndpoint": "http://www.example.com"
  }]
});

// DEACTIVATE EXAMPLE

let deactivateOperation = await did.generateOperation('deactivate');
```


#### `generateRequest()` *async*

The `generateRequest` method of the `ION.DID` class is an async function that takes either a `number`, in reference to an operation index, or a direct operation payload and returns an operation request object that can be published via an ION node.

```js
let did = new ION.DID({ ... });
let request = await did.generateRequest(0); // 0 = Create, same as did._ops[0]

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

The `getAllOperations` method of the `ION.DID` class is an async function that returns the exported state of the DID instance, a JSON object composed of the following values:

- `shortForm` - String: Short hash-based version of the DID URI string (only resolvable when anchored).
- `longForm` - String: Fully self-resolving payload-embedded version of the DID URI string.
- `ops` - Array: Exported array of all operations that have been included in the state chain of the DID (NOTE: reflection of operations in the network subject to inclusion via broadcast and anchoring).

#### `getAllOperations()` *async*

The `getAllOperations` method of the `ION.DID` class is an async function that returns all operations that have been created for the DID the class instance represents. This is useful in storing the key material and source data of operation. (e.g. for wallets that need to output a static data representation of a DID's state)

```js
let did = new ION.DID({ ... });
let operations = await did.getAllOperations();
```

### `ION.generateKeyPair()` *async*

The `generateKeyPair` method is an async function that makes generation of keys effortless. The currently supported key types are `secp256k1` and `Ed25519` (more are in the process of being added).

Example:

```js
let secp256k1KeyPair = await ION.generateKeyPair('secp256k1');

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

let Ed25519KeyPair = await ION.generateKeyPair('Ed25519');

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

### `ION.signJws(PARAMS)`

The `ION.signJws` method generates a signed JWS output of a provided payload, and accepts the following parameters:

1. `PARAMS` - Object, *required*: An object for passing the following properties used in the resolution request:
    - `payload` - *required*: The payload to be signed
    - `privateJwk` - Object, *required*: The JWK object for the private key that will be used to sign
    - `header` - Object, *optional*: Additional JWK header values.
    - `detached` - Boolean, *optional*: Pass `true` to output a payload-detached JWS output.

```javascript
const jws = await ION.signJws({
  payload: 'hello world',
  privateJwk: { ... }
});

// RESULT
// eyJhbGciOiJFUzI1NksifQ.ImhlbGxvIHdvcmxkIg.NKRJVCjK2...
```

### `ION.verifyJws(PARAMS)`

The `ION.verifyJws` method verifies a signed JWS output, and accepts the following parameters:

1. `PARAMS` - Object, *required*: An object for passing the following properties used in the resolution request:
    - `jws` - String, *required*: The JWS to be verified.
    - `publicJwk` - Object, *required*: The JWK object for the public key that will be used to verify the JWS.
    - `payload` - *optional*: Only required if verifying a payload-detached JWS

```javascript
const jws = await ION.verifyJws({
  jws: 'eyJhbGciOiJFUzI1NksifQ.ImhlbGxvIHdvcmxkIg.NK3f...',
  publicJwk: { ... }
});

// RESULT
// success: returns 'hello world' to await/then(response)
// fail: throws verification error in try/catch(error)
```

#### `ION.resolve(DID_URI, OPTIONS)` *async*

The `resolve` library method resolves a DID URI string and returns the associated DID resolution response object. The method arguments are as follows:

1. `DID_URI` - URI String, *required*
2. `OPTIONS` - Object, *optional*: An object for passing the following options used in the resolution request:
    - `nodeEndpoint` - String, *optional*: URI of the node you desire to contact for resolution. If you are running your own node, use this to pass in your node's resolution endpoint.

```js
const response = await ION.resolve('did:ion:EiDqtYampb2uthrAz_7H5AsqlboL3okP3y...');

RETURN VALUE:
{
    "@context": "https://w3id.org/did-resolution/v1",
    "didDocument": {
        "id": "did:ion:EiDqtYampb2uthrAz_7H5AsqlboL3okP3y4G8M40fY4ASA",
        "@context": [
            "https://www.w3.org/ns/did/v1",
            {
                "@base": "did:ion:EiDqtYampb2uthrAz_7H5AsqlboL3okP3y4G8M40fY4ASA"
            }
        ],
        "service": [
            {
                "id": "#domain-1",
                "type": "LinkedDomains",
                "serviceEndpoint": "https://foo.example.com"
            }
        ],
        "verificationMethod": [
            {
                "id": "#key-1",
                "controller": "",
                "type": "EcdsaSecp256k1VerificationKey2019",
                "publicKeyJwk": {
                    "crv": "secp256k1",
                    "kty": "EC",
                    "x": "IQoF6bqUDvBhGWUglcM7uq8BwqsEw3zAKMjPPIs_uW8",
                    "y": "szWeFJDgOVJ2vWm9u6tZoRugeAQQNQ6YR7ZbgiUfnio"
                }
            }
        ],
        "authentication": [
            "#key-1"
        ]
    },
    "didDocumentMetadata": {
        "method": {
            "published": false,
            "recoveryCommitment": "EiBPyOePlnmJ122lDhQJWJ0grIExBwjreUfOe36boqm-jg",
            "updateCommitment": "EiCfGApgMBs653vH-JAxgqBNqkY_7XjAMInCR5o04bXRFw"
        },
        "equivalentId": [
            "did:ion:EiDqtYampb2uthrAz_7H5AsqlboL3okP3y4G8M40fY4ASA"
        ]
    }
}
```

### `new ION.AnchorRequest(REQUEST_BODY, OPTIONS)`

The `ION.AnchorRequest` class is used to submit an ION operation for anchoring with an ION node that implements a challenge and response gated ION node endpoint. The class instantiation arguments are as follows:

1. `REQUEST_BODY` - Object, *required*
2. `OPTIONS` - Object, *optional*: An object for passing the following options used in the resolution request:
    - `challengeEndpoint` - URI String, *optional*: URI of the challenge endpoint for the ION node you are submitting to.
    - `solutionEndpoint` - URI String, *optional*: URI of the solution endpoint for the ION node you are submitting your completed challenge to.

> NOTE: Endpoint URIs will default to `https://beta.ion.msidentity.com` if not supplied

#### `submit()` *async*

Submits the ION operation request, per the request object and endpoints set during class instantiation.

```javascript
const did = new ION.DID();
const requestBody = await did.generateRequest();
const request = new ION.AnchorRequest(requestBody);
let response = await request.submit();
```

> NOTE: The `requestBody` value above is the JSON representation of the ION operation produced by the ION.DID class's `generateRequest()` function.
