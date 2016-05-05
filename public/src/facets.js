exports.Background = colorCell(generateCell(10, 10, 8), 0x22);
function particlesToShader(particles) {
    var lines = [];
    for (var y = 0; y < 10; y++) {
        var vals = [];
        for (var x = 0; x < 10; x++) {
            vals.push(particles.find((p) => p.x == x && p.y == y).group * (Math.random() > 0.5 ? -1 : 1));
        }
        lines.push(`COLORLINE(${y}, ${vals[0]}, ${vals[1]}, ${vals[2]}, ${vals[3]}, ${vals[4]});`);
        lines.push(`COLORLINE2(${y}, ${vals[5]}, ${vals[6]}, ${vals[7]}, ${vals[8]}, ${vals[9]});`);
    }
    return lines.join("\n");
}

exports.BackgroundShader = `
    precision mediump float;
uniform float time;
#define COLORLINE(y,c1,c2,c3,c4,c5) if (y1 == y) { if (x1 == 0) return c1;if (x1 == 1) return c2;if (x1 == 2) return c3;if (x1 == 3) return c4;if (x1 == 4) return c5; }
#define COLORLINE2(y,c1,c2,c3,c4,c5) if (y1 == y) { if (x1 == 5) return c1;if (x1 == 6) return c2;if (x1 == 7) return c3;if (x1 == 8) return c4;if (x1 == 9) return c5; }

int getColor(in vec4 coords) {
    int x1 = int(floor(coords.x / 80.0));
    int y1 = int(floor(coords.y / 80.0));
    if (x1 > 10 || y1 > 10) return 0;
    ${particlesToShader(exports.Background)}
    return 0;
}

void main()
{
    int clr = getColor(gl_FragCoord);
    if (clr == 0) {
        gl_FragColor = vec4(0,0,0,0);
    } else {
        float ang;
        if (clr > 0) {
            ang = (float(clr) + time)/6.0;
        }
        else {
            ang = (float(-clr) - time)/4.0;
        }
        float c = (44.0 + 11.0 + sin(ang)*11.0)/255.0;
        gl_FragColor = vec4(c,c,c,1.0);
    }
}
`;
let {cell, PIX_SIZE, CELL_SIZE} = require('./consts');
let gamejs = require('gamejs');

function newArray(size, ctor) {
    var ar = new Array(size);
    for (var i = 0; i < ar.length; i++) {
        ar[i] = ctor(i);
    }
    return ar;
}

function generateCell(width, height, maxGroupSize) {
    let matrix = newArray(height, () => new Array(width));
    var free = newArray(width*height, (idx) => {return {x: idx % width, y: Math.floor(idx/width)}});
    var groupNr = 1, groupFilled = [];
    function neighbors(cells) {
        var nb = {}
        function addn(cell,dx,dy) {
            if (cell.x+dx < 0 || cell.x+dx >= width) return;
            if (cell.y+dy < 0 || cell.y+dy >= height) return;
            nb[(cell.x+dx) + '_' + (cell.y+dy)] = {x:cell.x+dx, y:cell.y+dy};
        }
        cells.forEach(cell => {
            addn(cell, +1, 0);
            addn(cell, -1, 0);
            addn(cell, 0, +1);
            addn(cell, 0, -1);
        });
        return Object.keys(nb).map((k) => nb[k]);
    }
    while (free.length != 0) {
        var cell;
        if (groupFilled.length == 0) {
            let groupCenterIdx = Math.floor(free.length*Math.random());
            let removed = free.splice(groupCenterIdx, 1);
            cell = removed[0];
        } else {
            let freeNeighborCells = neighbors(groupFilled).filter(({x,y}) => matrix[y][x] === undefined);
            if (freeNeighborCells.length == 0) {
                //switch group
                groupFilled = [];
                groupNr++;
                continue;
            }
            cell = freeNeighborCells[Math.floor(freeNeighborCells.length*Math.random())];
            free = free.filter(({x,y}) => cell.x != x || cell.y != y);
        }
        //console.log('assign ', cell, ' to ', groupNr);
        matrix[cell.y][cell.x] = groupNr;
        groupFilled.push(cell);
        if (groupFilled.length >= maxGroupSize) {
            groupFilled = [];
            groupNr++;
        }
    }
    var particles = [];
    matrix.forEach((row, y) => {
        row.forEach((group, x) => {
            particles.push({x,y,group});
        });
    });
    return particles;
}


function colorCell(particles, baseColor) {
    var colorsPerGroup = {};
    let RANGE = 10;
    particles.forEach((p) => {
        if (!colorsPerGroup[p.group]) {
            colorsPerGroup[p.group] = Math.max(0, Math.min(255, (baseColor + Math.floor(Math.random()*RANGE - RANGE/2))));
        }
        p.color = colorsPerGroup[p.group];
    });
    return particles;
}

function multiplyCell(count, particles) {
    var np = [];
    particles.forEach((p) => {
        for (var mx = 0; mx < count; mx++) {
            for (var my = 0; my < count; my++) {
                np.push({x:p.x*count+mx, y:p.y*count+my, color: p.color, group: p.group});
            }
        }
    });
    return np;
}

