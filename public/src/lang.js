exports.en = {
};

exports.ru = {
    'pawn': 'пешка',
    'knight': 'конь',
    'queen': 'ферзь',
    'king': 'король',
    'rook': 'ладья',
    'bishop': 'слон'
};

exports.active = exports.en;

exports.t = (k) => {
    return exports.active[k] || k;
};