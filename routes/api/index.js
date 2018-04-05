var router = require('express').Router();

const users = require('./users');
const profiles = require('./profiles');
const campaigns = require('./campaign');
const tags = require('./tags');
const payment = require('./payment');

router.use('/', users);
router.use('/profiles', profiles);
router.use('/campaigns', campaigns);
router.use('/tags', tags);
router.use('/payment', payment);

router.use(function(err, req, res, next){
  if(err.name === 'ValidationError'){
    return res.status(422).json({
      errors: Object.keys(err.errors).reduce(function(errors, key){
        errors[key] = err.errors[key].message;
        return errors;
      }, {})
    });
  }

  return next(err);
});

module.exports = router;