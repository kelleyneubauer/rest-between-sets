/** 
 * app.js
 * 
 * Kelley Neubauer - kelley@kelleyneubauer.com
 * 
 */

'use strict';

require('dotenv').config();

const { default: axios } = require('axios');
const { auth } = require('express-openid-connect');

const express = require('express');
const bodyParser = require('body-parser');
// const request = require('request');
const handlebars = require('express-handlebars');
const model = require('./model');
const { expressjwt: jwt } = require("express-jwt");
const jwksRsa = require('jwks-rsa');
var ManagementClient = require('auth0').ManagementClient;
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const router = express.Router();
const config = {
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

app.engine('handlebars', handlebars.engine());
app.set('view engine', 'handlebars');
app.set('views', './views');
app.enable('trust proxy');
// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));
app.use(bodyParser.json());

// Swagger
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
          url: 'http://localhost:8080',
          description: 'Development server',
        },
        {
            url: 'http://www.prod.com',
            description: 'Production server',
        },
      ],
  },
  apis: ['./*.js', './swagger-components.yaml', './swagger-paths.yaml'], // files containing annotations as above
};
const openapiSpecification = swaggerJsdoc(swaggerOptions);
app.use('/api', swaggerUi.serve, swaggerUi.setup(openapiSpecification));

// Validate JWT sent as Bearer Token
// Adds auth to req
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

/**
 * Helper functions
 */

function getTimestamp() {
    return new Date();
}

function removeElement(arr, element) {
    const index = arr.indexOf(element);
    if (index >= 0) {
        arr.splice(index, 1);
    }
    return arr;
}


/**
 * GET /api
 * 
 * Landing page
 */
router.get('/', async function(req, res) {
    const url = `${req.protocol}://${req.get('host')}`;
    if (req.oidc.isAuthenticated()) {
        const users = await model.getUsers();
        const user = users.filter((user) => {
            return user.user_id === req.oidc.user.sub;
        });

        if (!user.length) {
            await model.postUser({
                user_email: req.oidc.user.name,
                user_id: req.oidc.user.sub,
                created_at: getTimestamp()
            });
        }

        res
        .status(200)
        .render('auth', {
            username: req.oidc.user.name,
            id: req.oidc.user.sub,
            jwt: req.oidc.idToken,
            url_text: "Logout",
            url: `${url}/logout`
        });
    } else {
        res
        .status(200)
        .render('home', {
            title_text: "REST Between Sets",
            text: "Sign in to get your JWT and access the API",
            url_text: "Login",
            url: `${url}/login`
        });
    }
});


/**
 * GET /api/users
 * 
 * Get all registered users
 * 
 * @swagger
 * /users:
 *   $ref: '#/paths/~1users'
 */
router.get('/users', async function(req, res) {
    if (!req.accepts(['application/json'])) {
        res.status(406).json({ Error: 'Not Acceptable' });
    } else {
        try {
            const data = await model.getUsers();
            res.status(200).json(data);
        } catch(err) {
            console.log(err);
            res.status(500).send('Oops');
        }
    }
});


/**
 * POST /api/users
 * 
 * Not supported
 */
router.post('/users', function(req, res) {
	res.set('Allow', 'GET');
	res.status(405).json({ Error: 'Method Not Allowed' });
});


/**
 * POST /api/movements
 * 
 * Add a movement with auth
 * 
 * @swagger
 * /movements:
 *   post:
 *     $ref: '#/paths/~1movements/post'
 */
 router.post('/movements', checkJwt, async function(req, res) {
    if (!req.accepts(['application/json'])) {
        res.status(406).json({ Error: 'Not Acceptable' });
    } else if (req.get('content-type') !== 'application/json') {
        res.status(415).json({ Error: 'Unsupported Media Type' });
    } else {
        try {
            let newMovement = req.body;
            newMovement.created_by = req.auth.sub;
            newMovement.created_at = getTimestamp();
            newMovement.exercises = [];
            const key = await model.postMovement(newMovement);
            newMovement.id = parseInt(key.id);
            newMovement.self = model.generateSelfLink(req.protocol, req.get('host'), req.baseUrl + '/movements', key.id);
            res.location(newMovement.self);
            res.status(201).json(newMovement);
        } catch(err) {
            console.log(err);
            res.status(500).send('Oops');
        }
    }
});


