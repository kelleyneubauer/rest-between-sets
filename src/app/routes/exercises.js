/** 
 * exercises.js
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
            if (Object.keys(req.body).length !== 3 || !('exercise_name' in req.body && 'video_links' in req.body && 'reference_links' in req.body)) {
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

module.exports = router;