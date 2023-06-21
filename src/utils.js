import crossFetch from 'cross-fetch';
import ProofOfWorkSDK from '@decentralized-identity/ion-pow-sdk';

import * as ed25519 from '@noble/ed25519';
import * as secp256k1 from '@noble/secp256k1';

import { base64url } from 'multiformats/bases/base64';
import { IonKey } from '@decentralized-identity/ion-sdk';
import { sha256 } from 'multiformats/hashes/sha2';

// supports fetch in: node, browsers, and browser extensions.
// uses native fetch if available in environment or falls back to a ponyfill.
// 'cross-fetch' is a ponyfill that uses `XMLHTTPRequest` under the hood.
// `XMLHTTPRequest` cannot be used in browser extension background service workers.
// browser extensions get even more strict with `fetch` in that it cannot be referenced
// indirectly.
const fetch = globalThis.fetch ?? crossFetch;

/**
 * @typedef {object} PrivateJWK
 * @property {'Ed25519'|'secp256k1'} privateJWK.crv
 * @property {string} privateJWK.d
 */

/**
 * @typedef {object} PublicJWK
 * @property {'Ed25519'|'secp256k1'} publicJWK.crv
 * @property {string} publicJWK.x
 * @property {string} [publicJWK.y]
 */

/**
 * @typedef {object} KeyPair
 * @property {PrivateJWK} privateJwk
 * @property {PublicJWK} publicJwk
 */

const keyGenerators = {
  'Ed25519': IonKey.generateEd25519OperationKeyPair,
  'EdDSA': IonKey.generateEd25519OperationKeyPair,
  'secp256k1': IonKey.generateEs256kOperationKeyPair,
  'ES256K': IonKey.generateEs256kOperationKeyPair
};

/**
 * generates a keypair of the type provided
 * @param {'Ed25519'| 'EdDSA' | 'secp256k1' | 'ES256K'} type
 * @returns {KeyPair}
 */
export async function generateKeyPair(type = 'secp256k1') {
  const keyGeneratorFn = keyGenerators[type];

  if (!keyGeneratorFn) {
    throw new Error('Unsupported key type');
  }

  const [ publicJwk, privateJwk ] = await keyGeneratorFn();
  return { publicJwk, privateJwk };
}

/**
 * signs the payload provided using the key provided
 * @param {object} params
 * @param {any} params.payload - anything JSON stringifiable.
 * @param {object} [params.header] - any properties you want included in the header. `alg` will be included for you
 * @param {PrivateJWK} params.privateJwk - the key to sign with
 * @returns {string} compact JWS
 */
export async function sign(params = { }) {
  const { header = { }, payload, privateJwk } = params;

  switch (privateJwk.crv) {
    case 'Ed25519':
      header.alg = 'EdDSA';
      break;

    case 'secp256k1':
      header.alg = 'ES256K';
      break;

    default:
      throw new Error('Unsupported cryptographic type');
  }

  const textEncoder = new TextEncoder();

  const headerStr = JSON.stringify(header);
  const headerBytes = textEncoder.encode(headerStr);
  const headerBase64Url = base64url.baseEncode(headerBytes);

  const payloadStr = JSON.stringify(payload);
  const payloadBytes = textEncoder.encode(payloadStr);
  const payloadBase64Url = base64url.baseEncode(payloadBytes);

  // this is what's going to get signed
  const message = `${headerBase64Url}.${payloadBase64Url}`;
  let messageBytes = textEncoder.encode(message);

  if (privateJwk.crv === 'secp256k1') {
    messageBytes = await sha256.encode(messageBytes);
  }

  const privateKeyBytes = base64url.baseDecode(privateJwk.d);

  // sign the actual payload
  let signatureBytes;
  if (privateJwk.crv === 'Ed25519') {
    signatureBytes = await ed25519.signAsync(messageBytes, privateKeyBytes);
  }
  else if (privateJwk.crv === 'secp256k1') {
    const signature = await secp256k1.signAsync(messageBytes, privateKeyBytes);
    signatureBytes = signature.toCompactRawBytes();
  }
  const signature = base64url.baseEncode(signatureBytes);

  return `${message}.${signature}`;
}

/**
 *  verifies the provided JWS with the provided public key
 * @param {object} params
 * @param {string} params.jws - the compact jws to verify
 * @param {PublicJWK} params.publicJwk - the public key used to verify the signature
 * @returns {boolean}
 */
export async function verify(params = { }) {
  const { jws, publicJwk } = params;
  const [ headerBase64Url, payloadBase64Url, signatureBase64Url ] = jws.split('.');

  const message = `${headerBase64Url}.${payloadBase64Url}`;
  const messageBytes = new TextEncoder().encode(message);

  const signatureBytes = base64url.baseDecode(signatureBase64Url);

  switch (publicJwk.crv) {
    case 'secp256k1': {
      const xBytes = base64url.baseDecode(publicJwk.x);
      const yBytes = base64url.baseDecode(publicJwk.y);

      const publicKeyBytes = new Uint8Array(xBytes.length + yBytes.length + 1);

      // create an uncompressed public key using the x and y values from the provided JWK.
      // a leading byte of 0x04 indicates that the public key is uncompressed
      // (e.g. x and y values are both present)
      publicKeyBytes.set([ 0x04 ], 0);
      publicKeyBytes.set(xBytes, 1);
      publicKeyBytes.set(yBytes, xBytes.length + 1);

      const hashedMessage = await sha256.encode(messageBytes);

      return secp256k1.verify(signatureBytes, hashedMessage, publicKeyBytes);
    }

    case 'Ed25519': {
      const publicKeyBytes = base64url.baseDecode(publicJwk.x);

      return ed25519.verifyAsync(signatureBytes, messageBytes, publicKeyBytes);
    }

    default:
      throw new Error('Unsupported cryptographic type');
  }
}

/**
 * resolves the ION DID provided
 * @param {string} didUri
 * @param {object} options
 * @param {string} [nodeEndpoint] - the resolver node
 * @returns
 */
export async function resolve(didUri, options = { }) {
  const { nodeEndpoint = 'https://beta.discover.did.microsoft.com/1.0/identifiers' } = options;

  const response = await fetch(`${nodeEndpoint}/${didUri}`);

  if (response.status >= 400) {
    throw new Error(response.statusText);
  }

  return response.json();
}

export async function anchor(anchorRequest, options = { }) {
  const {
    challengeEndpoint = 'https://beta.ion.msidentity.com/api/v1.0/proof-of-work-challenge',
    solutionEndpoint = 'https://beta.ion.msidentity.com/api/v1.0/operations'
  } = options;

  return ProofOfWorkSDK.submitIonRequest(challengeEndpoint, solutionEndpoint, JSON.stringify(anchorRequest));
};