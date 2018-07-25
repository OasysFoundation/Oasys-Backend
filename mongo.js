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


// Returns picture, title, description, tags, and url from "contents" db with published flag
const getUserPreview = function (db, callback) {
    const collection = db.collection('contents');
    collection.find().toArray(function (err, result) {
        if (err) throw err;
        console.log("db response: ")
        console.log(result)
        callback(result);
    });
}

// saves content to "contents" db
const saveContent = function (db, userId, contentId, data, callback) {
    var newData = data.data;
    for (var i = 0; i < newData.length; i++) {
        newData[0].thumb = 'null';
    }
    var title = data.title;
    var published = 0;
    var description = data.description;
    var tags = data.tags;

    console.log(contentId);
    console.log(userId);
    console.log(newData);
    console.log(title);
    console.log(description);
    console.log(published);
    console.log(tags);


    const collection = db.collection('contents');
    collection.update({"contentId": contentId, "userId": userId}, {
        $set: {
            "data": newData,
            "title": title,
            "description": description,
            "published": published,
            "tags": tags
        }
    }, {"upsert": true}, function (err, result) {
        if (err) {
            console.log(err)
            throw err;
        }
        else {
            console.log("Update successful");
            callback(result);
        }
    });
}

// saves content including title,picture,url etc. and publishes content so preview mode can grab it
const publishContent = function (db, userId, contentId, data, callback) {
    console.log(data);
    var newData = data.data;
    for (var i = 0; i < newData.length; i++) {
        newData[0].thumb = 'null';
    }
    var title = data.title;
    var published = data.published;
    var description = data.description;
    var tags = data.tags;

    const collection = db.collection('contents');
    collection.update({"contentId": contentId, "userId": userId}, {
        $set: {
            "data": newData,
            "title": title,
            "description": description,
            "published": published,
            "tags": tags
        }
    }, {"upsert": true}, function (err, result) {
        if (err) throw err;
        else {
            console.log("Update successful");
            callback(result);
        }
    });
}

// Write to "contents" db
exports.writeContentToMongo = function (status, data, userId, contentId, callback) {
    if (status == "save") {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            else {
                console.log("Connected successfully to server");
                saveContent(db, userId, contentId, data, function (result, err) {
                    if (err) throw err;
                    db.close();
                    callback(result);
                });
            }
        });
    }
    else {
        MongoClient.connect(url, function (err, db) {
            if (err) throw err;
            else {
                console.log("Connected successfully to server");
                publishContent(db, userId, contentId, data, function (result, err) {
                    if (err) throw err;
                    db.close();
                    callback(result);
                });
            }
        });

    }
};

// Write to "contents" db
exports.writeCommentToMongo = function (data, userId, contentId, callback) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        else {
            console.log("Connected successfully to server");
            saveComment(db, userId, contentId, data, function (result, err) {
                if (err) throw err;
                db.close();
                callback(result);
            });
        }
    });
};

// Reads from "contents" db
exports.readUserPreviewFromMongo = function (callback) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        else {
            console.log("Connected successfully to db");
            getUserPreview(db, function (result, err) {
                if (err) throw err;
                db.close();
                callback(result);
            });
        }
    });
};


exports.uploadUsername = function (userId, username, callback) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        else {
            console.log("Connected successfully to server");
            newUsername(db, userId, username, function (result, err) {
                if (err) throw err;
                db.close();
                callback(result);
            });
        }
    });
};


// Uploads username to "users" db
const newUsername = function (db, userId, username, callback) {
    const collection = db.collection('users');
    collection.find({'NAME': username}).toArray(function (err, docs) {
        if (err) throw err;

        if (docs.length > 0) {
            console.log("my docs");
            console.log(docs);
            callback();
        }
        else {
            collection.insertOne({"UID": userId, 'NAME': username, "PIC": ''}, function (err, result) {
                if (err) throw err;
                console.log(result);
                callback(result);
            });
        }
    });
};

