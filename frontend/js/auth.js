function signOut() {
    firebase.auth().signOut().then(() => {
        window.location.href='index.html';
    }).catch((error) => {
        console.error('Failure at logout!', error);
        window.location.href='index.html';
    });
}

firebase.auth().onAuthStateChanged(stateUser => {
    if (!stateUser) {
        window.location.href='index.html';
    } else {
        loadUserData();
    }
});