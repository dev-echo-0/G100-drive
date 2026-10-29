const express = require('express');
const { google } = require('googleapis');
const Busboy = require('busboy');

const app = express();
const PORT = 3000;

// ==========================================
// 1. YAHAN APNI KEYS DAALEIN (Console Se)
// ==========================================
const CLIENT_ID = process.env['CLIENT_ID']; 
const CLIENT_SECRET = process.env['CLIENT_SECRET'];
const REDIRECT_URI = process.env['REDIRECT_URI'];

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// ==========================================
// 2. OAUTH LOGIN ROUTES
// ==========================================
// Home route: User ko login link dikhayega
app.get('/', (req, res) => {
    res.send(`<h2>Google Drive File Uploader</h2>
              <a href="/login" style="padding:10px; background:blue; color:white; text-decoration:none;">Login with Google</a>`);
});

// Login route: Google login page par bhejega
app.get('/login', (req, res) => {
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive'] // Drive ki permission
    });
    res.redirect(url);
});

// Callback route: Login success hone ke baad tokens save karega
app.get('/oauth2callback', async (req, res) => {
    const { code } = req.query;
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens); // Token set kar diya
        res.redirect('/dashboard'); // Dashboard par bhej diya
    } catch (error) {
        res.status(500).send('Login failed: ' + error.message);
    }
});

// ==========================================
// 3. DASHBOARD ROUTE (With Progress Bar)
// ==========================================
app.get('/dashboard', (req, res) => {
    // Agar login nahi kiya hai toh wapas bhej do
    if (!oauth2Client.credentials || !oauth2Client.credentials.access_token) {
        return res.redirect('/');
    }

    res.send(`
        <html>
        <head><title>Dashboard</title></head>
        <body style="font-family: Arial; padding: 20px;">
            <h2>Upload Any File to Drive (Direct Streaming)</h2>
            <input type="file" id="fileInput" required />
            <button onclick="uploadFile()" style="padding: 5px 15px;">Upload</button>
            
            <div style="margin-top: 20px;">
                <progress id="progressBar" value="0" max="100" style="width: 300px; height: 20px;"></progress>
                <span id="status" style="margin-left: 10px; font-weight: bold;">0%</span>
            </div>

            <script>
                function uploadFile() {
                    const file = document.getElementById('fileInput').files[0];
                    if (!file) return alert('Pehle koi file select karein!');

                    const formData = new FormData();
                    formData.append('myFile', file);

                    const xhr = new XMLHttpRequest();
                    
                    // Progress Update karna
                    xhr.upload.addEventListener('progress', (event) => {
                        if (event.lengthComputable) {
                            const percent = Math.round((event.loaded / event.total) * 100);
                            document.getElementById('progressBar').value = percent;
                            document.getElementById('status').innerText = percent + '% Uploaded';
                        }
                    });

                    // Upload Complete hone par
                    xhr.onload = () => {
                        if (xhr.status === 200) {
                            document.getElementById('status').innerText = 'Upload Complete! ✅';
                            alert(xhr.responseText); // Success message ya File ID
                        } else {
                            document.getElementById('status').innerText = 'Error! ❌';
                            alert('Upload failed: ' + xhr.responseText);
                        }
                    };

                    // Backend par bhejna
                    xhr.open('POST', '/upload-stream', true);
                    xhr.send(formData);
                }
            </script>
        </body>
        </html>
    `);
});

// ==========================================
// 4. DIRECT STREAMING UPLOAD ROUTE
// ==========================================
app.post('/upload-stream', (req, res) => {
    const busboy = Busboy({ headers: req.headers });
    let uploadPromise = null;

    busboy.on('file', (fieldname, fileStream, fileInfo) => {
        console.log(`Bina RAM bhare upload start ho raha hai: ${fileInfo.filename}`);

        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        
        // Direct stream ko Drive api me dalna
        uploadPromise = drive.files.create({
            requestBody: { name: fileInfo.filename },
            media: {
                mimeType: fileInfo.mimeType,
                body: fileStream // 🔥 Yahi pipe ho raha hai seedha Drive ko
            },
        });
    });

    busboy.on('finish', async () => {
        try {
            if (uploadPromise) {
                const response = await uploadPromise;
                console.log('Upload Done!');
                res.status(200).send(`File upload ho gayi! Google Drive check karein. (ID: ${response.data.id})`);
            } else {
                res.status(400).send('Koi file nahi mili.');
            }
        } catch (error) {
            console.error('Drive API Error:', error.message);
            res.status(500).send(error.message);
        }
    });

    // Browser se aane wale data ko busboy (postman) me dalna
    req.pipe(busboy);
});

// ==========================================
// SERVER START
// ==========================================
app.listen(PORT, () => {
    console.log(`✅ Server is running!`);
    console.log(`👉 Apne browser mein open karein: http://localhost:${PORT}`);
});
