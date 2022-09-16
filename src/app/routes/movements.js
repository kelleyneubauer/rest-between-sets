/** 
 * movements.js
 * 
 * Kelley Neubauer - kelley@kelleyneubauer.com
 */

'use strict';

const express = require('express');
const router = express.Router();
const { checkJwt } = require('../../config/checkJwt-config');
const model = require('../models/model');
const { getTimestamp, removeElement } = require('../service/helpers');

 
/**
 * POST /api/movements
 * 
 * Add a movement with auth
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

 module.exports = router;