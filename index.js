const { google } = require('googleapis');

// 1. Service Account Setup (Ab humein Drive aur Sheets dono ki permission chahiye)
const auth = new google.auth.GoogleAuth({
    keyFile: '/etc/secrets/x.json', 
    scopes: [
        'https://www.googleapis.com/auth/drive.readonly', // Sheet dhoondhne ke liye
        'https://www.googleapis.com/auth/spreadsheets'    // Data likhne/padhne ke liye
    ]
});

const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });

// ==========================================
// AUTO-DETECT FUNCTIONS
// ==========================================

// 1. Share ki gayi Google Sheet ko khud dhoondhna
async function getAutoSheet() {
    const res = await drive.files.list({
        q: "sharedWithMe = true and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
        fields: 'files(id, name)',
        pageSize: 1
    });
    
    if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0]; // Retun karega: { id: '...', name: '...' }
    }
    return null;
}

// 2. Sheet ke andar pehle Tab (Page) ka naam khud pata karna
async function getFirstTabName(spreadsheetId) {
    const res = await sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId
    });
    return res.data.sheets[0].properties.title; // Jaise "Sheet1" ya "MyData"
}

// ==========================================
// DATABASE (CRUD) FUNCTIONS
// ==========================================

// Naya Data Add karna (Auto Next Row)
async function addData(name, email, phone) {
    try {
        const targetSheet = await getAutoSheet();
        if (!targetSheet) return console.log('❌ Error: Koi Google Sheet share nahi ki gayi hai.');

        const tabName = await getFirstTabName(targetSheet.id);

        // Append function khud next khali line (empty row) dhoondh lega
        await sheets.spreadsheets.values.append({
            spreadsheetId: targetSheet.id,
            range: tabName, // Sirf Tab ka naam dena kafi hai, A1-B1 ki zarurat nahi!
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [
                    [name, email, phone] // Yeh data next empty row me automatically A, B, C column me jayega
                ]
            }
        });
        console.log(`✅ Naya data save ho gaya (Sheet: ${targetSheet.name}) -> ${name}`);
    } catch (error) {
        console.error('Data add error:', error.message);
    }
}

// Data Padhna
async function readData() {
    try {
        const targetSheet = await getAutoSheet();
        if (!targetSheet) return console.log('❌ Error: Koi Sheet nahi mili.');

        const tabName = await getFirstTabName(targetSheet.id);

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: targetSheet.id,
            range: tabName, // Poore tab ka data le aayega
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log('Sheet bilkul khali hai.');
            return;
        }

        console.log(`\n📋 Database Data (${targetSheet.name}):`);
        rows.forEach((row, index) => {
            console.log(`Row ${index + 1}: Name: ${row[0]}, Email: ${row[1]}, Phone: ${row[2]}`);
        });
    } catch (error) {
        console.error('Data read error:', error.message);
    }
}

// ==========================================
// TEST KAREIN
// ==========================================
async function runAutoTest() {
    console.log("Google Drive me Sheet dhoondh raha hoon...");
    
    // Naya data bhejna
    await addData("Test User", "test@test.com", "0000000000");
    await addData("Suresh", "suresh@example.com", "8888888888");

    // Data padhna
    await readData();
}

runAutoTest();
