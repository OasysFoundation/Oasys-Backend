#!/usr/bin/env nodejs

/****************************
Starting Point of Application
****************************/
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const cors = require('cors')

app.use(cors());

var mongo = require('./mongo.js');

// Middleware to parse json 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//Documentation
app.get('/', (req, res) => {
  res.send('Documentation Coming Soon!')
});

//Load editor JSON from DB
app.get('/loadEditor', (req, res) => {
  mongoId = req.headers.id;
  console.log(mongoId);
  mongo.readFromMongo(mongoId, function(result) { 
    console.log(result);
    res.json(result); 
  });
});

//Load editor JSON from DB
app.get('/loadGraph', (req, res) => {
  mongo.readGraphFromMongo(function(result) { 
    console.log(result);
    res.json(result); 
  });
});

//Save editor JSON to DB
app.post('/saveEditor', (req, res) => {
  jsonBody =req.body;
  console.log(jsonBody);
  mongo.writeToMongo(jsonBody, function(result) { 
    console.log(result.insertedId);
    res.send(result.insertedId); 
  });
});

//Save editor JSON to DB
app.post('/updateEditor', (req, res) => {
  jsonBody =req.body;
  mongoId = req.headers.id;
  mongo.updateMongo(jsonBody, mongoId, function(result) { 
    console.log(result);
    res.send(result); 
  });
});

//Save editor JSON to DB
app.post('/updateGraph', (req, res) => {
  jsonBody =req.body;
  mongoId = req.headers.id;
  mongo.updateGraphMongo(jsonBody, mongoId, function(result) { 
    console.log(result);
    res.send(result); 
  });
});

//Delete editor JSON from DB
app.get('/deleteEditor', (req, res) => {
  mongoId = req.headers.id;
  mongo.deleteFromMongo(mongoId, function(result) { 
    console.log(result);
    res.send(result); 
  });
});



app.listen(8080, () => console.log('Listening on port 8080'))

