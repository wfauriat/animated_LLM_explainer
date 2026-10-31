// The running example of Scenes 13 and 14: an app scaffold produced from a
// short request. The code is real: it is meant to read as serious work.
export const LIBRARY = 'easy_reminder_mail'; // made up by the model: it does not exist

export const IMPORT_WRONG = `from ${LIBRARY} import send_later`;
export const IMPORT_FIXED = 'from emails.mailer import send_later';

// The reminder, with a mistake nobody spots yet: Scene 14's test catches the "+".
export const SEND_WRONG = '        at=when + timedelta(days=1),';
export const SEND_FIXED = '        at=when - timedelta(days=1),';

export const REMINDER = [
  'from datetime import timedelta',
  IMPORT_WRONG,
  '',
  'SHOP = "hello@bike-shop.example"',
  '',
  '',
  'def schedule_reminder(email, bike, when):',
  '    send_later(',
  '        sender=SHOP,',
  '        to=email,',
  '        subject="Your bike repair is tomorrow",',
  '        body=f"We expect your {bike} at {when:%H:%M}.",',
  SEND_WRONG,
  '    )',
];

// Scaffold files, in the order they get written. `examples` = how many
// similar files people have written (illustrative: the width of its stack).
export const FILES: {path: string; examples: number; code: string[]}[] = [
  {
    path: 'README.md',
    examples: 34,
    code: [
      '# Bike repair shop',
      '',
      'Customers book a repair slot online and get a reminder email.',
      '',
      '    pip install -r requirements.txt',
      '    flask run',
    ],
  },
  {path: 'requirements.txt', examples: 40, code: ['flask', 'pytest']},
  {
    path: 'db/schema.sql',
    examples: 48,
    code: [
      '-- Bike repair shop: customers book a time slot.',
      'CREATE TABLE bookings (',
      '    id        INTEGER PRIMARY KEY,',
      '    customer  TEXT NOT NULL,',
      '    email     TEXT NOT NULL,',
      '    bike      TEXT NOT NULL,',
      '    starts_at TEXT NOT NULL,',
      "    status    TEXT DEFAULT 'booked'",
      ');',
      '',
      'CREATE INDEX idx_bookings_time ON bookings (starts_at);',
    ],
  },
  {
    path: 'app.py',
    examples: 56,
    code: [
      'from datetime import datetime',
      'from flask import Flask, redirect, render_template, request',
      'import sqlite3',
      '',
      'from emails.reminder import schedule_reminder',
      '',
      'app = Flask(__name__)',
      'DB = "db/shop.sqlite"',
      '',
      '',
      '@app.get("/book")',
      'def book_form():',
      '    return render_template("book_repair.html")',
      '',
      '',
      '@app.post("/book")',
      'def book_repair():',
      '    form = request.form',
      '    when = datetime.fromisoformat(form["when"])',
      '    with sqlite3.connect(DB) as db:',
      '        db.execute(',
      '            "INSERT INTO bookings (customer, email, bike, starts_at)"',
      '            " VALUES (?, ?, ?, ?)",',
      '            (form["name"], form["email"], form["bike"], when.isoformat()),',
      '        )',
      '    schedule_reminder(form["email"], form["bike"], when)',
      '    return redirect("/book?done=1")',
    ],
  },
  {
    path: 'templates/book_repair.html',
    examples: 44,
    code: [
      '<h1>Book a repair</h1>',
      '<form method="post" action="/book">',
      '  <label>Your name <input name="name" required></label>',
      '  <label>Email <input name="email" type="email" required></label>',
      '  <label>Your bike <input name="bike" required></label>',
      '  <label>When <input name="when" type="datetime-local" required></label>',
      '  <button>Book my slot</button>',
      '</form>',
    ],
  },
  {path: 'emails/reminder.py', examples: 5, code: REMINDER},
  {
    path: 'tests/test_booking.py',
    examples: 36,
    code: [
      'from datetime import datetime, timedelta',
      'from unittest.mock import patch',
      '',
      'from emails.reminder import schedule_reminder',
      '',
      '',
      '@patch("emails.reminder.send_later")',
      'def test_reminder_is_sent_the_day_before(send_later):',
      '    when = datetime(2026, 11, 3, 10, 0)',
      '    schedule_reminder("ana@example.com", "city bike", when)',
      '    sent_at = send_later.call_args.kwargs["at"]',
      '    assert sent_at < when, "reminder must go out before the booking"',
    ],
  },
];
