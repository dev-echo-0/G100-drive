const express = require('express');
const { google } = require('googleapis');
const Busboy = require('busboy');

const app = express();
const PORT = 3000;

// 1. Service Account Setup (credentials.json aapke folder me honi chahiye)
const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/drive'] 
});
const drive = google.drive({ version: 'v3', auth });

// 2. Dashboard Route (List Files + Upload Form)
app.get('/', async (req, res) => {
    try {
        // Service Account ki Root Drive se files list karna
        const response = await drive.files.list({
            // 'root' in parents ka matlab hai jo files kisi folder me nahi, bahar padi hain
            q: "'root' in parents and trashed=false",
            fields: 'files(id, name, size, mimeType)',
            orderBy: 'createdTime desc'
        });
        
        const files = response.data.files;
        
        // HTML UI
        let html = `
            <html lang="en">
            <head>
                <title>Service Account Root Drive</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; background: #f4f4f9; }
                    .box { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
                    button { background: #007bff; color: white; border: none; padding: 10px 15px; cursor: pointer; border-radius: 4px; }
                    button:hover { background: #0056b3; }
                    table { width: 100%; border-collapse: collapse; background: white; }
                    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                    th { background: #333; color: white; }
                </style>
            </head>
            <body>
            
            <div class="box">
                <h2>Upload File (Direct to Service Account Root)</h2>
                <form action="/upload" method="POST" enctype="multipart/form-data">
                    <input type="file" name="myFile" required />
                    <button type="submit">Upload</button>
                </form>
            </div>

            <div class="box">
                <h3>Root Drive Files (${files.length})</h3>
                <table>
                    <tr>
                        <th>File Name</th>
                        <th>Size</th>
                        <th>File ID</th>
                    </tr>
        `;

        if (files.length === 0) {
            html += `<tr><td colspan="3" style="text-align:center;">Root drive bilkul khali hai.</td></tr>`;
        } else {
            files.forEach(file => {
                const sizeStr = file.size ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown';
                html += `
                    <tr>
                        <td>${file.name}</td>
                        <td>${sizeStr}</td>
                        <td>${file.id}</td>
                    </tr>
                `;
            });
        }

        html += `</table></div></body></html>`;
        res.send(html);

    } catch (error) {
        res.status(500).send('Error fetching files: ' + error.message);
    }
});

// 3. File Upload Route (Streaming)
app.post('/upload', (req, res) => {
    const busboy = Busboy({ headers: req.headers, highWaterMark: 2 * 1024 * 1024 }); 
    let uploadPromise = null;

    busboy.on('file', (fieldname, fileStream, fileInfo) => {
        console.log(`Uploading to Root: ${fileInfo.filename}`);
        
        uploadPromise = drive.files.create({
            requestBody: { 
                name: fileInfo.filename,
                // parents: [FOLDER_ID] hata diya, ab default ye "root" me jayega
            },
            media: {
                mimeType: fileInfo.mimeType,
                body: fileStream
            },
        });
    });

    busboy.on('finish', async () => {
        try {
            if (uploadPromise) {
                await uploadPromise;
                // Upload complete hone par turant dashboard reload karega
                res.redirect('/');
            } else {
                res.status(400).send('File missing.');
            }
        } catch (error) {
            console.error(error);
            res.status(500).send('Upload Failed: ' + error.message);
        }
    });

    req.pipe(busboy);
});

app.listen(PORT, () => {
    console.log(`✅ Server is running! Browser mein open karein: http://localhost:${PORT}`);
});
