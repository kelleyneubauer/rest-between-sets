/** 
 * server.js
 * 
 * Kelley Neubauer - kelley@kelleyneubauer.com
 */

'use strict';

require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const handlebars = require('express-handlebars');
const { auth } = require('express-openid-connect');
const { openapiSpecification } = require('./config/swagger-config');
const swaggerUi = require('swagger-ui-express');
const { authConfig } = require('./config/auth-config');

const app = express();
const router = express.Router();

// handlebars
app.engine('handlebars', handlebars.engine());
app.set('view engine', 'handlebars');
app.set('views', 'src/app/views');
app.enable('trust proxy');

// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(authConfig));
app.use(bodyParser.json());

app.use('/api', swaggerUi.serve, swaggerUi.setup(openapiSpecification));
app.use('/', require('./app/routes'));
app.use('/', router);

/**
 * Server
 */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});

/**
 * Error handling
 */
app.use(function (err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
        res.status(401).json({ Error: 'Invalid Token' });
    } else {
      next(err);
    }
});