var falling = [];

let FCOUNT = 50;
for (var i = FCOUNT; i >= 0;i--) {
    falling.push(i/FCOUNT*i/FCOUNT);
}
var exploding = [];
let ECOUNT = 30;
for (var i = 0; i <= ECOUNT;i++) {
    exploding.push(1 + 4*i/ECOUNT);
}
exploding.push(0);


class Facets {
    constructor(particles, width, height) {
        this._particles = particles;
        this._width = width;
        this._height = height;
        this._tick = null;
    }

    fall(delay) {
        this._perform(falling, delay);
    }

    _perform(falling, delay) {
        var fall = {};
        let overallDelay = Math.random() * (delay || 0);
        this._particles.forEach((p) => {
            fall[p.group] = fall[p.group] || {delay: overallDelay + Math.random()*falling.length, ts: 0};
            p.delay = fall[p.group].delay;
            p.ts = fall[p.group].ts;
            p.view = {x: p.x, y: p.y, factor: falling[0]};
        });
        let cx = this._width / 2;
        let cy = this._height / 2;
        let pad = 0;
        this._tick = () => {
            var particlesRem = 0;
            this._particles.forEach((p, idx) => {
                if (p.delay > 0) {
                    p.delay--;
                    particlesRem++;
                } else if (!p.falling) {
                    p.falling = true;
                    particlesRem++;
                } else if (p.ts != falling.length-1) {
                    p.ts++;
                    particlesRem++;
                }

                if (p.falling) {
                    let f = falling[p.ts];
                    let nx = (Math.max(0, p.x - pad)- cx)*f + cx;
                    let ny = (Math.max(0, p.y - pad)- cy)*f + cy;
                    p.view = {x:nx, y:ny, factor: f < 1 ? f : 1+Math.log(f)};
                }
            });
            if (particlesRem == 0) { this._tick = null; this.done = true; }
            return true;
        }
    }

    explode() {
        this._perform(exploding);
    }

    rise() {
        this._perform(falling.slice().reverse());
    }

    get inAction() { return this._tick != null; }

    tick() {
        if (this._tick) return this._tick();
        return false;
    }

    get particles() { return this._particles; }

}

class FacetedSurface {
    constructor(surface, facets, facetSize) {
        this._surface = surface;
        this._facets = facets;
        this._width = facets.width * facetSize;
        this._height = facets.height * facetSize;
        this._facetSize = facetSize;
    }

    tick() {
        this._facets.tick();
    }

    get inAction() { return this._facets.inAction; }

    draw(surface, offsetX, offsetY) {
        this._facets.particles.forEach((p) => {
            surface._context.globalAlpha = Math.min(1, p.view.factor);
            surface._context.drawImage(this._surface._canvas,
                p.x*this._facetSize, p.y*this._facetSize, this._facetSize, this._facetSize,
                offsetX + p.view.x*this._facetSize, offsetY + p.view.y*this._facetSize, this._facetSize*p.view.factor, this._facetSize*p.view.factor
            );
        });
    }
}

let FloorFacets = JSON.stringify(generateCell(CELL_SIZE, CELL_SIZE, 50));

class FacetedFloor {
    constructor(color, x, y) {
        this._color = color;
        this._x = cell(x);
        this._y = cell(y);
    }

    tick() {
        return this._facets ? this._facets.tick() : false;
    }

    fall(delay) {
        this._facets = new Facets(JSON.parse(FloorFacets), CELL_SIZE, CELL_SIZE);
        this._width = this._facets.width * PIX_SIZE;
        this._height = this._facets.height * PIX_SIZE;
        this._facets.fall(delay);
        return this;
    }

    get inAction() { return this._facets && this._facets.inAction; }
    get done() { return this._facets && this._facets.done; }

    //TODO: same
    draw(surface, offsetX, offsetY) {
        if (this.inAction || this.done) {
            let rect = new gamejs.Rect(
                offsetX + this._x, offsetY + this._y, cell(1), cell(1)
            );
            surface.clear(rect);
            //gamejs.graphics.rect(surface, "rgba(0,0,0,0)", rect, 0);
            if (!this.done) {
                this._facets.particles.forEach((p) => {
                    gamejs.graphics.rect(surface, "rgba(" + this._color + "," + this._color + "," + this._color + "," + Math.min(1, p.view.factor) + ")", new gamejs.Rect(
                        offsetX + this._x + p.view.x * PIX_SIZE, offsetY + this._y + p.view.y * PIX_SIZE, PIX_SIZE * p.view.factor, PIX_SIZE * p.view.factor
                    ), 0);
                });
            }
        } else {
            var clr = this._color == 0 ? "rgba(0,0,0,0)" : "rgb(" + this._color + "," + this._color + "," + this._color + ")";
            gamejs.graphics.rect(surface, clr, new gamejs.Rect(
                offsetX + this._x, offsetY + this._y, cell(1), cell(1)
            ), 0);
        }
    }
}

exports.Facets = Facets;
exports.FacetedSurface = FacetedSurface;
exports.FacetedFloor = FacetedFloor;
exports.generateCell = generateCell;