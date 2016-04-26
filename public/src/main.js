var gamejs = require('gamejs');
let graphics = require('gamejs/graphics');
let {Field} = require('./field');
let {Figure, FigureDrawer} = require('./chess_figure');
let {Rules} = require('./chess_rules');
let {Font} = require('gamejs/font');
let {figure, pixel, cell, figureInCell, PIX_SIZE, time, CELL_SIZE} = require('./consts');

class MessageLoop {
    constructor(state, message) {
        this.state = state;
        this.state.message = message;
    }

    loop(ms) {
        if (pressed[gamejs.event.K_SPACE]) {
            this.next();
        }
    }

    click() {
        this.next();
    }

    next() {
        this.state.message = null;
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
        if (this.state.hasAnimations) {
            if (this.state.controller) {
                let mf = this.state.controller.moving;
                let moves = this.state.controller.possibleFields;
                for (let f of this.state.level.figures.filter((f) => f.isAlive)) {
                    if (mf == f) continue;
                    let t = moves.find((m) => m.x == f.x && m.y == f.y);
                    let dx = f.x - mf.x;
                    let dy = f.y - mf.y;
                    if (t && t.beats.indexOf(f) != -1 && (dx*dx+dy*dy) < 1) {
                        f.smashed();
                    }
                }
            }
            return;
        }
        if (this.state.phase == MORPHING) {
            this.state.controller.morph();
            this.state.controller.recalculate();
            this.state.phase = WAITING;
        }
        if (this.state.phase == MOVED) {
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

class GameState {
    constructor() {
        this.startLevel({field: [
            "..R.....",
            ".*......",
            "......g.",
            "........",
            "...BR...",
            "........",
            "........",
            "......K.",
        ],
            controllers: [
                (level) => new UserController(level.field, HeroState),
                (level) => new AIController("White", level.field, (f) => f.side == 'white' && f.figure != 'pawn'),
                (level) => new AIController("Black", level.field, (f) => f.side == 'black'),
            ],
            scenario: (level, game) => {
                return [
                    () => new MessageLoop(game, "Test message"),
                    () => new GamingLoop(game, 0, () => {
                        console.log(level.hero);
                        if (level.hero.y == 0) {
                            game.next();
                            return true;
                        }

                    }),
                    () => new MessageLoop(game, "After first cycle"),
                    () => new ActionLoop(game, () => {
                        HeroState.side = 'hero';
                        level.hero.side = 'hero';
                        level.hero.morph('queen');
                    }),
                    () => new GamingLoop(game, 0, () => {
                        if (!level.field.figures.some((f) => f.side == 'black' && f.isAlive)) {
                            game.win();
                            return true;
                        }
                    })
                ];
            }
        })
    }

    startLevel(level) {
        this.subloop = null;
        this.level = new Level(level);

        this.scenario = this.level.scenario(this);
        this.next();
    }

    get subloop() { return this._subloop;}

    set subloop(val) {
        this._subloop = val;
        console.log(val);
    }

    next() {
        this.subloop = this.scenario.shift()();
    }

    win() {
        this.subloop = new NullLoop(this);
    }

    playAnimations(ms) {
        this.hasAnimations = false;
        this.level.field.figures.forEach((f) => {
            if (f.tick(ms)) this.hasAnimations = true;
        });
    }

    loop(ms) {
        this.playAnimations(ms);
        if (this.subloop && this.subloop.loop) this.subloop.loop(ms);
    }

    click(pos) {
        if (this.subloop && this.subloop.click) this.subloop.click(pos);
    }

    draw(surface) {
        //draw field
        this.level.field.map.forEach((row, ri) => {
            row.forEach((fcell, ci) => {
                var color = {
                    white: 'white',
                    black: 'gray',
                    false: 'black'
                }[fcell];
                if (this.phase == WAITING && this.controller.isHero()) {
                    let mv = this.controller.getPossibleFields().find(({x,y}) => x == ci && y == ri);
                    if (mv) {
                        color = 'blue';
                        if (mv.beats && mv.beats.length) {
                            color = 'red';
                        }
                    }
                }
                graphics.rect(surface, color, new gamejs.Rect(cell(ci), cell(ri), CELL_SIZE*PIX_SIZE, CELL_SIZE*PIX_SIZE), 0);
            });
        });
        //draw figures
        let drawer = new FigureDrawer(surface);
        this.level.figures.forEach((fig) => {
            drawer.draw(fig);
        });
        //draw messages
        if (this.message) {
            surface.blit(FONT.render(this.message, "red"), [0,0]);
        }
    }

}

var HeroState = {
    figure: 'pawn',
    side: 'white',
    rules: null//TODO
};

class Level {
    constructor(levelDescription) {
        this.field = new Field(levelDescription.field);
        this.controllers = levelDescription.controllers.map((ctor) => ctor(this));
        this.scenarioCtor = levelDescription.scenario;
    }

    get figures() {
        return this.field.figures;
    }

    get hero() {
        return this.field.hero;
    }

    scenario(game) {
        return this.scenarioCtor(this, game);
    }
}

class Controller {
    constructor(name, field) {
        this._field = field;
        this._name = name;
    }

    get name() {
        return this._name;
    }

    get field() {
        return this._field;
    }

    isHero() { return false; }
}

class UserController extends Controller {
    constructor(field, heroState) {
        super("Your", field);
        this._hero = new Figure(heroState.figure, {side: heroState.side});
        field.assignHero(this._hero);
        this.figures = [this.hero];
    }

    isHero() { return true; }

    recalculate() {
        this.possibleFields = Rules[this._hero.figure].getMoves(this._hero, this.field);
        this.moving = this._hero;
        console.log(this.possibleFields);
    }

    getPossibleFields() {
        return this.possibleFields;
    }

    performMove(x,y) {
        let pm = this.possibleFields.find((p) => p.x == x && p.y == y);
        if (!pm) return false;
        this._hero.move({x,y,drawShlafe:true});
        this.morphAfterMove = pm.morphTo;
        //TODO: morph
        return true;
    }

    canMoveAgain() {
        return this.morphAfterMove && this._hero.side == 'hero';
    }

    morph() {
        this._hero.morph(this.morphAfterMove);
    }
}

class AIController extends Controller {
    constructor(name, field, selector) {
        super(name, field);
        this.figures = field.figures.filter(selector);
    }

    getPossibleFields() {
        return this.possibleFields;
    }

    performMove() {
        let alive = this.figures.filter((f) => f.isAlive);
        let f = alive[Math.floor(Math.random()*alive.length)];
        let mvs = Rules[f.figure].getMoves(f, this.field);
        this.possibleFields = mvs;
        this.moving = f;
        //console.log(f, mvs);
        f.move(mvs[0]);
    }

}

var pressed = {};
let FONT = new Font('20px monospace');

gamejs.ready(() => {

    gamejs.event.onKeyDown((e) => {
        pressed[e.key] = true;
    });
    gamejs.event.onKeyUp((e) => {
        pressed[e.key] = false;
    });

    gamejs.event.onMouseDown((e) => {
        game.click(e.pos);
    });
    var game = new GameState();

    gamejs.onTick((msDuration) => {
        let display = gamejs.display.getSurface();
        display.clear();
        //graphics.rect(display, "blue", new gamejs.Rect(10, 10, 20, 20));
        game.loop(msDuration);
        game.draw(display);
    });
});


/*
1. draw figure, movements, fighting - as in prototype
2. add chess rules - how figures can walk, fight, etc
3. add own rules - how hero can do the same
4. control - highlight moves, morphs, etc.
5. several small scenario-based puzzles
6. free scrolling arena - support runaway troops.
7. very little enemy AI
8. graphics, fonts, music
9. levels
10. story

?. switching levels

! king


Game

  Level
    Field
    Figures
    Controllers
        //depending on scenario
        HeroController
    Scenario
        Events


Loop
  render
  events->controller
  collisions->controller


 */

/*
visual effects:
- floor - generate facets. ruine them in holes, fill with blood on murder
- wave for target cell
 */