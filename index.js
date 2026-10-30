const { QuickDB } = require("quick.db");
// const db = new QuickDB(); // will make a json.sqlite in the root folder
// if you want to specify a path you can do so like this
const db = new QuickDB({ filePath: "/etc/secrets/test.sqlite" });

(async () => {
    // Init the database, this is always needed!
    await db.init();

    // self calling async function just to get async
    // Setting an object in the database:
    await db.set("userInfo", { difficulty: "Easy" });
    // -> { difficulty: 'Easy' }

    // Getting an object from the database:
    await db.get("userInfo");
    // -> { difficulty: 'Easy' }

    // Getting an object property from the database:
    await db.get("userInfo.difficulty");
    // -> 'Easy'

    // Setting an object in the database:
    await db.set("userInfo", { difficulty: "Easy" });
    // -> { difficulty: 'Easy' }

    // Pushing an element to an array (that doesn't exist yet) in an object:
    await db.push("userInfo.items", "Sword");
    // -> { difficulty: 'Easy', items: ['Sword'] }

    // Adding to a number (that doesn't exist yet) in an object:
    await db.add("userInfo.balance", 500);
    // -> { difficulty: 'Easy', items: ['Sword'], balance: 500 }

    // Repeating previous examples:
    await db.push("userInfo.items", "Watch");
    // -> { difficulty: 'Easy', items: ['Sword', 'Watch'], balance: 500 }
    await db.add("userInfo.balance", 500);
    // -> { difficulty: 'Easy', items: ['Sword', 'Watch'], balance: 1000 }

    // Fetching individual properties
    await db.get("userInfo.balance"); // -> 1000
    await db.get("userInfo.items"); // ['Sword', 'Watch']
})();
