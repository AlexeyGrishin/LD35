function addIfEmpty(field, x, y, res) {
    if (field.isEmpty(x,y)) {
        res.push({x,y});
        return true;
    }
    return false;
}

function addIfCanStep(field, x, y, side, figure, res, beats) {
    if (field.canStepInto(x, y, side)) {
        let r = {x,y};
        let c = field.get(x,y);
        if (c) {
            if (!beats) beats = [];
            beats.push(c);
        }
        if (beats && beats.length) {
            r.beats = beats;
            if (side == 'hero') {
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

function getMovesFor({x,y,side,figure}, field, checks) {
    var res = [];
    for (let {dx,dy} of checks) {
        var finished = false;
        var tx = x+dx, ty = y+dy;
        var beats = [];
        while (!finished) {
            addIfCanStep(field, tx, ty, side, figure, res, beats);
            if (side == 'hero') {
                finished = field.get(tx, ty) === null;
            } else {
                finished = !field.isEmpty(tx, ty);
            }
            tx+=dx;
            ty+=dy;
        }
    }
    return res;
}

function getMovesForExact({x,y,side, figure}, field, checks) {
    var res = [];
    for (let {dx,dy} of checks) {
        var tx = x+dx, ty = y+dy;
        addIfCanStep(field, tx, ty, side, figure, res);
    }
    return res;
}

exports.Rules = {
        pawn: {
            getMoves: function ({x, y, side, figure}, field) {
                if (side == 'hero') { throw "!!!";}
                var res = [];
                let dy = side == 'white' ? -1 : +1;
                addIfEmpty(field, x, y+dy, res);
                addIfCanStep(field, x+1, y+dy, side, figure, res);
                addIfCanStep(field, x-1, y+dy, side, figure, res);
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
