var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');
var slug = require('slug');
var User = mongoose.model('User');

var CampaignSchema = new mongoose.Schema({
    slug: {type: String, lowercase: true, unique: true},
    title: String,
    description: String,
    body: String,
    amount: Number,
    favoritesCount: {type: Number, default: 0},
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
    tagList: [{ type: String }],
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {timestamps: true});

CampaignSchema.plugin(uniqueValidator, {message: 'is already taken'});

CampaignSchema.pre('validate', function(next){
    if(!this.slug)  {
        this.slugify();
    }

    next();
});

CampaignSchema.methods.slugify = function() {
    this.slug = slug(this.title) + '-' + (Math.random() * Math.pow(36, 6) | 0).toString(36);
};

CampaignSchema.methods.updateFavoriteCount = function() {
    var campaign = this;

    return User.count({favorites: {$in: [campaign._id]}}).then(function(count){
        campaign.favoritesCount = count;

        return campaign.save();
    });
};

CampaignSchema.methods.toJSONFor = function(user){
    return {
        slug: this.slug,
        title: this.title,
        description: this.description,
        body: this.body,
        amount: this.amount,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        tagList: this.tagList,
        favorited: user ? user.isFavorite(this._id) : false,
        favoritesCount: this.favoritesCount,
        author: this.author.toProfileJSONFor(user)
    };
};

mongoose.model('Campaign', CampaignSchema);
