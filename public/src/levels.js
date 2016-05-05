let t = require('lang').t;

function whiteAi(s, heroAlly = true) {
    return s.ai("White", heroAlly ? "hero" : "white", (f) => f.color == 'white' && f.side != 'hero');
}
function blackAi(s, heroAlly = false) {
    return s.ai("Black", heroAlly ? "black" : "black", (f) => f.color == 'black' && f.side != 'hero');
}

function pawnsAi(s, heroAlly = true) {
    return s.ai("Pawns", heroAlly ? "hero" : "white", (f) => f.figure == 'pawn' && f.side != 'hero');
}
function pawnsNone(s, heroAlly = true) {
    return s.none("Pawns", heroAlly ? "hero" : "white", (f) => f.figure == 'pawn' && f.side != 'hero');
}
function figuresAi(s, heroAlly = false) {
    return s.ai("Figures", heroAlly ? "black" : "black", (f) => f.figure != 'pawn' && f.side != 'hero');
}


let level1 = {
    name: 'Level 1',
    field: [
        "........",
        "..*....g",
        "........",
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
                    game.enqueue(s.message("But how? We are locked on this board!", level.hero));
                    game.enqueue(s.message("Not you", king));
                    game.enqueue(s.message("Break the rules...", king));
                    game.win(level2);
                    return true;
                }
                break;
        }
    }

};

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
            levelState.killedBefore = heroState.killedPawns;
            levelState.hero = heroState;
            //TODO: modify rules
        },
        controllers: (s) => [s.user(), whiteAi(s), blackAi(s)],
        scenarioCallback: (level, game, s, levelState) => () => {
            if (!levelState.startDialog) {
                game.enqueue(s.message("Die, stupid pawns", level.find('knight', 'black')));
                game.enqueue(s.message("They left you here for die", level.find('rook', 'black')));
                game.enqueue(s.message("That's not true!", level.find('pawn', 'white')));
                levelState.startDialog = true;
            }
            if (!level.firstKill && level.count('pawn', 'white') != 4 && levelState.hero.killedPawns != levelState.killedBefore) {
                game.enqueue(s.message("But... Why?..", level.find('pawn', 'white')));
                game.enqueue(s.message("I thought you here to protect us...", level.find('pawn', 'white')));
                game.enqueue(s.message("Shut up", level.hero));
                level.firstKill = true;
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
        ".K.K....K.K..",
        ".............",
        ".............",
        ".p.p.....p.p.",
        ".pRpR.*.RpRp."
    ],
    initState: (heroState, levelState) => {
        if (heroState.figure === 'pawn') {
            heroState.figure = 'bishop';
        }
        heroState.color = 'hero';
    },
    controllers: (s) => [s.user(), whiteAi(s), blackAi(s)],
    scenarioCallback: (level, game, s, levelState) => () => {
        if (!level.pawnWarn) {
            game.enqueue(s.message("Pawns are weak. Allied or hostile - does not matter"));
            game.enqueue(s.message("You may kill few to save many"));
            game.enqueue(s.message("Up to you"));
            level.pawnWarn = true;
        }
        if (!level.find(undefined, 'black')) {
            game.win(level4);
            return true;
        }
    }
};

let level4 = {
    name: "Level 4",
    field: [
        "..........",
        "..........",
        ".B.B..B.B.",
        "p.p....p.p",
        "..........",
        "....*.....",
        "..........",
        "..........",
        ".p.p..p.p.",
        ".R.R..R.R.",
    ],
    initState: (heroState, levelState) => {
        if (heroState.figure === 'pawn') {
            heroState.figure = 'bishop';
        }
        heroState.color = 'hero';
        levelState.hero = heroState;
    },
    controllers: (s) => [s.user(), whiteAi(s), blackAi(s)],
    scenarioCallback: (level, game, s, levelState) => () => {
        if (!level.initialDialog) {
            if (levelState.hero.killedPawns == 0) {
                game.enqueue(s.message("Champion, this is a trap!", level.find("pawn", "white")));
                game.enqueue(s.message("Leave us!", level.find("pawn", "white")));
            } else {
                game.enqueue(s.message("One more to kill us...", level.find("pawn", "white")));
                game.enqueue(s.message("We are doomed", level.find("pawn", "white")));
            }
            game.enqueue(s.message("Time to die, shapeshifter", level.find(undefined, "black")));
            level.initialDialog = true;
        }
        if (!level.find(undefined, 'black')) {
            game.win(level5);
            return true;
        }
    }
};


let level5 = {
    name: "Level 5",
    field: [
        "....Q.....",
        "... ......",
        "...p......",
        "..  ..  .p",
        ".   ......",
        "Q...*....Q",
        "..........",
        ".p.    ...",
        "....   .Q.",
        "...p......",
    ],
    initState: (heroState, levelState) => {
        if (heroState.figure === 'pawn') {
            heroState.figure = 'queen';
        }
        heroState.color = 'hero';
        levelState.hero = heroState;
    },
    controllers: (s) => [s.user(), whiteAi(s), blackAi(s)],
    scenarioCallback: (level, game, s, levelState) => () => {
        if (!level.initialDialog) {
            game.enqueue(s.message("At last, you understand how big this war is"));
            game.enqueue(s.message("It is endless"));
            game.enqueue(s.message("And tired world collapses"));
            game.enqueue(s.action(() => {
                level.fall(2,4);
                level.fall(9,4);
                level.fall(4,9);
                level.fall(10,9);
            }));
            level.initialDialog = true;
        } else {
            if (!level.q4) {
                game.enqueue(s.message("Just don't move. It will not hurt", level.find("queen", "black")));
                level.q4 = true;
            }
            if (!level.q3 && level.count("queen", "black") == 3) {
                game.enqueue(s.message("I told you don't move!", level.find("queen", "black")));
                level.q3 = true;
            }
            if (!level.q2 && level.count("queen", "black") == 2) {
                game.enqueue(s.message("Do you like to complicate things?", level.find("queen", "black")));
                level.q2 = true;
            }
            if (!level.q1 && level.count("queen", "black") == 1) {
                game.enqueue(s.message("My patience is exhaused", level.find("queen", "black")));
                level.q1 = true;
            }
        }
        if (!level.find(undefined, 'black')) {
            game.win(level6);
            return true;
        }
    }
};

