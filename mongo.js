/***************************************************************
 Module for Connecting, Reading, Writing, and Deleting from Mongo
 ***************************************************************/
require('dotenv').config()
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const f = require('util').format;
const assert = require('assert');
const user = encodeURIComponent(process.env.USER_ID);
const password = encodeURIComponent(process.env.PASSWORD);
const authMechanism = 'DEFAULT';
const url = f('mongodb://%s:%s@localhost:27017/oasysTest?authMechanism=%s',
    user, password, authMechanism);

var exports = module.exports = {};

/***************************
 Reading from Mongo (helper functions)
 ***************************/

'use strict';
// Write to "contents" db
exports.writeContentToMongo = function (status, data, userId, contentId) {
    const published = status === 'save' ? 0 : 1
    const newData = data.data;
    newData.forEach(d => d.thumb = 'null') // !?!? why a string
    const {title, description, tags} = data;
    console.log('Save || publish Content :', contentId, userId, newData, title, description, published);

    return query('contents', 'update', {"contentId": contentId, "userId": userId}, {
        $set: {
            "data": newData, title, description, published, tags
        }
    }, {"upsert": true})
};

exports.uploadUsername = function (userId, username, callback) {
    query('users', 'find',{'NAME': username})
        .then(result => {
            result.length
                ? callback()
                : query('users', 'insertOne', {"UID": userId, 'NAME': username, "PIC": ''})
                    .then(res => callback(res))
        })
};

//TODO app.js still change to promise!
const MongoX = {
    getAllRatings: (userId) => query('ratings', 'find', {userId: userId}),
    getRatingsForContent: (userId, contentId) => query('ratings', 'find', {userId, contentId}),

    getProfile: (userId) => query('users', 'find', {'UID': userId}),


    // uploadUserName: (userId, userName) => query('users')

    writeRating: (userId, contentId, rating, accessUser) => query('ratings', 'insertOne', {
        contentId,
        userId,
        rating: parseInt(rating),
        accessUser
    }),
    getContentsPreview: () => query('contents', 'find', {published: 1, featured: true}),

    readContent: (userId, contentId) => query('contents', 'find', {'userId': userId, 'contentId': contentId}),

    //analytics
    // Returns full JSON of specified user id
    readAnalyticsFromCreator: (userId) => query('analytics', 'find', {'contentUserId': userId}),

    readAnalyticsFromContent: (userId, contentId) => query('analytics', 'find', {
        'contentId': contentId,
        "contentUserId": userId
    }),

    readAnalyticsFromUsers: (userId, contentId) => query('analytics', 'find', {'accessUserId': userId}),


    uploadProfilePicture: (userId, newUrl) => query('users', 'update', {"UID": userId}, {$set: {"PIC": newUrl}}, {"upsert": true}),

    uploadTitlePicture(userId, contentId, newUrl) {
        return query('contents', 'update', {
            "contentId": contentId,
            "userId": userId
        }, {$set: {"picture": newUrl}}, {"upsert": true})
    },

}

exports.uploadProfilePicture = MongoX.uploadProfilePicture;
exports.getProfile = MongoX.getProfile;
exports.writeRatingToMongo = MongoX.writeRating;
exports.uploadTitlePicture = MongoX.uploadTitlePicture;
exports.readContentFromMongo = MongoX.readContent;
exports.getAllRatingsFromMongo = MongoX.getAllRatings;
exports.getRatingsForContent = MongoX.getRatingsForContent;
exports.readPreviewFromMongo = MongoX.getContentsPreview;
exports.readAnalyticsFromUsersMongo = MongoX.readAnalyticsFromUsers;
exports.readAnalyticsFromCreatorMongo = MongoX.readAnalyticsFromCreator;
exports.readAnalyticsFromContentMongo = MongoX.readAnalyticsFromContent;

//2 levels of DB query. Fire callback after second request is successful
//if there is no analytics for that content and user and starttime it makes one, else => update
exports.writeAnalyticsDataToMongo = function (data, callback) {
    console.log('Write Analytics data input: ', data);
    const {
        startTime, endTime, contentId,
        contentUserId, accessUserId, accessTimes
    } = data;

    query('analytics', 'find', {startTime, contentId, contentUserId})
        .then(result => {
            if (result.length) {
                query('analytics', 'update', {contentId, startTime, contentUserId},
                    {$set: {endTime, accessTimes}},
                    {"upsert": false})
                    .then(res => callback(res))
            }
            else {
                query('analytics', 'insertOne', {
                    startTime,
                    endTime,
                    contentId,
                    contentUserId,
                    accessUserId,
                    accessTimes
                })
                    .then(res => callback(res))
            }
        })
        .catch(err => {
            console.log("didn't find analytics @ save analytics");
            throw err
        })
}

// Write to "contents" db
function query(collectionName, operation, ...params) { //add option to pass callback directly
    return new Promise(function (resolve, reject) {
        MongoClient.connect(url)
            .then(client => {
                const db = client.db()
                const collection = db.collection(collectionName);

                const mongoDBquery = operation === 'find'
                    ? () => collection[operation](...params).toArray()
                    : () => collection[operation](...params)

                mongoDBquery()
                    .then(data => {
                        console.log('YO', data)
                        resolve(data)
                        client.close();
                    })
                    .catch(err => {
                        throw err
                        reject(err)
                        client.close();
                    })

            })
            .catch(err => {
                throw err
            })
    })
}



















