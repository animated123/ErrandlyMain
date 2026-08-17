# ErrandRunner Firestore Security Specification

This document outlines the data invariants and testing strategy for the ErrandRunner Firestore security rules.

## 1. Data Invariants

- **Users**: Users can only read and write their own documents. Admins have full access.
- **Errands**:
    - Requesters can only create errands where they are the `requesterId`.
    - Errand access is limited to the `requesterId`, the `runnerId` (if assigned), and Admins.
    - Status transitions must be logical (e.g., cannot skip from `pending` to `completed`).
- **Featured Services / Service Listings**: Publicly readable (anyone can see available services). Writable only by Admins.
- **Transactions**: Users can only read their own transactions. Only Admins or system processes can update/delete them.
- **Runner Applications**: Users can create their own applications. Only Admins can read or update them.
- **Support Chats**: Users can read/write their own chat. Admins have access to all.
- **Errand Chats**: Accessible only to the `requesterId` and `runnerId` of the parent errand.
- **Notifications**: Users can only read/write their own notifications.

## 2. The "Dirty Dozen" Payloads (Anti-Patterns)

The following payloads MUST be rejected by the security rules:

1.  **Identity Spoofing (Create Errand)**: A user attempting to create an errand with someone else's `requesterId`.
    ```json
    { "path": "errands/malicious_id", "data": { "requesterId": "someone_else_uid", "title": "Free Work" }, "auth": { "uid": "attacker_uid" } }
    ```
2.  **Privilege Escalation (User Profile)**: A user attempting to set their own `role` to `admin`.
    ```json
    { "path": "users/attacker_uid", "data": { "role": "admin" }, "auth": { "uid": "attacker_uid" } }
    ```
3.  **Cross-User Data Leak (Get User)**: A user attempting to read another user's profile.
    ```json
    { "path": "users/victim_uid", "auth": { "uid": "attacker_uid" } }
    ```
4.  **Orphaned Errand Chat**: Attempting to write a chat message to an errand the user is not part of.
    ```json
    { "path": "errand_chats/victim_errand_id/messages/msg_1", "data": { "text": "Hacked" }, "auth": { "uid": "attacker_uid" } }
    ```
5.  **State Shortcutting (Errand Update)**: A runner attempting to complete an errand that hasn't been assigned yet.
    ```json
    { "path": "errands/errand_id", "data": { "status": "completed" }, "auth": { "uid": "runner_uid" } }
    ```
6.  **Resource Poisoning (Long Strings)**: Attempting to save a 1MB string in a field that should be short (e.g., `title`).
    ```json
    { "path": "errands/errand_id", "data": { "title": "A".repeat(1024 * 1024) }, "auth": { "uid": "requester_uid" } }
    ```
7.  **Shadow Update (ghost field)**: Attempting to verify themselves by adding a hidden `isVerified` field.
    ```json
    { "path": "users/attacker_uid", "data": { "isVerified": true, "name": "Attacker" }, "auth": { "uid": "attacker_uid" } }
    ```
8.  **Unauthorized Collection Scrape (List Transactions)**: Attempting to list all transactions across all users.
    ```json
    { "path": "transactions", "auth": { "uid": "attacker_uid" } }
    ```
9.  **Bypassing Owner Lock (Transaction Update)**: A user attempting to decrease their own debt or increase balance manually in a transaction doc.
    ```json
    { "path": "transactions/tx_1", "data": { "amount": 0 }, "auth": { "uid": "owner_uid" } }
    ```
10. **Application Hijacking**: A user trying to update another user's runner application.
    ```json
    { "path": "runner_applications/victim_app_id", "data": { "status": "approved" }, "auth": { "uid": "attacker_uid" } }
    ```
11. **Malicious ID Injection**: Using a very long or special-character string as a document ID.
    ```json
    { "path": "errands/!@#$%^&*()_+", "data": { "title": "Test" }, "auth": { "uid": "requester_uid" } }
    ```
12. **PII Blanket Leak (List Users)**: Attempting to list all users to scrape emails.
    ```json
    { "path": "users", "auth": { "uid": "attacker_uid" } }
    ```

## 3. Test Runner (Conceptual)

We will use `@firebase/rules-unit-testing` or similar. All "Dirty Dozen" payloads must return `PERMISSION_DENIED`.
