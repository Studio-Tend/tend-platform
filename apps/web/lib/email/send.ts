import { render } from '@react-email/components';
import type { WeekLayout } from '@tend/core';
import { createElement } from 'react';
import { Resend } from 'resend';
import { WeekEmail } from './WeekEmail';
import { icsFilename, weekEmailText, weekRangeLabel } from './week-layout';

/*
 * The only file that knows about Resend. The route calls sendWeekEmail() and
 * never imports the SDK, so swapping providers (or adding a queue later) means
 * changing this file only.
 */

export class EmailConfigError extends Error {}
export class EmailDeliveryError extends Error {}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: {
    filename: string;
    content: string | Buffer;
    contentType: string;
  }[];
}

interface EmailConfig {
  apiKey: string;
  from: string;
  replyTo?: string;
}

function readConfig(): EmailConfig {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new EmailConfigError('RESEND_API_KEY and EMAIL_FROM must be set');
  }
  return { apiKey, from, replyTo: process.env.EMAIL_REPLY_TO || undefined };
}

let client: Resend | undefined;
function getClient(apiKey: string): Resend {
  client ??= new Resend(apiKey);
  return client;
}

export async function sendEmail(message: EmailMessage): Promise<{ id: string }> {
  const config = readConfig();

  const { data, error } = await getClient(config.apiKey).emails.send({
    from: config.from,
    to: message.to,
    replyTo: config.replyTo,
    subject: message.subject,
    html: message.html,
    text: message.text,
    attachments: message.attachments,
  });

  if (error || !data) {
    // Resend's message is safe to log but not to show users.
    throw new EmailDeliveryError(error?.message ?? 'Resend returned no data');
  }
  return { id: data.id };
}

export async function buildWeekEmailMessage({
  to,
  week,
  weekStart,
  planUrl,
  ics,
}: {
  to: string;
  week: WeekLayout;
  weekStart: string;
  planUrl: string;
  ics: string;
}): Promise<EmailMessage> {
  const html = await render(createElement(WeekEmail, { week, weekStart, planUrl }));
  const text = weekEmailText(week, weekStart, planUrl);

  return {
    to,
    subject: `Your week · ${weekRangeLabel(weekStart)}`,
    html,
    text,
    attachments: [
      {
        filename: icsFilename(weekStart),
        content: ics,
        contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
      },
    ],
  };
}

export async function sendWeekEmail(input: {
  to: string;
  week: WeekLayout;
  weekStart: string;
  planUrl: string;
  ics: string;
}): Promise<{ id: string }> {
  return sendEmail(await buildWeekEmailMessage(input));
}
