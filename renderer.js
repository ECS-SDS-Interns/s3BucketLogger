// This is the external JavaScript file for our application
console.log('Application initializing...');

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
  document.getElementById('errorLog').textContent = `Error: ${event.error.message}`;
});

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed');
  
  const startButton = document.getElementById('startButton');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const statusMessage = document.getElementById('statusMessage');
  const resultContainer = document.getElementById('resultContainer');
  const resultMessage = document.getElementById('resultMessage');
  const errorLog = document.getElementById('errorLog');
  
  if (!startButton) {
    console.error('Start button not found!');
    errorLog.textContent = 'Error: Start button not found!';
    return;
  }
  
  startButton.addEventListener('click', async () => {
    console.log('Start button clicked');
    errorLog.textContent = ''; // Clear previous errors
    
    // Get form values
    const credentials = {
      accessKeyId: document.getElementById('accessKeyId').value,
      secretAccessKey: document.getElementById('secretAccessKey').value,
      region: document.getElementById('region').value,
      bucketName: document.getElementById('bucketName').value,
      logFilePath: document.getElementById('logFilePath').value
    };
    
    // Log credentials (except secret key for security)
    console.log(`Access Key: ${credentials.accessKeyId ? credentials.accessKeyId.substring(0, 5) + '...' : 'not provided'}`);
    console.log(`Region: ${credentials.region}`);
    console.log(`Bucket: ${credentials.bucketName}`);
    console.log(`Log Path: ${credentials.logFilePath}`);
    
    // Validate form values
    const missingFields = [];
    for (const [key, value] of Object.entries(credentials)) {
      if (!value || !value.trim()) {
        missingFields.push(key);
      }
    }
    
    if (missingFields.length > 0) {
      const errorMsg = `Please fill in these required fields: ${missingFields.join(', ')}`;
      alert(errorMsg);
      console.error(errorMsg);
      errorLog.textContent = errorMsg;
      return;
    }
    
    try {
      // Check if electronAPI exists
      if (!window.electronAPI) {
        throw new Error('Electron API not available. This application must be run in Electron.');
      }
      
      // Reset UI
      startButton.disabled = true;
      progressContainer.style.display = 'block';
      resultContainer.style.display = 'none';
      resultContainer.className = 'result-container';
      progressBar.style.width = '0%';
      statusMessage.textContent = 'Connecting to AWS S3...';
      
      console.log('Starting S3 bucket listing process');
      
      // Register progress update listener
      window.electronAPI.onProgressUpdate((data) => {
        console.log('Progress update received:', data);
        updateProgress(data);
      });
      
      // Call the main process to list S3 bucket
      console.log('Invoking listS3Bucket IPC call');
      const result = await window.electronAPI.listS3Bucket(credentials);
      console.log('Result received:', result);
      
      // Update result based on success or failure
      resultContainer.style.display = 'block';
      if (result.success) {
        resultContainer.classList.add('success');
        resultMessage.textContent = result.message;
      } else {
        resultContainer.classList.add('error');
        resultMessage.textContent = `Error: ${result.message}`;
      }
    } catch (error) {
      // Handle errors
      const errorMsg = error.message || 'An unknown error occurred';
      console.error('Error in S3 listing process:', errorMsg, error);
      
      progressContainer.style.display = 'none';
      resultContainer.style.display = 'block';
      resultContainer.classList.add('error');
      resultMessage.textContent = `Error: ${errorMsg}`;
      errorLog.textContent = `Error: ${errorMsg}`;
    } finally {
      startButton.disabled = false;
    }
  });
  
  function updateProgress(data) {
    console.log(`Updating progress: ${data.status} - ${data.message}`);
    
    switch(data.status) {
      case 'started':
        statusMessage.textContent = data.message;
        progressBar.style.width = '10%';
        break;
        
      case 'processing':
        statusMessage.textContent = data.message;
        progressBar.style.width = '50%';
        break;
        
      case 'completed':
        statusMessage.textContent = data.message;
        progressBar.style.width = '100%';
        break;
        
      case 'error':
        statusMessage.textContent = data.message;
        progressBar.style.backgroundColor = '#e74c3c';
        break;
    }
  }
  
  // Add keyboard shortcut for DevTools
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'I') {
      if (window.electronAPI && window.electronAPI.toggleDevTools) {
        window.electronAPI.toggleDevTools();
      }
    }
  });
  
  console.log('Event listeners registered');
});