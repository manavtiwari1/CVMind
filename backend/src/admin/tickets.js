import mongoose from 'mongoose';
import { AppSetting, Ticket } from './models.js';

async function nextTicketNumber() {
  const row = await AppSetting.findOneAndUpdate(
    { key: 'counter.ticket' },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: 'after' }
  ).lean();
  return 1000 + Number(row.value || 0);
}

// Turns a contact-form message into a ticket. Safe to call twice for the same message.
export async function ticketFromContact(contact) {
  const contactId = String(contact._id || contact.id || '');
  if (contactId && await Ticket.exists({ contactId })) return null;
  try {
    return await Ticket.create({
      number: await nextTicketNumber(),
      name: contact.name || '',
      email: String(contact.email || '').toLowerCase(),
      subject: contact.subject || 'General inquiry',
      contactId,
      messages: [{ kind: 'customer', authorName: contact.name || contact.email, body: contact.message || '', createdAt: contact.createdAt || new Date() }],
      createdAt: contact.createdAt || new Date()
    });
  } catch (err) {
    if (err?.code === 11000) return null; // created concurrently
    throw err;
  }
}

// Imports contact messages saved before tickets existed. Runs at most once per process.
let imported = false;
export async function importLegacyContacts() {
  if (imported) return;
  imported = true;
  try {
    const Contact = mongoose.models.Contact;
    if (!Contact) return;
    const known = new Set((await Ticket.distinct('contactId', { contactId: { $gt: '' } })).map(String));
    const contacts = await Contact.find().sort({ createdAt: 1 }).lean();
    for (const contact of contacts) {
      if (!known.has(String(contact._id))) await ticketFromContact(contact);
    }
  } catch (err) {
    imported = false;
    console.error('[tickets] contact import failed:', err.message);
  }
}
