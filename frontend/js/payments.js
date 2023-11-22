// Called from auth.js after user loaded
function loadUserData() {
    const db = firebase.firestore();
    // Get the currently signed-in user
    let user = firebase.auth().currentUser;
    // Query the Firestore database for user's payments collection
    db.collection('users').doc(user.uid).collection('payments').orderBy('created', 'desc').get().then((querySnapshot) => {
        // Retrieve the payment data and display it on the frontend
        const tableBody = document.getElementById('payment-table-body');
        querySnapshot.forEach((doc) => {
          const payment = doc.data();
          const row = tableBody.insertRow();
          const dateCell = row.insertCell();
          const amountCell = row.insertCell();
          const statusCell = row.insertCell();
          dateCell.innerHTML = new Date(payment.created * 1000).toLocaleString();
          amountCell.innerHTML = `${payment.amount / 100} ${payment.currency}`;
          statusCell.innerHTML = payment.status;
        });
    }).catch((error) => {
        console.error(error);
    });
}