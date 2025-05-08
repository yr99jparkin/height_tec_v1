## **Email Notification System Specification** 

Develop an automated email notification system that alerts users when a wind speed threshold (amber or red) is exceeded for a device. The system will:

* Notify via email contacts listed in the `notification_contacts` table for the affected device.

* Enforce a default cooldown period of **15 minutes** between email notifications, per device, to prevent notification spam.

* Allow `notification_contacts` to acknowledge the email alerts and optionally snooze further notifications.

### **Notification Triggering & Workflow** 

1. **Alert Detection**

   * The UDP listener monitors wind speed data per device.

   * When a reading exceeds the configured threshold:

     * Check the timestamp of the last sent notification for the device in order to enforce cooldown and prevent spam

     * If the device is in a cooldown state due to an amber threshold beng exceeded, subsequent red alerts should override an amber cooldown

     * Check for any active `notification_contact` specific snoozes for the device. If one ‘notification contact’ snoozes their notifications, this should not stop notifications for other ‘notification contacts’. 

2. **Notification Generation**

   * If eligible for notification:

     * Generate a **secure, one-time-use token** for acknowledgment \- this token would be unique per `notification_contact`

     * Assemble a notification payload including but not limited to:

       * Wind speed & threshold exceeded

       * Device and location details

       * Alert severity (red or amber)

       * Acknowledgment buttons 

         1. Acknowledge 

         2. Acknowledge & Snooze for 1 Hour

         3. Acknowledge & Snooze for the rest of today

       * Appropriate timestamps

     * Render an HTML email:

       * Branded consistently with the web app

       * Responsive for mobile and desktop

     * Email is sent via **Postmark,** you will need to npm install postmark. The API key for this service has been added to the secrets. 

###  **Acknowledgment/Snooze Flow**

1. `notification_contact` clicks an acknowledgment button in the email received

2. The system routes them to a 2 step **confirmation page** that:

   * Requires no login

   * Accepts a one-time token via URL parameter

   * Verifies the token authenticity and expiry

   * Processes the selected acknowledgment action via internal API. 

   * Exposing tokenised URLs give the risk of unintentional acknowledgment (e.g., scanner bots clicking links) so need to use a 2 step confirmation page, Step 1 is “Click to confirm”, Step 2 displays the confirmation message to the `notification_contact`:

     * Summary of the action taken

     * Device information

     * Any next alert expectations (e.g., “snoozed until 6 PM today”)

   * Need to update a tracking database with:

     * Acknowledged timestamp

     * Acknowledgement `notification_contact` details 

     * Type of acknowledgment, e.g. applied snooze duration (if any)

     

3. If the token is expired, already used, or invalid:

   * Show a user-friendly error message on the confirmation page

     

4. The confirmation page should have the app logo in the header, which when clicked, hyperlinks the user to the authentication page to login

### **Security Considerations**

* **One-time tokens**:

  * Generated using secure random UUIDs or JWTs

  * Must be single-use and expire after a short time (e.g., 30–60 minutes)

* **HTTPS** must be enforced for all token-based acknowledgment endpoints. The domain for this app when production deployed will be [https://www.heighttec.app](https://www.heighttec.app) so acknowledgement URLs should use this root domain 

* **Token replay protection**: Use DB flag to mark tokens as consumed

