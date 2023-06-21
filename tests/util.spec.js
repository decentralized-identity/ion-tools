import * as utils from '../src/utils.js';
import { expect } from 'chai';

import jwkEd255191Private from './vectors/jwkEd255191Private.json' assert { type: 'json' };
import jwkEd255191Public from './vectors/jwkEd255191Public.json' assert { type: 'json' };
import jwkEd255192Public from './vectors/jwkEd255192Public.json' assert { type: 'json' };
import jwkEs256k1Private from './vectors/jwkEs256k1Private.json' assert { type: 'json' };
import jwkEs256k1Public from './vectors/jwkEs256k1Public.json' assert { type: 'json' };
import jwkEs256k2Public from './vectors/jwkEs256k2Public.json' assert { type: 'json' };

describe('utils', () => {
  it('should be able to sign and verify SECP256K1 JWS', async () => {
    const signInput = {
      payload: { testing: '123' },
      privateJwk: jwkEs256k1Private
    };

    const jws = await utils.sign(signInput);

    // correct input
    const verifyInput = {
      jws,
      publicJwk: jwkEs256k1Public
    };
    const verificationResult = await utils.verify(verifyInput);

    expect(verificationResult).to.be.true;

    // incorrect input
    const incorrectVerifyInput = {
      jws,
      publicJwk: jwkEs256k2Public
    };
    const incorrectVerificationResult = await utils.verify(incorrectVerifyInput);

    expect(incorrectVerificationResult).to.be.false;
  });

  it('should be able to sign and verify ED25519 JWS', async () => {
    const signInput = {
      payload: { testing: '123' },
      privateJwk: jwkEd255191Private
    };

    const jws = await utils.sign(signInput);

    // correct input
    const verifyInput = {
      jws,
      publicJwk: jwkEd255191Public
    };
    const verificationResult = await utils.verify(verifyInput);

    expect(verificationResult).to.be.true;

    // incorrect input
    const incorrectVerifyInput = {
      jws,
      publicJwk: jwkEd255192Public
    };
    const incorrectVerificationResult = await utils.verify(incorrectVerifyInput);

    expect(incorrectVerificationResult).to.be.false;
  });
});