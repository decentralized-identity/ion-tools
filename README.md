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
let authnKeys = ION.generateKeyPair();
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

/* RETURNS:
{
  publicJwk: {
    crv: "secp256k1"
    kty: "EC"
    x: "vzdebSynLu8K4FFAjJ3J3A19wkQ_8fxE3ZJkEAUUX_4"
    y: "dfa9DA3nOu427dHVgxRCVhwSBL2ZWXshlMLWhxDydKK"
  },
  privateJwk: {
    crv: "secp256k1"
    d: "cibepTzdfasdfdfadf89d24q34nc427CXAwKMHxPX7U"
    kty: "EC"
    x: "vzdebSynLu8K4FFAjJ3J3A19wkQ_8fxE3ZJkEAUUX_4"
    y: "dfa9DA3nOu427dHVgxRCVhwSBL2ZWXshlMLWhxDydKK"
  }
}
*/
```

