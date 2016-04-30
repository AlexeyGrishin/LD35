let t = require('lang').t;

var gamejs = require('gamejs');
let {figure, pixel, cell, figureInCell, PIX_SIZE, time, CELL_SIZE} = require('./consts');

class MessageLoop {
    constructor(state, message, figureSaying) {
        this.state = state;
        this.state.message = t(message);
        this.state.messageShown = "";
        this.state.messageFigure = figureSaying;
        this.passed = 0;
    }

    isShownCompletely() {
        return this.state.message.length == this.state.messageShown.length;
    }

    loop(ms) {
        this.passed += ms;
        if (this.isShownCompletely() && this.passed > 3000) {
            this.next();
            return;
        }
        if (!this.isShownCompletely() && this.passed > 100) {
            this.passed -= 100;
            let spIdx = this.state.message.indexOf(" ", this.state.messageShown.length+1);
            this.state.messageShown = spIdx == -1 ? this.state.message : this.state.message.substring(0, spIdx);
        }
        if (this.state.pressed[gamejs.event.K_SPACE]) {
            this.next();
        }
    }

    click() {
        this.next();
    }

    next() {
        if (!this.isShownCompletely()) {
            this.state.messageShown = this.state.message;
            return;
        }
        this.state.message = null;
        this.state.messageShown = null;
        this.state.messageFigure = null;
        this.state.next();
    }
}

class NullLoop {
    constructor(state) {
        console.log("null");
    }

    loop(ms) {}

    click() {}
}

let MOVE = "move";
let WAITING = "waiting";
let MOVED = "moved";
let MORPHING = "morphing";

class GamingLoop {
    constructor(state, controllerIdx, stopCondition) {
        this.state = state;
        this.controllerIdx = controllerIdx;
        this.stopCondition = stopCondition;
        this.state.phase = MOVE;
    }

    loop(ms) {
        for (var xy in this.state.highlightMovement) {
            if (this.state.highlightMovementTo == xy) {
                this.state.highlightMovement[xy] += 0.1;
            } else {
                this.state.highlightMovement[xy] -= 0.1;
            }
            this.state.highlightMovement[xy] = Math.max(0, this.state.highlightMovement[xy]);
            this.state.highlightMovement[xy] = Math.min(1, this.state.highlightMovement[xy]);
            if (this.state.highlightMovement[xy] == 0) {
                delete this.state.highlightMovement[xy];
            }
        }
        if (this.state.hasAnimations) {
            if (this.state.controller) {
                let mf = this.state.controller.moving;
                let moves = this.state.controller.possibleFields;
                for (let f of this.state.level.figures.filter((f) => f.isAlive)) {
                    if (mf == f) continue;
                    let t = moves.find((m) => m.x == f.x && m.y == f.y);
                    let dx = f.x - mf.x;
                    let dy = f.y - mf.y;
                    if (t && t.beats && t.beats.indexOf(f) != -1 && (dx*dx+dy*dy) < 1) {
                        f.smashed();
                    }
                }
            }
            return;
        }
        if (this.state.phase == MOVED && this.state.controller && this.state.controller.shallMorph()) {
            this.state.controller.morph();
            return;
        }

        if (this.state.phase == MORPHING) {
            this.state.controller.morph();
            this.state.controller.recalculate();
            this.state.phase = WAITING;
            if (this.stopCondition()) {
                this.state.controller = null;
                this.state.phase = null;
                return;
            }
        }
        if (this.state.phase == MOVED) {
            if (!this.state.level.hero.isAlive) {
                this.state.loose();
                return;
            }
            if (this.stopCondition()) {
                this.state.controller = null;
                this.state.phase = null;
                return;
            }
            this.controllerIdx = (this.controllerIdx + 1) % this.state.level.controllers.length;
        }
        if (this.state.phase == WAITING) {
            return;
        }
        let controller = this.state.level.controllers[this.controllerIdx];
        this.state.controller = controller;
        if (controller.isHero()) {
            controller.recalculate();
            this.state.phase = WAITING;
        } else {
            controller.performMove();
            this.state.phase = MOVED;
        }


    }

    move(pos) {
        let controller = this.state.level.controllers[this.controllerIdx];
        if (this.state.phase != WAITING || !controller.isHero()) return;
        let cx = Math.floor(pos[0] / CELL_SIZE / PIX_SIZE);
        let cy = Math.floor(pos[1] / CELL_SIZE / PIX_SIZE);
        if (controller.canMoveTo(cx, cy)) {
            this.state.highlightMovement = this.state.highlightMovement || {};
            this.state.highlightMovement[cx + "_" + cy] = this.state.highlightMovement[cx + "_" + cy] || 0.1;
            this.state.highlightMovementTo = cx + "_" + cy;
        } else {
            this.state.highlightMovementTo = null;
        }
    }

    click(pos) {
        let controller = this.state.level.controllers[this.controllerIdx];
        if (this.state.phase != WAITING || !controller.isHero()) return;
        let cx = Math.floor(pos[0] / CELL_SIZE / PIX_SIZE);
        let cy = Math.floor(pos[1] / CELL_SIZE / PIX_SIZE);
        if (!controller.performMove(cx, cy)) return;
        if (!controller.canMoveAgain()) {
            this.state.phase = MOVED;
        } else {
            this.state.phase = MORPHING;
        }
    }
}

class ActionLoop {
    constructor(state, action) {
        this.state = state;
        this.action = action;
    }

    loop() {
        this.action();
        this.state.next();
    }
}

exports.loops = (game) => {return {
    message: (...args) => () => new MessageLoop(game, ...args),
    action: (...args) => () => new ActionLoop(game, ...args),
    gaming: (...args) => () => new GamingLoop(game, ...args),
    nothing: (...args) => () => new NullLoop(game, ...args)
}};
exports.WAITING = WAITING;