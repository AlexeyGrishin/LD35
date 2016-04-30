var gamejs = require('gamejs');
let graphics = require('gamejs/graphics');
let {Field} = require('./field');
let {Figure, FigureDrawer} = require('./chess_figure');
let {Rules} = require('./chess_rules');
let {Font} = require('gamejs/font');
let {figure, pixel, cell, figureInCell, PIX_SIZE, time, CELL_SIZE} = require('./consts');
let {loops, WAITING} = require('./loops');
let {levels} = require('./levels');
let {Background, FacetedSurface, Facets, generateCell} = require('./facets');
let {t} = require('./lang');

let BGS = 50;
var fieldSurface = new gamejs.graphics.Surface([800,800]);
var uiSurface = new gamejs.graphics.Surface([800,800]);
var startSurface = new gamejs.graphics.Surface([800,800]);
var endSurface = new gamejs.graphics.Surface([800,800]);

function createCssBackground() {
    let bg = $("#gjs-background");
    var groups = {};
    for (var x = 0; x < 10; x++) {
        for (var y = 0; y < 10; y++) {
            let bgcell = Background.find((p) => p.x == x && p.y == y);
            let color = bgcell.color;
            let direction = Math.random() < 0.5 ? -1 : 1;
            let factor = 0.1;
            let bootstrap = Math.floor((1 / factor) * Math.random());
            let group = groups[bgcell.group] || (groups[bgcell.group] = {el: $("<div></div>").addClass("bg-group").attr("data-group", bgcell.group).appendTo(bg), colors: []});
            if (group.colors.length == 0) {
                for (var i = 0; i < BGS;i++) {
                    let ii = (bootstrap + i) % BGS;
                    let icolor = Math.round(color + direction * ((BGS/2 - Math.abs(ii-BGS/2))) * factor);
                    group.colors.push("rgb(" + [icolor,icolor,icolor].join(",") + ")");
                }
            }
            group.el.append($("<div></div>").addClass("bg-cell").css({left: x*80, top:y*80}));
        }
    }

    return {
        show: (idx) => {
            Object.keys(groups).forEach((gid) => {
                groups[gid].el[0].style.background = groups[gid].colors[idx];
            });
        }
    }
}

class StartLoop {
    constructor(state) {
        this.state = state;
        this.drawer = new FigureDrawer(startSurface, 400-CELL_SIZE, 100);
        this.fig = new Figure('pawn', {x:0, y:0, color: 'white'});
    }

    loop(ms) {
        this.fig.tick(ms);
        if (this.state.pressed[gamejs.event.K_SPACE]) {
            this.click();
        }
    }

    click() {
        this.state.startGame();
    }

    draw(surface) {
        surface.clear();
        startSurface.clear();
        this.drawer.draw(this.fig);
        center(startSurface, FONT_HEADER, "pawn story", "yellow", 200);
        center(startSurface, FONT_HINT, "click or press any key to start", "white", 300);
        surface.blit(startSurface);
    }
}

let FONT_HEADER = new Font("36px monospace");
let FONT_HINT = new Font("16px italic times new roman");


function center(surface, font, text, color, y) {
    let w = font.size(text)[0];
    surface.blit(font.render(text, color), [400-w/2, y]);
}


function drawEndSurface() {
    center(endSurface, FONT_HEADER, "the end", "yellow", 200);
    center(endSurface, FONT_HINT, "Thanks for playing!", "white", 300);
}


class LevelSwitchSubloop {
    constructor(state) {
        this.state = state;
    }

    fromStartToLevel(nextLevel) {
        let oldFacets = new Facets(generateCell(10, 10, 3), 10, 10);
        this.oldFaceted = new FacetedSurface(startSurface, oldFacets, 80);
        oldFacets.explode();
        this._toLevel(nextLevel);
    }

    fromLevelToEnd(fromLevel) {
        this._fromLevel(fromLevel);
        drawEndSurface();
        let newFacets = new Facets(generateCell(10, 10, 3), 10, 10);
        this.newFaceted = new FacetedSurface(endSurface, newFacets, 80);
        newFacets.rise();
        this.nextLevel = null;
        this.noffsetX = 0;
        this.noffsetY = 0;
    }

    _toLevel(nextLevel) {
        this.nextLevel = nextLevel;
        var levelInstance = new Level(nextLevel);
        var newLevel = fieldSurface.clone();
        newLevel.clear();
        this.state._drawField(newLevel, levelInstance, new FigureDrawer(newLevel));
        let newFacets = new Facets(generateCell(levelInstance.width, levelInstance.height, 5), levelInstance.width, levelInstance.height);
        this.newFaceted = new FacetedSurface(newLevel, newFacets, cell(1));
        this.noffsetX = 400-cell(levelInstance.width)/2;
        this.noffsetY = 400-cell(levelInstance.height)/2;
        newFacets.rise();

    }

