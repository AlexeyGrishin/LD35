var gamejs = require('gamejs');
let graphics = require('gamejs/graphics');
let {Field} = require('./field');
let {Figure, FigureDrawer} = require('./chess_figure');
let {Rules} = require('./chess_rules');
let {Font} = require('gamejs/font');
let {figure, pixel, cell, figureInCell, PIX_SIZE, time, CELL_SIZE} = require('./consts');
let {loops, WAITING} = require('./loops');
let {levels} = require('./levels');
let {Background} = require('./facets');
let {t} = require('./lang');

var bgSurfaces = [];
let BGS = 100;
for (var i = 0; i < BGS; i++) {
    bgSurfaces.push(new gamejs.graphics.Surface([800,800]));
}
var fieldSurface = new gamejs.graphics.Surface([800,800]);
var uiSurface = new gamejs.graphics.Surface([800,800]);
//let bgSurface = new gamejs.graphics.Surface([800,800]);
for (var x = 0; x < 10; x++) {
    for (var y = 0; y < 10; y++) {
        let color = parseInt(Background.find((p) => p.x == x && p.y == y).color.split(",")[1]);
        let direction = Math.random() < 0.5 ? -1 : 1;
        let factor = 0.1;
        let bootstrap = Math.floor((1/factor)*Math.random());
        for (var i = 0; i < BGS;i++) {
            let ii = (bootstrap + i) % BGS;
            let icolor = Math.round(color + direction * ((BGS/2 - Math.abs(ii-BGS/2))) * factor);
            graphics.rect(bgSurfaces[i], "rgb(" + [icolor,icolor,icolor].join(",") + ")", new gamejs.Rect(x*80,y*80,80,80), 0);
        }
    }
}

class GameState {
    constructor() {
        this.pressed = {};
        this.loops = loops(this);
        this.startLevel(levels.level1);
        this.bgIdx = 0;
        this.bgPass = 0;
        this.bgChanged = true;
    }

    startLevel(level) {
        this.subloop = null;
        this.level = new Level(level);
        this.scenario = this.level.scenario(this);
        this.next();
        this.updateUi();
        fieldSurface.clear();
    }

    get subloop() { return this._subloop;}

    set subloop(val) {
        this._subloop = val;
    }

    next() {
        this.subloop = this.scenario.shift()();
    }

    win(nextLevel) {
        HeroState.savedPawns += this.level.figures.filter((f) => f.isAlive && f.figure == 'pawn').length;
        if (nextLevel) {
            this.startLevel(nextLevel);
        } else {
            console.log("win");
            this.subloop = this.loops.nothing(this);
        }
    }

    loose() {
        console.log("lost");
        this.subloop = this.loops.nothing(this);
    }

    playAnimations(ms) {
        this.hasAnimations = false;
        this.level.field.figures.forEach((f) => {
            if (f.tick(ms)) this.hasAnimations = true;
        });
    }

    loop(ms) {
        this.bgPass += ms;
        if (this.bgPass > 400) {
            this.bgPass -= 400;
            this.bgIdx = (this.bgIdx + 1) % BGS;
            this.bgChanged = true;
        }
        this.playAnimations(ms);
        if (this.subloop && this.subloop.loop) this.subloop.loop(ms);
    }

    click(pos) {
        if (this.subloop && this.subloop.click) this.subloop.click([pos[0] - this.offsetX, pos[1] - this.offsetY]);
    }

    draw(surface) {
        //draw background
        if (this.bgChanged) {
            surface.blit(bgSurfaces[this.bgIdx], null, null, 'copy');
        }

        //draw interface
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
                graphics.rect(fieldSurface, color, new gamejs.Rect(cell(ci), cell(ri), CELL_SIZE*PIX_SIZE, CELL_SIZE*PIX_SIZE), 0);
            });
        });
        //draw figures
        let drawer = new FigureDrawer(fieldSurface);
        this.level.figures.forEach((fig) => {
            drawer.draw(fig);
        });
        //draw messages
        if (this.messageShown) {
            let [width, height] = MSG_FONT.size(this.messageShown);
            let [fwidth, fheight] = MSG_FONT.size(this.message);
            var pad = 5;
            var x,y,colors;
            if (this.messageFigure) {
                x = cell(this.messageFigure.x) - width;
                y = cell(this.messageFigure.y) - height;
                if (cell(this.messageFigure.x) < fwidth) {
                    x += width + cell(1);
                }
                if (cell(this.messageFigure.y) < fheight) {
                    y += height + cell(1);
                }

                colors = {
                    'white': {bg: 'white', fg: 'black'},
                    'black': {bg: 'black', fg: 'white'},
                    'hero': {bg: '#4400cc', fg: 'white'}
                }[this.messageFigure.color];
            } else {
                x = cell(this.level.width/2) - fwidth/2;
                y = cell(this.level.height/2) - fheight/2;
                pad = 10;
                colors = {bg: '#883333', fg: 'white'}
            }

            graphics.rect(fieldSurface, colors.bg, new gamejs.Rect(x, y, width+pad*2, height+pad*2), 0);
            graphics.rect(fieldSurface, colors.fg, new gamejs.Rect(x, y, width+pad*2, height+pad*2), 2);
            fieldSurface.blit(MSG_FONT.render(this.messageShown, colors.fg), [x+pad,y+pad-2]);
        }
        this.offsetX = 400-cell(this.level.width)/2;
        this.offsetY = 40;
        surface.blit(fieldSurface, [this.offsetX, this.offsetY]);
        graphics.rect(surface, 'brown', new gamejs.Rect(400-cell(this.level.width)/2-2, 40-2, cell(this.level.width)+4, cell(this.level.height)+4), 4);

        surface.blit(uiSurface, 0, 0);
    }


    updateUi() {
        uiSurface.clear();
        uiSurface.blit(UI_FONT.render(t(this.level.name), "yellow"), [5, 5]);
        let s = t("Saved pawns: " + HeroState.savedPawns);
        uiSurface.blit(UI_FONT.render(s, "yellow"), [800 - 5 - UI_FONT.size(s)[0], 5]);
    }


}

