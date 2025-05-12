import { ServerClient } from "postmark";
import { log } from "./vite";
import { storage } from "./storage";
import { NotificationContact, InsertEmailBounce } from "@shared/schema";

// Postmark bounce API types
interface PostmarkBounce {
  ID: number;
  Type: string;
  TypeCode: number;
  Name: string;
  Tag: string;
  MessageID: string;
  ServerID: number;
  Description: string;
  Details: string;
  Email: string;
  From: string;
  BouncedAt: string;
  DumpAvailable: boolean;
  Inactive: boolean;
  CanActivate: boolean;
  Subject: string;
  Content?: string;
  MessageStream?: string;
}

export class BounceService {
  private client: ServerClient;

  constructor() {
    if (!process.env.POSTMARK_API_KEY) {
      log("Warning: Postmark API key not set. Bounce API will not work.", "email");
    }
    this.client = new ServerClient(process.env.POSTMARK_API_KEY || "");
  }

  /**
   * Fetches all bounces from Postmark and syncs them to the local database
   */
  async syncBounces(): Promise<number> {
    try {
      if (!process.env.POSTMARK_API_KEY) {
        log("Cannot fetch bounces: Postmark API key not set", "email");
        return 0;
      }

      // Default parameters for bounce API
      const params = {
        count: 500, // Maximum allowed by Postmark
        offset: 0,
        // We can add type, inactive, emailFilter etc. as parameters if needed
      };

      // Fetch bounces from Postmark
      const response = await this.client.getBounces(params);
      const bounces = response.Bounces;
      
      log(`Retrieved ${bounces.length} bounces from Postmark`, "email");
      
      let newBounceCount = 0;
      
      // Process each bounce and store it in our database
      for (const bounce of bounces) {
        const existingBounce = await storage.getEmailBounceByPostmarkId(bounce.ID);
        
        if (!existingBounce) {
          // Find notification contact that matches the email
          // This is a simple way to match contacts, could be improved with filtering or fuzzy matching
          const [contact] = await storage.getNotificationContactsByEmail(bounce.Email);
          
          // Create new bounce record
          const newBounce: InsertEmailBounce = {
            email: bounce.Email,
            type: bounce.Type,
            description: bounce.Description,
            details: bounce.Details,
            notificationContactId: contact ? contact.id : null,
            bouncedAt: new Date(bounce.BouncedAt),
            dumpAvailable: bounce.DumpAvailable,
            inactive: bounce.Inactive,
            canActivate: bounce.CanActivate,
            messageId: bounce.MessageID,
            subject: bounce.Subject,
            tag: bounce.Tag,
            messageStream: bounce.MessageStream,
            serverId: bounce.ServerID,
            postmarkId: bounce.ID
          };
          
          await storage.createEmailBounce(newBounce);
          newBounceCount++;
        }
      }
      
      log(`Added ${newBounceCount} new bounces to database`, "email");
      return newBounceCount;
    } catch (error) {
      log(`Error syncing bounces: ${error}`, "email");
      return 0;
    }
  }

  /**
   * Reactivates a bounced email in Postmark if possible
   */
  async reactivateEmail(email: string): Promise<boolean> {
    try {
      if (!process.env.POSTMARK_API_KEY) {
        log("Cannot reactivate email: Postmark API key not set", "email");
        return false;
      }
      
      const result = await this.client.activateBounce(email);
      log(`Reactivated bounced email: ${email}`, "email");
      
      // Update our database to reflect the change
      const bounces = await storage.getEmailBouncesByEmail(email);
      
      // Mark all bounces for this email as inactive
      for (const bounce of bounces) {
        await storage.markEmailBounceInactive(bounce.id);
      }
      
      return true;
    } catch (error) {
      log(`Error reactivating email ${email}: ${error}`, "email");
      return false;
    }
  }

  /**
   * Checks if an email address has any hard bounces in Postmark
   */
  async hasHardBounces(email: string): Promise<boolean> {
    try {
      const bounces = await storage.getEmailBouncesByEmail(email);
      // Check if there are any hard bounces
      return bounces.some(bounce => 
        bounce.type === "HardBounce" && 
        !bounce.inactive
      );
    } catch (error) {
      log(`Error checking for hard bounces for ${email}: ${error}`, "email");
      return false;
    }
  }
}

// Export a singleton instance
export const bounceService = new BounceService();