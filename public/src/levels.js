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
        initState: (heroState) => {
            if (heroState.figure === 'pawn') {
                heroState.figure = 'bishop';
            }
            heroState.color = 'hero'; //TODO
            //TODO: modify rules
        },
        controllers: (s) => [s.user(), whiteAi(s), blackAi(s)],
        scenario: (level, game, s) => [
            s.message("Ha-ha-ha, die stupid pawns", level.find('knight', 'black')),
            s.message("No, please!", level.find('pawn', 'white')),
            s.gaming(0, () => {
                if (!level.find(undefined, 'black')) {
                    game.win();
                    return true;
                }
            })
        ]
    }
;

let level1 = {
    name: 'Level 1',
    field: [
        "..R.....",
        ".*......",
        "......g.",
        "........",
        "...BR...",
        "........",
        "........",
        "......K.",
    ],
    initState: (heroState) => {
        heroState.figure = 'pawn';
        heroState.color = 'white';
    },
    controllers: (s) => [
        s.user(),
        s.ai("White", "hero", (f) => f.color == 'white' && f.figure != 'pawn'),
        s.ai("Black", "black", (f) => f.color == 'black')
    ],
    scenario: (level, game, s) => [
        s.message("Test message"),
        s.gaming(0, () => {
            if (level.hero.y == 0) {
                game.next();
                return true;
            }
        }),
        s.message("After first cycle", level.hero),
        s.action(() => {
            level.hero.color = 'hero';
            level.hero.morph('queen');
        }),
        s.gaming(0, () => {
            if (!level.find(undefined, 'black')) {
                game.win(level2);
                return true;
            }
        })
    ]
};

exports.levels = {
    level1, level2
};
