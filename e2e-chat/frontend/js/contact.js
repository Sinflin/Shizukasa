import { authedFetch, apiBase } from "./auth.js";

export async function fetchContacts() {
  const res = await authedFetch(`${apiBase()}/contacts/`);
  if (!res.ok) throw new Error("Could not load contacts");
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
    throw new Error(err.detail || "Could not add contact");
  }
  return res.json();
}

/* This block of code is for testing purposes only. It allows the frontend to simulate a contact being added without actually calling the backend. */