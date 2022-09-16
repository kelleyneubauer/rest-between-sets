/** 
 * model.js
 * 
 * Kelley Neubauer - kelley@kelleyneubauer.com
 */

'use strict';

const constants = require('../constants');
const { Datastore } = require('@google-cloud/datastore');
const { UsersManager } = require('auth0');
const datastore = new Datastore();

function fromDatastore(item) {
	item.id = parseInt(item[Datastore.KEY].id);
	return item;
}

// Creates a new entity or update an existing entity
function updateEntity(kind, id, attributes) {
  let key;
  if (id) {
    key = datastore.key([kind, parseInt(id, 10)]);
  } else {
    key = datastore.key(kind);
  }
  const entity = {
      key: key, 
      data: attributes
  };
  return datastore.save(entity)
    .then(() => {return key;});
}

function createEntity(kind, attributes) {
  return updateEntity(kind, null, attributes);
}

async function getEntities(kind, limit = 0, req = null) {
    if (limit > 0) {
        let q = datastore.createQuery(kind).limit(limit);
        const results = {};
        if (Object.keys(req.query).includes('cursor')) {
            q = q.start(req.query.cursor);
        }
        return datastore.runQuery(q).then((entities) => {
            results[kind.toLowerCase()] = entities[0].map(fromDatastore);
            if (entities[1].moreResults !== Datastore.NO_MORE_RESULTS) {
                // results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + entities[1].endCursor;
                results.next = entities[1].endCursor;
            }
            return results;
        });
    } else {
        const q = datastore.createQuery(kind);
        const entities = await datastore.runQuery(q);
        return entities[0].map(fromDatastore);
    }
}

async function getEntity(kind, id) {
    const key = datastore.key([kind, parseInt(id, 10)]);
    let entity = await datastore.get(key);
    if (entity[0] === undefined || entity[0] === null) {
        return Promise.reject(new Error('Not Found'));
    } else {
        return fromDatastore(entity[0]);
    }
}

async function deleteEntity(kind, id) {
    const key = datastore.key([kind, parseInt(id, 10)]);
    let res = await datastore.delete(key);
    if (res[0].indexUpdates === 0) {
        return Promise.reject(new Error('Not Found'));
    } else {
        return res[0];
    }
}

async function putEntity(kind, id, attributes) {
    delete attributes.id;
    return updateEntity(kind, id, attributes);
}

function generateSelfLink(protocol, host, baseUrl, id) {
	return `${protocol}://${host}${baseUrl}/${id}`;
}


// Users
function postUser(attributes) {
    return createEntity(constants.USERS, attributes);
}

function getUsers() {
    return getEntities(constants.USERS);
}

// Movements
function postMovement(attributes) {
    return createEntity(constants.MOVEMENTS, attributes);
}

function getMovements(limit = 0, req = null) {
    return getEntities(constants.MOVEMENTS, limit, req);
}

function getMovement(id) {
    return getEntity(constants.MOVEMENTS, id);
}

async function putMovement(id, attributes) {
    return putEntity(constants.MOVEMENTS, id, attributes);
}

function deleteMovement(id) {
    return deleteEntity(constants.MOVEMENTS, id);
}

// Exercises
function postExercise(attributes) {
    return createEntity(constants.EXERCISES, attributes);
}

function getExercises(limit = 0, req = null) {
    return getEntities(constants.EXERCISES, limit, req);
}

function getExercise(id) {
    return getEntity(constants.EXERCISES, id);
}

async function putExercise(id, attributes) {
    return putEntity(constants.EXERCISES, id, attributes);
}

function deleteExercise(id) {
    return deleteEntity(constants.EXERCISES, id);
}

module.exports = {
    postUser,
    getUsers,
    postMovement,
    putMovement,
    getMovements,
    getMovement,
    deleteMovement,
    postExercise,
    getExercises,
    getExercise,
    putExercise,
    deleteExercise,
    generateSelfLink
};