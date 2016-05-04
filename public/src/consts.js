exports.FIG_SIZE = 21;
exports.PIX_SIZE = 2;
exports.PADDING = 1;
exports.CELL_SIZE = exports.FIG_SIZE + exports.PADDING*2;

exports.cell = function(n) { return n*exports.CELL_SIZE*exports.PIX_SIZE};
exports.figureInCell = function(n) { return exports.cell(n) + exports.PADDING};
exports.figure = function(n) { return n*exports.FIG_SIZE*exports.PIX_SIZE};
exports.pixel = function(n) { return n * exports.PIX_SIZE; }

exports.time = function(ms) { return ms/70;}