const fetch = require('cross-fetch');
const randomBytes = require('randombytes');
const ed25519 = require('@transmute/did-key-ed25519');
const secp256k1 = require('@transmute/did-key-secp256k1');
const RawIonSdk = require('@decentralized-identity/ion-sdk');
const ProofOfWorkSDK = require('ion-pow-sdk');

async function _generateKeyPair(factory){
  const keyPair = await factory.generate({
    secureRandom: () => randomBytes(32)
  });
  const { publicKeyJwk, privateKeyJwk } = await keyPair.toJsonWebKeyPair(true);
  return {
    publicJwk: publicKeyJwk,
    privateJwk: privateKeyJwk
  }
}

var ION = globalThis.ION = {
  SDK: RawIonSdk,
  async generateKeyPair (type) {
    switch (type) {
      case 'Ed25519':
      case 'EdDSA':
        return await _generateKeyPair(ed25519.Ed25519KeyPair);

      case 'secp256k1':
      case 'ES256K':
      default:
        return await _generateKeyPair(secp256k1.Secp256k1KeyPair);
    }
  },
  async signJws(params = {}){
    let method = 'sign';
    let payload = params.payload;
    let header = params.header || {};
    if (params.detached) {
      method = 'signDetached';
      payload = payload instanceof Buffer ? payload : Buffer.from(payload);
      header = Object.assign(header, {
        b64: false,
        crit: ['b64']
      });
    }
    switch(params.privateJwk.crv){
      case 'secp256k1':
        header = Object.assign(header, {
          alg: 'ES256K'
        });
        return secp256k1.ES256K[method](payload, params.privateJwk, header);
      default: throw new Error('Unsupported cryptographic type');
    } 
  },
  async verifyJws(params = {}){
    let payload = params.payload;
    if (payload) payload = payload instanceof Buffer ? payload : Buffer.from(payload);
    switch(params.privateJwk.crv){
      case 'secp256k1':
        return params.payload ? 
          secp256k1.ES256K.verifyDetached(params.jws, payload, params.privateJwk) : 
          secp256k1.ES256K.verify(params.jws, params.privateJwk);
      default: throw new Error('Unsupported cryptographic type');
    } 
  },
  async generateDidPayload (content = {}) {
    return {
      operation: 'create',
      content: content,
      recovery: await this.generateKeyPair(),
      update: await this.generateKeyPair()
    };
  },
  async resolve(didUri, options = {}){
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
  constructor (options = {}) {
    this._ops = options.ops || [];
    if (!this._ops[0]) {
      this._ops[0] = ION.generateDidPayload(options.content || {});
    }
  }

  getAllOperations () {
    return Promise.all(this._ops);
  }

  async getOperation (index) {
    return this._ops[index];
  }

  async getURI (form) {
    const create = await this.getOperation(0);
    this._longForm = this._longForm || RawIonSdk.IonDid.createLongFormDid({
      recoveryKey: create.recovery.publicJwk,
      updateKey: create.update.publicJwk,
      document: create.content
    });
    return !form || form === 'long' ? this._longForm : this._longForm.split(':').slice(0, -1).join(':');
  }

  async generateRequest (payload = 0) {
    const op = typeof payload === 'number' ? await this.getOperation(payload) : payload;
    switch (op.operation) {
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
