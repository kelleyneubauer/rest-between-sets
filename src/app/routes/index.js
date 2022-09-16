/** 
 * index.js
 * 
 * Kelley Neubauer - kelley@kelleyneubauer.com
 */

'use strict';

const express = require('express');
const router = express.Router();
const model = require('../models/model');

router.use('/', require('./users'));
router.use('/', require('./movements'));
router.use('/', require('./exercises'));

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

module.exports = router;