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
		title: 'REST Between Sets',
		version: '1.0.0',
		description: '<p>A RESTful API for managing an exercise database</p>'
		+ '</p>'
		+ '<ul><li>Sign in at <a href="http://restbetweensets.com" target="_blank">restbetweensets.com</a> to get your JWT</li>'
		+ '<li>Click the "Authorize" button and paste your token in the value field to access the API</li></ul>'
		+ '</p>'
		+ '</br>'
		+ '<p>created by <a href="http://github.com/kelleyneubauer" target="_blank">Kelley Neubauer</a></p>'
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