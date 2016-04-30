let {Figures} = require('./figures');
let {figure, pixel, cell, figureInCell, PIX_SIZE, time} = require('./consts');
let graphics = require('gamejs/graphics');
let gamejs = require('gamejs');

let Colors = {
    color: {
        'white': '#fff',
        'black': '#000',
        'hero': '#4400cc'
    },
    border: {
        'white': '#000',
        'black': '#ccc',
        'hero': '#220044'
    }
};

function figure2particles(map) {
    var _particles = [];
    map.forEach((row, ri) => {
        row.split("").forEach((cell, ci) => {
            switch (cell) {
                case '.': break;
                case '=': {
                    _particles.push({x: ci, y:ri, type: 'border'});
                    break;
                }
                case '+': {
                    _particles.push({x: ci, y:ri, type: 'heart'});
                    break;
                }
                case '#': {
                    _particles.push({x: ci, y:ri, type: 'body'});
                    break;
                }
            }
        })
    });
    return {particles: _particles};
}

var heartBeat = [1,1,0.9,0.8,0.5,0.7,0.9,1.1,1,1,1,1,1,1,1];

function sign(x) {
    if (x < 0) return -1;
    if (x > 0) return 1;
    return 0;
}

class Figure {
    constructor(figureName, {x, y, side, color}) {
        this.figure = figureName;
        let figure = Figures.get(figureName);
        this.isAlive = true;
        this.x = x;
        this.y = y;
        this.side = side;
        this.color = color;
        this._particles = figure2particles(figure).particles.sort((p1, p2) => {
            let order = ['border', 'body', 'heart'];
            return order.indexOf(p1.type) - order.indexOf(p2.type);
        });
        this._maxY = figure.length-1;
        this._cX = Math.floor(figure[0].length/2);
        this._heartColor = 255;
        this._heartPhase = Math.floor(Math.random()*(heartBeat.length-0.1));

        this.view = {
            action: null,
            animation: null
        }
    }

    locate({x,y}) {
        this.x = x;
        this.y = y;
    }

    move({x, y, drawShlafe, afterMove}) {
        let ox = this.x;
        let oy = this.y;
        let tx = x;
        let ty = y;
        let dx = sign(tx - ox);
        let dy = sign(ty - oy);
        //special case for knight
        if (this.figure == 'knight' && !afterMove) {
            this.move({x: this.x+dx, y: this.y, drawShlafe, afterMove: () => {
                this.move({x, y, drawShlafe, afterMove: () => {}});
            }});
            return;
        }
        let speed = this.isHero ? (Math.abs(tx-ox) + Math.abs(ty-oy) > 2 ? 0.6 : 0.4) : 0.5;
        function isShlafe(p) { return p.type == 'shlafe';}
        function isntShlafe(p) { return p.type != 'shlafe';}
        this.view.action = (ms) => {
            this.x += speed*dx*time(ms);
            this.y += speed*dy*time(ms);
            this._particles.filter(isShlafe).forEach((p) => {
                p.x -= dx*speed*cell(1);
                p.y -= dy*speed*cell(1);
                p.ts--;
            });
            this._particles = this._particles.filter((p) => isntShlafe(p) || p.ts > 0);
            var shlafe = [];
            if (drawShlafe) this._particles.filter(isntShlafe).forEach((p) => {
                if (Math.random() < 0.2) {
                    shlafe.push({x: p.x, y: p.y, type: 'shlafe', ts: 1+Math.floor(Math.random()*5)});
                }
            });
            this._particles = this._particles.concat(shlafe);
            if (Math.abs(this.x - tx) <= 1 + speed && Math.abs(this.y - ty) <= 1 + speed) {
                if (Math.abs(speed) > 0.1)
                    speed -= 0.02;
            }
            if (Math.abs(this.x - tx) <= speed && Math.abs(this.y - ty) <= speed) {
                this.x = tx;
                this.y = ty;
                this.view.action = null;
                if (afterMove) {
                    afterMove();
                } else {
                    this.view.animation = () => {
                        this._particles.filter((p) => p.type == 'shlafe').forEach((p) => {
                            p.ts--;
                        });
                        this._particles = this._particles.filter((p) => p.type != 'shlafe' || p.ts > 0);
                        if (!this._particles.some((p) => p.type == 'shlafe')) {
                            this.view.animation = null;
                        }
                    };
                }
            }
        }

    }

    get isHero() {
        return this.color == 'hero';
    }

    smashed() {
        this.isAlive = false;
        this._particles.forEach((p) => {
            p.a = 0.5;
            p.v = 0;
            p.vx = 0;
            p.ax = 0;
            if (p.x > this._cX) {
                p.vx = 0.2;
            } else if (p.x < this._cX) {
                p.vx = -0.2;
            } else {

            }
            p.vx *= 3*Math.pow((this._maxY - p.y)/this._maxY, 2);
        });
        this.view.action = () => {
            var anyMove = false;
            var remove = -1;
            this._particles.sort((p1,p2) => p2.y - p1.y).forEach((p, idx) => {
                if (p.x == this._cX) {
                    remove = idx;
                }
                if (p.y < this._maxY && !p.freeze) {
                    p.v += p.a;
                    p.vx += p.ax;
                    p.y += p.v;
                    p.x += p.vx;
                    anyMove = true;
                    if (p.y >= this._maxY) {
                        if (p.v > 1) {
                            p.v = -p.v/3;
                            p.y = this._maxY - 0.1;
                        } else {
                            p.y = this._maxY;
                            p.freeze = true;
                        }
                    }
                }
            });
            if (remove != -1) this._particles.splice(remove, 1);
            if (!anyMove) {
                this.view.action = null;
            }
        }
    }

