
const RawIonSdk = require('@decentralized-identity/ion-sdk');

var Ionize = globalThis.Ionize = {
  async generateKeyPair (type) {
    switch (type) {
      case 'secp256k1':
      case 'ES256K':
      default:
        return await RawIonSdk.IonKey.generateEs256kOperationKeyPair();
    }
  },
  async generateDidPayload (replacePatch = {}) {
    const recoveryKeys = await this.generateKeyPair();
    const updateKeys = await this.generateKeyPair();
    return {
      operation: 'create',
      patches: [replacePatch],
      recovery: {
        publicJwk: recoveryKeys[0],
        privateJwk: recoveryKeys[1]
      },
      update: {
        publicJwk: updateKeys[0],
        privateJwk: updateKeys[1]
      }
    };
  }
};

Ionize.DID = class {
  constructor (options = {}) {
    this._ops = options.ops || [];
    if (!this._ops[0]) {
      this._ops[0] = Ionize.generateDidPayload(options.initialPatch || {});
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
      document: create.patches[0]
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
          document: op.patches[0]
        });
    }
  }
};

export { Ionize };
