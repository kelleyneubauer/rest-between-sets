/** 
 * auth-config.js
 * 
 * Kelley Neubauer - kelley@kelleyneubauer.com
 * 
 * Configuration options for express open-id connect
 * Uses Auth0 for authentication
 */

const authConfig = {
    authRequired: false,
    auth0Logout: true,
    baseURL: process.env.ENVIRONMENT === 'production' ? process.env.BASE_URL : process.env.BASE_URL_LOCAL,
    clientID: process.env.CLIENT_ID,
    issuerBaseURL: `https://${process.env.DOMAIN}`,
    secret: process.env.LONG_RANDOM_STRING,
    authorizationParams: {
        response_type: 'code',
        scope: 'openid profile email',
      },
};

module.exports = {
	authConfig
}