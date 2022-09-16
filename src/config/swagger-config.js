/** 
 * swagger-config.js
 * 
 * Kelley Neubauer - kelley@kelleyneubauer.com
 * 
 * Options for Swagger JS doc which is used to create Swagger UI
 */

 const swaggerJsdoc = require('swagger-jsdoc');

 const swaggerOptions = {
	definition: {
	  openapi: '3.0.0',
	  info: {
		title: 'REST Between Sets API',
		version: '1.0.0',
		description: `A RESTful API for managing an exercise database`
	  },
	  servers: [
		  {
			  url: process.env.BASE_URL,
			  description: 'Production server',
		  },
		  {
			url: process.env.BASE_URL_LOCAL,
			description: 'Development server',
		  },
		],
	},
	apis: ['src/swagger-components.yaml', 'src/swagger-paths.yaml'], // files containing annotations as above
  };

  const openapiSpecification = swaggerJsdoc(swaggerOptions);

  module.exports = {
	  swaggerOptions,
	  openapiSpecification
  };