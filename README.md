# Novels AI

An app that creates audiobooks with AI

## Locally login to google cloud

gcloud init
gcloud auth login
gcloud auth application-default login
gcloud config set project ai-audiobook
ls -l ~/.config/gcloud/application_default_credentials.json

## Run frontend locally

`firebase emulators:start` to test frontend locally from the root folder of this project.

Deploy frontend with command `firebase deploy --only hosting`

## Run backend locally

Set all needed env variables on your system.

`npm install` command in backend folder to install dependencies.

`npm start` command to start the server on localhost



Test customer
Live: cus_NgjSSLoqZW8du5
Test: cus_Ngm5rYw71uaA9N