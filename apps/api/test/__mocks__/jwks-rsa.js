/**
 * Jest mock for jwks-rsa (uses jose v6 ESM which jest cannot transform).
 * E2E tests override PlatformExchangeValidatorService entirely,
 * so this mock is never actually called — it exists only to satisfy the import chain.
 */
const JwksClient = jest.fn().mockImplementation(() => ({
  getSigningKey: jest.fn().mockResolvedValue({ getPublicKey: () => "mock-public-key" })
}));

module.exports = JwksClient;
module.exports.default = JwksClient;
