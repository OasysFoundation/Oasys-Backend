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
            query('users', 'insertOne', {"UID": userId, 'NAME': username, "PIC": ''})
                .then(resolve("success"))
        })
    },
    wallet(userId, walletId) {
        return query('users', 'update', {
            "UID": userId,
        }, {$set: {"walletId": walletId}}, {"upsert": true})
    },
    rating(uid, contentId, rating, accessUserUid) {
        let userRating = parseInt(rating);

        return new Promise(function(resolve,reject) {
             console.log('Rate Content :', uid, contentId, userRating, accessUserUid);

             query('ratings', 'find', {'contentId': contentId, 'accessUserUid': accessUserUid})
                .then(result => {
                    result.length ?
                        //update if exists
                        query('ratings', 'update', {"contentId": contentId, "accessUserUid": accessUserUid},
                        {$set: {uid, 'rating': userRating}},
                        {"upsert": true})
                            .then(res => resolve(res))

                        //post new entry if new ID
                        : query('ratings', 'insert', {contentId, uid, 'rating': userRating, accessUserUid})
                            .then(res => resolve(res))

                })
                .catch(err => {
                    console.log("error when rating", err);
                    reject(err)
                    throw err
                })
        })
    },
    comment(userId, contentId, data) {
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
    removeContent(uid, contentId){
        return new Promise(function(resolve,reject) {
             console.log('Remove Content :', uid, contentId);

             query('contents', 'find', {'contentId': contentId, 'uid': uid})
                .then(result => {
                    result.length ?
                        //update if exists
                        query('contents', 'remove', {"contentId": contentId, "uid": uid})
                            .then(res => resolve(res))

                        //post new entry if new ID
                        : resolve("No Content")

                })
                .catch(err => {
                    console.log("error when rating", err);
                    reject(err)
                    throw err
                })
        })
    },
    contentPost(data, userId, username) {
        return new Promise(function (resolve, reject) {
            const published = data.published;
            const featured = data.featured;
            const newData = data.data;
            // newData.forEach(d => d.thumb = 'null');// !?!? why a string
            const {title, description, tags, contentId, iconName} = data;
            const userId = data.user.uid;
            const birthday = Date.now();
            // const newUniqueIDPossibility = Date.now();
            console.log('Save || publish Content :', contentId, userId, title, description, published, tags, iconName, newData);

            query('contents', 'find', {'contentId': contentId, 'uid': userId})
                .then(result => {
                    result.length ?
                        //update if exists
                        query('contents', 'update', {"contentId": contentId, "uid": userId},
                        {$set: {"data": newData, username, title, description, published, tags, userId, featured,iconName}},
                        {"upsert": true})
                            .then(res => resolve(res))


                        //post new entry if new ID
                        : query('contents', 'insert', {"contentId": contentId, "uid": userId, "data": newData, username, birthday, title, description, published, tags, featured, iconName})
                            .then(res => resolve({"contentId": contentId}))

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
                        ? updateType && updateType === "quizUpdate"
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

const getContent = async function (contentQueryParams) {

    const contents = await query('contents', 'find', contentQueryParams);

    const ratingParams = []

    contents.map(content => {
        const {userId, contentId} = content;
        ratingParams.push({userId, contentId});
    })

    const allRatingRequests = ratingParams.map(param => new Promise(function (resolve, reject) {
        GET.ratingsForContent(param.userId, param.contentId)
            .then(rating => {
                resolve(rating)
            })
            .catch(err => {

                console.log(err)
                reject(err)
            })
    }))

    const finishedRatingReq = await Promise.all(allRatingRequests);
    console.log(finishedRatingReq, "finishedRatingreque")

    finishedRatingReq.map((ratingsForContent, idx) => {
        let mean = 0;
        if(ratingsForContent.length){
            const sum = ratingsForContent.reduce((acc, val) => ({rating: acc.rating + val.rating})).rating;
            mean = ratingsForContent.length ? sum / ratingsForContent.length : -1
        }

        contents[idx].rating = {count: ratingsForContent.length, mean: mean.toFixed(1)}
    });
    return contents;
}

const GET = {
    allRatings: (userId) => query('ratings', 'find', {userId: userId}),
    allComments: (userId) => query('comments', 'find', {userId: userId}),
    ratingsForContent: (uid, contentId) => query('ratings', 'find', {uid, contentId}),

    comments: (userId, contentId, slideNumber) => query('comments', 'find', {contentId, userId, slideNumber}),

    profile: (userId) => query('users', 'find', {'UID': userId}),


    contentById: (contentId) => getContent({'contentId': contentId}),
    contentByUserNameAndTitle: (username, title) => getContent({'username': username, "title": title}),

    contentsPreview: () => getContent({published: 1, featured: 1}),
    contentsPreviewUserPage: (uid) => getContent({'uid': uid}),
    contentsPreviewPublishedUserPage: (uid) => getContent({published: 1, 'uid': uid}),
    content: (uid, contentId) => getContent({'uid': uid, 'contentId': contentId}),

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



