var HeroState = {
    figure: 'pawn',
    color: 'white',
    savedPawns: 0,
    rules: null//TODO
};

class Level {
    constructor(levelDescription) {
        levelDescription.initState(HeroState);
        this.name = levelDescription.name;
        this.field = new Field(levelDescription.field);
        this.controllers = levelDescription.controllers({
            user: () => new UserController(this.field, HeroState),
            ai: (name, side, selector) => new AIController(name, this.field, selector, side)
        });
        this.scenarioCtor = levelDescription.scenario;
    }

    get width() { return this.field.width; }
    get height() { return this.field.height; }

    get figures() {
        return this.field.figures;
    }

    get hero() {
        return this.field.hero;
    }

    find(figure, color) {
        return this.figures.find((f) => f.isAlive && (figure === undefined || f.figure == figure) && (color === undefined || color == f.color))
    }

    scenario(game) {
        return this.scenarioCtor(this, game, game.loops);
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
        this._hero = new Figure(heroState.figure, {side: "hero", color: heroState.color});
        field.assignHero(this._hero);
        this.figures = [this.hero];
    }

    isHero() { return true; }

    recalculate() {
        this.possibleFields = Rules[this._hero.figure].getMoves(this._hero, this.field);
        this.moving = this._hero;
        //console.log(this.possibleFields);
    }

    getPossibleFields() {
        return this.possibleFields;
    }

    performMove(x,y) {
        let pm = this.possibleFields.find((p) => p.x == x && p.y == y);
        if (!pm) return false;
        this._hero.move({x,y,drawShlafe:true});
        if (pm.morphTo !== 'pawn') {
            this.morphAfterMove = pm.morphTo;
        } else {
            this.morphAfterMove = null;
        }

        return true;
    }

    canMoveAgain() {
        return this.morphAfterMove && this._hero.isHero;
    }

    morph() {
        this._hero.morph(this.morphAfterMove);
    }
}

class AIController extends Controller {
    constructor(name, field, selector, side) {
        super(name, field);
        this.figures = field.figures.filter(selector);
        this.figures.forEach((f) => f.side = side);
    }

    getPossibleFields() {
        return this.possibleFields;
    }

    performMove() {
        let alive = this.figures.filter((f) => f.isAlive);
        if (alive.length == 0) return;
        let done = alive.find((a) => {
            let mvs = Rules[a.figure].getMoves(a, this.field);
            let move = mvs.find((m) => m.beats && m.beats.length > 0);
            if (move) {
                this.moving = a;
                this.possibleFields = mvs;
                a.move(move);
                return true;
            }
            return false;
        });
        if (!done) {
            let f = alive[Math.floor(Math.random()*alive.length)];
            let mvs = Rules[f.figure].getMoves(f, this.field);
            let move = mvs.find((m) => m.beats && m.beats.length > 0) || mvs[0];
            this.possibleFields = mvs;
            this.moving = f;
            f.move(move);
        }
    }

}

let MSG_FONT = new Font('italic 16px times new roman');
let UI_FONT = new Font('18px helvetica');

gamejs.ready(() => {

    var game = new GameState();

    gamejs.event.onKeyDown((e) => {
        game.pressed[e.key] = true;
    });
    gamejs.event.onKeyUp((e) => {
        game.pressed[e.key] = false;
    });
    gamejs.event.onMouseDown((e) => {
        game.click(e.pos);
    });

    gamejs.onTick((msDuration) => {
        let display = gamejs.display.getSurface();
        //display.clear();
        game.loop(msDuration);
        game.draw(display);
    });
});



/*
TODO: different rules on differnt stages

visual effects:
- floor - generate facets. ruine them in holes, fill with blood on murder
- wave for target cell

+ rules
    + side --> color
    + side == nr of controller
    + alies/foes
- floor
    - facets
    - ruine for holes
    - blood
- loosing screen
- winning screen
- interface (score, level)
    + center level
    + dark background
    + level#, saved pawns
    - hint
    - highlight hero
    - highlight moves
- level switch (fade-in/fade-out, or something like that)
    - idea: current level is exploding as broken mirror, next level appears under it
+ check condition after move
+ user alive-ness
- real introduction
- localization?
- performance

 */