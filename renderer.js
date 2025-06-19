// filepath: d:\s3BucketLogger\renderer.js
// DOM Elements
const s3BucketTab = document.getElementById('s3BucketTab');
const localFolderTab = document.getElementById('localFolderTab');
const s3BucketPage = document.getElementById('s3BucketPage');
const localFolderPage = document.getElementById('localFolderPage');

const bucketNameInput = document.getElementById('bucketName');
const accessKeyInput = document.getElementById('accessKey');
const secretKeyInput = document.getElementById('secretKey');
const regionInput = document.getElementById('region');
const logFilePathInput = document.getElementById('logFilePath');
const localFolderPathInput = document.getElementById('localFolderPath');
const localLogFilePathInput = document.getElementById('localLogFilePath');

const generateS3LogButton = document.getElementById('generateS3Log');
const generateLocalLogButton = document.getElementById('generateLocalLog');
const selectDefaultDirectoryButton = document.getElementById('selectDefaultDirectory');
const selectLocalDefaultDirectoryButton = document.getElementById('selectLocalDefaultDirectory');
const browseLocalFolderButton = document.getElementById('browseFolder');
const clearOutputPathButton = document.getElementById('clearOutputPath');
const clearLocalOutputPathButton = document.getElementById('clearLocalOutputPath');

const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const logOutput = document.getElementById('logOutput');

// Tab switching
s3BucketTab.addEventListener('click', () => {
  s3BucketTab.classList.add('active');
  localFolderTab.classList.remove('active');
  s3BucketPage.classList.add('active');
  localFolderPage.classList.remove('active');
});

localFolderTab.addEventListener('click', () => {
  localFolderTab.classList.add('active');
  s3BucketTab.classList.remove('active');
  localFolderPage.classList.add('active');
  s3BucketPage.classList.remove('active');
});

// Clear directory path buttons
clearOutputPathButton.addEventListener('click', () => {
  logFilePathInput.value = '';
});

clearLocalOutputPathButton.addEventListener('click', () => {
  localLogFilePathInput.value = '';
});

// Select default directory buttons
selectDefaultDirectoryButton.addEventListener('click', async () => {
  const defaultPath = await window.electronAPI.getDefaultDirectory();
  logFilePathInput.value = defaultPath;
});

selectLocalDefaultDirectoryButton.addEventListener('click', async () => {
  const defaultPath = await window.electronAPI.getDefaultDirectory();
  localLogFilePathInput.value = defaultPath;
});

// Browse for local folder
browseLocalFolderButton.addEventListener('click', async () => {
  const selectedPath = await window.electronAPI.selectDirectory();
  if (selectedPath) {
    localFolderPathInput.value = selectedPath;
  }
});

// Generate S3 Log
generateS3LogButton.addEventListener('click', async () => {
  const bucketName = bucketNameInput.value.trim();
  const accessKey = accessKeyInput.value.trim();
  const secretKey = secretKeyInput.value.trim();
  const region = regionInput.value.trim();
  const logFilePath = logFilePathInput.value.trim();

  if (!bucketName || !accessKey || !secretKey || !region || !logFilePath) {
    showError('Please fill in all the S3 bucket fields');
    return;
  }

  try {
    showProgress();

    // Listen for progress updates
    window.electronAPI.onProgressUpdate(handleProgressUpdate);

    const result = await window.electronAPI.listS3Bucket({
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      region: region,
      bucketName: bucketName,
      logFilePath: `${logFilePath}/s3_log_${new Date().toISOString().replace(/:/g, '-')}.txt`
    });

    if (result.success) {
      logOutput.textContent = `Successfully logged ${result.itemCount} items from bucket ${bucketName}`;
      showSuccess(result.message);
    } else {
      logOutput.textContent = `Error: ${result.message}`;
      showError(result.message);
    }
  } catch (error) {
    logOutput.textContent = `Error: ${error.message}`;
    showError(error.message);
  } finally {
    hideProgress();
  }
});

// Generate Local Log
generateLocalLogButton.addEventListener('click', async () => {
  const localFolderPath = localFolderPathInput.value.trim();
  const logFilePath = localLogFilePathInput.value.trim();

  if (!localFolderPath || !logFilePath) {
    showError('Please fill in all the local folder fields');
    return;
  }

  try {
    showProgress();

    // Listen for progress updates
    window.electronAPI.onProgressUpdate(handleProgressUpdate);

    const result = await window.electronAPI.scanLocalFolder({
      folderPath: localFolderPath,
      logFilePath: `${logFilePath}/local_log_${new Date().toISOString().replace(/:/g, '-')}.txt`
    });

    if (result.success) {
      logOutput.textContent = `Successfully logged ${result.itemCount} items from folder ${localFolderPath}`;
      showSuccess(result.message);
    } else {
      logOutput.textContent = `Error: ${result.message}`;
      showError(result.message);
    }
  } catch (error) {
    logOutput.textContent = `Error: ${error.message}`;
    showError(error.message);
  } finally {
    hideProgress();
  }
});

// Handle progress updates
function handleProgressUpdate(progressData) {
  switch (progressData.status) {
    case 'started':
      showProgress();
      progressText.textContent = progressData.message;
      progressBar.style.width = '5%';
      break;
    case 'processing':
      progressText.textContent = progressData.message;
      // Set width based on processed items if total is known
      if (progressData.total) {
        const percentage = (progressData.processed / progressData.total * 100).toFixed(1);
        progressBar.style.width = `${percentage}%`;
      } else {
        // Just show an indeterminate percentage
        progressBar.style.width = '50%';
      }
      break;
    case 'organizing':
      progressText.textContent = progressData.message;
      const percentage = (progressData.processed / progressData.total * 100).toFixed(1);
      progressBar.style.width = `${percentage}%`;
      break;
    case 'completed':
      progressText.textContent = progressData.message;
      progressBar.style.width = '100%';
      setTimeout(hideProgress, 2000);
      break;
    case 'error':
      progressText.textContent = progressData.message;
      progressBar.style.width = '100%';
      progressBar.style.backgroundColor = 'var(--error-color)';
      setTimeout(hideProgress, 2000);
      break;
  }
}

function showProgress() {
  progressContainer.style.display = 'block';
  progressBar.style.backgroundColor = 'var(--primary-color)';
  progressBar.style.width = '0%';
}

function hideProgress() {
  setTimeout(() => {
    progressContainer.style.display = 'none';
  }, 500);
}

function showError(message) {
  // You could implement a toast notification here
  console.error(message);
}

function showSuccess(message) {
  // You could implement a toast notification here
  console.log(message);
}