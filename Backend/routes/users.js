var express = require('express');
var router = express.Router();
const uuidv4 = require('uuid/v4');
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, '..', 'uploads/') });

const { jwtsecret, encrAlgorithm, encrSecret } = require('../config');
const { getStudent, getInterviewer, getPersons, savePerson, editPerson } = require('../DAL')
const { getRestaurants, saveRestaurant, editRestaurant } = require('../DAL')
const { getItems, saveItem, editItem } = require('../DAL')
const { getMatching, saveInterviewDetails, updateInterviewerStatus, getupdatedInterviewerDetails, statusChange} = require('../DAL')

// crypto (can be updated to use 'bcrypt' instead)
const _encrypt = password => {
  const cipher = crypto.createCipher(encrAlgorithm, encrSecret);
  let ciphered = cipher.update(password, 'utf8', 'hex');
  ciphered += cipher.final('hex');
  return ciphered;
};

const _decrypt = encrypted => {
  const decipher = crypto.createDecipher(encrAlgorithm, encrSecret);
  let deciphered = decipher.update(encrypted, 'hex', 'utf8');
  deciphered += decipher.final('utf8');
  return deciphered;
};


// get all users (test route)
router.get('/', async function (req, res, next) {
  try {
    const { results } = await getPersons();
    res.json(results);
  } catch (e) {
    res.status(500).send(e.message || e);
  }
});

// get all students
router.get('/students', async function (req, res, next) {
  try {
    const { results } = await getStudent();
    res.json(results);
  } catch (e) {
    res.status(500).send(e.message || e);
  }
});

// get all students matching with interviewer
router.get('/matching', async function (req, res, next) {
//const { Interviewer_ID , Student_ID } = req.query;
const Student_ID = 2;
const { Interviewer_ID  } = req.query;
  try {
    const { results } = await getMatching();
    console.log(results);
    if(results)
    {
      matching_result = JSON.parse(JSON.stringify(results[0]));
    
    console.log(matching_result);
    console.log(Student_ID);
    
    const Interviewer_Id = matching_result.Interviewer_ID;


    var d = new Date();
    var curr_date = d.getDate();
    var curr_month = d.getMonth() + 1;
    var curr_year = d.getFullYear();
    var seconds = d.getSeconds();
    var minutes = d.getMinutes();
    var hour = d.getHours();

    interviewDetails = {
      Interviewer_Id : matching_result.Interviewer_ID,
      //Student_Id : matching_result.Student_ID,
      Student_Id : 2,
      Location : '1',
      Time : (curr_year + '-' + curr_month + '-' + curr_date + ' ' + hour + ':' + minutes + ':' + seconds),
      Status : 'planned'
    }

    try {
      const { interviewDetailsResults } = await saveInterviewDetails(interviewDetails);
    }
    catch (e) {
      console.log("no matching results");
      res.status(500).send(e.message || e);
    }
    

    interviewDetailsUpdate = {
      Interviewer_Id : matching_result.Interviewer_ID,
      
    }

    try {
      const { updateInterviewerResults } = await updateInterviewerStatus(interviewDetailsUpdate);
    }
    catch (e) {
      console.log("no matching results");
      res.status(500).send(e.message || e);
    }

    try {
      const { results } = await getupdatedInterviewerDetails(interviewDetailsUpdate);
    }
    catch (e) {
      console.log("no matching results");
      res.status(500).send(e.message || e);
    }
    

    res.json(results);
    }
    
    
  } catch (e) {
    console.log("no matching results");
    res.status(500).send(e.message || e);
  }
});

// get all Interviewers
router.get('/interviewers', async function (req, res, next) {
  try {
    const { results } = await getInterviewer();
    res.json(results);
  } catch (e) {
    res.status(500).send(e.message || e);
  }
});

