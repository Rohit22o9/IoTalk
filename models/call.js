const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
    caller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['audio', 'video'],
        default: 'audio'
    },
    status: {
        type: String,
        enum: ['ringing', 'accepted', 'declined', 'missed', 'ended'],
        default: 'ringing'
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: Date,
    duration: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Calculate duration before saving
callSchema.pre('save', function(next) {
    if (this.endTime && this.startTime && this.status === 'ended') {
        this.duration = Math.floor((this.endTime - this.startTime) / 1000);
    }
    next();
});

module.exports = mongoose.model('Call', callSchema);