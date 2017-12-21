/*jshint esversion: 6 */

// Import packages and initiate express app
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var path = require('path');
var config = require('../config/test.json');
require('moment');

// Set debugging for mongo connections
mongoose.set('debug', config.mongodb.debug);

// Configure app for bodyParser() to let us grab data from the body of POST
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// Setup port for server to listen on (use PORT or 3000 if PORT not set)
var port = process.env.PORT || 3000;

// Connecte to MongoDB
//mongoose.Promise = global.Promise;
mongoose.connect('mongodb://' + config.mongodb.host + ':' + config.mongodb.port + '/' + config.mongodb.db ,{ useMongoClient: true });

// Add path to static content (HTML homepage) for Single Page Application (SPA) that will serve SWF content
// Express will by default look for index.html if it is not supplied i.e. localhost:3000
app.use(express.static(path.join(__dirname, '../public')));

// Added this static path so node modules js files can be accessed
app.use('/node_modules', express.static(path.join(__dirname, '../node_modules')));

//app.use('node_modules', express.static(__dirname + '/node_modules'));

// Setup API routes (all to be prefixed with /api). All functions generated by router will be applied to our application
var router = express.Router();
app.use('/api',router);

// Start the server (environment variable or port 3000 if not defined).
// Made server a variable so I can export to mocha/chai for unit testing.
//Seems to have lost ability for app to populate current week number in schedule section. This make sense?
var server = app.listen(port);
module.exports = server;
console.log('Server listening on port ' + port);

// ------------------------- BASIC SERVER CREATED --------------------- //

// Add in schema objects
var Engineer = require ('../models/engineer');
var Schedule = require ('../models/schedule');

// Add in bespoke functions for application
var SwfFn = require("../functions/supportSched_functions.js");

// Middleware - useful for validation, logging or stopping request from cotinuing in event request is not safe
router.use(function(req,res,next) {
    console.log('Request received');
    //app.use(express.static(path.join(__dirname, 'public')));
     // move on to route; if not there request stops here.
    next();
});

// Test Route (to see if everything is running)
router.get('/', function(req,res) {
  res.json({message: 'Welcome to the API'});
});

// ------------------------- API for Engineer --------------------- //
// create engineer and get all engineers
router.route('/engineers')

  .post(function(req,res)
  {
    var countQuery = Engineer.count();
    countQuery.exec(function (e, count)
    {
      if (count > 10)
      {
        console.log("More than 10 engineers; scheduler may not work." );
      }
    });

    // create record
    var engineer = new Engineer();
    engineer.fname = req.body.fname;
    engineer.lname = req.body.lname;
    engineer.gender = req.body.gender;
    engineer.empid = req.body.empid;
    engineer.dob = req.body.dob;
    engineer.start = req.body.start;

    Engineer.distinct('empid', function(err, empids) {
      //console.log(empids);
      var containsCheck = getEmployeeIDCheck(empids,engineer.empid);
      //console.log("check  = ", containsCheck, empids.length);
      if ( ! containsCheck )
      {
        // if no employee in the database has the same empid then save record
        engineer.save(function(err)
        {
          // if error on save  output error otherwise print confirmation note
          if (err)
          {
            res.send(err);
          }
          res.json({ message: "Engineer record created successfully", engineer});
        });
      } else {
        res.json({ message: "Employee with same EmpID exists in database; record not created"});
      }
    });
  })

  .get(function(req,res)
  {
    Engineer.find(function(err,engineer)
    {
      if (err)
      {
        res.send(err);
      }
      res.json(engineer);
    });
  })

  .delete(function(req,res)
  {
    Engineer.remove(function(err,engineer)
    {
      if (err)
      {
        res.send(err);
      }
      res.json({ message: "All engineer records deleted"});
    });
  });

// get or delete engineer based on employee ID
router.route('/engineers/:empid')
    .get(function(req,res)
    {
      Engineer.find({empid:req.params.empid},function(err,engineer)
      {
        if (err)
        {
          res.send(err);
        }
        res.json(engineer);
      });
    })

    .delete(function(req,res)
    {
      Engineer.remove({empid:req.params.empid},function(err,engineer)
      {
        if (err)
        {
          res.send(err);
        }
        res.json({ message: "Engineer record deleted successfully EmployeeID: ", empid:req.params.empid});
      });
    });

// get engineer based on mongo ID
router.route('/engineers/id/:engineer_id')

  .get(function(req,res)
  {
    Engineer.findById(req.params.engineer_id,function(err,engineer)
    {
      if (err)
      {
        res.send(err);
      }
      res.json(engineer);
    });
  });

