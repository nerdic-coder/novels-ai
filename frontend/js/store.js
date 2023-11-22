function isSuccessOrderParamPresent() {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    // Modify the condition based on the specific parameters you're checking for
    if (success) {
      gtag('event', 'conversion', {
          'send_to': 'AW-987087034/PhTWCPKdl80YELqB19YD',
          'transaction_id': ''
      });
    }
}

async function buyPoints(event) {
    event.target.disabled = true;
    // Get the currently signed-in user
    let user = firebase.auth().currentUser;
    const paymentRef = await firebase.firestore()
      .collection('users')
      .doc(user.uid)
      .collection("checkout_sessions")
      .add({
        mode: "payment",
        price: "price_1MvLYABPvg43OlrWhK03okqu", // One-time price created in Stripe
        success_url: `${window.location.origin}/list.html?success=true`,
        cancel_url: `${window.location.origin}/list.html?cancel=true`,
      });
    // Listen for changes to the document
    paymentRef.onSnapshot((doc) => {
      // Check if the URL field exists and is not null
      if (doc.exists && doc.data().url) {
        const url = doc.data().url;
        event.target.disabled = false;
        gtag('event', 'begin_checkout', {
          'event_category': 'Checkout',
          'event_label': 'Start of Checkout',
          'value': 5,
        });
        // Do something with the URL, e.g. open it in a new window
        window.location.href = url;
      } else if (doc.exists && doc.data().error) {
        alert('Payment could not be initiated, if error persist contact us!');
        event.target.disabled = false;
      }
    });
}

function checkPointsLimit() {
    // Get the currently signed-in user
    let user = firebase.auth().currentUser;
    const userDocRef = firebase.firestore().collection('users').doc(user.uid);
    userDocRef.get().then((doc) => {
      if (doc.exists) {
        let points = doc.data().points;
        if (points === undefined) {
          points = 2;
        }
        const chapters = 1;
        // Display the user's points in the UI
        document.getElementById('point-indicator').textContent = points;

        if (points < chapters) {
          // Disable submit button
          const submitButton = document.getElementById('submit-button');
          submitButton.disabled = true;
        } else {
          const submitButton = document.getElementById('submit-button');
          submitButton.disabled = false;
        }
      } else {
        console.error('User document does not exist');
        document.getElementById('point-indicator').textContent = NEW_USER_POINTS;
      }
    }).catch((error) => {
      console.error(`Error getting user document: ${error}`);
      document.getElementById('point-indicator').textContent = NEW_USER_POINTS;
    });
}