/**
 * GET /api/movements
 * 
 * Get all movements for authenticated user
 * 
 * @swagger
 * /movements:
 *   get:
 *     $ref: '#/paths/~1movements/get'
 */
 router.get('/movements', checkJwt, async function(req, res) {
    if (!req.accepts(['application/json'])) {
        res.status(406).json({ Error: 'Not Acceptable' });
    } else {
        try {
            let total = await model.getMovements();
            total = total.filter((movement) => {
                return movement.created_by === req.auth.sub;
            }).length

            // get 5 results by this user for pagination
            let count = 5;
            let data = await model.getMovements(count, req);
            while (data.next !== undefined && data.movements.filter((movement) => { return movement.created_by === req.auth.sub }).length < 5) {
                count += 1;
                data = await model.getMovements(count, req);
            }

            // format the response
            data.count = total;
            if (data.next !== undefined) {
                data.next = req.protocol + "://" + req.get("host") + req.baseUrl + "/movements" + "?cursor=" + data.next;
            }
            data.movements = data.movements.filter((movement) => {
                return movement.created_by === req.auth.sub;
            }).map((movement) => {
                movement.self = model.generateSelfLink(req.protocol, req.get('host'), req.baseUrl + '/movements', movement.id);
                movement.exercises = movement.exercises.map((exercise) => {
                    return {
                        id: exercise,
                        self: model.generateSelfLink(req.protocol, req.get('host'), req.baseUrl + '/exercises', exercise)
                    }
                });
                return movement;
            });

            res.status(200).json(data);
        } catch(err) {
            console.log(err);
            res.status(500).send('Oops');
        }
    }
});


/**
 * GET api/movements/:id
 * 
 * Retrieve a movement
 * 
 * @swagger
 * /movements/{movement_id}:
 *   get:
 *     $ref: '#/paths/~1movements/~1{movement_id}/get'
 */
  
 router.get('/movements/:movement_id', checkJwt, async function(req, res) {
    if (!req.accepts(['application/json'])) {
        res.status(406).json({ Error: 'Not Acceptable' });
    } else {
        try {
            const movement = await model.getMovement(req.params.movement_id); // returns Not Found
            if (movement.created_by !== req.auth.sub) {
                throw new Error('Not Authorized');
            }
            movement.self = model.generateSelfLink(req.protocol, req.get('host'), req.baseUrl + '/movements', movement.id);
            movement.exercises = movement.exercises.map((exercise) => {
                return {
                    id: exercise,
                    self: model.generateSelfLink(req.protocol, req.get('host'), req.baseUrl + '/exercises', exercise)
                }
            });
            res.status(200).json(movement);
        } catch(err) {
            if (err.message === 'Not Found' || err.message === 'Not Authorized' || err.message === '3 INVALID_ARGUMENT: Key path id is invalid. Must not be zero.') { //|| err.message === '3 INVALID_ARGUMENT: Key path id is invalid. Must not be zero.') {
                res.status(403).json({ Error: 'Forbidden' });
            } else {
                console.log(err);
                res.status(500).send('Oops');
            }
        }
    }
});


/**
 * PUT api/movements/:id
 * 
 * Edit a movement
 * 
 * @swagger
 * /movements/{movement_id}:
 *   put:
 *     $ref: '#/paths/~1movements/~1{movement_id}/put'
 */
router.put('/movements/:movement_id', checkJwt, async function(req, res) {
    if (!req.accepts(['application/json'])) {
        res.status(406).json({ Error: 'Not Acceptable' });
    } else if (req.get('content-type') !== 'application/json') {
        res.status(415).json({ Error: 'Unsupported Media Type' });
    } else {
        try {
            if (Object.keys(req.body).length !== 2 || !('movement_name' in req.body && 'coaching_tips' in req.body)) {
                throw new Error('Bad Request');
            }
            const movementId = parseInt(req.params.movement_id);
            const movement = await model.getMovement(movementId);
            if (movement.created_by !== req.auth.sub) {
                throw new Error('Not Authorized');
            }
            Object.keys(req.body).forEach(attribute => {
                movement[attribute] = req.body[attribute];
            });
            await model.putMovement(movementId, movement);
            movement.id = parseInt(movementId);
            movement.self = model.generateSelfLink(req.protocol, req.get('host'), req.baseUrl + '/movements', movementId);
            res.location(movement.self);
            res.status(200).json(movement);
        } catch(err) {
            if (err.message === 'Bad Request') {
                res.status(400).json({ Error: 'Bad Request' });
            } else if (err.message === 'Not Authorized') { 
                res.status(403).json({ Error: 'Forbidden' });
            } else if (err.message === 'Not Found' || err.message === '3 INVALID_ARGUMENT: Key path id is invalid. Must not be zero.') {
                res.status(404).json({ Error: 'Not Found' });
            } else {
                console.log(err);
                res.status(500).send('Oops');
            }
        }
    }
});


