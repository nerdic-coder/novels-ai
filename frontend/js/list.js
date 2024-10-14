async function deleteAudiobook(audiobookId) {
    if (confirm("Are you sure you want to delete this book?")) {
        const formData = new FormData();
        formData.append('audiobookId', audiobookId);

        const token = await firebase.auth().currentUser.getIdToken();
        fetch(API_URL_REMOVE_NOVEL + '?' + new URLSearchParams(formData), {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
        .then(response => response.text())
        .then(data => {
            if (data === 'Unauthorized') {
                alert('Your session have expired!');
                window.location.href='index.html';
            } else if (data === 'Internal Server Error') {
                alert('Deleting Audiobook failed, please try again!');
            }
        })
        .catch(error => {
            console.error(error);
            alert('Deleting Audiobook failed, please try again!');
        });
    }
}

async function addChapter(audiobookId) {
    if (confirm("Are you sure you want to add a new chapter for 1 point?")) {
        const formData = new FormData();
        formData.append('audiobookId', audiobookId);

        const token = await firebase.auth().currentUser.getIdToken();
        fetch(API_URL_ADD_CHAPTER + '?' + new URLSearchParams(formData), {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
        .then(response => response.text())
        .then(data => {
            if (data === 'Unauthorized') {
                alert('Your session have expired!');
                window.location.href='index.html';
            } else if (data === 'Internal Server Error') {
                alert('Adding chapter failed, please try again!');
            } else if (data === 'Insufficient points') {
              alert('You do not have enough points to add a new chapter.');
            }
        })
        .catch(error => {
            console.error(error);
            alert('Adding chapter failed, please try again!');
        });
    }
}

function loadNovels() {
    const narrationTypes = new Map([
        ['first', 'First Person'],
        ['third-limited', 'Third Person Limited'],
        ['third-omni', 'Third Person Omniscient'],
        ['third-object', 'Third Person Objective (Dramatic)'],
        ['second', 'Second Person'],
        ['multiple', 'Multiple Points of View'],
        ['consciousness', 'Stream of Consciousness'],
        ['unreliable', 'Unreliable Narrator'],
        ['plural', 'First Person Plural'],
        ['detached', 'Detached Narrator']
    ]);
    const voices = new Map([
        ['onyx', 'Paul'],
        ['alloy', 'Sophia'],
        ['nova', 'Kate'],
        ['shimmer', 'Eve'],
        ['fable', 'Orion'],
    ]);
    // Get the currently signed-in user
    let user = firebase.auth().currentUser;
    // Get the audiobooks collection for the current user
    const audiobooksRef = firebase.firestore().collection('users').doc(user.uid).collection('audiobooks');

    // Listen for changes to the audiobooks collection
    audiobooksRef.orderBy('createdDate', 'desc').limit(storiesShown).onSnapshot((snapshot) => {
      if (snapshot.size < storiesShown) {
        loadMoreButton.classList.add('hidden');
      } else {
        loadMoreButton.classList.remove('hidden');
      }
      // Clear the existing list of audiobooks
      const audiobooksList = document.getElementById('audiobooks-list');
      audiobooksList.innerHTML = '';
      if (snapshot.size < 1) {
        audiobooksList.innerHTML = '<div class="alert alert-info" role="alert">No novels created yet!</div>';
      }

      // Loop through the audiobook documents in the snapshot
      snapshot.forEach((doc) => {
        // Get the audiobook data from the document
        const audiobookData = doc.data();
        const audiobookId = doc.id;

        // Create a new list item for the audiobook
        const audiobookRow = document.createElement('tr');
        const audiobookTitle = document.createElement('td');
        const audiobookOptions = document.createElement('td');
        let audiobookContent = `<p><strong>${audiobookData.title}</strong><br/>`;

        if (audiobookData.genre) {
          audiobookContent += `
            Genre: ${audiobookData.genre}<br/>
          `;
        }

        if (audiobookData.style) {
          audiobookContent += `
            Author: ${audiobookData.style}<br/>`;
        }

        if (audiobookData.plot) {
          audiobookContent += `
            Plotline: ${audiobookData.plot}<br/>`;
        }

        if (audiobookData.pov && narrationTypes.get(audiobookData.pov)) {
          audiobookContent += `
            Point of view: ${narrationTypes.get(audiobookData.pov)}<br/>`;
        }

        if (audiobookData.voice && voices.get(audiobookData.voice)) {
            audiobookContent += `
              Voice: ${voices.get(audiobookData.voice)}<br/>`;
          }

        if (audiobookData.starring) {
          audiobookContent += `
            Starring: ${audiobookData.starring}`;
        }

        audiobookContent += '</p>';
        audiobookTitle.textContent = audiobookData.title;

        let audioContent = '';
        for (let index = 0; index < audiobookData.chapters.length; index += 1) {
          audioContent += `
            <h4>Chapter ${index + 1}</h4>
            <audio controls>
              <source src="${audiobookData.chapters[index].chapterUrl}" type="audio/mpeg">
              <p>Your browser does not support the audio element</p>
            </audio>
            <br>
          `;
        }

        if (audiobookData.status === 'progress') {
          const spinner = document.createElement('div');
          spinner.classList.add('spinner-border', 'text-success');
          spinner.setAttribute('role', 'status');
          spinner.innerHTML = '<span class="visually-hidden">Loading...</span>';
          audiobookOptions.appendChild(spinner);
        } else if (audiobookData.status === 'error') {
          audiobookContent += '<div class="alert alert-danger" role="alert">Failed to generate!</div>';
          audiobookOptions.innerHTML = `
            <div class="mb-3 d-grid gap-2" style="margin-top: 15px; margin-bottom: 15px;">
              <input type="button" value="Delete novel" class="btn btn-warning" onclick="deleteAudiobook('${audiobookId}')">
            </div>
          `;
        } else {
          audiobookContent += audioContent;
          audiobookOptions.innerHTML = `
            <div class="mb-3 d-grid gap-2" style="margin-top: 15px; margin-bottom: 15px;">
              <input type="button" value="Add chapter" class="btn btn-success btn-needs-points" onclick="addChapter('${audiobookId}')">
              <input type="button" value="Delete novel" class="btn btn-warning" onclick="deleteAudiobook('${audiobookId}')">
            </div>
          `;
        }
        
        audiobookTitle.innerHTML = audiobookContent;

        audiobookRow.appendChild(audiobookTitle);
        audiobookRow.appendChild(audiobookOptions);
        // Add the new list item to the list of audiobooks
        audiobooksList.appendChild(audiobookRow);
      });
    });
}

// Called from auth.js after user loaded
function loadUserData() {
    isSuccessOrderParamPresent();
    loadNovels();
    checkPointsLimit();
}