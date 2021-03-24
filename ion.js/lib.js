const RawIonSdk = require('@decentralized-identity/ion-sdk');
const ProodOfWorkSDK = require('ion-pow-sdk');

var ION = globalThis.ION = {
  SDK: RawIonSdk,
  async generateKeyPair (type) {
    switch (type) {
      case 'secp256k1':
      case 'ES256K':
      default:
        let keys = await RawIonSdk.IonKey.generateEs256kOperationKeyPair();
        return {
          publicJwk: keys[0],
          privateJwk: keys[1]
        }
    }
  },
  async generateDidPayload (content = {}) {
    return {
      operation: 'create',
      content: content,
      recovery: await this.generateKeyPair(),
      update: await this.generateKeyPair()
    };
  }
};

ION.POW = class {
  constructor() {}

  async submitIonRequest (getChallengeUri, solveChallengeUri, requestBody) {
    ProodOfWorkSDK.submitIonRequest(getChallengeUri, solveChallengeUri, JSON.stringify(requestBody));
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

  async generateRequest (payload) {
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

export { ION };