//TODO app.js still change to promise!
const MongoX = {

    getAllRatings: (userId) => query('ratings', 'find', {userId: userId}),
    getRatingsForContent: (userId, contentId) => query('ratings', 'find', {userId, contentId}),

    getProfile: (userId) => query('users', 'find', {'UID': userId}),


    // uploadUserName: (userId, userName) => query('users')

    writeRating:
        (userId, contentId, rating, accessUser) => query('ratings', 'insertOne', {
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

exports.uploadTitlePicture = MongoX.uploadTitlePicture;

exports.getAllRatingsFromMongo = MongoX.getAllRatings;
exports.getRatingsForContent = MongoX.getRatingsForContent;

exports.readPreviewFromMongo = MongoX.getContentsPreview;
exports.readAnalyticsFromUsersMongo = MongoX.readAnalyticsFromUsers;
exports.readAnalyticsFromCreatorMongo = MongoX.readAnalyticsFromCreator;
exports.readAllRatingsFromMongo = MongoX.readAllRatings;

exports.writeAnalyticsDataToMongo = function (data, callback) {
    MongoClient.connect(url, function (err, client) {
        if (err) throw err;
        const db = client.db()
        {
            console.log("Connected successfully to server");
            saveAnalytics(db, data, function (result, err) {
                if (err) throw err;
                client.close();
                callback(result);
            });
        }
    });
};

// saves content to "contents" db
const saveAnalytics = function (db, data, callback) {
    console.log('SaveAnalytics data input: ', data);
    const {
        startTime, endTime, contentId,
        contentUserId, accessUserId, accessTimes
    } = data;
    const collection = db.collection('analytics');
    collection.find({startTime, contentId, contentUserId})
        .toArray(function (err, docs) {
            if (err) throw err;

            if (docs.length > 0) {
                collection.update({contentId, startTime, contentUserId},
                    {$set: {"endTime": endTime, "accessTimes": accessTimes}},
                    {"upsert": false}, function (err, result) {
                        if (err) throw err;
                        else {
                            console.log("Update successful");
                            callback(result);
                        }
                    });
            }
            else {
                collection.insertOne({startTime, endTime, contentId, contentUserId, accessUserId, accessTimes},
                    function (err, result) {
                        if (err) throw err;
                        else {
                            console.log("insert successful")
                            console.log(result);
                            callback(result);
                        }
                    });
            }
        });
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


//phase out
exports.readAllCommentsFromMongo = function (userId, callback) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        else {
            console.log("Connected successfully to db");
            findAllComments(userId, db, function (result, err) {
                if (err) throw err;
                db.close();
                callback(result);
            });
        }
    });
};

exports.readCommentsFromMongo = function (userId, contentId, slideNumber, callback) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        else {
            console.log("Connected successfully to db");
            findComments(userId, contentId, slideNumber, db, function (result, err) {
                if (err) throw err;
                db.close();
                callback(result);
            });
        }
    });
};


// saves content to "contents" db
const saveComment = function (db, userId, contentId, data, callback) {
    console.log(data);
    var time = data.time;
    var newComment = data.comment;
    var parent = data.parent;
    var slideNumber = data.slideNumber;
    var accessUser = data.accessUser;
    const collection = db.collection('comments');
    collection.insertOne({
        "contentId": contentId,
        'userId': userId,
        "accessUser": accessUser,
        "time": time,
        "comment": newComment,
        "parent": parent,
        "slideNumber": slideNumber
    }, function (err, result) {
        if (err) throw err;
        console.log(result);
        callback(result);
    });
}
// Returns full JSON of specified user id and content id
const findAllComments = function (userId, db, callback) {
    const collection = db.collection('comments');
    collection.find({'userId': userId}).toArray(function (err, result) {
        if (err) throw err;
        console.log("db response: ")
        console.log(result)
        callback(result);
    });
}
// Returns full JSON of specified user id and content id
const findComments = function (userId, contentId, slideNumber, db, callback) {
    const collection = db.collection('comments');
    collection.find({
        'contentId': contentId,
        'userId': userId,
        'slideNumber': slideNumber
    }).toArray(function (err, result) {
        if (err) throw err;
        console.log("db response: ")
        console.log(result)
        callback(result);
    });
}


















