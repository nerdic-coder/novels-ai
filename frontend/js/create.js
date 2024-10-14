// Helper function to handle the POST request
async function postData(token, formData) {
  // POST request
  const response = await fetch(API_URL_GENERATE_NEW_NOVEL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(formData),
  });

  const data = await response.text();

  const submitButton = document.getElementById('submit-button');
  // Re-enable the submit button
  submitButton.disabled = false;
  submitButton.value = 'Create novel';

  if (data === 'Unauthorized') {
    alert('Your session has expired!');
    window.location.href = 'index.html';
  } else {
    window.location.href = 'list.html';
  }
}

async function generateAudiobook() {
  const voiceSelect = document.getElementById('voice');
  const povSelect = document.getElementById('pov');
  
  // Disable submit button
  const submitButton = document.getElementById('submit-button');
  submitButton.disabled = true;
  submitButton.value = 'Loading...';
  
  try {
    const token = await firebase.auth().currentUser.getIdToken();
  
    const imageInput = document.getElementById('image');
    const file = imageInput.files[0];
  
    // Gather form data
    const formData = {
      voice: voiceSelect.options[voiceSelect.selectedIndex].value,
      pov: povSelect.options[povSelect.selectedIndex].value,
      genre: document.getElementById('genre').value,
      title: document.getElementById('title').value,
      style: document.getElementById('style').value,
      plot: document.getElementById('plot').value,
      starring: document.getElementById('starring').value,
    };
  
    // Only add the image to formData if a file was selected
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64Image = reader.result;
        formData.image = base64Image;  // Image as Base64 string
  
        // Make the POST request with the image included
        await postData(token, formData);
      };
    } else {
      // Make the POST request without the image
      await postData(token, formData);
    }
  
  } catch (error) {
    console.error(error);
    alert('Creating novel failed, please try again!');
  
    // Re-enable the submit button
    submitButton.disabled = false;
    submitButton.value = 'Create novel';
  }
}

// Called from auth.js after user loaded
function loadUserData() {
    checkPointsLimit();
}