    _fromLevel(fromLevel) {
        var oldLevel = fieldSurface.clone();
        let oldFacets = new Facets(generateCell(fromLevel.width, fromLevel.height, 5), fromLevel.width, fromLevel.height);
        this.oldFaceted = new FacetedSurface(oldLevel, oldFacets, cell(1));
        oldFacets.explode();
    }

    fromLevelToLevel(fromLevel, nextLevel) {
        this._fromLevel(fromLevel);
        this._toLevel(nextLevel);
    }



    loop(ms) {
        if (this.oldFaceted) this.oldFaceted.tick();
        if (this.newFaceted) this.newFaceted.tick();
        if (!this.oldFaceted.inAction && (!this.newFaceted || !this.newFaceted.inAction) && this.nextLevel) {
            this.state.startLevel(this.nextLevel);
        }
    }

    draw(surface, offsetX, offsetY) {
        surface.clear();
        if (this.oldFaceted) {
            this.oldFaceted.draw(surface, offsetX, offsetY);
        }

        if (this.newFaceted) {
            this.newFaceted.draw(surface, this.noffsetX, this.noffsetY);
        }
    }
}

class GameState {
    constructor() {
        this.pressed = {};
        this._loopsQueue = [];
        this.loops = loops(this);
        //this.startLevel(levels.level1);
        this.subloop = new StartLoop(this);
        this.bgIdx = 0;
        this.bgPass = 0;
        this.bgChanged = true;
        this._drawer = new FigureDrawer(fieldSurface);
        this._cssbg = createCssBackground();
        this.highlightMovement = {};
    }

    startGame() {
        this.subloop = new LevelSwitchSubloop(this, levels.firstLevel);
        this.subloop.fromStartToLevel(levels.firstLevel);
    }

    startLevel(level) {
        this._loopsQueue = [];
        this.subloop = null;
        this.level = new Level(level);
        this.scenarioCallback = this.level.scenarioCallback(this, this.loops);
        this.gamingLoop = this.loops.gaming(0, this.scenarioCallback)();
        this.next();
        this.scenarioCallback();
        this.updateUi();
        this._redraw = true;
        fieldSurface.clear();
    }

    enqueue(subloopCtor) {
        this._loopsQueue.push(subloopCtor);
        if (this.subloop == this.gamingLoop) {
            this.next();
        }
    }

    get subloop() { return this._subloop;}

    set subloop(val) {
        this._subloop = val;
        console.log(val);
    }

    next() {
        let nextSubloopCtor = this._loopsQueue.shift();
        this.subloop = nextSubloopCtor ? nextSubloopCtor() : this.gamingLoop;
    }

    animateLevelSwitch(nextLevel) {
        this.subloop = new LevelSwitchSubloop(this);
        this.subloop.fromLevelToLevel(this.level, nextLevel);
        return this.subloop;
    }

    win(nextLevel) {
        this.enqueue(() => {
            HeroState.savedPawns += this.level.figures.filter((f) => f.isAlive && f.figure == 'pawn').length;
            if (nextLevel) {
                this.animateLevelSwitch(nextLevel);
            } else {
                this.subloop = new LevelSwitchSubloop(this);
                this.subloop.fromLevelToEnd(this.level);
            }
            return this.subloop;
        });
    }

    loose() {
        this.enqueue(this.loops.message("You are dead..."));
        this.enqueue(() => {
            return this.animateLevelSwitch(this.level.description)
        });
    }

    playAnimations(ms) {
        this.hasAnimations = false;
        if (!this.level) return;
        this.level.field.figures.forEach((f) => {
            if (f.tick(ms)) this.hasAnimations = true;
        });
    }

    loop(ms) {
        this.bgPass += ms;
        if (this.bgPass > 100) {
            this.bgPass -= 100;
            this.bgIdx = (this.bgIdx + 1) % BGS;
            this.bgChanged = true;
        }
        this.playAnimations(ms);
        if (this.subloop && this.subloop.loop) this.subloop.loop(ms);
    }

    click(pos) {
        if (this.subloop && this.subloop.click) this.subloop.click([pos[0] - this.offsetX, pos[1] - this.offsetY]);
    }

    move(pos) {
        if (this.subloop && this.subloop.move) this.subloop.move([pos[0] - this.offsetX, pos[1] - this.offsetY]);
        if (this.highlightMovementTo) $el.css({cursor: "pointer"}); else $el.css({cursor: "default"});
    }

