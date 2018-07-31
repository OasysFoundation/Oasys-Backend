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
    user, password, authMechanism); //,

var exports = module.exports = {};
'use strict';

const SET = {
    profilePicture: (userId, newUrl) => query('users', 'update', {"UID": userId}, {$set: {"PIC": newUrl}}, {"upsert": true}),

    titlePicture(userId, contentId, newUrl) {
        return query('contents', 'update', {
            "contentId": contentId,
            "userId": userId
        }, {$set: {"picture": newUrl}}, {"upsert": true})
    },
    username(userId, username) {
        return new Promise(function (resolve, reject) {
            query('users', 'find', {'NAME': username})
                .then(result => {
                    result.length
                        ? reject('username or Id exists already!')
                        : query('users', 'insertOne', {"UID": userId, 'NAME': username, "PIC": ''})
                            .then(resolve)
                })
        })
    },
    rating: (userId, contentId, rating, accessUser) => query('ratings', 'insertOne', {
        contentId,
        userId,
        rating: parseInt(rating),
        accessUser
    }),
    comment(userId, contentId, data){
        const {time, comment, parent, slideNumber, accessUser} = data
        return query('comments', 'insertOne', {
            contentId,
            userId,
            accessUser,
            time,
            comment,
            parent,
            slideNumber,
        })
    },
    contentPost(status, data, userId, contentId) {
        return new Promise(function (resolve, reject) {
            const published = status === 'save' ? 0 : 1;
            const newData = data.data;
            newData.forEach(d => d.thumb = 'null');// !?!? why a string
            const {title, description, tags} = data;
            console.log('Save || publish Content :', contentId, userId, newData, title, description, published);

            query('contents', 'find', {'contentId': contentId, 'userId':userId, 'published':1})
                .then(result => {
                    result.length
                        ? resolve({"alreadyPublished": true})
                        : query('contents', 'update', {"contentId": contentId, "userId": userId}, 
                                { $set: {"data": newData, title, description, published, tags}},
                                {"upsert": true})
                                    .then(res => resolve(res))
                })
                .catch(err => {
                    console.log("didn't find content @ post content");
                    reject(err)
                    throw err
                })
        })
    },
    //2 levels of DB query. Fire callback after second request is successful//if there is no analytics for that content and user and starttime it makes one, else => update
    analyticsData(data) {
        return new Promise(function (resolve, reject) {
            console.log('Write Analytics data input: ', data);
            const {
                startTime, endTime, contentId,
                contentUserId, accessUserId, accessTimes,
                updateType, quizzes
            } = data;

            query('analytics', 'find', {startTime, contentId, contentUserId})
                .then(result => {
                    result.length
                        // right now updateType is only set on quizzes post request. 
                        // eventually we should always include the updateType on analytics post requests
                        ? updateType && updateType==="quizUpdate"
                            ? query('analytics', 'update', {contentId, startTime, contentUserId},
                                {$set: {endTime, quizzes}},
                                {"upsert": false})
                                   .then(res => resolve(res))
                            : query('analytics', 'update', {contentId, startTime, contentUserId},
                                {$set: {endTime, accessTimes}},
                                {"upsert": false})
                                   .then(res => resolve(res))
                        : query('analytics', 'insertOne', {
                            startTime,
                            endTime,
                            contentId,
                            contentUserId,
                            accessUserId,
                            accessTimes,
                            quizzes
                        })
                            .then(res => resolve(res))
                })
                .catch(err => {
                    console.log("didn't find analytics @ save analytics");
                    reject(err)
                    throw err
                })
        })
    }
}

const GET = {
    allRatings: (userId) => query('ratings', 'find', {userId: userId}),
    ratingsForContent: (userId, contentId) => query('ratings', 'find', {userId, contentId}),

    comments: (userId, contentId, slideNumber) => query('comments', 'find', {contentId, userId, slideNumber}),
    

    profile: (userId) => query('users', 'find', {'UID': userId}),

    contentsPreview: () => query('contents', 'find', {published: 1, featured: true}),
    contentsPreviewUserPage: (userId) => query('contents', 'find', {'userId': userId}),
    content: (userId, contentId) => query('contents', 'find', {'userId': userId, 'contentId': contentId}),

    //analytics
    analyticsFromCreator: (userId) => query('analytics', 'find', {'contentUserId': userId}),
    analyticsFromContent: (userId, contentId) => query('analytics', 'find', {
        'contentId': contentId,
        "contentUserId": userId
    }),
    analyticsFromUsers: (userId) => query('analytics', 'find', {'accessUserId': userId}),
}

exports.GET = GET;
exports.SET = SET;

// Write to "contents" db
function query(collectionName, operation, ...params) { //add option to pass callback directly
    return new Promise(function (resolve, reject) {
        MongoClient.connect(url, {useNewUrlParser: true})
            .then(client => {
                const db = client.db()
                const collection = db.collection(collectionName);

                const mongoDBquery = operation === 'find'
                    //because find doesn't return a promise like update, insert and so on
                    ? () => collection[operation](...params).toArray()
                    : () => collection[operation](...params)

                mongoDBquery()
                    .then(data => {
                        // console.log(data)
                        // console.log(
                        //     `**///////  DATA
                        //  ::: @ Collection: ${collectionName}
                        //  ::: @ Operation: ${operation}`)
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



