let level6 = {
    name: "Level 6",
    field: [
        "...... .. ....G ",
        "......K........ ",
        "..Q...... ..... ",
        "..            . ",
        "PP            . ",
        "................",
        " .............*.",
        ".R..............",
        ".R.....B........",
    ],
    music: "battle2",
    initState: (heroState, levelState) => {
        if (heroState.figure === 'pawn') {
            heroState.figure = 'queen';
        }
        heroState.color = 'hero';
        levelState.hero = heroState;
    },
    controllers: (s) => [s.user(), blackAi(s)],
    scenarioCallback: (level, game, s, levelState) => () => {
        if (!level.initialDialog) {
            game.enqueue(s.message("So you found me, witch", level.find("king", "black")));
            game.enqueue(s.message("But don't think it will be easy", level.find("king", "black")));
            game.enqueue(s.action(() => {
                level.fall(15,4);
                level.fall(15,5);
            }));
            level.initialDialog = true;
        }
        if (!level.falledBridge && level.hero.y < 3) {
            game.enqueue(s.message("Can you fly, witch?", level.find("king", "black")));
            game.enqueue(s.message("You have all the time to learn!", level.find("king", "black")));
            game.enqueue(s.action(() => {
                level.fall(10,2);
            }));
            level.falledBridge = true;
        }
        if (level.find("king", 'black').goingToBeSmasmed && !levelState.finalDialog) {
            game.enqueue(s.action(() => {
                let king = level.find("king", "black");
                king.move({x: king.x+1,y: king.y, afterMove: () => {
                    game.enqueue(s.message("Congratulations, witch. You killed me", king));
                    game.enqueue(s.message("And this is your prize", king));
                    game.enqueue(s.message("Meet you in hell!", king));
                    game.enqueue(s.action(() => {
                        king.smashed();
                        level.hero.morph("pawn");
                        level.hero.color = 'black';
                        levelState.hero.color = 'black';
                    }));
                    game.enqueue(s.message("What?", level.hero));
                    game.win(level7);
                }});
                levelState.finalDialog = true;
            }));
        }
    }
};

let level7 = {
    name: "Level 7",
    music: "battle2",
    field: [
        ".......",
        "PPPP  *",
        "....  .",
        "....  .",
        "..k.  .",
        "r...  .",
        "....  .",
        "......."
    ],
    initState: (heroState, levelState) => {
        heroState.figure = 'pawn';
        heroState.color = 'black';
        levelState.hero = heroState;
    },
    controllers: (s) => [s.user(), whiteAi(s, false), blackAi(s, true)],
    scenarioCallback: (level, game, s, levelState) => () => {
        if (!levelState.initialDialog) {
            game.enqueue(s.message("Well, well, well. Cannon fodder here", level.find("rook", "white")));
            game.enqueue(s.message("Wait! That's me, shapeshifter", level.hero));
            game.enqueue(s.message("Huh? You are not in good shape for me", level.find("knight", "white")));
            game.enqueue(s.message("But we'll fix it right now", level.find("rook", "white")));
            levelState.initialDialog = true;
        }
        if (level.hero.y === 3 && !levelState.d1) {
            game.enqueue(s.message("Their king is dead", level.hero));
            game.enqueue(s.message("Why are you killing them?", level.hero));
            game.enqueue(s.message("Because it is funny!", level.find(undefined, "white")));
            levelState.d1 = true;
        }
        if (level.hero.y === 5 && !levelState.d2) {
            game.enqueue(s.message("Were have you been while I fighted for you?", level.hero));
            levelState.d2 = true;
        }
        if (level.hero.y === 7 && level.hero.figure == 'pawn') {
            level.hero.morph("queen");
            level.hero.color = 'hero';
            levelState.hero.color = 'hero';
            game.enqueue(s.message("Now come here", level.hero));
            game.enqueue(s.message("Damn...", level.find(undefined, "white")));
        }
        if (!level.find(undefined, 'white')) {
            game.win(level8);
            return true;
        }
    }

};


let level8 = {
    name: "Level 8",
    music: "battle2",
    field: [
        "............",
        ".Q.......P..",
        "...P..p..q..",
        "..p.....P...",
        ".....K....B.",
        "...P....p...",
        ".P...*....P.",
        "..b.........",
        "..p...P..p..",
        "......R...k.",
        ".r...p....p.",
        "............",
    ],
    initState: (heroState, levelState) => {
        if (heroState.figure === 'pawn') {
            heroState.figure = 'bishop';
        }
        heroState.color = 'hero';
        levelState.hero = heroState;
    },
    controllers: (s) => [s.user(), pawnsNone(s), figuresAi(s)],
    scenarioCallback: (level, game, s, levelState) => () => {
        if (!levelState.initialDialog) {
            game.enqueue(s.message("That's enough"));
            game.enqueue(s.message("Time has come to save as many pawns as possible"));
            levelState.initialDialog = true;
        }
        let figures = level.count("rook") + level.count("bishop") + level.count("knight") + level.count("queen");
        if (figures === 1 /*just hero*/ ) {
            game.win();
            return true;
        }
    }

};

exports.levels = {
    firstLevel: level1
};
