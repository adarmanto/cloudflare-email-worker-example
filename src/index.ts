import PostalMime from "postal-mime";
import { convert } from "html-to-text";

const parseContent = (text?: string, html?: string): string | null => {
  // Extract body (prefer plain text, fallback to HTML conversion)
  let body = text;
  if (!body && html) {
    body = convert(html);
  }

  if (!body) {
    return null;
  }

  return body.trim();
};

export default {
  async email(message, env, ctx) {
    try {
      // Parse email with base64 encoding for attachments
      const email = await PostalMime.parse(message.raw, {
        attachmentEncoding: "base64",
      });

      let body = parseContent(email.text, email.html);

      // Prepare payload for the API
      const payload = JSON.stringify({
        subject: email.subject,
        name: email.from.name,
        email: email.from.address,
        message: body,
        source: "email",
        reply_to: message.to,
        message_id: email.messageId,
        attachments: email.attachments.map((attachment) => ({
          filename: attachment.filename || "unnamed_attachment",
          mimeType: attachment.mimeType || "application/octet-stream",
          content: attachment.content, // Already a base64 string due to attachmentEncoding
        })),
      });

      // API Call with Basic Authentication
      const apiResponse = await fetch("https://example.com/api/tickets", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Basic ${env.API_KEY}`,
        },
        body: payload,
      });

      // Check API response
      if (!apiResponse.ok) {
        console.error("API Call Failed. Status:", apiResponse.status);
        const errorText = await apiResponse.text();
        console.error("Error Response Body:", errorText);
        message.setReject("Failed to process email.");
      } else {
        console.log("Email processed and forwarded to API.");
      }
    } catch (error) {
      console.error("Failed to process email:", error);
      message.setReject("Failed to process email.");
    }
  },
} satisfies ExportedHandler<Env>;
