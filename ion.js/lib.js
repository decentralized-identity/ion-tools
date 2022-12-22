const fetch = require('cross-fetch');
const RawIonSdk = require('@decentralized-identity/ion-sdk');
const ProofOfWorkSDK = require('ion-pow-sdk');
const ed25519 = require('@noble/ed25519');
const secp256k1 = require('@noble/secp256k1');
const { base64url } = require('multiformats/bases/base64');
const { sha256 } = require('multiformats/hashes/sha2');

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

var ION = globalThis.ION = {
  SDK: RawIonSdk,

  async generateKeyPair(type) {
    let method;
    let keys = {};
    switch (type) {
      case 'Ed25519':
      case 'EdDSA':
        method = 'generateEd25519OperationKeyPair';
        break;
      case 'secp256k1':
      case 'ES256K':
      default:
        method = 'generateEs256kOperationKeyPair';
    }
    [keys.publicJwk, keys.privateJwk] = await RawIonSdk.IonKey[method]();

    return keys;
  },

  /**
   * signs the payload provided using the key provided
   * @param {object} params 
   * @param {any} params.payload - anything JSON stringifiable.
   * @param {object} [params.header] - any properties you want included in the header. `alg` will be included for you
   * @param {PrivateJWK} params.privateJwk - the key to sign with
   * @returns {string} compact JWS
   */
  async signJws(params = {}) {
    const { header = {}, payload, privateJwk } = params;
    let signer;
    let signerOpts;

    if (privateJwk.crv === 'Ed25519') {
      header.alg = 'EdDSA';
      signer = ed25519;
    } else if (privateJwk.crv = 'secp256k1') {
      header.alg = 'ES256K';

      signer = secp256k1;
      signerOpts = { der: false };

    } else {
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

    const signatureBytes = await signer.sign(messageBytes, privateKeyBytes, signerOpts);
    const signature = base64url.baseEncode(signatureBytes);

    return `${message}.${signature}`;
  },

  /**
   *  verifies the provided JWS with the provided public key
   * @param {object} params
   * @param {string} params.jws - the compact jws to verify
   * @param {PublicJWK} params.publicJwk - the public key used to verify the signature
   * @returns {boolean}
   */
  async verifyJws(params = {}) {
    const { jws, publicJwk } = params;
    const [headerBase64Url, payloadBase64Url, signatureBase64Url] = jws.split('.');

    const message = `${headerBase64Url}.${payloadBase64Url}`;
    const messageBytes = new TextEncoder().encode(message);

    const signatureBytes = base64url.baseDecode(signatureBase64Url);

    if (publicJwk.crv === 'secp256k1') {
      const xBytes = base64url.baseDecode(publicJwk.x);
      const yBytes = base64url.baseDecode(publicJwk.y);

      const publicKeyBytes = new Uint8Array(xBytes.length + yBytes.length + 1);

      // create an uncompressed public key using the x and y values from the provided JWK.
      // a leading byte of 0x04 indicates that the public key is uncompressed
      // (e.g. x and y values are both present)
      publicKeyBytes.set([0x04], 0);
      publicKeyBytes.set(xBytes, 1);
      publicKeyBytes.set(yBytes, xBytes.length + 1);

      const hashedMessage = await sha256.encode(messageBytes);

      return secp256k1.verify(signatureBytes, hashedMessage, publicKeyBytes);
    } else if (publicJwk.crv === 'Ed25519') {
      const publicKeyBytes = base64url.baseDecode(publicJwk.x);

      return ed25519.verify(signatureBytes, messageBytes, publicKeyBytes);
    } else {
      throw new Error('Unsupported cryptographic type');
    }
  },

  async resolve(didUri, options = {}) {
    return fetch((options.nodeEndpoint || 'https://beta.discover.did.microsoft.com/1.0/identifiers/') + didUri)
      .then(response => {
        if (response.status >= 400) throw new Error('Not Found');
        return response.json();
      });
  }
};

ION.AnchorRequest = class {
  constructor(requestBody, options = {}) {
    this.body = requestBody;
    this.challengeEndpoint = options.challengeEndpoint;
    this.solutionEndpoint = options.solutionEndpoint;
    if (!this.challengeEndpoint || !this.solutionEndpoint) {
      this.challengeEndpoint = 'https://beta.ion.msidentity.com/api/v1.0/proof-of-work-challenge';
      this.solutionEndpoint = 'https://beta.ion.msidentity.com/api/v1.0/operations';
    }
  }
  async submit() {
    return ProofOfWorkSDK.submitIonRequest(
      this.challengeEndpoint,
      this.solutionEndpoint,
      JSON.stringify(this.body)
    );
  }
}

ION.DID = class {
  constructor(options = {}) {
    this._ops = options.ops || [];
    if (!this._ops[0]) {
      this._ops[0] = this.generateOperation('create', options.content || {}, false);
    }
  }

  async getState() {
    return {
      shortForm: await this.getURI('short'),
      longForm: await this.getURI(),
      ops: await this.getAllOperations()
    }
  }

  getAllOperations() {
    return Promise.all(this._ops);
  }

  async getOperation(index) {
    return this._ops[index];
  }

  async getURI(form) {
    const create = await this.getOperation(0);
    this._longForm = this._longForm || await RawIonSdk.IonDid.createLongFormDid({
      recoveryKey: create.recovery.publicJwk,
      updateKey: create.update.publicJwk,
      document: create.content
    });
    return !form || form === 'long' ? this._longForm : this._longForm.split(':').slice(0, -1).join(':');
  }

  async getSuffix() {
    return (await this.getURI('short')).split(':').pop();
  }

  async generateOperation(type, content, commit = true) {
    let ops = await this.getAllOperations();
    let lastOp = ops[ops.length - 1];
    if (lastOp && lastOp.operation === 'deactivate') {
      throw 'Cannot perform further operations on a deactivated DID'
    }
    let op = {
      operation: type,
      content: content
    };
    if (type !== 'create') {
      op.previous = ops.reduce((last, op) => {
        return op.operation === type || (op.operation === 'recover' && (type === 'deactivate' || type === 'update')) ? op : last;
      }, ops[0])
    }
    if (type === 'create' || type === 'recover') {
      op.recovery = await ION.generateKeyPair()
    }
    if (type !== 'deactivate') {
      op.update = await ION.generateKeyPair()
    }
    if (commit) this._ops.push(op);
    return op;
  }

  async generateRequest(payload = 0, options = {}) {
    const op = typeof payload === 'number' ? await this.getOperation(payload) : payload;
    switch (op.operation) {
      case 'update':
        return RawIonSdk.IonRequest.createUpdateRequest({
          didSuffix: await this.getSuffix(),
          signer: options.signer || RawIonSdk.LocalSigner.create(op.previous.update.privateJwk),
          updatePublicKey: op.previous.update.publicJwk,
          nextUpdatePublicKey: op.update.publicJwk,
          servicesToAdd: op.content?.addServices,
          idsOfServicesToRemove: op.content?.removeServices,
          publicKeysToAdd: op.content?.addPublicKeys,
          idsOfPublicKeysToRemove: op.content?.removePublicKeys
        });
        break;

      case 'recover':
        return RawIonSdk.IonRequest.createRecoverRequest({
          didSuffix: await this.getSuffix(),
          signer: options.signer || RawIonSdk.LocalSigner.create(op.previous.recovery.privateJwk),
          recoveryPublicKey: op.previous.recovery.publicJwk,
          nextRecoveryPublicKey: op.recovery.publicJwk,
          nextUpdatePublicKey: op.update.publicJwk,
          document: op.content
        });
        break;

      case 'deactivate':
        return RawIonSdk.IonRequest.createDeactivateRequest({
          didSuffix: await this.getSuffix(),
          recoveryPublicKey: op.previous.recovery.publicJwk,
          signer: options.signer || RawIonSdk.LocalSigner.create(op.previous.recovery.privateJwk)
        });
        break;

      case 'create':
      default:
        return RawIonSdk.IonRequest.createCreateRequest({
          recoveryKey: op.recovery.publicJwk,
          updateKey: op.update.publicJwk,
          document: op.content
        });
    }
  }
};

module.exports = ION;
