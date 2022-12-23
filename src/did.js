import { IonDid, IonRequest, LocalSigner } from '@decentralized-identity/ion-sdk';
import { generateKeyPair } from './utils.js';

export class DID {
  #ops;
  #opQueue = Promise.resolve();
  #longForm;
  #longFormPromise;

  constructor(options = { }) {
    this.#ops = options.ops || [ ];
    if (!this.#ops.length) {
      this.#ops.push(this.generateOperation('create', options.content || { }, false));
    }
  }

  async generateOperation(type, content, commit = true) {
    const opQueue = this.#opQueue;
    this.#opQueue = new Promise((resolve, reject) => {
      opQueue.finally(() => this.#generateOperation(type, content, commit).then(resolve, reject));
    });
    return this.#opQueue;
  }

  async #generateOperation(type, content, commit) {
    let ops = await this.getAllOperations();
    let lastOp = ops[ops.length - 1];
    if (lastOp && lastOp.operation === 'deactivate') {
      throw 'Cannot perform further operations on a deactivated DID';
    }
    let op = {
      operation: type,
      content
    };
    if (type !== 'create') {
      op.previous = ops.reduce((last, op) => {
        return op.operation === type || (op.operation === 'recover' && (type === 'deactivate' || type === 'update')) ? op : last;
      }, ops[0]);
    }
    if (type === 'create' || type === 'recover') {
      op.recovery = await generateKeyPair();
    }
    if (type !== 'deactivate') {
      op.update = await generateKeyPair();
    }
    if (commit) {
      this.#ops.push(op);
    }

    return op;
  }

  async generateRequest(payload = 0, options = { }) {
    const op = typeof payload === 'number' ? await this.getOperation(payload) : payload;

    switch (op.operation) {
      case 'update':
        return IonRequest.createUpdateRequest({
          didSuffix: await this.getSuffix(),
          signer: options.signer || LocalSigner.create(op.previous.update.privateJwk),
          updatePublicKey: op.previous.update.publicJwk,
          nextUpdatePublicKey: op.update.publicJwk,
          servicesToAdd: op.content?.addServices,
          idsOfServicesToRemove: op.content?.removeServices,
          publicKeysToAdd: op.content?.addPublicKeys,
          idsOfPublicKeysToRemove: op.content?.removePublicKeys
        });
        break;

      case 'recover':
        return IonRequest.createRecoverRequest({
          didSuffix: await this.getSuffix(),
          signer: options.signer || LocalSigner.create(op.previous.recovery.privateJwk),
          recoveryPublicKey: op.previous.recovery.publicJwk,
          nextRecoveryPublicKey: op.recovery.publicJwk,
          nextUpdatePublicKey: op.update.publicJwk,
          document: op.content
        });

      case 'deactivate':
        return IonRequest.createDeactivateRequest({
          didSuffix: await this.getSuffix(),
          recoveryPublicKey: op.previous.recovery.publicJwk,
          signer: options.signer || LocalSigner.create(op.previous.recovery.privateJwk)
        });

      case 'create':
      default:
        return IonRequest.createCreateRequest({
          recoveryKey: op.recovery.publicJwk,
          updateKey: op.update.publicJwk,
          document: op.content
        });
    }
  }

  async getAllOperations() {
    return Promise.all(this.#ops);
  }

  async getOperation(index) {
    return this.#ops[index];
  }

  async getState() {
    const [ shortForm, longForm, ops ] = await Promise.all([
      this.getURI('short'),
      this.getURI(),
      this.getAllOperations()
    ]);
    return { shortForm, longForm, ops };
  }

  /**
   * returns the suffix portion of the DID string for the DID URI the class instance represents
   * @example
   * <caption>example DID URI: `did:ion:EiCZws6U61LV3YmvxmOIlt4Ap5RSJdIkb_lJXhuUPqQYBg`</caption>
   *
   * // returns: EiCZws6U61LV3YmvxmOIlt4Ap5RSJdIkb_lJXhuUPqQYBg
   * did.getSuffix()
   * @returns {string} suffix
   */
  async getSuffix() {
    const uri = await this.getURI('short');
    return uri.split(':').pop();
  }

  /**
   * returns either the long or short form URI for the DID based on the form provided
   * @param {'long' | 'short'} form - There are two forms of ION DID URI, the Long-Form URI, which can
   * be used instantly without anchoring an ION DID, and the Short-Form URI, which is only
   * resolvable after a DID has been published to the ION network.
   * @returns {string}
   */
  async getURI(form) {
    if (this.#longFormPromise) {
      await this.#longFormPromise;
    }

    if (!this.#longForm) {
      this.#longFormPromise = this.getOperation(0).then((create) => {
        return IonDid.createLongFormDid({
          recoveryKey: create.recovery.publicJwk,
          updateKey: create.update.publicJwk,
          document: create.content
        });
      });
      this.#longForm = await this.#longFormPromise;
      this.#longFormPromise = undefined;
    }

    return !form || form === 'long' ? this.#longForm : this.#longForm.split(':').slice(0, -1).join(':');
  }
}