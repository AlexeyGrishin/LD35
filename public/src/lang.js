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
    exports.ru[k] = exports.ru[k] || "TODO: " + k;
    return exports.active[k] || k;
};

window.printRu = () => console.log(JSON.stringify(exports.ru));