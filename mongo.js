
/***************************************************************
Module for Connecting, Reading, Writing, and Deleting from Mongo
***************************************************************/
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const f = require('util').format;
const assert = require('assert');
const user = encodeURIComponent('Robbie');
const password = encodeURIComponent('oodlesofnoodles13');
const authMechanism = 'DEFAULT';
const url = f('mongodb://%s:%s@localhost:27017/oasysTest?authMechanism=%s',
  user, password, authMechanism);

var exports = module.exports = {};

/***************************
Reading from Mongo (helpers)
***************************/
// Editor Collection
const findDocuments = function(db, mongoId, callback) {
  const collection = db.collection('graph');
  collection.findOne(ObjectId(mongoId), function(err, result) {
    if (err) throw err;
    console.log(result);
    callback(result);
  });
}

// Graph Collection
const findGraph = function(db, callback) {
  const collection = db.collection('graphDb');
  collection.findOne(function(err, result) {
    if (err) throw err;
    console.log(result);
    callback(result);
  });
}

/***************************
Writing to Mongo (helpers)
***************************/
// Editor collection
const insertDocument = function(db, data, callback) {
  const collection = db.collection('graph');
  // Insert 
  collection.insertOne( data, function(err, result) {
    console.log(result);
    callback(result);
  });
}

// Editor collection
const updateDocument = function(db, mongoId, data, callback) {
  const collection = db.collection('graph');
  //update
  collection.updateOne({"_id": ObjectId(mongoId)}
    , { $set: { data : data } }, function(err, result) {
    assert.equal(err, null);
    console.log("Updated the document with the field a equal to 2");
    callback(result);
  });  
}

// Graph collection
const updateGraph = function(db, mongoId, data, callback) {
  const collection = db.collection('graphDb');
  //update
  collection.updateOne({"_id": ObjectId(mongoId)}
    , { $set: { data : data } }, function(err, result) {
    assert.equal(err, null);
    callback(result);
  });  
}

/***************************
Deleting from Mongo (helpers)
****************************/
const removeDocument = function(db, mongoId, callback) {
  const collection = db.collection('graph');
  collection.deleteOne({"_id": ObjectId(mongoId)}, function(err, result) {
    assert.equal(err, null);
    callback(result);
  });    
}

/*****************
Exported Functions
*****************/

//Write
exports.writeToMongo = function(data, callback) {
	MongoClient.connect(url, function(err, db) {
	  assert.equal(null, err);
	  console.log("Connected successfully to server");
	  insertDocument(db, data, function(result) {
       db.close();
       callback(result);
      });
	});
};

//Update
exports.updateMongo = function(data, mongoId, callback) {
	MongoClient.connect(url, function(err, db) {
	  assert.equal(null, err);
	  console.log("Connected successfully to server");
	  updateDocument(db, mongoId, data, function(result) {
       db.close();
       callback(result);
      });
	});
};

//Update
exports.updateGraphMongo = function(data, mongoId, callback) {
	MongoClient.connect(url, function(err, db) {
	  assert.equal(null, err);
	  console.log("Connected successfully to server");
	  updateGraph(db, mongoId, data, function(result) {
       db.close();
       callback(result);
      });
	});
};

//Read
exports.readFromMongo = function(mongoId, callback) {
	MongoClient.connect(url, function(err, db) {
	  assert.equal(null, err);
	  console.log("Connected successfully to server");
	  findDocuments(db, mongoId, function(result) {
	  	db.close();
	  	callback(result);
	    });
	});
};

//Read
exports.readGraphFromMongo = function(callback) {
	MongoClient.connect(url, function(err, db) {
	  assert.equal(null, err);
	  console.log("Connected successfully to server");
	  findGraph(db, function(result) {
	  	db.close();
	  	callback(result);
	    });
	});
};

//Delete
exports.deleteFromMongo = function(mongoId, callback) {
	MongoClient.connect(url, function(err, db) {
	  assert.equal(null, err);
	  console.log("Connected successfully to server");
	  removeDocument(db, mongoId, function(result) {
	  	db.close();
	  	callback(result);
	    });
	});
};