// get engineer based on gender
router.route('/engineers/gender/:gender')

  .get(function(req,res)
  {
    // need to match attribute make in d/b to parameter in function; implicit for the _id lookup
    Engineer.find({gender:req.params.gender},function(err,engineer)
    {
      if (err)
      {
        res.send(err);
      }
      res.json(engineer);
    });
  });

// ------------------------- API for Schedule --------------------- //
// get entire schedule
router.route('/schedules/')
  .get(function(req,res)
  {
    Schedule.find(function(err,schedule)
    {
      if (err)
      {
        res.send(err);
      }
      res.json(schedule);
      console.log('Schedule GET (all) Completed');
    });
  });

// get engineer based on employ ee ID
router.route('/schedules/:empid')
  .get(function(req,res)
  {
      Schedule.find({empid:req.params.empid},function(err,schedule)
      {
        if (err)
        {
          res.send(err);
        }
        res.json(schedule);
        console.log('Schedule GET (empid) Completed');
      });
  });

// get schedule based on mongo ID
router.route('/schedules/id/:schedule_id')
  .get(function(req,res)
  {
    Schedule.findById(req.params.schedule_id,function(err,schedule)
    {
      if (err)
      {
        res.send(err);
      }
      res.json(schedule);
      console.log('Schedule GET (schedule_id) Completed');
    });
  });

// get schedule based on date
router.route('/schedules/date/:date')
  .get(function(req,res)
  {
    Schedule.find({date:req.params.date},function(err,schedule)
    {
      if (err)
      {
        res.send(err);
      }
      res.json(schedule);
      console.log('Schedule GET (date) Completed');
    });
  });


  // create, get and delete schedule for period in a year
  // - peroiod starts on week schedule_period and extends for 2 weeks
  // - period must be an odd number and includes 1 e.g. 1,3,5,7 etc.

  router.route('/schedules/:schedule_year/:schedule_period')

    .post(function(req,res)
    {
      // create record
      var query =  getEngineerIDs();
      var jsonMessage = "Success: Generated new schedule";

      console.log(parseInt(req.params.schedule_period%2),parseInt(req.params.schedule_period));

      query.exec(function(err,records)
      {
        if(err) return console.log(err);
        var results = SwfFn.populateCalendar(SwfFn.assignEngineers(records),+
                      req.params.schedule_year,req.params.schedule_period);
        if ( results.length == 0  ) {
          jsonMessage = "Failed: Start year/week in past";
        }
        console.log(jsonMessage);
        for (var count in results)
        {
          // Write record to Mongo using upsert; if records for future date already
          // here then overwrite them otherwise insert. This is ok since the period
          // is in the future
          Schedule.findOneAndUpdate (
            { ymd: results[count].ymd, shift: results[count].shift },
            results[count],
            {upsert: true, new: true, runValidators: true},
            function (err,res) { if (err) res.send(err); }
          );
        }
        res.json({message: jsonMessage });
      });

    })

    .get(function(req,res)
    {
      Schedule.find( { $and: [ { yr: req.params.schedule_year },{ wn:{$in:[req.params.schedule_period,parseInt(req.params.schedule_period)+1]}}]},
      function(err,schedule)
      {
        if (err)
        {
          res.send(err);
        }
        res.json(schedule);
        console.log('Schedule GET(year/weekstart) Completed');
      });
    })

    .delete(function(req,res)
    {
      Schedule.remove( { $and: [ { yr: req.params.schedule_year },{ wn:{$in:[req.params.schedule_period,parseInt(req.params.schedule_period)+1]}}]},
      function(err,schedule)
      {
        if (err) res.send(err);
        res.json({message: 'Schedule deletion completed successfully for year/period = ' + req.params.schedule_year + req.params.schedule_period});
      });
      //console.log('Schedule GET Completed');
    });

// Get Engineer IDs
function getEngineerIDs(){
   var query = Engineer.find({},{empid:1, _id:0});
   return query;
}

// Check to see if a value is in an array
 //getEmployeeIDCheck(empids,engineer.empid);
function getEmployeeIDCheck ( r, val ) {
    //console.log("at start of getEmployeeIDCheck", r.length, val);
    var i = 0, len = r.length;
    for(; i < len; i++ ) {
        //console.log(i,r[i],val);
        if( r[i] === val ) {
            return true;
        }
     }
     return false;
}