    _drawField(surface, level, drawer) {
        //draw field
        level.field.map.forEach((row, ri) => {
            row.forEach((fcell, ci) => {
                var color = {
                    white: 'white',
                    black: 'gray',
                    false: 'black'
                }[fcell];
                graphics.rect(surface, color, new gamejs.Rect(cell(ci), cell(ri), CELL_SIZE*PIX_SIZE, CELL_SIZE*PIX_SIZE), 0);
                if (this.phase == WAITING && this.controller.isHero()) {
                    let mv = this.controller.getPossibleFields().find(({x,y}) => x == ci && y == ri);
                    if (mv) {
                        let hl = this.highlightMovement[ci+"_"+ri] || 0.0;
                        if (mv.beats && mv.beats.length) {
                            graphics.circle(surface, "#ff3333", [cell(ci+0.5), cell(ri+0.5)], pixel(8+hl*2));
                        } else {
                            graphics.circle(surface, "#3333ff", [cell(ci+0.5), cell(ri+0.5)], pixel(5+hl*2));
                        }
                    }
                }
            });
        });
        //draw figures
        level.figures.forEach((fig) => {
            drawer.draw(fig);
        });
    }

    draw(surface) {
        //draw background
        if (this.bgChanged) {
            this._cssbg.show(this.bgIdx);
        }
        //draw special subloops
        if (this.subloop && this.subloop.draw) {
            this.subloop.draw(surface, this.offsetX || 0, this.offsetY || 0);
            return;
        }
        if (this._redraw) {
            surface.clear();
        }
        this._drawField(fieldSurface, this.level, this._drawer);

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
        this.offsetY = 400-cell(this.level.height)/2;
        surface.blit(fieldSurface, [this.offsetX, this.offsetY]);
        graphics.rect(surface, 'brown', new gamejs.Rect(this.offsetX-2, this.offsetY-2, cell(this.level.width)+4, cell(this.level.height)+4), 4);
        if (this._redraw) {
            surface.blit(uiSurface);
        }
        this._redraw = false;
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
        this._levelState = {};
        this.description = levelDescription;
        levelDescription.initState(HeroState, this._levelState);
        this.name = levelDescription.name;
        this.field = new Field(levelDescription.field);
        this.controllers = levelDescription.controllers({
            user: () => new UserController(this.field, HeroState),
            ai: (name, side, selector) => new AIController(name, this.field, selector, side)
        });
        this.scenarioCallbackCtor = levelDescription.scenarioCallback
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

    scenarioCallback(game, loops) {
        return this.scenarioCallbackCtor(this, game, loops, this._levelState);
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

    shallMorph() { return false; }

    canMoveTo(x,y) {
        return this.possibleFields.find((f) => f.x == x && f.y == y);
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

    checkDone() {
        return true;
    }

    morph() {
        this._hero.morph(this.morphAfterMove);
        HeroState.figure = this.morphAfterMove;
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
        let toMove = alive.map((a) => {
            let st = {
                figure: a,
                moves: Rules[a.figure].getMoves(a, this.field)
            };
            st.beat = st.moves.find((m) => m.beats && m.beats.length > 0);
            return st;
        }).filter((st) => st.moves.length > 0).sort((a,b) => {
            return (!!b.beat ? 1 : 0) - (!!a.beat ? 1 : 0);
        })[0];
        if (toMove) {
            this.moving = toMove.figure;
            this.possibleFields = toMove.moves;
            toMove.figure.move(toMove.beat || toMove.moves[0]);
        }
    }

    get pawnsToMorph() {
        return this.figures.filter((f) => f.figure == 'pawn' && (
            (f.color == 'white' && f.y == 0) || (f.color == 'black' && f.y == this.field.height-1)
        ));

    }

    recalculate() {}

    shallMorph() {
        return this.pawnsToMorph.length > 0;
    }

    morph() {
        this.pawnsToMorph.forEach((p) => p.morph('queen'));
    }

}

let MSG_FONT = new Font('italic 16px times new roman');
let UI_FONT = new Font('18px helvetica');
var $el;

gamejs.ready(() => {

    var game = new GameState();
    $el = $("canvas");

    gamejs.event.onKeyDown((e) => {
        game.pressed[e.key] = true;
    });
    gamejs.event.onKeyUp((e) => {
        game.pressed[e.key] = false;
    });
    gamejs.event.onMouseDown((e) => {
        game.click(e.pos);
    });
    gamejs.event.onMouseMotion((e) => {
        game.move(e.pos);
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
+ loosing screen
+ winning screen
- interface (score, level)
    + center level
    + dark background
    + level#, saved pawns
    - hint
    - highlight hero
    + highlight moves
+ level switch (fade-in/fade-out, or something like that)
+ check condition after move
+ user alive-ness
+ real introduction
- localization?
* performance

+ ai: when figure cannot move (pawn, for example)
+ ai: pawn reached end of field

 */