/**
 * PATCH api/movements/:id
 * 
 * Edit a movement
 * 
 * @swagger
 * /movements/{movement_id}:
 *   patch:
 *     $ref: '#/paths/~1movements/~1{movement_id}/patch'
 */
 router.patch('/movements/:movement_id', checkJwt, async function(req, res) {
    if (!req.accepts(['application/json'])) {
        res.status(406).json({ Error: 'Not Acceptable' });
    } else if (req.get('content-type') !== 'application/json') {
        res.status(415).json({ Error: 'Unsupported Media Type' });
    } else {
        try {
            const movementId = parseInt(req.params.movement_id);
            const movement = await model.getMovement(movementId);
            if (movement.created_by !== req.auth.sub) {
                throw new Error('Not Authorized');
            }
            Object.keys(req.body).forEach(attribute => {
                movement[attribute] = req.body[attribute];
            });
            await model.putMovement(movementId, movement);
            movement.id = parseInt(movementId);
            movement.self = model.generateSelfLink(req.protocol, req.get('host'), req.baseUrl + '/movements', movementId);
            res.location(movement.self);
            res.status(200).json(movement);
        } catch(err) {
            if (err.message === 'Not Authorized') { 
                res.status(403).json({ Error: 'Forbidden' });
            } else if (err.message === 'Not Found' || err.message === '3 INVALID_ARGUMENT: Key path id is invalid. Must not be zero.') {
                res.status(404).json({ Error: 'Not Found' });
            } else {
                console.log(err);
                res.status(500).send('Oops');
            }
        }
    }
});


/**
 * DELETE api/movements/:id
 * 
 * Delete a movement
 */
router.delete('/movements/:movement_id', checkJwt, async function(req, res) {
    try {
        const movementId = parseInt(req.params.movement_id);
        const movement = await model.getMovement(movementId);
        if (movement.created_by !== req.auth.sub) {
            throw new Error('Not Authorized');
        }
        // remove movement from all associated exercises
        for (const exerciseId of movement.exercises) {
            const exercise = await model.getExercise(exerciseId);
            exercise.movements = removeElement(exercise.movements, movementId);
            await model.putExercise(exerciseId, exercise);
        }
        await model.deleteMovement(movementId);
        res.status(204).end();
    } catch(err) {
        if (err.message === 'Not Authorized') { 
            res.status(403).json({ Error: 'Forbidden' });
        } else if (err.message === 'Not Found' || err.message === '3 INVALID_ARGUMENT: Key path id is invalid. Must not be zero.') {
            res.status(404).json({ Error: 'Not Found' });
        } else {
            console.log(err);
            res.status(500).send('Oops');
        }
    }
});


/**
 * PUT api/movements/:movement_id/exercises/:exercise_id
 * 
 * Assign an exercise to a movement category
 */
router.put('/movements/:movement_id/exercises/:exercise_id', checkJwt, async function(req, res) {
    try {
        const movementId = parseInt(req.params.movement_id);
        const exerciseId = parseInt(req.params.exercise_id);
        const movement = await model.getMovement(movementId);
        const exercise = await model.getExercise(exerciseId);
        if (movement.created_by !== req.auth.sub || exercise.created_by !== req.auth.sub) {
            throw new Error('Not Authorized');
        }
        if (!movement.exercises.includes(exerciseId)) {
            movement.exercises.push(exerciseId);
            await model.putMovement(movementId, movement);
        }
        if (!exercise.movements.includes(movementId)) {
            exercise.movements.push(movementId);
            await model.putExercise(exerciseId, exercise);
        }
        res.status(204).end();
    } catch(err) {
        if (err.message === 'Not Authorized') { 
            res.status(403).json({ Error: 'Forbidden' });
        } else if (err.message === 'Not Found' || err.message === '3 INVALID_ARGUMENT: Key path id is invalid. Must not be zero.') {
            res.status(404).json({ Error: 'Not Found' });
        } else {
            console.log(err);
            res.status(500).send('Oops');
        }
    }
});


