function addIfEmpty(field, x, y, res) {
    if (field.isEmpty(x,y)) {
        res.push({x,y});
        return true;
    }
    return false;
}

function addIfCanStep(field, x, y, side, isHero, figure, res, beats) {
    var canStepTrhoughPawns = false;
    if (isHero) {
        let c = field.get(x,y);
        if (c && c.figure == 'pawn') {
            canStepTrhoughPawns = true;
        }
    }
    if (field.canStepInto(x, y, side) || canStepTrhoughPawns) {
        let r = {x,y};
        let c = field.get(x,y);
        if (c) {
            if (!beats) beats = [];
            beats.push(c);
        }
        if (beats && beats.length) {
            r.beats = beats;
            if (isHero) {
                let lastBeaten = r.beats[r.beats.length-1];
                if (lastBeaten && lastBeaten.figure !== figure) {
                    r.morphTo = lastBeaten.figure;
                }
            }
        }
        res.push(r);
        return true;
    }
    return false;
}

function getMovesFor({x,y,side,figure,isHero}, field, checks) {
    var res = [];
    for (let {dx,dy} of checks) {
        var finished = false;
        var tx = x+dx, ty = y+dy;
        var beats = [];
        while (!finished) {
            addIfCanStep(field, tx, ty, side, isHero, figure, res, beats);
            if (isHero) {
                finished = field.get(tx, ty) === null || (field.get(tx,ty).side === side && field.get(tx,ty).figure !== 'pawn');
            } else {
                finished = !field.isEmpty(tx, ty);
            }
            tx+=dx;
            ty+=dy;
        }
    }
    return res;
}

function getMovesForExact({x,y,side, figure, isHero}, field, checks) {
    var res = [];
    for (let {dx,dy} of checks) {
        var tx = x+dx, ty = y+dy;
        addIfCanStep(field, tx, ty, side, isHero, figure, res);
    }
    return res;
}

exports.Rules = {
        pawn: {
            getMoves: function ({x, y, side, figure, isHero, color}, field) {
                if (isHero) { throw "!!!";}
                var res = [];
                let dy = color == 'white' ? -1 : +1;
                addIfEmpty(field, x, y + dy, res);
                if (!field.isEmpty(x + 1, y + dy)) {
                    addIfCanStep(field, x + 1, y + dy, side, isHero, figure, res);
                }
                if (!field.isEmpty(x - 1, y + dy)) {
                    addIfCanStep(field, x - 1, y + dy, side, isHero, figure, res);
                }
                return res;
            }
        },
        bishop: {
            getMoves: function (fig, field) {
                return getMovesFor(fig, field, [{dx:+1, dy: +1}, {dx:+1,dy:-1}, {dx:-1,dy:+1},{dx:-1,dy:-1}]);
            }
        },
        rook: {
            getMoves: function (fig, field) {
                return getMovesFor(fig, field, [{dx:+1, dy: 0}, {dx:-1,dy:0}, {dx:0,dy:+1},{dx:0,dy:-1}]);
            }
        },
        queen: {
            getMoves: function (fig, field) {
                return getMovesFor(fig, field, [
                    {dx:+1, dy: 0}, {dx:-1,dy:0}, {dx:0,dy:+1},{dx:0,dy:-1},
                    {dx:+1, dy: +1}, {dx:+1,dy:-1}, {dx:-1,dy:+1},{dx:-1,dy:-1}
                ]);
            }
        },
        king: {
            getMoves: function (fig, field) {
                return getMovesForExact(fig, field, [
                    {dx:+1, dy: 0}, {dx:-1,dy:0}, {dx:0,dy:+1},{dx:0,dy:-1},
                    {dx:+1, dy: +1}, {dx:+1,dy:-1}, {dx:-1,dy:+1},{dx:-1,dy:-1}
                ]);
            }
        },
        knight: {
            getMoves: function(fig, field) {
                return getMovesForExact(fig, field, [
                    {dx:+1,dy:+2}, {dx:+1,dy:-2},
                    {dx:-1,dy:+2}, {dx:-1,dy:-2},
                    {dx:+2,dy:+1}, {dx:+2,dy:-1},
                    {dx:-2,dy:+1}, {dx:-2,dy:-1}
                ])
            }
        }
    };
