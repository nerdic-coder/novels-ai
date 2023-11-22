const googleSignInButton = document.getElementById('google-sign-in-button');
const registerButton = document.getElementById('register-button');

async function signin() {
    const email = document.getElementById('input-email').value;
    const password = document.getElementById('input-password').value;

    firebase.auth().signInWithEmailAndPassword(email, password)
        .then(() => {
            window.location.href='list.html';
        })
        .catch((error) => {
            document.getElementById('login-form').reset();
            console.error(error.message);
            alert('Failed to login! ', error.message);
        });
}

registerButton.addEventListener('click', async () => {
    window.location.href = 'register.html';
});

googleSignInButton.addEventListener('click', async () => {
    try {
        googleSignInButton.disabled = true;
        googleSignInButton.value = 'Loading...';
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        // Create a Google sign-in provider
        const provider = new firebase.auth.GoogleAuthProvider();
        // Sign in with the Google provider
        await firebase.auth().signInWithRedirect(provider);
    } catch (error) {
        console.error('Error signing in', error);
        alert('Error signing in!');
        googleSignInButton.disabled = false;
        googleSignInButton.value = 'Google Signin';
    }
});

firebase.auth().onAuthStateChanged(stateUser => {
    if (stateUser) {
        window.location.href = 'list.html';
    }
});

window.onload = async function() {
    // After returning from the redirect when your app initializes you can obtain the result
    try {
        const result = await firebase.auth().getRedirectResult();
        if (result.user) {
            window.location.href = 'list.html';
        }
    } catch (error) {
        alert('Login failed!');
        console.error('Login failed!', error);
    }
};