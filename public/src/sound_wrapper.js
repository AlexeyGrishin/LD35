var gamejs = require('gamejs');
var audio = require('gamejs/audio');

class SoundWrapper {
    constructor(path) {
        this.sound = new gamejs.audio.Sound(path);
        this.playing = false;
    }

    play(loop) {
        if (this.playing) return;
        this.playing = true;
        if (!loop) {
            setTimeout(() => this.playing = false, this.sound.getLength() * 1000);
        }
        return this.sound.play(loop);
    }

    stop() {
        this.playing = true;
        return this.sound.stop();
    }

    setVolume(v) {
        this.sound.setVolume(v);
    }
}

exports.SoundWrapper = SoundWrapper;