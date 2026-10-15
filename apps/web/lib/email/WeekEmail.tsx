import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { layoutWeek, type Day, type WeekEntry, type WeekLayout } from '@tend/core';
import type { CSSProperties } from 'react';
import { seedFocuses, seedRoomItems } from '@/components/tend-flow/seed-data';
import { fonts, palette } from './palette';
import {
  calendarHoursPhrase,
  emailDayLanes,
  emailDayStamp,
  emailWeekRangeLabel,
  EMPTY_DAY_LABEL,
  icsFilename,
  waitlistUrlFromPlan,
  WEEK_EMAIL_INTRO,
  WEEK_EMAIL_ORIGIN,
} from './week-layout';

export interface WeekEmailProps {
  week: WeekLayout;
  weekStart: string;
  planUrl: string;
}

/**
 * Agenda-row week email, matching the phone week screen: date on the left,
 * times of day as headings, the focus under each item, make-room items marked
 * with ✦ on a door-blue wash, and "Not yet scheduled" underneath.
 */
export function WeekEmail({ week, weekStart, planUrl }: WeekEmailProps) {
  const scheduledCount = week.days.reduce((sum, day) => sum + day.entries.length, 0);
  const waitlistUrl = waitlistUrlFromPlan(planUrl);
  const firstUnscheduledRoom = week.unscheduled.findIndex((entry) => entry.kind === 'room');

  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>
        {`Your week from Tend: ${scheduledCount} planned${
          week.unscheduled.length ? `, ${week.unscheduled.length} still open` : ''
        }.`}
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.wordmark}>tend</Text>
          <Text style={styles.range}>{emailWeekRangeLabel(weekStart)}</Text>
          <Text style={styles.title}>Your week</Text>
          <Text style={styles.intro}>{WEEK_EMAIL_INTRO}</Text>

          <Section style={styles.card}>
            <table width="100%" border={0} cellPadding={0} cellSpacing={0} role="presentation" style={styles.agenda}>
              <tbody>
                {week.days.map(({ day, entries }, i) => (
                  <DayRow key={day} day={day} entries={entries} weekStart={weekStart} divided={i > 0} />
                ))}
              </tbody>
            </table>
          </Section>

          {week.unscheduled.length > 0 && (
            <Section style={styles.unscheduled}>
              <Text style={styles.sectionLabel}>Not yet scheduled</Text>
              {week.unscheduled.map((entry, i) => (
                <EntryLine
                  key={entry.id}
                  entry={entry}
                  washed={false}
                  style={unscheduledEntryStyle(i, firstUnscheduledRoom)}
                />
              ))}
            </Section>
          )}

          <Section style={styles.footerBlock}>
            <Text style={styles.sectionLabel}>Add it to your calendar</Text>
            <Text style={styles.footerBody}>
              Open the attached <strong style={styles.icsName}>{icsFilename(weekStart)}</strong>.{' '}
              {calendarHoursPhrase()}
              {' — all marked free, so they won\u2019t block anything. Or hand the file to your AI assistant and let it fit them around what\u2019s already there.'}
            </Text>
          </Section>

          <Section style={styles.footerBlock}>
            <Text style={styles.sectionLabel}>Change something</Text>
            <Text style={styles.footerBody}>
              <Link href={planUrl} style={styles.link}>
                Open this week in the planner
              </Link>
              {' — it picks up right where you left it.'}
            </Text>
          </Section>

          <Section style={styles.footerBlock}>
            <Text style={styles.footerNote}>
              Tend is still being built.{' '}
              <Link href={waitlistUrl} style={styles.link}>
                Join the waitlist
              </Link>{' '}
              to follow along.
            </Text>
            <Text style={styles.footerNoteSpaced}>{WEEK_EMAIL_ORIGIN}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function DayRow({
  day,
  entries,
  weekStart,
  divided,
}: {
  day: Day;
  entries: WeekEntry[];
  weekStart: string;
  divided: boolean;
}) {
  const { weekday, date } = emailDayStamp(day, weekStart);
  const lanes = emailDayLanes(day, entries);
  const empty = lanes.length === 0;
  const align = empty ? 'middle' : 'top';
  const cell = divided ? styles.dayCellDivided : styles.dayCell;

  return (
    <tr>
      <td width="56" style={{ ...cell, ...styles.dateCol, verticalAlign: align }}>
        <Text style={styles.weekday}>{weekday}</Text>
        <Text style={styles.dateNum}>{date}</Text>
      </td>
      <td style={{ ...cell, ...styles.eventsCol, verticalAlign: align }}>
        {empty ? (
          <Text style={styles.open}>{EMPTY_DAY_LABEL}</Text>
        ) : (
          lanes.map((lane, laneIndex) => (
            <Section key={lane.label} style={laneIndex > 0 ? styles.laneSpaced : undefined}>
              <Text style={styles.laneLabel}>{lane.label}</Text>
              {lane.entries.map((entry, i) => (
                <EntryLine
                  key={entry.id}
                  entry={entry}
                  washed={entry.kind === 'room'}
                  style={i > 0 ? styles.entrySpaced : undefined}
                />
              ))}
            </Section>
          ))
        )}
      </td>
    </tr>
  );
}

