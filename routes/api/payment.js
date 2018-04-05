var router = require('express').Router();
var mongoose = require('mongoose');
var User = mongoose.model('User');
var auth = require('../auth');

function postStripeCharge(stripeErr, stripeRes) {
    if (stripeErr) {
        res.status(500).send({ error: stripeErr });
    } else {
        res.status(200).send({ success: stripeRes });
    }
}

router.get('/paymenttest', function(req, res) {
    return res.json({ message: 'Hello Stripe checkout server!', timestamp: new Date().toISOString() })
});

router.post('/payment', auth.required, function(req, res){
    return stripe.charges.create(req.body, postStripeCharge(res));
});

module.exports = router;

