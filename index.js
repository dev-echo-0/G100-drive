const express = require('express');
const { google } = require('googleapis');
const Busboy = require('busboy');

const app = express();
const PORT = 3000;

// 1. Service Account Authentication setup
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json', // Yeh file aapke project folder me honi chahiye
    scopes: ['https://www.googleapis.com/auth/drive'] 
});
const drive = google.drive({ version: 'v3', auth });

// Helper Function: Shared Folder dhoondhne ke liye
async function getSharedFolder() {
    const res = await drive.files.list({
        q: "sharedWithMe = true and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields: 'files(id, name)',
        pageSize: 1 // Pehla shared folder uthayega
    });
    
    if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0]; // Return karega: { id: '...', name: '...' }
    }
    return null; // Agar koi folder share nahi hai
}

// 2. Dashboard Route (List Files + Upload Form)
app.get('/', async (req, res) => {
    try {
        const targetFolder = await getSharedFolder();

        // Agar Service Account ko koi folder share nahi kiya gaya hai
        if (!targetFolder) {
            return res.send(`
                <h2>Error: Koi Folder Nahi Mila!</h2>
                <p>Apne personal Google Drive mein ek folder banayein aur use Service Account ke email par (Editor permission ke sath) share karein. Phir is page ko refresh karein.</p>
            `);
        }

        // Us target folder ke andar ki files list karna
        const filesRes = await drive.files.list({
            q: `'${targetFolder.id}' in parents and trashed=false`,
            fields: 'files(id, name, size, mimeType)',
            orderBy: 'createdTime desc'
        });
        
        const files = filesRes.data.files;
        
        // HTML UI Generate karna
        let html = `
            <html lang="en">
            <head>
                <title>Drive Dashboard</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; background: #f4f4f9; }
                    .box { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
                    button { background: #28a745; color: white; border: none; padding: 10px 15px; cursor: pointer; border-radius: 4px; }
                    button:hover { background: #218838; }
                    table { width: 100%; border-collapse: collapse; background: white; }
                    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                    th { background: #333; color: white; }
                </style>
            </head>
            <body>
            
            <div class="box">
                <h2>Upload File</h2>
                <p><strong>Target Folder:</strong> 📂 ${targetFolder.name} (Auto-detected)</p>
                <form action="/upload" method="POST" enctype="multipart/form-data">
                    <input type="file" name="myFile" required />
                    <button type="submit">Upload to this Folder</button>
                </form>
            </div>

            <div class="box">
                <h3>Files in '${targetFolder.name}' (${files.length})</h3>
                <table>
                    <tr>
                        <th>File Name</th>
                        <th>Size (MB)</th>
                        <th>File ID</th>
                    </tr>
        `;

        if (files.length === 0) {
            html += `<tr><td colspan="3" style="text-align:center;">Yeh folder bilkul khali hai.</td></tr>`;
        } else {
            files.forEach(file => {
                const sizeMB = file.size ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown';
                html += `
                    <tr>
                        <td>${file.name}</td>
                        <td>${sizeMB}</td>
                        <td>${file.id}</td>
                    </tr>
                `;
            });
        }

        html += `</table></div></body></html>`;
        res.send(html);

    } catch (error) {
        res.status(500).send('Error loading dashboard: ' + error.message);
    }
});

// 3. File Upload Route (Streaming via Busboy)
app.post('/upload', async (req, res) => {
    try {
        const targetFolder = await getSharedFolder();
        if (!targetFolder) {
            return res.status(400).send('Upload Failed: Koi shared folder nahi mila.');
        }

        const busboy = Busboy({ headers: req.headers, highWaterMark: 2 * 1024 * 1024 }); 
        let uploadPromise = null;

        busboy.on('file', (fieldname, fileStream, fileInfo) => {
            console.log(`Uploading '${fileInfo.filename}' into folder '${targetFolder.name}'`);
            
            uploadPromise = drive.files.create({
                requestBody: { 
                    name: fileInfo.filename,
                    parents: [targetFolder.id] // File seedha auto-detected folder me jayegi
                },
                media: {
                    mimeType: fileInfo.mimeType,
                    body: fileStream
                },
            });
        });

        busboy.on('finish', async () => {
            if (uploadPromise) {
                await uploadPromise;
                // Upload success hote hi dashboard par wapas bhejein jahan nayi list dikhegi
                res.redirect('/');
            } else {
                res.status(400).send('Koi file mili nahi.');
            }
        });

        req.pipe(busboy);
    } catch (error) {
        res.status(500).send('Upload Route Error: ' + error.message);
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server is running! Browser mein open karein: http://localhost:${PORT}`);
});