function unscheduledEntryStyle(index: number, firstRoom: number): CSSProperties | undefined {
  if (firstRoom > 0 && index === firstRoom) return styles.unscheduledRoom;
  if (index > 0) return styles.entrySpaced;
  return undefined;
}

function EntryLine({
  entry,
  washed,
  style,
}: {
  entry: WeekEntry;
  washed: boolean;
  style?: CSSProperties;
}) {
  return (
    <Section style={{ ...(washed ? styles.entryRoom : styles.entry), ...style }}>
      <Text style={styles.entryLabel}>
        {entry.kind === 'room' && (
          <span aria-hidden="true" style={styles.roomMark}>
            ✦{' '}
          </span>
        )}
        {entry.label}
      </Text>
      {entry.focusTitle ?? entry.intention ? (
        <Text style={styles.entryMeta}>{entry.focusTitle ?? entry.intention}</Text>
      ) : null}
    </Section>
  );
}

WeekEmail.PreviewProps = {
  week: layoutWeek(seedFocuses(), seedRoomItems()),
  weekStart: '2026-09-21',
  planUrl: 'https://www.heytend.co/plan/week#w=preview',
} satisfies WeekEmailProps;

export default WeekEmail;

const label: CSSProperties = {
  fontFamily: fonts.sans,
  fontSize: '12px',
  lineHeight: '16px',
  fontWeight: 500,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: palette.accentText,
  margin: '0 0 8px',
};

const dayCell: CSSProperties = { paddingTop: '16px', paddingBottom: '16px' };

const styles = {
  body: { backgroundColor: palette.canvas, margin: 0, padding: '32px 0' },
  container: { maxWidth: '560px', margin: '0 auto', padding: '0 20px' },
  wordmark: {
    fontFamily: fonts.serif,
    fontSize: '24px',
    lineHeight: '31px',
    color: palette.text,
    margin: '0 0 32px',
  },
  range: { ...label, margin: '0 0 8px' },
  title: {
    fontFamily: fonts.serif,
    fontSize: '32px',
    lineHeight: '38px',
    letterSpacing: '-0.01em',
    color: palette.text,
    margin: '0 0 8px',
  },
  intro: {
    fontFamily: fonts.sans,
    fontSize: '16px',
    lineHeight: '24px',
    color: palette.textSoft,
    margin: '0 0 24px',
  },
  card: {
    border: `1px solid ${palette.border}`,
    borderRadius: '16px',
    padding: '4px 20px',
    backgroundColor: palette.canvas,
  },
  agenda: { width: '100%', tableLayout: 'fixed' },
  dayCell,
  dayCellDivided: { ...dayCell, borderTop: `1px solid ${palette.divider}` },
  dateCol: { width: '56px', minWidth: '56px', maxWidth: '56px' },
  eventsCol: { width: '100%', paddingLeft: '12px' },
  weekday: {
    ...label,
    margin: 0,
  },
  dateNum: {
    fontFamily: fonts.sans,
    fontSize: '16px',
    lineHeight: '24px',
    color: palette.text,
    margin: 0,
  },
  open: {
    fontFamily: fonts.sans,
    fontSize: '16px',
    lineHeight: '24px',
    color: palette.textSoft,
    fontStyle: 'italic',
    margin: 0,
  },
  laneLabel: {
    fontFamily: fonts.sans,
    fontSize: '12px',
    lineHeight: '16px',
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: palette.textSoft,
    margin: '0 0 4px',
  },
  laneSpaced: { marginTop: '16px' },
  entry: { padding: '0' },
  entrySpaced: { marginTop: '8px' },
  entryRoom: {
    padding: '8px 12px',
    backgroundColor: palette.roomWash,
    borderRadius: '8px',
  },
  entryLabel: {
    fontFamily: fonts.sans,
    fontSize: '16px',
    lineHeight: '24px',
    fontWeight: 500,
    color: palette.text,
    margin: 0,
  },
  roomMark: { color: palette.accentText },
  entryMeta: {
    fontFamily: fonts.sans,
    fontSize: '12px',
    lineHeight: '16px',
    color: palette.textSoft,
    margin: '4px 0 0',
  },
  unscheduled: { padding: '32px 0 0' },
  unscheduledRoom: {
    marginTop: '12px',
    paddingTop: '16px',
    borderTop: `1px solid ${palette.divider}`,
  },
  sectionLabel: label,
  footerBlock: { margin: '32px 0 0' },
  footerBody: {
    fontFamily: fonts.sans,
    fontSize: '14px',
    lineHeight: '20px',
    color: palette.textSoft,
    margin: 0,
  },
  icsName: { fontWeight: 600, color: palette.text },
  footerNote: {
    fontFamily: fonts.sans,
    fontSize: '12px',
    lineHeight: '16px',
    color: palette.textSoft,
    margin: 0,
  },
  footerNoteSpaced: {
    fontFamily: fonts.sans,
    fontSize: '12px',
    lineHeight: '16px',
    color: palette.textSoft,
    margin: '8px 0 0',
  },
  link: { color: palette.accentText, textDecoration: 'underline' },
} satisfies Record<string, CSSProperties>;
