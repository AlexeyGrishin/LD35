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
            //TODO: modify rules
        },
        controllers: (s) => [s.user(), whiteAi(s), blackAi(s)],
        scenarioCallback: (level, game, s, levelState) => () => {
            if (!levelState.startDialog) {
                game.enqueue(s.message("Ha-ha-ha, die stupid pawns", level.find('knight', 'black')));
                game.enqueue(s.message("No, please!", level.find('pawn', 'white')));
                levelState.startDialog = true;
            }
            if (!level.find(undefined, 'black')) {
                game.win(level3);
                return true;
            }
        }
    }
;

let level3 = {
    name: "Level 3",
    field: [
        ".....K.K.K.K.",
        ".............",
        ".............",
        ".....p.p.p.p.",
        ".*..pRpRpRpR."
    ],
    initState: (heroState, levelState) => {
        if (heroState.figure === 'pawn') {
            heroState.figure = 'bishop';
        }
        heroState.color = 'hero';
    },
    controllers: (s) => [s.user(), whiteAi(s), blackAi(s)],
    scenarioCallback: (level, game, s, levelState) => () => {
        if (!level.find(undefined, 'black')) {
            game.win();
            return true;
        }
    }
};

let level1 = {
    name: 'Level 1',
    field: [
        "........",
        "..*.....",
        ".......g",
        "..B..R..",
        "........",
        "....K...",
        "........",
        "........",
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
    scenarioCallback: (level, game, s, levelState) => () => {
        let king = level.find('king', 'white');
        switch (levelState.event) {
            case 'started':
                game.enqueue(s.message("You just a little pawn in a big game."));
                game.enqueue(s.message("But even you can change the world..."));
                game.enqueue(s.message("...with one step forward"));
                levelState.event = 'waitForMorph';
                break;
            case 'waitForMorph':
                if (level.hero.y == 0) {
                    game.enqueue(s.message("Strange feeling", level.hero));
                    game.enqueue(s.message("I am... changing?", level.hero));
                    game.enqueue(s.action(() => {
                        level.hero.color = 'hero';
                        level.hero.morph('queen');
                    }));
                    game.enqueue(s.message("Yes, you are, my warrior", king));
                    game.enqueue(s.message("Too late for you!", level.find(undefined, 'black')));
                    game.enqueue(s.message("Hurry up, don't let them touch me", king));
                    levelState.event = 'morphed';
                }
                break;
            case 'morphed':
                if (!levelState.hint1 && level.figures.filter((s) => s.color == 'black' && s.isAlive).length < 3) {
                    levelState.hint1 = true;
                    game.enqueue(s.message("When you take the piece, you morph into it"));
                    game.enqueue(s.message("When you morph - you continue moving"));
                }
                if (!levelState.hint2 && level.figures.filter((s) => s.color == 'black' && s.isAlive).length < 2) {
                    levelState.hint2 = true;
                    game.enqueue(s.message("You may end your turn beyond enemy's piece"));
                }
                if (!level.find(undefined, 'black')) {
                    game.enqueue(s.message("Well done, my warrior", king));
                    game.enqueue(s.message("But this is only beginning", king));
                    game.enqueue(s.message("Other battlefields are waiting for you", king));
                    game.enqueue(s.message("But how? We are locked in this board!", level.hero));
                    game.enqueue(s.message("Not you", king));
                    game.enqueue(s.message("Break the rules...", king));
                    game.win(level2);
                    return true;
                }
                break;
        }
    }

};

exports.levels = {
    level1, level2, level3,
    firstLevel: level1
};
