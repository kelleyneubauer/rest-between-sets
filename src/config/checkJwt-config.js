// Validate JWT sent as Bearer Token
// Adds auth to req
const { expressjwt: jwt } = require("express-jwt");
const jwksRsa = require('jwks-rsa');

const checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `https://${process.env.DOMAIN}/.well-known/jwks.json`
    }),
  
    // Validate the audience and the issuer.
    issuer: `https://${process.env.DOMAIN}/`,
    algorithms: ['RS256']
});

module.exports = {
	checkJwt
};