/**
 * DELETE api/movements/:movement_id/exercises/:exercise_id
 * 
 * Remove an exercise from a movement category
 */
 router.delete('/movements/:movement_id/exercises/:exercise_id', checkJwt, async function(req, res) {
    try {
        const movementId = parseInt(req.params.movement_id);
        const exerciseId = parseInt(req.params.exercise_id);
        const movement = await model.getMovement(movementId);
        const exercise = await model.getExercise(exerciseId);
        if (movement.created_by !== req.auth.sub || exercise.created_by !== req.auth.sub) {
            throw new Error('Not Authorized');
        }
        if (!movement.exercises.includes(exerciseId) || !exercise.movements.includes(movementId)) {
            throw new Error('Not Found');
        }

        movement.exercises = removeElement(movement.exercises, exerciseId);
        await model.putMovement(movementId, movement);

        exercise.movements = removeElement(exercise.movements, movementId);
        await model.putExercise(exerciseId, exercise);

        res.status(204).end();
    } catch(err) {
        if (err.message === 'Not Authorized') { 
            res.status(403).json({ Error: 'Forbidden' });
        } else if (err.message === 'Not Found' || err.message === '3 INVALID_ARGUMENT: Key path id is invalid. Must not be zero.') {
            res.status(404).json({ Error: 'Not Found' });
        } else {
            console.log(err);
            res.status(500).send('Oops');
        }
    }
});


/**
 * POST /api/exercises
 * 
 * Add an exercise with auth
 */
router.post('/exercises', checkJwt, async function(req, res) {
    if (!req.accepts(['application/json'])) {
        res.status(406).json({ Error: 'Not Acceptable' });
    } else if (req.get('content-type') !== 'application/json') {
        res.status(415).json({ Error: 'Unsupported Media Type' });
    } else {
        try {
            let newExercise = req.body;
            newExercise.created_by = req.auth.sub;
            newExercise.created_at = getTimestamp();
            newExercise.movements = [];
            const key = await model.postExercise(newExercise);
            newExercise.id = parseInt(key.id);
            newExercise.self = model.generateSelfLink(req.protocol, req.get('host'), req.baseUrl + '/exercises', key.id);
            res.location(newExercise.self);
            res.status(201).json(newExercise);
        } catch(err) {
            console.log(err);
            res.status(500).send('Oops');
        }
    }
});


/**
 * GET /api/exercises
 * 
 * Get all exercises for authenticated user
 */
router.get('/exercises', checkJwt, async function(req, res) {
    if (!req.accepts(['application/json'])) {
        res.status(406).json({ Error: 'Not Acceptable' });
    } else {
        try {
            let total = await model.getExercises();
            total = total.filter((exercise) => {
                return exercise.created_by === req.auth.sub;
            }).length

            // get 5 results by this user for pagination
            let count = 5;
            let data = await model.getExercises(count, req);
            while (data.next !== undefined && data.exercises.filter((exercise) => { return exercise.created_by === req.auth.sub }).length < 5) {
                count += 1;
                data = await model.getExercises(count, req);
            }

            // format the response
            data.count = total;
            if (data.next !== undefined) {
                data.next = req.protocol + "://" + req.get("host") + req.baseUrl + "/exercises" + "?cursor=" + data.next;
            }
            data.exercises = data.exercises.filter((exercise) => {
                return exercise.created_by === req.auth.sub;
            }).map((exercise) => {
                exercise.self = model.generateSelfLink(req.protocol, req.get('host'), req.baseUrl + '/exercises', exercise.id);
                exercise.movements = exercise.movements.map((movement) => {
                    return {
                        id: movement,
                        self: model.generateSelfLink(req.protocol, req.get('host'), req.baseUrl + '/movements', movement)
                    }
                })
                return exercise;
            });
            res.status(200).json(data);
        } catch(err) {
            console.log(err);
            res.status(500).send('Oops');
        }
    }
});


/**
 * GET api/exercises/:id
 * 
 * Retrieve an exercise
 */
 router.get('/exercises/:exercise_id', checkJwt, async function(req, res) {
    if (!req.accepts(['application/json'])) {
        res.status(406).json({ Error: 'Not Acceptable' });
    } else {
        try {
            const exercise = await model.getExercise(req.params.exercise_id); // returns Not Found
            if (exercise.created_by !== req.auth.sub) {
                throw new Error('Not Authorized');
            }
            exercise.self = model.generateSelfLink(req.protocol, req.get('host'), req.baseUrl + '/exercises', exercise.id);
            exercise.movements = exercise.movements.map((movement) => {
                return {
                    id: movement,
                    self: model.generateSelfLink(req.protocol, req.get('host'), req.baseUrl + '/movements', movement)
                }
            });
            res.status(200).json(exercise);
        } catch(err) {
            if (err.message === 'Not Found' || err.message === 'Not Authorized' || err.message === '3 INVALID_ARGUMENT: Key path id is invalid. Must not be zero.') { //|| err.message === '3 INVALID_ARGUMENT: Key path id is invalid. Must not be zero.') {
                res.status(403).json({ Error: 'Forbidden' });
            } else {
                console.log(err);
                res.status(500).send('Oops');
            }
        }
    }
});


