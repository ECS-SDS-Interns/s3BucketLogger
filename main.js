const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const AWS = require("aws-sdk");

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      // Add this to allow file access
      webSecurity: true,
    },
    icon: path.join(__dirname, "assets", "swa.png"),
  });

  // Load the index.html file
  mainWindow.loadFile("index.html");
}

// Create window when Electron is ready
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});

// Handle S3 listing request from renderer
ipcMain.handle("list-s3-bucket", async (event, credentials) => {
  try {
    const s3 = new AWS.S3({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      region: credentials.region,
    });

    const bucketName = credentials.bucketName;
    const logFilePath = credentials.logFilePath;

    let logContent = `S3 Bucket Contents: ${bucketName}\n`;
    logContent += `Generated on: ${new Date().toISOString()}\n\n`;

    let allItems = [];
    let isTruncated = true;
    let marker;
    let totalProcessed = 0;

    // Notify progress start
    mainWindow.webContents.send("progress-update", {
      status: "started",
      message: "Starting to list objects...",
    });

    while (isTruncated) {
      const params = { Bucket: bucketName };
      if (marker) params.Marker = marker;

      const response = await s3.listObjects(params).promise();

      // Add to our collection
      allItems = [...allItems, ...response.Contents];
      totalProcessed += response.Contents.length;

      // Send progress update
      mainWindow.webContents.send("progress-update", {
        status: "processing",
        processed: totalProcessed,
        message: `Retrieved ${totalProcessed} objects so far...`,
      });

      isTruncated = response.IsTruncated;
      if (isTruncated) {
        marker = response.Contents.slice(-1)[0].Key;
      }
    }

    // Group items by folder and format for the log
    const itemsByFolder = {};
    allItems.forEach((item) => {
      const key = item.Key;
      const parts = key.split("/");

      // If there's a folder structure (contains /)
      if (parts.length > 1) {
        const folderPath = parts.slice(0, -1).join("/");
        const fileName = parts[parts.length - 1];

        if (!itemsByFolder[folderPath]) {
          itemsByFolder[folderPath] = [];
        }

        itemsByFolder[folderPath].push({
          name: fileName,
          lastModified: item.LastModified,
          size: item.Size,
          storageClass: item.StorageClass,
          etag: item.ETag,
        });
      } else {
        // Root-level files
        if (!itemsByFolder[""]) {
          itemsByFolder[""] = [];
        }

        itemsByFolder[""].push({
          name: key,
          lastModified: item.LastModified,
          size: item.Size,
          storageClass: item.StorageClass,
          etag: item.ETag,
        });
      }
    });

    // Format the log content with folders and their contents
    logContent += `Total Objects: ${totalProcessed}\n\n`;

    Object.keys(itemsByFolder).forEach((folder) => {
      const files = itemsByFolder[folder];
      const currentDate = new Date().toISOString().split("T")[0];
      const currentTime = new Date().toTimeString().split(" ")[0];

      if (folder) {
        logContent += `[${currentDate} ${currentTime}] Folder: ${folder}\n`;
      } else {
        logContent += `[${currentDate} ${currentTime}] Root Files:\n`;
      }

      files.forEach((file) => {
        logContent += `- ${file.name}\n`;
      });

      logContent += "\n";
    });

    // Write to log file
    fs.writeFileSync(logFilePath, logContent);

    // Notify completion
    mainWindow.webContents.send("progress-update", {
      status: "completed",
      message: `Successfully logged ${totalProcessed} items to ${logFilePath}`,
      totalItems: totalProcessed,
    });

    return {
      success: true,
      message: `Successfully logged ${totalProcessed} items from bucket ${bucketName} to ${logFilePath}`,
      itemCount: totalProcessed,
    };
  } catch (error) {
    mainWindow.webContents.send("progress-update", {
      status: "error",
      message: error.message,
    });

    return {
      success: false,
      message: error.message,
    };
  }
});
