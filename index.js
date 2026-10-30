const fs = require('fs');
const path = require('path');

// Dummy file ka path
const filePath = path.join(__dirname, 'dummy_test_file.bin');

// 10 MB ka dummy data chunk (RAM ko bachane ke liye sirf 10MB memory me rakhenge)
const chunkSize = 10 * 1024 * 1024; 
const chunk = Buffer.alloc(chunkSize, '0'); // '0' se bhara hua buffer

let totalWritten = 0;

console.log("🚀 Render Storage Test Start kar rahe hain...\n");

try {
    // Agar pehle se koi purani test file hai, toh usko delete kar do
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    // Infinite loop, jab tak storage full na ho jaye
    while (true) {
        // File mein 10MB data add karein (append)
        fs.appendFileSync(filePath, chunk);
        totalWritten += 10;
        
        // Har 50 MB ke baad console me progress print karein
        if (totalWritten % 50 === 0) {
            console.log(`⏳ Ab tak ${totalWritten} MB data temporary disk par save ho chuka hai...`);
        }

        // Safety limit (Maarlo Render ne zyada space de di, toh 4000MB/4GB pe rok denge)
        if (totalWritten >= 4000) {
            console.log("\n✅ 4000 MB (4 GB) limit cross ho gayi. Test successfully stopped.");
            break;
        }
    }
} catch (error) {
    // ENOSPC ka matlab hai 'Error No Space' (Storage Full)
    if (error.code === 'ENOSPC') {
        console.log(`\n❌ DISK FULL ERROR!`);
        console.log(`🎯 FINAL RESULT: Render ke is instance par lagbhag **${totalWritten} MB** free storage available hai.`);
    } else {
        console.log("\n⚠️ Koi aur error aayi:", error.message);
    }
} finally {
    // Test ke baad storage clear karna zaroori hai, warna Render bot evict (band) kar dega
    console.log("\n🧹 Cleanup: Dummy file delete ki jaa rahi hai...");
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log("✅ Cleanup Done! Disk wapas free ho gayi.");
    }
}