/**
 * PUT api/exercises/:id
 * 
 * Edit an exercise
 */
 router.put('/exercises/:exercise_id', checkJwt, async function(req, res) {
    if (!req.accepts(['application/json'])) {
        res.status(406).json({ Error: 'Not Acceptable' });
    } else if (req.get('content-type') !== 'application/json') {
        res.status(415).json({ Error: 'Unsupported Media Type' });
    } else {
        try {
            if (Object.keys(req.body).length !== 3 || !('exercise_name' in req.body && 'video_links' in req.body && 'rerference_links' in req.body)) {
                throw new Error('Bad Request');
            }
            const exerciseId = parseInt(req.params.exercise_id);
            const exercise = await model.getExercise(exerciseId);
            if (exercise.created_by !== req.auth.sub) {
                throw new Error('Not Authorized');
            }
            Object.keys(req.body).forEach(attribute => {
                exercise[attribute] = req.body[attribute];
            });
            await model.putExercise(exerciseId, exercise);
            exercise.id = parseInt(exerciseId);
            exercise.self = model.generateSelfLink(req.protocol, req.get('host'), req.baseUrl + '/exercises', exerciseId);
            res.location(exercise.self);
            res.status(200).json(exercise);
        } catch(err) {
            if (err.message === 'Bad Request') {
                res.status(400).json({ Error: 'Bad Request' });
            } else if (err.message === 'Not Authorized') { 
                res.status(403).json({ Error: 'Forbidden' });
            } else if (err.message === 'Not Found' || err.message === '3 INVALID_ARGUMENT: Key path id is invalid. Must not be zero.') {
                res.status(404).json({ Error: 'Not Found' });
            } else {
                console.log(err);
                res.status(500).send('Oops');
            }
        }
    }
});


/**
 * PATCH api/exercises/:id
 * 
 * Edit an exercise
 */
 router.patch('/exercises/:exercise_id', checkJwt, async function(req, res) {
    if (!req.accepts(['application/json'])) {
        res.status(406).json({ Error: 'Not Acceptable' });
    } else if (req.get('content-type') !== 'application/json') {
        res.status(415).json({ Error: 'Unsupported Media Type' });
    } else {
        try {
            const exerciseId = parseInt(req.params.exercise_id);
            const exercise = await model.getExercise(exerciseId);
            if (exercise.created_by !== req.auth.sub) {
                throw new Error('Not Authorized');
            }
            Object.keys(req.body).forEach(attribute => {
                exercise[attribute] = req.body[attribute];
            });
            await model.putExercise(exerciseId, exercise);
            exercise.id = parseInt(exerciseId);
            exercise.self = model.generateSelfLink(req.protocol, req.get('host'), req.baseUrl + '/exercises', exerciseId);
            res.location(exercise.self);
            res.status(200).json(exercise);
        } catch(err) {
            if (err.message === 'Not Authorized') { 
                res.status(403).json({ Error: 'Forbidden' });
            } else if (err.message === 'Not Found' || err.message === '3 INVALID_ARGUMENT: Key path id is invalid. Must not be zero.') {
                res.status(404).json({ Error: 'Not Found' });
            } else {
                console.log(err);
                res.status(500).send('Oops');
            }
        }
    }
});


/**
 * DELETE api/exercises/:id
 * 
 * Delete a exercise
 */
 router.delete('/exercises/:exercise_id', checkJwt, async function(req, res) {
    try {
        const exerciseId = parseInt(req.params.exercise_id);
        const exercise = await model.getExercise(exerciseId);
        if (exercise.created_by !== req.auth.sub) {
            throw new Error('Not Authorized');
        }
        // remove exercise from all associated movements
        for (const movementId of exercise.movements) {
            const movement = await model.getMovement(movementId);
            movement.exercises = removeElement(movement.exercises, exerciseId);
            await model.putMovement(movementId, movement);
        }
        await model.deleteExercise(exerciseId);
        res.status(204).end();
    } catch(err) {
        if (err.message === 'Not Authorized') { 
            res.status(403).json({ Error: 'Forbidden' });
        } else if (err.message === 'Not Found' || err.message === '3 INVALID_ARGUMENT: Key path id is invalid. Must not be zero.') {
            res.status(404).json({ Error: 'Not Found' });
        } else {
            console.log(err);
            res.status(500).send('Oops');
        }
    }
});


/**
 * Server
 */
 app.use('/', router);

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});


/**
 * Error handling
 */
// send 401 if invalid JWT
app.use(function (err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
        res.status(401).json({ Error: 'Invalid Token' });
    } else {
      next(err);
    }
});
