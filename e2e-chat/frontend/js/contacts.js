// Talks to the /contacts REST endpoints.
// Uses authedFetch from auth.js so requests include the Authorization header
// and automatically retry once on 401 after refreshing the token.

import { apiBase, authedFetch } from "./auth.js";

export async function fetchContacts() {
  const res = await authedFetch(`${apiBase()}/contacts/`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to load contacts");
  }
  return res.json(); // [{ contact_phone_number, added_at }]
}

export async function addContact(phoneNumber) {
  const res = await authedFetch(`${apiBase()}/contacts/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contact_phone_number: phoneNumber }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to add contact");
  }
  return res.json(); // { contact_phone_number, added_at }
}