import { describe, it, expect, vi } from 'vitest';
import worker from './index';

const env = { API_KEY: 'mock_api_key' };
const ctx = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
  props: {},
  exports: {},
  abort: vi.fn()
};

function messageMock(content: string): ForwardableEmailMessage {
  const message: ForwardableEmailMessage = {
    from: 'john@example.com',
    to: 'support@example.com',
    raw: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(content));
        controller.close();
      }
    }),
    headers: new Headers(),
    rawSize: content.length,
    setReject: vi.fn(),
    forward: vi.fn(),
    reply: vi.fn(),
  };

  return message;
}

const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue({
  ok: true,
  status: 200,
  statusText: 'OK',
  headers: new Headers(),
  clone: () => ({} as Response),
  text: () => Promise.resolve('Success'),
} as Response);

const fetchArgs = {
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Basic ${env.API_KEY}`
  },
  body: expect.any(String)
}

describe('email worker', () => {
  it('should process email and send to API', async () => {
    const emailContent = 'From: John Doe <john@example.com>\r\nTo: support@example.com\r\nSubject: Test Email\r\n\r\nThis is a test email message.\r\n';
    const message = messageMock(emailContent);

    await worker.email(message, env, ctx);

    expect(fetchMock).toHaveBeenCalledWith('https://example.com/api/tickets', fetchArgs);

    const lastCall = fetchMock.mock.lastCall;
    if (lastCall && lastCall[1] && typeof lastCall[1].body === 'string') {
      const payload = JSON.parse(lastCall[1].body);
      expect(payload).toMatchObject({
        subject: 'Test Email',
        name: 'John Doe',
        email: 'john@example.com',
        message: 'This is a test email message.'
      });
    }

    expect(message.setReject).not.toHaveBeenCalled();
  });

  it('should handle email with attachment', async () => {
    const emailContent = `From: John Doe <john@example.com>
To: support@example.com
Subject: Email with Attachment
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="boundary123"

--boundary123
Content-Type: text/plain

This is the email body.

--
Regards
Test User

--boundary123
Content-Type: text/plain; name="attachment.txt"
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="attachment.txt"

VGhpcyBpcyBhbiBhdHRhY2htZW50Lg==

--boundary123--
    `;
    const message = messageMock(emailContent);

    await worker.email(message, env, ctx);

    const lastCall = fetchMock.mock.lastCall;
    expect(fetchMock).toHaveBeenCalledWith('https://example.com/api/tickets', fetchArgs);

    if (lastCall && lastCall[1] && typeof lastCall[1].body === 'string') {
      const payload = JSON.parse(lastCall[1].body);
      expect(payload).toMatchObject({
        subject: 'Email with Attachment',
        name: 'John Doe',
        email: 'john@example.com',
        message: 'This is the email body.\n\n--\nRegards\nTest User',
        attachments: [
          {
            filename: 'attachment.txt',
            mimeType: 'text/plain',
            content: 'VGhpcyBpcyBhbiBhdHRhY2htZW50Lg=='
          }
        ]
      });
    }

    expect(message.setReject).not.toHaveBeenCalled();
  });

  it('should handle API call failure', async () => {
    const emailContent = 'From: John Doe <john@example.com>\r\nTo: support@example.com\r\nSubject: Test Email\r\n\r\nThis is a test email message.\r\n';
    const message = messageMock(emailContent);
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'OK',
      headers: new Headers(),
      clone: () => ({} as Response),
      text: () => Promise.resolve('Error'),
    } as Response);

    await worker.email(message, env, ctx);

    expect(message.setReject).toHaveBeenCalledWith('Failed to process email.');
  });

  it('should handle invalid email content', async () => {
    const emailContent = 'Invalid email content';
    const message = messageMock(emailContent);

    const fetchMock = vi.spyOn(global, 'fetch');

    await worker.email(message, env, ctx);

    expect(message.setReject).toHaveBeenCalledWith('Failed to process email.');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});