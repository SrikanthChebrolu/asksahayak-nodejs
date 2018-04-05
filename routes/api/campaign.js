var router = require('express').Router();
var mongoose = require('mongoose');
var Campaign = mongoose.model('Campaign');
var Comment = mongoose.model('Comment');
var User = mongoose.model('User');
var auth = require('../auth');

// Preload campaign objects on routes with ':Campaign'
router.param('campaign', function(req, res, next, slug) {
    Campaign.findOne({ slug: slug})
    .populate('author')
    .then(function (campaign) {
      if (!campaign) { return res.sendStatus(404); }

      req.campaign = campaign;

      return next();
    }).catch(next);
});

router.param('comment', function(req, res, next, id) {
  Comment.findById(id).then(function(comment){
    if(!comment) { return res.sendStatus(404); }

    req.comment = comment;

    return next();
  }).catch(next);
});

router.get('/', auth.optional, function(req, res, next) {
  var query = {};
  var limit = 20;
  var offset = 0;

  if(typeof req.query.limit !== 'undefined'){
    limit = req.query.limit;
  }

  if(typeof req.query.offset !== 'undefined'){
    offset = req.query.offset;
  }

  if( typeof req.query.tag !== 'undefined' ){
    query.tagList = {"$in" : [req.query.tag]};
  }

  Promise.all([
    req.query.author ? User.findOne({username: req.query.author}) : null,
    req.query.favorited ? User.findOne({username: req.query.favorited}) : null
  ]).then(function(results){
    var author = results[0];
    var favoriter = results[1];

    if(author){
      query.author = author._id;
    }

    if(favoriter){
      query._id = {$in: favoriter.favorites};
    } else if(req.query.favorited){
      query._id = {$in: []};
    }

    return Promise.all([
        Campaign.find(query)
        .limit(Number(limit))
        .skip(Number(offset))
        .sort({createdAt: 'desc'})
        .populate('author')
        .exec(),
        Campaign.count(query).exec(),
      req.payload ? User.findById(req.payload.id) : null,
    ]).then(function(results){
      var campaigns = results[0];
      var campaignsCount = results[1];
      var user = results[2];

      return res.json({
          campaigns: campaigns.map(function(campaign){
          return campaign.toJSONFor(user);
        }),
          campaignsCount: campaignsCount
      });
    });
  }).catch(next);
});

router.get('/feed', auth.required, function(req, res, next) {
  var limit = 20;
  var offset = 0;

  if(typeof req.query.limit !== 'undefined'){
    limit = req.query.limit;
  }

  if(typeof req.query.offset !== 'undefined'){
    offset = req.query.offset;
  }

  User.findById(req.payload.id).then(function(user){
    if (!user) { return res.sendStatus(401); }

    Promise.all([
        Campaign.find({ author: {$in: user.following}})
        .limit(Number(limit))
        .skip(Number(offset))
        .populate('author')
        .exec(),
        Campaign.count({ author: {$in: user.following}})
    ]).then(function(results){
      var campaigns = results[0];
      var campaignsCount = results[1];

      return res.json({
          campaigns: campaigns.map(function(campaign){
              console.log(campaign.toJSONFor(user));
          return campaign.toJSONFor(user);
        }),
          campaignsCount: campaignsCount
      });
    }).catch(next);
  });
});

router.post('/', auth.required, function(req, res, next) {
  User.findById(req.payload.id).then(function(user){
    if (!user) { return res.sendStatus(401); }

    var campaign = new Campaign(req.body.campaign);

      campaign.author = user;

    return campaign.save().then(function(){
      console.log(campaign.author);
      return res.json({campaign: campaign.toJSONFor(user)});
    });
  }).catch(next);
});

// return a campaign
router.get('/:campaign', auth.optional, function(req, res, next) {
  Promise.all([
    req.payload ? User.findById(req.payload.id) : null,
    req.campaign.populate('author').execPopulate()
  ]).then(function(results){
    var user = results[0];

    return res.json({campaign: req.campaign.toJSONFor(user)});
  }).catch(next);
});

