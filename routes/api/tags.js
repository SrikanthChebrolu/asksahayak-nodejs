var router = require('express').Router();
var mongoose = require('mongoose');
var Campaign = mongoose.model('Campaign');

// return a list of tags
router.get('/', function(req, res, next) {
  Campaign.find().distinct('tagList').then(function(tags){
    return res.json({tags: tags});
  }).catch(next);
});

module.exports = router;
