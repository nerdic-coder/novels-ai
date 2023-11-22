async function generateAudiobook() {
    const voiceSelect = document.getElementById('voice');
    const formData = new FormData();
    // const chapters = document.getElementById('chapters').value;
    formData.append('chapters', 1);
    formData.append('voice', voiceSelect.options[voiceSelect.selectedIndex].value);
    formData.append('genre', document.getElementById('genre').value);
    formData.append('title', document.getElementById('title').value);
    formData.append('style', document.getElementById('style').value);
    formData.append('plot', document.getElementById('plot').value);
    formData.append('starring', document.getElementById('starring').value);

    // Disable submit button
    const submitButton = document.getElementById('submit-button');
    submitButton.disabled = true;
    submitButton.value = 'Loading...';

    const token = await firebase.auth().currentUser.getIdToken();
    fetch(API_URL_GENERATE_NEW_NOVEL + '?' + new URLSearchParams(formData), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(response => response.text())
      .then(data => {
        submitButton.disabled = false;
        submitButton.value = 'Create novel';
        if (data === 'Unauthorized') {
          alert('Your session have expired!');
          window.location.href='index.html';
        } else {
            window.location.href='list.html';
        }
      })
      .catch(error => {
        console.error(error);
        alert('Creating novel failed, please try again!');
        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.value = 'Create novel';
      });
}

// Called from auth.js after user loaded
function loadUserData() {
    checkPointsLimit();
}