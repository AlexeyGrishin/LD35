let t = require('lang').t;

function whiteAi(s, heroAlly = true) {
    return s.ai("White", heroAlly ? "hero" : "white", (f) => f.color == 'white');
}
function blackAi(s, heroAlly = false) {
    return s.ai("Black", heroAlly ? "black" : "black", (f) => f.color == 'black');
}

let level2 = {
        name: 'Level 2',
        field: [
            "...R.",
            ".....",
            "..*..",
            "K....",
            ".....",
            ".pppp"
        ],
        initState: (heroState, levelState) => {
            if (heroState.figure === 'pawn') {
                heroState.figure = 'bishop';
            }
            heroState.color = 'hero'; //TODO
            levelState.startDialog = true;
            //TODO: modify rules
        },
        controllers: (s) => [s.user(), whiteAi(s), blackAi(s)],
        scenarioCallback: (level, game, levelState) => () => {
            if (levelState.startDialog) {
                game.showMessage("Ha-ha-ha, die stupid pawns", level.find('knight', 'black'));
                game.showMessage("No, please!", level.find('pawn', 'white'));
                levelState.startDialog = false;
            }
            if (!level.find(undefined, 'black')) {
                game.win();
                return true;
            }
        }
    }
;

let level1 = {
    name: 'Level 1',
    field: [
        "..R.....",
        ".*......",
        "......g.",
        "........",
        "........",
        //"...BR...",
        "........",
        "........",
        ".K......",
    ],
    initState: (heroState, levelState) => {
        heroState.figure = 'pawn';
        heroState.color = 'white';
        levelState.event = 'started';
    },
    controllers: (s) => [
        s.user(),
        s.ai("White", "hero", (f) => f.color == 'white' && f.figure != 'pawn'),
        s.ai("Black", "black", (f) => f.color == 'black')
    ],
    scenarioCallback: (level, game, levelState) => () => {
        switch (levelState.event) {
            case 'started':
                game.showMessage("Test message");
                levelState.event = 'waitForMorph';
                break;
            case 'waitForMorph':
                if (level.hero.y == 0) {
                    game.showMessage("After first cycle", level.hero);
                    level.hero.color = 'hero';
                    level.hero.morph('queen');
                    levelState.event = 'morphed';
                }
                break;
            case 'morphed':
                if (!levelState.rook && !level.find('rook', 'black')) {
                    game.showMessage("Killed rook", level.hero);
                    game.showMessage("Well done!", level.find('king', 'white'));
                    levelState.rook = true;
                }
                if (!levelState.bishop && !level.find('bishop', 'black')) {
                    game.showMessage("Killed bishop", level.hero);
                    game.showMessage("Well done!", level.find('king', 'white'));
                    levelState.bishop = true;
                }
                if (!level.find(undefined, 'black')) {
                    game.win(level2);
                    return true;
                }
                break;
        }
    }

};

exports.levels = {
    level1, level2
};
