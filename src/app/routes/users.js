/** 
 * users.js
 * 
 * Kelley Neubauer - kelley@kelleyneubauer.com
 */

'use strict';

const express = require('express');
const router = express.Router();
const { checkJwt } = require('../../config/checkJwt-config');
const model = require('../models/model');
 
/**
 * GET /api/users
 * 
 * Get all registered users
 */
router.get('/users', checkJwt, async function(req, res) {
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

 module.exports = router;