let {Figure} = require('./chess_figure');
let {Figures} = require('./figures');

let types = {
    'k': 'knight',
    'r': 'rook',
    'b': 'bishop',
    'p': 'pawn',
    'q': 'queen',
    'g': 'king'
};

function isHero(c) { return c == '*';}
function color(c) { return c.toUpperCase() == c ? Figures.black : Figures.white;}

class Field {
    constructor(map) {
        this.offsetX = 0;
        this.offsetY = 0;
        this.height = map.length;
        this.width = map[0].length;
        this.figures = [];
        this.map = [];
        map.forEach((row, ri) => {
            var myRow = [];
            row.split("").forEach((cell, ci) => {
                if (cell != ' ') {
                    myRow.push((ci + ri)%2 ? Figures.black : Figures.white);
                } else {
                    myRow.push(false);
                }

                if (isHero(cell)) {
                    this.heroCoords = {x: ci, y: ri};
                } else if (types[cell.toLowerCase()]) {
                    let fig = new Figure(types[cell.toLowerCase()], {x: ci, y: ri, color: color(cell)});
                    this.figures.push(fig);
                }

            });
            this.map.push(myRow);
        });
    }

    get(x, y) {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) { return null; }
        let cell = this.map[y][x];
        if (!cell) return null;
        let figureOnCell = this.figures.find((f) => f.x == x && f.y == y);
        return figureOnCell && figureOnCell.isAlive ? figureOnCell : false;
    }

    isEmpty(x,y) { return this.get(x,y) === false; }

    canStepInto(x, y, mySide) {
        let cell = this.get(x,y);
        return cell == false || (cell != null && cell.side != mySide);
    }

    assignHero(hero) {
        this.hero = hero;
        hero.locate(this.heroCoords);
        this.figures.push(hero);
    }
}

exports.Field = Field;