// update campaign
router.put('/:campaign', auth.required, function(req, res, next) {
  User.findById(req.payload.id).then(function(user){
    if(req.campaign.author._id.toString() === req.payload.id.toString()){
      if(typeof req.body.campaign.title !== 'undefined'){
        req.campaign.title = req.body.campaign.title;
      }

      if(typeof req.body.campaign.description !== 'undefined'){
        req.campaign.description = req.body.campaign.description;
      }

      if(typeof req.body.campaign.body !== 'undefined'){
        req.campaign.body = req.body.campaign.body;
      }

      if(typeof req.body.campaign.tagList !== 'undefined'){
        req.campaign.tagList = req.body.campaign.tagList
      }

        if(typeof req.body.campaign.amount !== 'undefined'){
            req.campaign.amount = req.body.campaign.amount
        }

      req.campaign.save().then(function(campaign){
        return res.json({campaign: campaign.toJSONFor(user)});
      }).catch(next);
    } else {
      return res.sendStatus(403);
    }
  });
});

// delete campaign
router.delete('/:campaign', auth.required, function(req, res, next) {
  User.findById(req.payload.id).then(function(user){
    if (!user) { return res.sendStatus(401); }

    if(req.campaign.author._id.toString() === req.payload.id.toString()){
      return req.campaign.remove().then(function(){
        return res.sendStatus(204);
      });
    } else {
      return res.sendStatus(403);
    }
  }).catch(next);
});

// Favorite an campaign
router.post('/:campaign/favorite', auth.required, function(req, res, next) {
  var campaignId = req.campaign._id;

  User.findById(req.payload.id).then(function(user){
    if (!user) { return res.sendStatus(401); }

    return user.favorite(campaignId).then(function(){
      return req.campaign.updateFavoriteCount().then(function(campaign){
        return res.json({campaign: campaign.toJSONFor(user)});
      });
    });
  }).catch(next);
});

// Unfavorite an campaign
router.delete('/:campaign/favorite', auth.required, function(req, res, next) {
  var campaignId = req.campaign._id;

  User.findById(req.payload.id).then(function (user){
    if (!user) { return res.sendStatus(401); }

    return user.unfavorite(campaignId).then(function(){
      return req.campaign.updateFavoriteCount().then(function(campaign){
        return res.json({campaign: campaign.toJSONFor(user)});
      });
    });
  }).catch(next);
});

// return an campaign's comments
router.get('/:campaign/comments', auth.optional, function(req, res, next){
  Promise.resolve(req.payload ? User.findById(req.payload.id) : null).then(function(user){
    return req.campaign.populate({
      path: 'comments',
      populate: {
        path: 'author'
      },
      options: {
        sort: {
          createdAt: 'desc'
        }
      }
    }).execPopulate().then(function(campaign) {
      return res.json({comments: req.campaign.comments.map(function(comment){
        return comment.toJSONFor(user);
      })});
    });
  }).catch(next);
});

// create a new comment
router.post('/:campaign/comments', auth.required, function(req, res, next) {
  User.findById(req.payload.id).then(function(user){
    if(!user){ return res.sendStatus(401); }

    var comment = new Comment(req.body.comment);
    comment.campaign = req.campaign;
    comment.author = user;

    return comment.save().then(function(){
      req.campaign.comments.push(comment);

      return req.campaign.save().then(function(campaign) {
        res.json({comment: comment.toJSONFor(user)});
      });
    });
  }).catch(next);
});

router.delete('/:campaign/comments/:comment', auth.required, function(req, res, next) {
  if(req.comment.author.toString() === req.payload.id.toString()){
    req.campaign.comments.remove(req.comment._id);
    req.campaign.save()
      .then(Comment.find({_id: req.comment._id}).remove().exec())
      .then(function(){
        res.sendStatus(204);
      });
  } else {
    res.sendStatus(403);
  }
});

module.exports = router;