// save user (signup)
router.post('/', async (req, res, next) => {
  const { email, password, firstName, lastName, profileImage, restName, restZipCode } = req.body;
  const isSeller = req.body.isSeller === 'true' || req.body.isSeller === true;

  // make sure mandatory keys are present
  if (!(email && password && firstName && lastName)) {
    console.error('save users, mandatory buyer info missing');
    return res.status(400).json({ message: "mandatory buyer info missing" });
  }
  //check mandatory seller keys are present
  let restaurant = null;
  if (isSeller) {
    if (!(restName && restZipCode)) {
      console.error('save users, mandatory seller info missing');
      return res.status(400).json({ message: 'mandatory seller info missing ' });
    }
    else {
      restaurant = {
        restaurantId: uuidv4(),
        ownerId: uuidv4(),
        name: restName,
        address: '',
        cuisine: '',
        image: '',
        zipcode: restZipCode
      }
    }
  }

  const person = {
    id: restaurant ? restaurant.ownerId : uuidv4(),
    password: _encrypt(password),
    isSeller, email, firstName, lastName, profileImage
  }
  try {
    const { results } = await savePerson(person);
    isSeller && (await saveRestaurant(restaurant));
    res.json(results);
  } catch (e) {
    console.error('error creating a new user or restaurant', e);
    res.status(500).json({ message: e.message || e });
  }
});

// login
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;
  if (!(email && password)) {
    console.error('login, email/password missing');
    return res.status(400).json({ message: "invalid credentials" });
  }

  try {
    const { results } = await getPersons({ email, password: _encrypt(password) });
    if (results.length == 1) {
      const user = results[0];
      const authCookie = jwt.sign({
        id: user.id,
        email: user.email,
        isSeller: user.isSeller === 1
      }, jwtsecret, { expiresIn: "7d" });
      res.cookie('authCookie', authCookie, { maxAge: 900000, httpOnly: false, path: '/' });
      return res.json(user);
    } else {
      console.error('login, no user found: bad credentials');
      return res.status(400).json({ message: "bad credentials" });
    }
  } catch (e) {
    console.error('error in login', e);
    res.status(500).json({ message: e.message || e });
  }
});

//profile
router.get('/profile', async (req, res, next) => {
  let restaurant, queryResult, Restresult, finalresult;

  if (!(req.cookies.authCookie)) {
    console.error("Unauthorised access");
    return res.status(401).json({ message: "please login to continue" });
  }

  try {
    const user = jwt.verify(req.cookies.authCookie, jwtsecret);
    if (user.isSeller) {
      restaurant = { ownerId: user.id };
      ({ results: queryResult } = await getRestaurants(restaurant));
      Restresult = JSON.parse(JSON.stringify(queryResult))[0];
    }

    const person = { email: user.email };
    const { results } = await getPersons(person);
    let Personresult = JSON.parse(JSON.stringify(results))[0];

    delete Personresult.password;
    if (Restresult) {
      finalresult = { ...Personresult, ...Restresult };
    }
    else {
      finalresult = { ...Personresult };
    }
    res.json(finalresult);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/profile', upload.single('profileImage'), async (req, res, next) => {
  let person;
  const { email, password, firstName, lastName } = req.body;
  const profileImage = req.file ? `/${req.file.filename}` : '';
  if (!(req.cookies.authCookie)) {
    console.error("Unauthorised access");
    return res.status(401).json({ message: "please login to continue" });
  }
  try {
    const user = jwt.verify(req.cookies.authCookie, jwtsecret);
    person = {
      id: user.id,
      email, password, firstName, lastName, profileImage
    }
    await editPerson(person);
    res.json({ message: "Details updated" });
  }
  catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/update',  async (req, res, next) => {
  const { Interviewer_ID, Student_ID, Status} = req.query;
  
  interviewDetailsUpdate = {
    Interviewer_Id : Interviewer_ID,
    Student_Id : Student_ID,
    Status : Status

    
  }

  try {
    const { results } = await statusChange(interviewDetailsUpdate);
    res.send(results);
  }
  catch (e) {
    console.log("no matching results");
    res.status(500).send(e.message || e);
  }
});


module.exports = router;
