const authConfig = {
    authRequired: false,
    auth0Logout: true,
    // baseURL: process.env.BASE_URL,
    baseURL: process.env.BASE_URL_LOCAL,
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