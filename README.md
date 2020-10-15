## GDrive Custodian

This repository contains a signer/custodian for safely storing private keys in a web application. It stores the private key in the GDrive of a user via the file metadata.

It also uses 2 sandboxed iframes to actually access the sensitive data. The user program that wishes to use this would just include it in their project and call a function to attach a click listener to a button. Upon clicking this button a google signin flow starts and within it the user creates a new mnemonic or the application loads the one that they already own in their GDrive and initializes a signer with it.

The application will be listening to state change events and ultimately be able to create another flow through which it can send transactions to signer for it to sign them and then send these to the blockchain afterwards.