    morph(into) {
        this.figure = into;
        var p = figure2particles(Figures.get(into));
        p.particles = p.particles.sort((p1, p2) => {
            let order = ['border', 'body', 'heart'];
            return order.indexOf(p1.type) - order.indexOf(p2.type);
        });
        var rows = {};
        this._particles.forEach((p) => {
            p.ox = p.x;
            p.oy = p.y;
        });
        p.particles.forEach((p) => {
            p.ox = p.x;
            p.oy = p.y;
            p.x = this._cX;
            if (p.type != 'heart')  p.y = p.y / 2;
        });
        var self = this;
        function rotateRow(row) {
            var rowConf = (rows[row] || (rows[row] = {wait: 1*(self._maxY - row), scale: -1, step: 0.5}));
            //console.log(rowConf);
            if (rowConf.wait) {
                rowConf.wait--;
            } else if (rowConf.scale >= 1) {
                self._particles.filter((p) => p.oy == row).forEach((p) => {
                    p.x = p.ox;
                    p.y = p.oy;
                });
                return false;
                //finished, do nothing
            } else if (rowConf.scale < 0) {
                //move to center
                self._particles.filter((p) => p.oy == row).forEach((p) => {
                    p.x = self._cX + (p.ox - self._cX)*(-rowConf.scale);
                    if (p.type != 'heart') p.y = p.oy / (2 + rowConf.scale);
                });
                rowConf.scale += rowConf.step;
                if (rowConf.scale >= -rowConf.step/2 && rowConf.scale <= rowConf.step/2) {
                    rowConf.step = rowConf.step / 2;
                    self._particles = self._particles.filter((p) => p.oy != row).concat(p.particles.filter((p) => p.oy == row));
                }
            } else if (rowConf.scale >= 0) {
                self._particles.filter((p) => p.oy == row).forEach((p) => {
                    p.x = self._cX + (p.ox - self._cX)*(rowConf.scale);
                    if (p.type != 'heart') p.y = p.oy / (2 - rowConf.scale);
                });
                rowConf.scale += rowConf.step;
            }
            return true;
        }
        this.view.action = () => {
            var anyChanged = false;
            for (var row = 0; row <= this._maxY; row++) {
                if (rotateRow(row)) {
                    anyChanged = true;
                }
            }
            if (!anyChanged) {
                this.view.action = null;
            }
        }
    }

    get inAction() { return this.view.action != null; }

    tick(ms) {
        if (!this.isAlive) {
            this._heartColor *= 0.94;
        } else {
            this._heartPhase += time(ms);
            while (this._heartPhase >= heartBeat.length) {
                this._heartPhase -= heartBeat.length;
            }
        }

        if (this.view.animation) this.view.animation();
        if (!this.view.action) return false;
        this.view.action(ms);
        return true;
    }


}

function brigther(clr) {
    clr = {'white': '#ffffff', 'black': '#000000'}[clr] || clr;
    var r = parseInt(clr[1]+clr[2], 16);
    var g = parseInt(clr[3]+clr[4], 16);
    var b = parseInt(clr[5]+clr[6], 16);
    function br(v) {var c= Math.min(255,Math.floor(v*2)).toString(16); if (c.length==1) c = '0' + c; return c;}
    return '#' + br(r) + br(g) + br(b);
}

class FigureDrawer {
    constructor(surface, offsetX, offsetY) {
        this.surface = surface;
        this.offsetX = offsetX || 0;
        this.offsetY = offsetY || 0;
        this._cached = {};
    }

    draw(cfigure) {
        let key = cfigure.color + "_" + cfigure.figure + "_" + cfigure.isAlive;
        if (cfigure.view.animation == null && cfigure.view.action == null) {
            if (!this._cached[key]) {
                this._cached[key] = new gamejs.graphics.Surface([figure(1), figure(1)]);
                cfigure._particles.forEach((p) => this.drawParticle(p, cfigure, this._cached[key]));
            }
            this.surface.blit(this._cached[key], [this.offsetX + figureInCell(cfigure.x), this.offsetY + figureInCell(cfigure.y)]);
            cfigure._particles.filter((p) => p.type == 'heart').forEach((p) => this.drawParticle(p, cfigure));
        } else {
            cfigure._particles.forEach((p) => this.drawParticle(p, cfigure));
        }
    }

    drawParticle({x,y,type}, figure, mySurface, offsetX, offsetY) {
        var clr = Colors.color[figure.color];
        if (type == 'border') {
            clr = Colors.border[figure.color];
        }
        if (type == 'shlafe') {
            clr = brigther(clr);
        }
        if (!mySurface) {
            graphics.rect(this.surface, clr, new gamejs.Rect(this.offsetX + figureInCell(figure.x) + pixel(x), this.offsetY + figureInCell(figure.y) + pixel(y), PIX_SIZE, PIX_SIZE), 0);
        } else {
            graphics.rect(mySurface, clr, new gamejs.Rect(pixel(x), pixel(y), PIX_SIZE, PIX_SIZE), 0);
        }
        if (type == 'heart') {
            clr = 'rgb(' + figure._heartColor.toFixed(0) + ',0,0)';
            let r = PIX_SIZE*heartBeat[Math.floor(figure._heartPhase)]*(figure._heartColor/255);
            graphics.circle(this.surface, clr, [this.offsetX + figureInCell(figure.x) + pixel(x) + r/2, this.offsetY + figureInCell(figure.y) + pixel(y) + r/2], r, 0);
        }
    }
}

exports.Figure = Figure;
exports.FigureDrawer = FigureDrawer;