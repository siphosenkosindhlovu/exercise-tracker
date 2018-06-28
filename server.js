const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// Not found middleware
/*app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})*/

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})
var Schema = mongoose.Schema
var exerciseSchema = new Schema({
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: Date, default: Date.now}
})
var userSchema = new Schema({
  username: {type: String, required: true},
  count: {type: Number, default: 0},
  log: [exerciseSchema]
})

var User = mongoose.model('User', userSchema)


app.post("/api/exercise/new-user", (req, res) => {
    var user = new User({
      username : req.body.username,
    })
    console.log(user, 3)
    user.save((err, data) => {
      if(err){ 
        console.log(err)
        return res.json({'error': 'An error occured'});
      }
      res.json(data)
    })
})
app.post("/api/exercise/add", (req, res) => {
  User.findOne({_id: req.body.userId}, (err, data) => {
    if(err) return res.send(err);
    var user = data;
    user.log.push({
      description: (req.body.description),
      duration: req.body.duration,
      date: req.body.date ? new Date(req.body.date).getTime() : Date.now().getTime()
    })
    User.findOneAndUpdate(
      {_id: user._id}, 
      {
        log: user.log, 
        count: user.log.length
      }, 
      {new: true}, 
      (err, data) => {
        if(err) return res.json({'error': 'An error occured'})
        res.json(data)
      });
  })
})
app.get("/api/exercise/log?", (req, res) => {
 
  if(!req.query.userId){
   return res.json({"error": "No User Id"})
  }
  var options = {}
  if(req.query.from) {
    options.$gte = new Date(req.query.from);      
  }
  
  if(req.query.to) {
    options.$lte = new Date(req.query.to);        
  }
  
  
  if (req.query.limit){
     var limit = Number(req.query.limit)
  }
  if(!(options.$lte || options.$gte)){
    var query = User.findOne({_id: req.query.userId})
    query.exec(function(err, data){
      if (err) {
        console.log(err)
        return res.json({"error" : "An error occurred"})
      }
      var response = data;
      if (limit) response = {
        _id: data._id,
        username: data.username,
        log: data.log.slice(0, limit)
      }
      return res.json(response)
    })
  }else{
    var query = [
    {
      $match: {
        _id: mongoose.Types.ObjectId(req.query.userId)
      }
    },
    {
      $unwind: "$log"
    },
    {
      $match: {
        "log.date": options
      }
    },
    {
      $group: {
        _id: "$_id",
        log: {
          $push: '$log'
        }
      }}
  ]
    User.aggregate(query ,function(err, data){
    console.log(err)
    if(err) return res.json(err);
    var response = data[0];
    if (limit) {
      response = {
        _id: data[0]._id,
        log: data[0].log.slice(0, 3)
      }
    }
    res.json(response)
  })
 }
  
  
  
})
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
