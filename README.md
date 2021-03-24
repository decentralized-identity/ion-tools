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

The `getURI` method of the `ION.DID` class is an async function that returns the URI string for the DID the class instance represents. There are two forms of ION DID URI, the Long-Form URI, which can be used instantly without anchoring an ION DID, and the Short-Form URI, which is only resolvable after a DID has been published to the ION network.

```js
let did = new ION.DID({ ... });
let longFormURI = await did.getURI();
let shortFormURI = await did.getURI('short');
```

#### `generateRequest()` *async*

The `generateRequest` method of the `ION.DID` class is an async function that takes either a `number`, in reference to an operation index, or a direct operation payload and returns an operation request object that can be published via an ION node.

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

The `getAllOperations` method of the `ION.DID` class is an async function that returns all operations that have been created for the DID the class instance represents. This is useful in storing the key material and source data of operation. (e.g. for wallets that need to output a static data representation of a DID's state)

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
const requestBody = did.generateRequest() ;
const request = new ION.AnchorRequest(requestBody);
let response = await request.submit();
```

> NOTE: The `requestBody` value above is the JSON representation of the ION operation produced by the ION.DID class's `generateRequest()` function.